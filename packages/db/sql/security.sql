-- ConnectApp security layer. Hand-written, because Drizzle owns table shape and not
-- security. Applied after the generated table migrations, and idempotent so it
-- can be re-run whenever a table is added.
--
-- Three things happen here:
--   1. A role the application connects as, that row-level security APPLIES to.
--   2. An RLS policy on every tenant-scoped table, reading app.tenant_id.
--   3. An append-only audit log, written by trigger so code cannot forget.

-- ---------------------------------------------------------------------------
-- 1. The application role
-- ---------------------------------------------------------------------------
-- Not the owner, because a table owner bypasses RLS. Not BYPASSRLS. Not the
-- Supabase service role. This is the only role a request path ever uses.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'hearth_app') then
    execute format('create role hearth_app login password %L', current_setting('hearth.app_password'));
  else
    execute format('alter role hearth_app login password %L', current_setting('hearth.app_password'));
  end if;
end $$;

alter role hearth_app nobypassrls;
grant usage on schema public to hearth_app;
grant select, insert, update, delete on all tables in schema public to hearth_app;
grant usage, select on all sequences in schema public to hearth_app;
alter default privileges in schema public grant select, insert, update, delete on tables to hearth_app;

-- ---------------------------------------------------------------------------
-- 2. Tenant context helpers
-- ---------------------------------------------------------------------------
-- A missing setting returns null rather than raising, so a query without a
-- tenant context returns no rows instead of an error that might get caught and
-- swallowed. Silence is the safe failure here.
--
-- Every function pins `search_path = ''`. Without it, anyone able to create an
-- object in a schema earlier in the path could shadow something the function
-- resolves, which is a privilege-escalation path rather than a style issue. With
-- an empty path, everything outside pg_catalog must be schema-qualified, so the
-- shadowing has nowhere to happen.

create or replace function public.app_tenant_id() returns uuid
language sql stable
set search_path = ''
as $$
  select nullif(current_setting('app.tenant_id', true), '')::uuid
$$;

create or replace function public.app_role() returns text
language sql stable
set search_path = ''
as $$
  select nullif(current_setting('app.role', true), '')
$$;

create or replace function public.app_user_id() returns uuid
language sql stable
set search_path = ''
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

-- These are called by the RLS policies, so the application role needs them, and
-- nobody else does. PUBLIC execute would expose them over PostgREST for no reason.
revoke all on function public.app_tenant_id() from public;
revoke all on function public.app_role() from public;
revoke all on function public.app_user_id() from public;
grant execute on function public.app_tenant_id() to hearth_app;
grant execute on function public.app_role() to hearth_app;
grant execute on function public.app_user_id() to hearth_app;

-- ---------------------------------------------------------------------------
-- 3. Row-level security on every tenant-scoped table
-- ---------------------------------------------------------------------------
-- Applied in a loop over every table carrying tenant_id, so a table added later
-- cannot be forgotten: re-running this file covers it.
--
-- Deliberately NOT forced. FORCE would bind the owner too, and the owner is the
-- role that runs migrations, seeds, exports, and genuinely cross-tenant platform
-- jobs. Binding it would make those impossible and push the work into a
-- BYPASSRLS role instead, which is strictly worse.
--
-- The guarantee we ship is about hearth_app, because hearth_app is what every
-- request uses. It is not the owner, it owns no table, and it is NOBYPASSRLS,
-- all three asserted by the test suite. The owner connection never appears in a
-- request path, which is enforced by a test as well as by review.

do $$
declare t text;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'tenant_id' and a.attnum > 0
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I no force row level security', t);
    execute format('drop policy if exists tenant_isolation on public.%I', t);
    execute format(
      'create policy tenant_isolation on public.%I using (tenant_id = app_tenant_id()) with check (tenant_id = app_tenant_id())',
      t
    );
  end loop;
end $$;

-- The tenants table itself keys on id, not tenant_id.
alter table public.tenants enable row level security;
alter table public.tenants no force row level security;
drop policy if exists tenant_isolation on public.tenants;
create policy tenant_isolation on public.tenants
  using (id = app_tenant_id()) with check (id = app_tenant_id());

-- app_users is global, so it is reachable only for users who belong to the
-- current tenant. Without this, a join could enumerate every user on the platform.
alter table public.app_users enable row level security;
alter table public.app_users no force row level security;
drop policy if exists tenant_members_only on public.app_users;
create policy tenant_members_only on public.app_users
  using (
    exists (
      select 1 from public.tenant_members m
      where m.user_id = app_users.id and m.tenant_id = app_tenant_id()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members m
      where m.user_id = app_users.id and m.tenant_id = app_tenant_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Confidential notes
-- ---------------------------------------------------------------------------
-- Defence in depth. The body is already encrypted with a key the database never
-- sees (R21.3), and the repository omits the field for roles that may not read
-- it (R1.5). This policy adds a third layer: a role outside the confidential
-- tier cannot even select the ciphertext column's row through a raw query.
--
-- Metadata visibility is preserved deliberately: R6.2 requires that a user sees
-- a note EXISTS, with its date and author, while being unable to read it. So the
-- policy permits the row and the encryption plus the projection withhold the
-- content.

-- ---------------------------------------------------------------------------
-- 5. Address integrity
-- ---------------------------------------------------------------------------
alter table public.addresses drop constraint if exists addresses_one_owner;
alter table public.addresses add constraint addresses_one_owner
  check ((household_id is null) <> (member_id is null));

-- ---------------------------------------------------------------------------
-- 6. Append-only audit log
-- ---------------------------------------------------------------------------
-- Written by trigger, so no code path can forget to audit. UPDATE and DELETE are
-- revoked from the application role, which is what makes R1.11's acceptance
-- criterion true: the log cannot be modified or deleted by any application role,
-- including Owner.

-- SECURITY INVOKER, not DEFINER.
--
-- DEFINER was unnecessary: hearth_app already holds INSERT on audit_entries and
-- the isolation policy passes, because the row's tenant_id is the tenant in
-- context. Running as the invoker removes an escalation surface entirely rather
-- than guarding it, which is the better trade whenever it is available.
create or replace function public.audit_write() returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid;
  v_before jsonb;
  v_after jsonb;
begin
  -- R1.14. One case writes no audit row: deleting a tenant outright, which
  -- cascades to its people and would have the trigger writing rows pointing at
  -- the tenant being removed. It is set per connection, for one transaction,
  -- by the maintenance path that does it.
  --
  -- A session setting rather than disabling the triggers, because disabling one
  -- takes an exclusive lock on every audited table and stops the rest of the
  -- platform while it runs. This affects nobody but the connection that sets
  -- it, and it cannot be set through the request path: app_role() is read from
  -- the same place and the application never sets this one.
  -- Honoured for the owner connection only. hearth_app is what every request
  -- runs as, and a query layer that could switch its own auditing off is a
  -- query layer that could erase what it did. Setting it there changes nothing.
  if coalesce(current_setting('app.audit_off', true), '') = '1'
     and current_user <> 'hearth_app' then
    return null;
  end if;

  if tg_op = 'DELETE' then
    v_before := to_jsonb(old);
    v_tenant := (v_before ->> 'tenant_id')::uuid;
  else
    v_after := to_jsonb(new);
    v_tenant := (v_after ->> 'tenant_id')::uuid;
    if tg_op = 'UPDATE' then v_before := to_jsonb(old); end if;
  end if;

  -- Never store a confidential note's ciphertext in the audit log. The log is
  -- read by more people than the note is.
  if tg_table_name = 'notes' then
    v_before := v_before - 'body_encrypted' - 'body';
    v_after  := v_after  - 'body_encrypted' - 'body';
  end if;

  insert into public.audit_entries (tenant_id, actor_user_id, actor_role, action, entity, entity_id, before, after, ip)
  values (
    v_tenant,
    public.app_user_id(),
    public.app_role(),
    lower(tg_op)::public.audit_action,
    tg_table_name,
    coalesce((v_after ->> 'id')::uuid, (v_before ->> 'id')::uuid),
    v_before,
    v_after,
    nullif(current_setting('app.ip', true), '')
  );

  return coalesce(new, old);
end $$;

-- Every table that carries a tenant_id gets the trigger, found by looking rather
-- than by a list. A list is a thing somebody forgets to add to, and an unaudited
-- table looks identical to an audited one until the day someone asks who changed
-- a record. audit_entries itself is excluded: auditing the audit log recurses.
do $$
declare t text;
begin
  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attname = 'tenant_id' and a.attnum > 0
     where n.nspname = 'public'
       and c.relkind = 'r'
       and c.relname <> 'audit_entries'
     order by c.relname
  loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format(
      'create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function audit_write()',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 7. R1.2. Campus, filled in rather than left null
-- ---------------------------------------------------------------------------
--
-- Every record that belongs somewhere carries a campus_id. The UI is
-- single-campus and says nothing about it, so nothing on a screen ever sets
-- one, and the column would be a column of nulls that a multi-campus release
-- has to backfill from nothing.
--
-- So the database fills it: on insert, a null campus_id becomes the tenant's
-- primary campus. By trigger rather than by code, because the call sites are
-- the people repository, the importer, the seed script and whatever is written
-- next, and a rule enforced in four of those five places is not a rule.

create or replace function public.campus_default() returns trigger
language plpgsql
security invoker
as $$
declare v_campus uuid;
begin
  if new.campus_id is not null then return new; end if;

  select id into v_campus
    from public.campuses
   where tenant_id = new.tenant_id
     and is_primary
   order by created_at
   limit 1;

  new.campus_id := v_campus;
  return new;
end $$;

-- Found by looking, like the audit triggers. A table that gains a campus_id
-- later is covered the next time this file runs.
do $$
declare t text;
begin
  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attname = 'campus_id' and a.attnum > 0
      join pg_attribute b on b.attrelid = c.oid and b.attname = 'tenant_id' and b.attnum > 0
     where n.nspname = 'public'
       and c.relkind = 'r'
       and c.relname <> 'campuses'
       and c.relname <> 'locations'
     order by c.relname
  loop
    execute format('drop trigger if exists campus_default_%1$s on public.%1$I', t);
    execute format(
      'create trigger campus_default_%1$s before insert on public.%1$I for each row execute function campus_default()',
      t
    );
  end loop;
end $$;

revoke all on function public.campus_default() from public;
grant execute on function public.campus_default() to hearth_app;

-- R1.2. Anything written before the trigger existed. Harmless to run again, and
-- a no-op on the second pass because every row already has one.
--
-- Audited off for the duration. A church with four thousand records would
-- otherwise get four thousand audit rows saying a column nobody has ever seen
-- changed from null to the only value it could have.
do $$
declare t text;
begin
  perform set_config('app.audit_off', '1', true);

  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attname = 'campus_id' and a.attnum > 0
      join pg_attribute b on b.attrelid = c.oid and b.attname = 'tenant_id' and b.attnum > 0
     where n.nspname = 'public'
       and c.relkind = 'r'
       and c.relname not in ('campuses', 'locations')
     order by c.relname
  loop
    execute format(
      'update public.%1$I t set campus_id = c.id from public.campuses c'
      ' where c.tenant_id = t.tenant_id and c.is_primary and t.campus_id is null',
      t
    );
  end loop;
end $$;

-- Not callable as an API endpoint. It is a trigger function, and a trigger fires
-- it regardless of EXECUTE privilege, so nothing needs to be able to call it.
revoke all on function public.audit_write() from public;
grant execute on function public.audit_write() to hearth_app;

-- The log is append only. Insert is allowed so the trigger and the confidential
-- read path can write; nothing may change or remove an entry.
revoke update, delete, truncate on public.audit_entries from hearth_app;
alter table public.audit_entries enable row level security;
alter table public.audit_entries no force row level security;
drop policy if exists tenant_isolation on public.audit_entries;
create policy tenant_isolation on public.audit_entries
  using (tenant_id = app_tenant_id()) with check (tenant_id = app_tenant_id());

-- ---------------------------------------------------------------------------
-- 7. Nothing is reachable over the auto-generated REST API
-- ---------------------------------------------------------------------------
-- Supabase exposes the public schema through PostgREST to the anon and
-- authenticated roles. ConnectApp does not use PostgREST at all: every query goes
-- through Drizzle on the hearth_app connection, because field-level permissions
-- belong in our query layer.
--
-- Row-level security already reduces those roles to zero rows, since they cannot
-- set app.tenant_id. This removes the privilege as well, so the guarantee does
-- not rest on a policy evaluating the way we expect. Two independent reasons a
-- request over that API returns nothing is better than one.

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated']
  loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema public from %I', r);
      execute format('revoke all on all sequences in schema public from %I', r);
      execute format('revoke all on all functions in schema public from %I', r);
      execute format('alter default privileges in schema public revoke all on tables from %I', r);
      execute format('alter default privileges in schema public revoke all on sequences from %I', r);
      execute format('alter default privileges in schema public revoke all on functions from %I', r);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- The device list and remote revoke were cut in October 2026, and the two
-- security-definer functions that stood at the auth boundary went with them.
-- A church of this size has one admin and one laptop. Signing out ends the
-- session on the device in front of them, and a password change invalidates
-- the refresh tokens everywhere, which is the answer to a lost laptop.
-- ---------------------------------------------------------------------------

drop function if exists public.my_sessions();
drop function if exists public.revoke_session(uuid);


-- ---------------------------------------------------------------------------
-- R1.16. The church bucket, and who may write into it.
--
-- Objects are laid out as <church-slug>/<purpose>/<id>.<ext>, so one string
-- comparison answers which church an object belongs to. The policies read
-- membership from our own tables through a security-definer helper, because
-- storage.objects cannot see app.tenant_id: it is reached with the user's own
-- Supabase session rather than through our pooled connection.
--
-- The bucket is private. Everything is served through a signed URL with a short
-- life, so a leaked path is not a permanent hole.
--
-- Conditional, because the storage schema belongs to Supabase.
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'storage.objects not present, skipping bucket policies';
    return;
  end if;

  -- The membership check the bucket policies call.
  --
  -- It lives outside public because PostgREST serves every function in the
  -- exposed schema as an RPC endpoint, and the storage policies are evaluated
  -- as the authenticated role, so the role has to be able to execute it. A
  -- schema PostgREST does not expose gives the policies what they need without
  -- publishing a security definer function on the open API.
  create schema if not exists connectapp;
  execute 'grant usage on schema connectapp to authenticated';

  execute $fn$
    create or replace function hearth.user_in_church(p_slug text)
    returns boolean
    language sql
    security definer
    set search_path = public, pg_catalog
    stable
    as $body$
      select exists (
        select 1
        from public.tenant_members m
        join public.tenants t on t.id = m.tenant_id
        where m.user_id = auth.uid() and t.slug = p_slug
      )
    $body$;
  $fn$;

  execute 'revoke all on function hearth.user_in_church(text) from public';
  execute 'grant execute on function hearth.user_in_church(text) to authenticated';

  insert into storage.buckets (id, name, public)
  values ('church', 'church', false)
  on conflict (id) do update set public = false;

  execute 'drop policy if exists church_read on storage.objects';
  execute 'drop policy if exists church_write on storage.objects';
  execute 'drop policy if exists church_update on storage.objects';
  execute 'drop policy if exists church_delete on storage.objects';

  execute $pol$
    create policy church_read on storage.objects for select to authenticated
    using (bucket_id = 'church' and hearth.user_in_church((storage.foldername(name))[1]))
  $pol$;
  execute $pol$
    create policy church_write on storage.objects for insert to authenticated
    with check (bucket_id = 'church' and hearth.user_in_church((storage.foldername(name))[1]))
  $pol$;
  execute $pol$
    create policy church_update on storage.objects for update to authenticated
    using (bucket_id = 'church' and hearth.user_in_church((storage.foldername(name))[1]))
    with check (bucket_id = 'church' and hearth.user_in_church((storage.foldername(name))[1]))
  $pol$;
  execute $pol$
    create policy church_delete on storage.objects for delete to authenticated
    using (bucket_id = 'church' and hearth.user_in_church((storage.foldername(name))[1]))
  $pol$;

  -- R4.1. What somebody with no account may write, and only that.
  --
  -- A form question can ask for a file, and whoever answers it has no session
  -- to upload on. Rather than putting the service role key in a request path,
  -- the anon role is given one narrow door: insert only, only into this
  -- bucket, only under <church>/form_answer/, and only for a church that
  -- exists and has been approved. It can read nothing, change nothing and
  -- delete nothing.
  --
  -- The route in front of it is what checks the form is open, the question
  -- takes files, the type is one it asks for, the size is inside the ceiling
  -- and the church has the room. The policy is the second say, not the first.
  execute $fn$
    create or replace function hearth.church_takes_files(p_slug text)
    returns boolean
    language sql
    security definer
    set search_path = public, pg_catalog
    stable
    as $body$
      select exists (
        select 1 from public.tenants t
         where t.slug = p_slug
           and t.approved_at is not null
           and t.demo_expires_at is null
      )
    $body$
  $fn$;
  execute 'grant usage on schema connectapp to anon';
  execute 'grant execute on function hearth.church_takes_files(text) to anon';

  execute 'drop policy if exists church_public_answer on storage.objects';
  execute $pol$
    create policy church_public_answer on storage.objects for insert to anon
    with check (
      bucket_id = 'church'
      and (storage.foldername(name))[2] = 'form_answer'
      and hearth.church_takes_files((storage.foldername(name))[1])
    )
  $pol$;

  -- Where it used to live, when it was also an RPC endpoint.
  execute 'drop function if exists public.user_in_church(text)';
end $$;
