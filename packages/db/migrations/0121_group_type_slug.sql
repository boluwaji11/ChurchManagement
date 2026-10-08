-- R9.1. A kind of group has a name in its address.
--
-- The group list filters by type, and the filter carried a raw uuid, which is
-- what a leader saw when they copied the address to send to somebody else.
alter table group_types
  add column if not exists slug text;

-- What is already there, named the way a new one would be.
update group_types t
   set slug = base.slug || case
     when base.rank = 1 then ''
     else '-' || base.rank::text
   end
  from (
    select
      id,
      tenant_id,
      regexp_replace(
        regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'),
        '(^-|-$)', '', 'g'
      ) as slug,
      row_number() over (
        partition by tenant_id,
          regexp_replace(
            regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'),
            '(^-|-$)', '', 'g'
          )
        order by created_at
      ) as rank
    from group_types
  ) base
 where base.id = t.id
   and t.slug is null;

create unique index if not exists group_type_slug_unique
  on group_types (tenant_id, slug);
