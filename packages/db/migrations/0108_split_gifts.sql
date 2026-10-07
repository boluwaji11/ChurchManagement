-- R13.4. A gift split across funds.
--
-- A split is written as one gift a fund rather than as a gift with parts: a
-- treasurer's question is always "how much went to the building", and every
-- total, statement, campaign and export already answers it one row at a time.
-- What changes is only that one payment may now write more than one row, so
-- the index that keeps a redelivered webhook from writing twice takes the fund
-- as well.
drop index if exists gift_intent_unique;
create unique index if not exists gift_intent_fund_unique
  on gifts (tenant_id, stripe_payment_intent_id, fund_id);
