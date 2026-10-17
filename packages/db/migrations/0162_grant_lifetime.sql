-- HRT-387, R16.1. When a church's Resend grant runs out.
--
-- Resend's refresh token lasts sixty days and every refresh resets the sixty.
-- A church that sends nothing for two months therefore loses its grant without
-- anybody doing anything wrong, and the next send fails with no way back
-- except connecting Resend again.
--
-- `updated_at` cannot answer this: it moves when the provider's last error is
-- written down, which would read as a grant that had been refreshed when it
-- had not. So the day it runs out is its own column, written beside the
-- credential every time the pair is exchanged.
--
-- Null means a grant written before this column existed, or a vendor with no
-- expiry at all, which is a church's own mail server.
alter table church_providers
  add column if not exists credential_expires_at timestamptz;

-- The worker asks one question of this table on every pass: which grants are
-- near the end. Narrow, so it stays an index scan as churches are added.
create index if not exists church_provider_expiring
  on church_providers (credential_expires_at)
  where state = 'connected' and credential_expires_at is not null;
