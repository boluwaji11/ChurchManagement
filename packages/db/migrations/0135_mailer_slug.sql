-- R16.12, R24.6, HRT-268. A readable address for a mailer.
--
-- A mailer was reached by its id, which put a raw identifier in the address
-- bar of a screen somebody works in for an hour. Every other thing a church
-- makes is reached by its name.
alter table mailers add column if not exists slug text;

update mailers
   set slug = coalesce(hearth_slug(name), 'mailer') || '-' || left(id::text, 4)
 where slug is null;

alter table mailers alter column slug set not null;

create unique index if not exists mailers_slug_unique on mailers (tenant_id, slug);

-- The words, and a number only where the words are already taken. `keeping` is
-- the row being renamed, which otherwise collides with itself.
create or replace function hearth_free_mailer_slug(tenant uuid, words text, keeping uuid default null)
  returns text language plpgsql as $$
declare
  base text := coalesce(hearth_slug(words), 'mailer');
  candidate text := base;
  n int := 1;
begin
  while exists (
    select 1 from mailers m
     where m.tenant_id = tenant and m.slug = candidate
       and (keeping is null or m.id <> keeping)
  ) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end $$;
