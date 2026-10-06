-- R1.6. A church starts with one role, and adds the rest when it needs them.
--
-- Nine roles against twenty permissions is a grid nobody reads, and eight of
-- the nine are empty in a church of forty people. The built-ins stay in the
-- product as ready-made answers: a church picks the ones it uses, and the rest
-- sit on the shelf until it does.
--
-- Only the ones nobody holds and nobody has edited are put away here, so a
-- church already running on Staff and Pastoral keeps them exactly as they are.
update tenant_roles r
   set archived_at = now()
 where r.builtin
   and r.key <> 'owner'
   and r.archived_at is null
   and not r.customised
   and not exists (
     select 1 from tenant_members m
      where m.tenant_id = r.tenant_id
        and (m.role_id = r.id or (m.role_id is null and m.role::text = r.key))
   );
