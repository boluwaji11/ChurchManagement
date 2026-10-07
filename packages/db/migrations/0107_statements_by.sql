-- R13.18. One statement a household, or one a person.
--
-- A church's choice, because both are right: a couple who give on one card
-- want one statement, and a church whose givers file separately wants two.
alter table tenants
  add column if not exists statements_by text not null default 'person';
