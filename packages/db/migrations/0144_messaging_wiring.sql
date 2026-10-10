-- HRT-286, HRT-287, HRT-123, R16.1, R16.2, R16.8, R21.15.
--
-- The wiring a church's own messaging accounts hang off. Nothing here sends
-- anything. There is no queue, no composer and no message table: this is the
-- state of a church's connection to its own providers, the state of the
-- registrations those providers require, and who in the congregation has
-- agreed to be contacted.
--
-- The order matters and it is the reason these tables exist at all. A carrier
-- registration asks the church to describe how people opted in, so consent is
-- recorded before a registration can honestly be submitted, and a registration
-- is approved days later rather than on the press of a button.

-- R16.1, R16.2, R21.15. A church's own account with a provider.
--
-- The credential is an encrypted envelope and is never selected by a read
-- path. It leaves this table only into the worker that uses it.
create table if not exists church_providers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  -- "email" or "sms". One row per channel per vendor.
  channel text not null,
  -- "resend", "twilio", "smtp".
  vendor text not null,
  -- "connected" or "disconnected". A disconnected row is kept, because the
  -- church reconnecting the same account should not look like a new one.
  state text not null default 'disconnected',
  -- What the vendor calls this account: a Twilio subaccount SID, a Resend
  -- team id. Safe to read and safe to show.
  external_account_id text,
  -- R21.15. The sealed credential. Null until the church connects.
  credential text,
  -- Which key sealed it, so a key can be rotated without reading the secret.
  credential_key_id text,
  connected_at timestamptz,
  connected_by uuid,
  last_verified_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists church_provider_unique
  on church_providers (tenant_id, channel, vendor);
create index if not exists church_provider_tenant_idx
  on church_providers (tenant_id);

-- R16.1. A domain a church sends from, and how far its verification has got.
--
-- The records we asked for are kept so the screen can show them again. A
-- volunteer closes the tab halfway through typing them into GoDaddy, and the
-- screen they come back to has to be the same screen.
create table if not exists church_sending_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  provider_id uuid references church_providers(id) on delete cascade,
  domain text not null,
  -- "pending", "verified" or "failed".
  state text not null default 'pending',
  -- What we asked them to publish, as the registrar's form wants it.
  records jsonb not null default '[]'::jsonb,
  checked_at timestamptz,
  verified_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists church_sending_domain_unique
  on church_sending_domains (tenant_id, domain);
create index if not exists church_sending_domain_tenant_idx
  on church_sending_domains (tenant_id);

-- R16.2. The carrier registration a church needs before a single text leaves.
--
-- Two kinds, in order: the brand is the church as an organisation, and the
-- campaign is what it intends to send. A campaign cannot be submitted before
-- its brand is approved, and either can be refused.
create table if not exists church_registrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  provider_id uuid not null references church_providers(id) on delete cascade,
  -- "brand" or "campaign".
  kind text not null,
  -- "draft", "submitted", "in_review", "approved" or "rejected".
  state text not null default 'draft',
  external_id text,
  submitted_at timestamptz,
  decided_at timestamptz,
  -- Why it was refused, as the carrier said it and as we say it.
  rejection_code text,
  rejection_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists church_registration_unique
  on church_registrations (tenant_id, provider_id, kind);
create index if not exists church_registration_tenant_idx
  on church_registrations (tenant_id);

-- R16.8. Who has agreed to be contacted, and what they agreed to.
--
-- A congregation imported from a spreadsheet has no consent record, and that
-- is the honest answer rather than an inconvenient one: the carrier asks how
-- people opted in, and "they were in a CSV" is not an answer. Recorded per
-- channel, because agreeing to a newsletter is not agreeing to a text.
create table if not exists contact_consent (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  -- "email" or "sms".
  channel text not null,
  -- "granted", "withdrawn" or "unknown".
  state text not null default 'unknown',
  -- How it was given: "form", "paper", "verbal", "import", "portal".
  source text,
  -- The church's own note of the evidence, which is what a regulator reads.
  evidence text,
  captured_at timestamptz,
  captured_by uuid,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists contact_consent_unique
  on contact_consent (tenant_id, member_id, channel);
create index if not exists contact_consent_tenant_idx
  on contact_consent (tenant_id);
create index if not exists contact_consent_member_idx
  on contact_consent (tenant_id, member_id);
