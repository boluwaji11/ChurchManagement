-- R4.1. A question that takes files.
--
-- How many, and what kind. A church asking for a dedication photo wants one
-- image; a church asking for a signed consent wants one PDF; a church asking
-- for pictures of three children wants five of anything. The question says so
-- rather than the platform guessing.
alter table form_fields add column if not exists max_files integer not null default 1;
alter table form_fields add column if not exists file_kinds text not null default 'any';
