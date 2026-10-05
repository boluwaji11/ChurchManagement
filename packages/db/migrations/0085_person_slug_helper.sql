-- R24.6. A free readable address for a person, written in SQL.
--
-- Three paths create a person from raw statements rather than through the
-- query builder: a form submission matching nobody, somebody accepting an
-- invitation, and somebody joining a church from the open web. All three need
-- a slug, and all three should pick it the same way the rest of the product
-- does, so the rule lives here once.
create or replace function hearth_free_person_slug(tenant uuid, words text)
  returns text language plpgsql as $$
declare
  base text := coalesce(hearth_slug(words), 'person');
  candidate text := base;
  n int := 1;
begin
  while exists (
    select 1 from people p where p.tenant_id = tenant and p.slug = candidate
  ) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end $$;
