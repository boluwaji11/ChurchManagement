-- R13.3. When the next collection comes out.
--
-- The question both sides ask about a repeating gift, and neither screen
-- could answer it. Stripe keeps it on the subscription item and sends it with
-- every subscription event, so it is written down as it arrives.
alter table recurring_gifts
  add column if not exists next_on date;
