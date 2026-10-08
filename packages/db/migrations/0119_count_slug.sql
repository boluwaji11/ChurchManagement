-- R13.10. A counting session has a name in its address.
--
-- The id was a raw uuid, which is what a treasurer saw when they copied the
-- address to send to the other counter. The slug is made from the session's
-- own name and the day it counted, which is how anybody refers to it anyway.
alter table gift_batches
  add column if not exists slug text;

-- What is already there, named the way a new one would be.
update gift_batches b
   set slug = base.slug || case
     when base.rank = 1 then ''
     else '-' || base.rank::text
   end
  from (
    select
      id,
      tenant_id,
      regexp_replace(
        regexp_replace(lower(name || '-' || to_char(received_on, 'YYYY-MM-DD')), '[^a-z0-9]+', '-', 'g'),
        '(^-|-$)', '', 'g'
      ) as slug,
      row_number() over (
        partition by tenant_id,
          regexp_replace(
            regexp_replace(lower(name || '-' || to_char(received_on, 'YYYY-MM-DD')), '[^a-z0-9]+', '-', 'g'),
            '(^-|-$)', '', 'g'
          )
        order by created_at
      ) as rank
    from gift_batches
  ) base
 where base.id = b.id
   and b.slug is null;

create unique index if not exists gift_batch_slug_unique
  on gift_batches (tenant_id, slug);
