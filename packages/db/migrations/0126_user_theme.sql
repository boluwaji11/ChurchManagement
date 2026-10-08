-- R24.x, R17.2. Which palette this person reads in.
--
-- The choice was a cookie, so it belonged to a browser rather than to the
-- person who made it: somebody who chose dark on the church laptop was back
-- in light on their phone. Null means they have not chosen, and each surface
-- keeps its own default for that.
alter table app_users
  add column if not exists theme text;

alter table app_users
  drop constraint if exists app_users_theme_check;

alter table app_users
  add constraint app_users_theme_check
  check (theme is null or theme in ('system', 'light', 'dark'));
