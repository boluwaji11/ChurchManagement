-- R1.14. A saved list has a name in its address.
--
-- The directory opens a list by it, and the address carried a raw uuid, which
-- is what somebody saw when they copied it to send to a colleague.
alter table saved_lists
  add column if not exists slug text;

-- What is already there, named the way a new one would be.
update saved_lists l
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
    from saved_lists
  ) base
 where base.id = l.id
   and l.slug is null;

-- A list named only in punctuation still needs an address of its own.
update saved_lists
   set slug = 'list-' || left(id::text, 8)
 where slug is null or slug = '';

create unique index if not exists saved_lists_slug_unique
  on saved_lists (tenant_id, slug);
