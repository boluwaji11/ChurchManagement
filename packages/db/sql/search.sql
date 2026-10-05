-- R2.14. The indexes behind the one search box.
--
-- Hand-written rather than generated, because Drizzle does not model a trigram
-- index and the whole point of these is the operator class.
--
-- A volunteer types what they remember into one box: part of a surname, the
-- back half of a phone number, a street. All of that is a substring match, and
-- a substring match with a leading wildcard cannot use an ordinary btree index.
-- pg_trgm can, so these exist and the search stays under 300ms at five thousand
-- people instead of reading every row.
--
-- Idempotent, and applied after the table migrations on every run.

-- In `extensions`, where Supabase keeps pgcrypto and uuid-ossp, rather than in
-- public. An extension in public puts forty of its own functions next to ours,
-- which the hardening pass then tries to revoke and cannot.
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
grant usage on schema extensions to public;

-- Names, including the preferred name somebody actually goes by.
create index if not exists members_first_name_trgm
  on members using gin (lower(first_name) extensions.gin_trgm_ops);
create index if not exists members_last_name_trgm
  on members using gin (lower(last_name) extensions.gin_trgm_ops);
create index if not exists members_preferred_name_trgm
  on members using gin (lower(coalesce(preferred_name, '')) extensions.gin_trgm_ops);
-- "sarah bennett" typed in full, which is what people do.
create index if not exists members_full_name_trgm
  on members using gin (lower(first_name || ' ' || last_name) extensions.gin_trgm_ops);

-- Email addresses, and phone numbers with their punctuation taken out, because
-- a church holds "(512) 555-0148" and somebody types 5550148.
create index if not exists contact_value_trgm
  on contact_methods using gin (lower(value) extensions.gin_trgm_ops);
create index if not exists contact_digits_trgm
  on contact_methods using gin (regexp_replace(value, '[^0-9]', '', 'g') extensions.gin_trgm_ops);

-- Addresses. A church looks somebody up by street more often than software
-- expects, usually while holding a returned letter.
create index if not exists address_line1_trgm
  on addresses using gin (lower(line1) extensions.gin_trgm_ops);
create index if not exists address_city_trgm
  on addresses using gin (lower(coalesce(city, '')) extensions.gin_trgm_ops);
create index if not exists address_postal_trgm
  on addresses using gin (lower(coalesce(postal_code, '')) extensions.gin_trgm_ops);

-- The joins the search makes, which are by person and by household.
create index if not exists address_member_idx on addresses (tenant_id, member_id);
create index if not exists address_household_idx on addresses (tenant_id, household_id);
