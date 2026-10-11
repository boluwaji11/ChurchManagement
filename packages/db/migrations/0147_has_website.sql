-- R22.1, R22.2. Whether the church says it has a website at all.
--
-- The website column alone cannot answer this. A church that told us it has no
-- site and a church nobody ever asked both hold null, and the two lead
-- different ways: one is offered a page of ours, the other is asked the
-- question. So the answer is kept rather than inferred from an empty field.
--
-- Nullable on purpose. Every church that signed up before the question existed
-- has not answered it, and saying "no" on their behalf would offer a page to
-- churches that already have one.
alter table tenants
  add column if not exists has_website boolean;
