-- R1.1. The address somebody writes to.
--
-- The church's public pages carry a line saying who to contact, and a phone
-- number on its own is no use to anybody reading at eleven at night.
alter table tenants add column if not exists email text;
