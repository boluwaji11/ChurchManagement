-- R1.10, R17.1. Whether a member may change this field on their own profile.
--
-- A church adds custom fields for two different reasons. Some are the
-- person's own details, which they should keep up to date themselves, and
-- some are the church's notes about them. Off by default, because a field
-- added before this column existed was never meant for the member to edit.
alter table custom_fields
  add column if not exists member_editable boolean not null default false;
