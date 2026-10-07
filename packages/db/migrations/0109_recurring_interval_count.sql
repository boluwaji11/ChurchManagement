-- R13.3. Every two weeks is a schedule churches actually use.
--
-- Stripe says it as an interval and a count, so this keeps the count beside
-- the interval rather than inventing a word for the pair.
alter table recurring_gifts
  add column if not exists interval_count integer not null default 1;
