-- R11.8. A shape comes off the list without being destroyed.
--
-- A template a church has stopped using is still the record of how it ran its
-- services for a season, so it is archived the way everything else in the
-- product is, and the plans built from it are untouched either way.
alter table plan_templates
  add column if not exists archived_at timestamptz;
