-- R13.16. A campaign has its name in its address.
--
-- The id was a raw uuid, which is what a church saw when it copied the
-- address of its building appeal to put in a newsletter. A campaign's name
-- is already unique within the church, so the slug is simply that.
alter table campaigns
  add column if not exists slug text;

update campaigns c
   set slug = base.slug || case when base.rank = 1 then '' else '-' || base.rank::text end
  from (
    select
      id,
      regexp_replace(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g') as slug,
      row_number() over (
        partition by tenant_id,
          regexp_replace(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')
        order by created_at
      ) as rank
    from campaigns
  ) base
 where base.id = c.id
   and c.slug is null;

create unique index if not exists campaign_slug_unique on campaigns (tenant_id, slug);
