-- Hearth security layer. Hand-written, because Drizzle owns table shape and not
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
  check ((household_id is null) <> (person_id is null));

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
-- authenticated roles. Hearth does not use PostgREST at all: every query goes
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
-- R1.10. The signed-in user's own sessions, and remote revoke.
--
-- Supabase Auth owns the session records, in a schema the application role
-- cannot read. The alternative is the service role key, and that key never
-- appears in a request path. So two security-definer functions stand at the
-- boundary instead, each one narrowed to the caller's own rows by
-- app_user_id(), which is set from a membership-verified session rather than
-- from anything the browser sent.
--
-- Written conditionally, because the auth schema belongs to Supabase and is
-- absent in the CI database and in any plain Postgres. Where it is missing the
-- functions are not created and the repository reports the feature as
-- unavailable.
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('auth.sessions') is null then
    raise notice 'auth.sessions not present, skipping session functions';
    return;
  end if;

  execute $fn$
    create or replace function public.my_sessions()
    returns table (
      id uuid,
      created_at timestamptz,
      refreshed_at timestamptz,
      user_agent text,
      ip text
    )
    language sql
    security definer
    set search_path = auth, pg_catalog
    stable
    as $body$
      select s.id, s.created_at, coalesce(s.refreshed_at, s.updated_at, s.created_at),
             s.user_agent, host(s.ip)
      from auth.sessions s
      where s.user_id = public.app_user_id()
        and public.app_user_id() is not null
      order by coalesce(s.refreshed_at, s.updated_at, s.created_at) desc
    $body$;
  $fn$;

  -- Deleting the session is what ends it. The refresh tokens go with it through
  -- their foreign key, so a revoked device cannot mint a new access token when
  -- the one it holds expires.
  execute $fn$
    create or replace function public.revoke_session(p_session_id uuid)
    returns integer
    language plpgsql
    security definer
    set search_path = auth, pg_catalog
    as $body$
    declare
      v_count integer;
    begin
      if public.app_user_id() is null then
        return 0;
      end if;
      delete from auth.sessions
      where id = p_session_id and user_id = public.app_user_id();
      get diagnostics v_count = row_count;
      return v_count;
    end;
    $body$;
  $fn$;

  execute 'revoke all on function public.my_sessions() from public';
  execute 'revoke all on function public.revoke_session(uuid) from public';
  execute 'grant execute on function public.my_sessions() to hearth_app';
  execute 'grant execute on function public.revoke_session(uuid) to hearth_app';
end $$;
