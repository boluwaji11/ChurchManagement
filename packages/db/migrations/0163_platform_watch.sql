-- HRT-394, HRT-396, R21.x. What the platform's own services last said, and who
-- has tried the operator portal's door.
--
-- Both sit outside the tenancy beside platform_admins and platform_events: no
-- tenant_id, no policy keyed on one, and nothing a church's session holds can
-- reach them. Both are append only for the same reason the event log is.

-- HRT-394. One row a probe.
--
-- A status screen that only knows about right now cannot answer the question
-- an operator actually has, which is whether a thing has been failing since
-- the morning or failed once a minute ago. Keeping the answers is what turns
-- the screen from a light into a record.
create table if not exists platform_checks (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  -- 'database', 'supabase', 'stripe', 'resend', 'redis', 'queue', 'web'.
  service text not null,
  -- 'pass', 'warn', 'fail' or 'off', where off is a service this environment
  -- has no credential for, which is a fact rather than a fault.
  state text not null,
  -- How long the probe took. Null where there was nothing to time.
  took_ms integer,
  -- What it said, in the provider's own words, when it did not pass.
  said text,
  -- Which environment answered, so development's failures never read as
  -- production's on a screen that shows both.
  environment text not null default 'production'
);

create index if not exists platform_checks_service_idx
  on platform_checks (service, at desc);
create index if not exists platform_checks_at_idx on platform_checks (at desc);

comment on table platform_checks is
  'HRT-394. One row a probe of one service, kept so a status screen can say how long something has been wrong.';

-- HRT-396, R21.1. Every attempt at the operator portal's door.
--
-- The portal reaches every church on the platform, so who has tried to open it
-- is worth as much as who got in. It is also what the throttle counts: five
-- refusals from one address inside fifteen minutes and that address waits.
--
-- An account that signs in correctly and is not an operator is its own outcome
-- rather than a success or a failure, because it is the one that means
-- somebody with a real church account went looking for this door.
create table if not exists platform_sign_ins (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  email text not null,
  -- 'in', 'wrong', 'refused' (authenticated, not an operator), 'throttled'.
  outcome text not null,
  -- Where it came from, so a burst reads as a burst.
  ip text,
  agent text
);

create index if not exists platform_sign_ins_email_idx
  on platform_sign_ins (lower(email), at desc);
create index if not exists platform_sign_ins_at_idx on platform_sign_ins (at desc);

comment on table platform_sign_ins is
  'HRT-396. Every attempt at the operator portal, including the ones that were refused.';

alter table platform_checks enable row level security;
alter table platform_sign_ins enable row level security;

-- Read and written only through the owner connection, behind the same admin
-- check every other platform read runs behind.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'hearth_app') then
    revoke all on platform_checks from hearth_app;
    revoke all on platform_sign_ins from hearth_app;
  end if;
end $$;
