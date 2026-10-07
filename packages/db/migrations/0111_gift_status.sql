-- R13.2. A bank debit that has been authorised but has not arrived.
--
-- A card either works or it does not, within a second. A bank debit is an
-- instruction: Stripe takes it, the money moves over the following days, and
-- it can still be returned. The church needs to see it the moment the giver
-- authorises it, and a treasurer cannot be shown it as received until it is.
--
-- So a gift carries what has happened to it. Everything written before this
-- had already settled.
alter table gifts
  add column if not exists status text not null default 'settled';

create index if not exists gift_status_idx on gifts (tenant_id, status);

-- R13.2. Why it did not arrive, in Stripe's own words.
--
-- A bank says no for a reason a treasurer can act on: no funds in the account,
-- the account is closed, the giver told their bank to stop it. The words come
-- from the bank through Stripe, so they are kept as given rather than
-- translated into something vaguer.
alter table gifts
  add column if not exists failure_reason text;
