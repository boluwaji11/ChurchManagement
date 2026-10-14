-- HRT-142, R16.1. The short-lived token, kept for the fifteen minutes it lasts.
--
-- Resend rotates the refresh token on every use and revokes the grant when one
-- is replayed. The worker was refreshing on every pass, which is a rotation a
-- minute and two passes overlapping away from a church losing its connection
-- for no reason. The access token it gets back is good for a quarter of an
-- hour, so it is kept and reused until it is nearly spent.
alter table church_providers
  add column if not exists access_token text,
  add column if not exists access_expires timestamptz;
