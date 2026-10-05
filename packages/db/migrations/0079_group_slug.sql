-- R9.2. A readable address for a group.
--
-- A church sending somebody a link to its Tuesday group should be sending
-- /groups/tuesday-night, not a uuid. The id stays the key and old links keep
-- working: the route reads either.
alter table groups add column if not exists slug text;

-- Backfill from the name, in the same shape the application generates: lower
-- case, apostrophes dropped, everything else that is not a letter or a digit
-- collapsed to a single hyphen, trimmed, cut to sixty characters.
update groups
   set slug = nullif(
         left(
           trim(both '-' from regexp_replace(
             lower(replace(replace(name, '''', ''), '’', '')),
             '[^a-z0-9]+', '-', 'g')),
           60),
         '')
 where slug is null;

update groups set slug = 'group' where slug is null or slug = '';

-- Two groups in one church can share a name, so a clash takes a number, which
-- is what the application does when it writes the next one.
with numbered as (
  select id,
         slug,
         row_number() over (partition by tenant_id, slug order by created_at, id) as n
    from groups
)
update groups g
   set slug = numbered.slug || '-' || numbered.n
  from numbered
 where g.id = numbered.id
   and numbered.n > 1;

alter table groups alter column slug set not null;

create unique index if not exists group_slug_unique on groups (tenant_id, slug);
