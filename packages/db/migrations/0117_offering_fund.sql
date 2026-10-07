-- R13.9. The second fund every church already runs.
--
-- A church keeps its general fund and its offering apart, and the first one
-- was there from signup while the second had to be invented. It is added to
-- every church that has not already written one.
insert into funds (tenant_id, name, code, position)
select t.id, 'Offering & Tithe', 'OFF', 1
  from tenants t
 where not exists (
   select 1 from funds f where f.tenant_id = t.id and lower(f.name) = 'offering & tithe'
 );
