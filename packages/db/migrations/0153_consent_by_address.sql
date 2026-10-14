-- HRT-139, HRT-143, R16.8. Somebody a church writes to who is not on its list.
--
-- A church emails the roofer, the county office, a visiting speaker. None of
-- them is a member and all of them may ask to be left alone, so consent is
-- recorded against the address when there is no person behind it.
--
-- Without this the way out could not be offered to them at all, and a message
-- with no way out is the one thing this product will not send.
alter table contact_consent
  alter column member_id drop not null,
  add column if not exists address text;

create unique index if not exists contact_consent_address_unique
  on contact_consent (tenant_id, address, channel) where address is not null;
