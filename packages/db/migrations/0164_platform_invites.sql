-- HRT-401, R21.x. Asking somebody onto the platform team before they have an
-- account to grant.
--
-- `platform_admins` points at `app_users`, and a row only appears there once
-- somebody has signed up and proved their address. So the portal could hand the
-- platform to a colleague who already used ConnectApp and to nobody else, and
-- the way in for everyone else was to walk through a church's own front door
-- first. This table holds the gap: an address asked, a token mailed, and the
-- grant made when they arrive carrying it.
--
-- The name begins with platform_, which is what keeps the audit trigger off it:
-- these tables sit outside the tenancy and keep their record in platform_events
-- (HRT-400).

create table if not exists platform_invites (
  id uuid primary key default gen_random_uuid(),
  -- The address asked, lowercased on the way in. It is matched against the
  -- address Supabase proved, so it is the whole of the identity check.
  email text not null,
  -- What to call them on the team list once they arrive.
  name text not null,

  -- The token is never stored. Only this, so the table being read does not
  -- hand anybody a way in, the same reasoning as a password.
  token_hash text not null unique,

  invited_by uuid references app_users (id) on delete set null,
  -- Kept as text as well, because the log reads as people and an account can
  -- go away.
  invited_by_name text not null,

  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  -- When they arrived and the grant was made. Set once.
  accepted_at timestamptz,
  -- When somebody on the team changed their mind before it was used.
  revoked_at timestamptz
);

-- One live invitation an address. A second ask replaces the first rather than
-- leaving two tokens that both work.
create unique index if not exists platform_invites_live_idx
  on platform_invites (lower(email))
  where accepted_at is null and revoked_at is null;

create index if not exists platform_invites_at_idx
  on platform_invites (created_at desc);

-- Read and written only through the owner connection, behind the same team
-- check as the rest of the portal. No role an application session can hold
-- reaches it.
alter table platform_invites enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'hearth_app') then
    revoke all on platform_invites from hearth_app;
  end if;
end $$;
