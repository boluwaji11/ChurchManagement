-- R16.10, R17.11. Where a push goes.
--
-- One row a browser rather than a person: somebody with a phone and a laptop
-- has two, and a church that reaches one and not the other has reached nobody
-- on the walk to the car.
--
-- The endpoint is a URL at the browser's own push service and the two keys are
-- what the payload is encrypted to. A subscription the browser has dropped
-- answers 404 or 410 on the next send, which is when the row goes.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  user_id uuid not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists push_tenant_idx on push_subscriptions (tenant_id);
create index if not exists push_user_idx on push_subscriptions (tenant_id, user_id);
create unique index if not exists push_endpoint_unique on push_subscriptions (endpoint);
