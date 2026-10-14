-- HRT-139, HRT-143, R16.4, R16.6, R16.8. What a church sent, and to whom.
--
-- One row a send and one row a person, because "we emailed everybody on
-- Tuesday" is not an answer when somebody says they never got it. The per
-- person row carries what the provider said, so a bounce is attached to the
-- address that bounced rather than to the send as a whole.
create table if not exists email_sends (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  subject text not null,
  body text not null,
  -- "everyone", "list" or "group", and which one.
  audience text not null,
  audience_id uuid,
  audience_name text,
  -- "draft", "sending", "sent" or "failed".
  state text not null default 'draft',
  total integer not null default 0,
  delivered integer not null default 0,
  failed integer not null default 0,
  sent_by uuid,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_send_tenant_idx on email_sends (tenant_id, created_at desc);

create table if not exists email_recipients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  send_id uuid not null references email_sends(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  address text not null,
  -- "sent" or "failed".
  state text not null,
  -- What the provider said when it refused, in its own words.
  said text,
  at timestamptz not null default now()
);

create index if not exists email_recipient_send_idx on email_recipients (tenant_id, send_id);
create index if not exists email_recipient_member_idx on email_recipients (tenant_id, member_id);

-- R16.8. The way out, which every message carries.
--
-- A token rather than a member id in the address, because an unsubscribe link
-- is forwarded, pasted into chat groups and crawled, and a guessable one lets
-- anybody take anybody off the church's list.
alter table contact_consent
  add column if not exists token text;

create unique index if not exists contact_consent_token_unique
  on contact_consent (token) where token is not null;
