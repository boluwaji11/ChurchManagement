-- R13.9. Every church has a general fund.
--
-- A gift has to go somewhere, and the first thing a treasurer records is the
-- offering. Written at sign-up from now on; this puts it in for the churches
-- that were created before, leaving alone any that already keeps a list.
insert into funds (tenant_id, name, code, position)
select t.id, 'General', 'GEN', 0
from tenants t
where not exists (select 1 from funds f where f.tenant_id = t.id)
on conflict do nothing;
