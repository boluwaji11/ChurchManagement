-- HRT-142, R16.7. A copy gets another go, and a dead address stops being used.
--
-- Two failures look the same on the way out and are not the same thing. A
-- provider saying "slow down" is temporary and the copy should go again in a
-- minute. A provider saying "there is nobody at that address" is permanent,
-- and a church that keeps writing to it for two years is a church whose other
-- mail starts landing in spam folders.

alter table email_recipients
  -- How many times this copy has been attempted, so a backoff can grow.
  add column if not exists attempts integer not null default 0,
  -- Not before this. Null means now.
  add column if not exists next_try timestamptz,
  -- What the provider called it, which is how its later verdict is matched.
  add column if not exists provider_ref text;

-- The worker reads this on every pass: what is waiting, and ready.
create index if not exists email_recipient_ready_idx
  on email_recipients (send_id, next_try)
  where state = 'queued';

-- Matching a provider's verdict back to the copy it belongs to.
create index if not exists email_recipient_ref_idx
  on email_recipients (provider_ref)
  where provider_ref is not null;

alter table contact_methods
  -- R16.7. When the provider said this address does not exist.
  add column if not exists bounced_at timestamptz,
  add column if not exists bounce_reason text;
