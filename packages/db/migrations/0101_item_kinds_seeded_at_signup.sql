-- R11.2. Every church starts with the eight.
--
-- Written at sign-up from now on. This puts them in for the churches that were
-- created before, leaving alone any that has already written its own list.
insert into plan_item_kinds (tenant_id, slug, position)
select t.id, k.slug, k.ordinality - 1
from tenants t
cross join unnest(array[
  'song', 'scripture', 'sermon', 'prayer', 'offering',
  'announcement', 'media', 'custom'
]) with ordinality as k(slug, ordinality)
where not exists (select 1 from plan_item_kinds p where p.tenant_id = t.id)
on conflict do nothing;
