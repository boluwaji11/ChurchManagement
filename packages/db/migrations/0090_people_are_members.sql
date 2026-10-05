-- R2.x. The church's own word, all the way down.
--
-- "People" is what a database calls them. Every screen and every address says
-- members, and the schema saying something else is a seam that shows up in
-- every query somebody reads afterwards.
--
-- A rename rather than a copy: Postgres keeps the constraints, the indexes and
-- the foreign keys pointing at the same objects, so nothing is rebuilt and
-- nothing is locked beyond the catalogue update.
--
-- Written so it can be run twice. A rename that has already happened is not an
-- error worth stopping a deploy for, and a migration that cannot be re-run is
-- a migration that strands a database halfway the first time anything in it
-- fails.
do $$
declare
  t text;
begin
  if to_regclass('public.people') is not null then
    alter table people rename to members;
  end if;

  if to_regclass('public.person_tags') is not null then
    alter table person_tags rename to member_tags;
  end if;

  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid
     where n.nspname = 'public'
       and c.relkind = 'r'
       and a.attname = 'person_id'
       and a.attnum > 0
       and not a.attisdropped
  loop
    execute format('alter table public.%I rename column person_id to member_id', t);
  end loop;

  -- The other end of a relationship, which names a member just the same.
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'relationships'
       and column_name = 'related_person_id'
  ) then
    alter table relationships rename column related_person_id to related_member_id;
  end if;
end $$;

-- R24.6. The same helper, saying members. Three paths create a member from raw
-- statements and all three need an address picked the way the rest of the
-- product picks one.
create or replace function hearth_free_member_slug(tenant uuid, words text)
  returns text language plpgsql as $$
declare
  base text := coalesce(hearth_slug(words), 'member');
  candidate text := base;
  n int := 1;
begin
  while exists (
    select 1 from members m where m.tenant_id = tenant and m.slug = candidate
  ) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end $$;

drop function if exists hearth_free_person_slug(uuid, text);
