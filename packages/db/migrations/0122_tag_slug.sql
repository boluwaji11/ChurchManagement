-- R1.13. A tag has a name in its address.
--
-- The directory filters by tag, and the filter carried a raw uuid, which is
-- what somebody saw when they copied the address to send to a colleague.
alter table tags
  add column if not exists slug text;

-- What is already there, named the way a new one would be.
update tags t
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
    from tags
  ) base
 where base.id = t.id
   and t.slug is null;

create unique index if not exists tags_slug_unique
  on tags (tenant_id, slug);
