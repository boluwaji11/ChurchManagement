-- HRT-386, R13.1, R13.5. The rate Stripe actually charges this church.
--
-- Stripe bills a registered 501(c)(3) 2.2% and 30c instead of 2.9% and 30c,
-- but only once the church has asked for it by email and Stripe has granted
-- it, and it is never backdated. Until then every church pays the full rate.
--
-- The product worked the "cover the processing fee" figure out at 2.2% for
-- everybody, so a giver covering the fee at a church that had not been granted
-- the rate covered seven tenths of a percent less than Stripe took, and the
-- church absorbed the rest out of the gift.
--
-- Nothing in the Stripe API reports which rate an account is on, so the church
-- tells us: this is the day it said Stripe had granted it. Null means the full
-- rate, which is where every account starts.
alter table stripe_accounts
  add column if not exists nonprofit_rate_at timestamptz;
