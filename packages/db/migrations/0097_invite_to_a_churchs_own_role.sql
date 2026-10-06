-- R1.6, R1.7. An invitation can carry a role the church wrote itself.
--
-- The enum column stays, because it is what the audit log records and what any
-- path that has not been handed the permission set falls back to. A custom role
-- rides beside it exactly as it does on tenant_members: the enum reads "member"
-- and this names the real one, so anything reading the enum alone fails closed.
alter table invitations
  add column if not exists role_id uuid references tenant_roles(id) on delete set null;
