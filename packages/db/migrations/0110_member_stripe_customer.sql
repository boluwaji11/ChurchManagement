-- R13.2. A giver should not type their card in twice.
--
-- Stripe keeps a customer a church, so the id is per member and belongs to the
-- church's own connected account. Nothing about the card itself is here: the
-- id is a handle Stripe answers to, and the card stays with Stripe.
alter table members
  add column if not exists stripe_customer_id text;
