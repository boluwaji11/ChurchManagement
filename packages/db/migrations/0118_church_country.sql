-- R22.8. Every church says which country it is in.
--
-- The country decides how a church reads a date, how the product spells a
-- word to it and what its address form asks for. It was only ever asked for
-- in settings, so a church that never opened that screen had none, and every
-- date fell back to whatever the reader's browser was set to: a Missouri
-- church on a British laptop read 07/10/2026 for the seventh of October.
--
-- Anything still blank is filled from the timezone the church did give, which
-- is the one thing signup has always asked.
update tenants
   set country = case
     when timezone like 'America/%' and timezone in (
       'America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix',
       'America/Los_Angeles', 'America/Anchorage', 'America/Adak', 'America/Detroit',
       'America/Indiana/Indianapolis', 'America/Kentucky/Louisville', 'America/Boise',
       'America/Juneau', 'America/Sitka', 'America/Nome', 'America/Menominee',
       'America/North_Dakota/Center', 'Pacific/Honolulu'
     ) then 'US'
     when timezone like 'Europe/London' then 'GB'
     when timezone like 'Europe/Dublin' then 'IE'
     when timezone like 'Australia/%' then 'AU'
     when timezone like 'Pacific/Auckland' then 'NZ'
     when timezone like 'Africa/Lagos' then 'NG'
     when timezone like 'Africa/Johannesburg' then 'ZA'
     when timezone like 'America/Toronto' or timezone like 'America/Vancouver'
       or timezone like 'America/Edmonton' or timezone like 'America/Winnipeg'
       then 'CA'
     else 'US'
   end
 where country is null or btrim(country) = '';

alter table tenants alter column country set default 'US';
