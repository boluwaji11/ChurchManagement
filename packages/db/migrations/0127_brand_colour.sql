-- R1.1, R24.4. The colour a church actually uses, rather than the nearest of eight.
--
-- The eight are kept: a church that has never opened the setting still wears
-- the hue it was given, and this column stays null until somebody picks. What
-- is stored is the colour as the church wrote it, because that is the thing
-- they recognise. What the product draws is a ramp rebuilt from its hue at the
-- spectrum's own lightness, so a pale brand cannot put unreadable words on a
-- giving page.
alter table tenants add column if not exists brand_color text;

alter table tenants drop constraint if exists tenants_brand_color_hex;
alter table tenants add constraint tenants_brand_color_hex
  check (brand_color is null or brand_color ~ '^#[0-9a-fA-F]{6}$');
