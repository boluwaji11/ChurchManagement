-- R13.3. Whether a gift was collected by a repeating gift.
--
-- A church reading its list wants to tell the gift somebody chose to make
-- this week from the one Stripe collected on its own, because the second one
-- is money it can plan on. Stripe knows, through the invoice that raised the
-- payment, so it is written down when the gift is recorded.
alter table gifts
  add column if not exists recurring boolean not null default false;
