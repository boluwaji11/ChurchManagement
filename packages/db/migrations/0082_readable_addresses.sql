-- R24.6. Readable addresses for people, teams and services.
--
-- The same treatment events, groups and forms already have. The id stays the
-- key and every screen reads either, so a link written before this and a
-- bookmark somebody kept both keep working.

-- The shape the application generates: lower case, apostrophes dropped,
-- everything else that is not a letter or a digit collapsed to one hyphen,
-- trimmed, cut to sixty characters. Written once here so the three backfills
-- below cannot drift from each other.
create or replace function hearth_slug(source text) returns text
  language sql immutable as $$
  select nullif(
    left(
      trim(both '-' from regexp_replace(
        lower(replace(replace(coalesce(source, ''), '''', ''), '’', '')),
        '[^a-z0-9]+', '-', 'g')),
      60),
    '')
$$;

alter table people add column if not exists slug text;
alter table teams add column if not exists slug text;
alter table service_occurrences add column if not exists slug text;

update people
   set slug = coalesce(
         hearth_slug(concat_ws(' ', coalesce(preferred_name, first_name), last_name)),
         'person')
 where slug is null;

update teams set slug = coalesce(hearth_slug(name), 'team') where slug is null;

update service_occurrences
   set slug = to_char(occurs_on, 'YYYY-MM-DD')
              || coalesce('-' || hearth_slug(name), '')
 where slug is null;

-- Two of anything can collapse to the same words, so a clash takes a number,
-- which is what the application does when it writes the next one.
with numbered as (
  select id, slug, row_number() over (partition by tenant_id, slug order by created_at, id) as n
    from people
)
update people p set slug = numbered.slug || '-' || numbered.n
  from numbered where p.id = numbered.id and numbered.n > 1;

with numbered as (
  select id, slug, row_number() over (partition by tenant_id, slug order by created_at, id) as n
    from teams
)
update teams x set slug = numbered.slug || '-' || numbered.n
  from numbered where x.id = numbered.id and numbered.n > 1;

with numbered as (
  select id, slug, row_number() over (partition by tenant_id, slug order by created_at, id) as n
    from service_occurrences
)
update service_occurrences x set slug = numbered.slug || '-' || numbered.n
  from numbered where x.id = numbered.id and numbered.n > 1;

alter table people alter column slug set not null;
alter table teams alter column slug set not null;
alter table service_occurrences alter column slug set not null;

create unique index if not exists person_slug_unique on people (tenant_id, slug);
create unique index if not exists team_slug_unique on teams (tenant_id, slug);
create unique index if not exists occurrence_slug_unique on service_occurrences (tenant_id, slug);
