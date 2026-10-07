-- R13.3. Which repeating gift collected this one.
--
-- The mark on a gift says Stripe collected it rather than the giver choosing
-- to give that week, and it comes off when the repeating gift is stopped. So
-- the gift has to know which subscription raised it.
alter table gifts
  add column if not exists stripe_subscription_id text;

create index if not exists gift_subscription_idx
  on gifts (tenant_id, stripe_subscription_id);
