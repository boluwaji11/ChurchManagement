-- R13.15. A refund to a bank account takes days, the same as the gift did.
--
-- Stripe answers "pending" when it takes the instruction and tells us later
-- whether the money moved. The church was being shown "Refunded" the moment
-- it pressed the button, which is a day or three early and sometimes wrong.
alter table gifts
  add column if not exists refund_status text,
  add column if not exists stripe_refund_id text;

-- Everything refunded before this was a card, which answers at once.
update gifts set refund_status = 'settled' where refunded_cents > 0;
