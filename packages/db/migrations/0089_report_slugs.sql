-- R24.6. A readable address for a report a church built.
--
-- A saved report was reached by its id, which put a raw identifier in the
-- address bar of the one screen a church is most likely to send to somebody
-- else.
alter table saved_reports add column if not exists slug text;

update saved_reports
   set slug = coalesce(hearth_slug(name), 'report') || '-' || left(id::text, 4)
 where slug is null;

alter table saved_reports alter column slug set not null;

create unique index if not exists saved_reports_slug_unique
  on saved_reports (tenant_id, slug);

-- The same rule the other free addresses use: the words, and a number only
-- where the words are already taken.
-- `keeping` is the row being renamed, which otherwise collides with itself and
-- walks away with a -2 on the end every time somebody saves without changing
-- the name.
create or replace function hearth_free_report_slug(tenant uuid, words text, keeping uuid default null)
  returns text language plpgsql as $$
declare
  base text := coalesce(hearth_slug(words), 'report');
  candidate text := base;
  n int := 1;
begin
  while exists (
    select 1 from saved_reports r
     where r.tenant_id = tenant and r.slug = candidate
       and (keeping is null or r.id <> keeping)
  ) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end $$;
