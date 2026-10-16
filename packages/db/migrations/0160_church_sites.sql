-- HRT-377, R22.2. A church's website, as a document with a draft and a live copy.
--
-- What it replaces: church_websites held one row per church with a `published`
-- boolean, one of three layout words and a flat array of sections, and a save
-- wrote straight over what the congregation was reading. There was no draft, no
-- revision to go back to, and no second page.
--
-- The old table stays until the content in it has been brought forward, which
-- the repository does on the first read of a church that has one. Nothing reads
-- it afterwards.
--
-- Both tables carry tenant_id, so sql/security.sql gives them row-level
-- security and an audit trigger in its loop. Nothing here grants anything.

create table if not exists church_sites (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  -- The document being worked on. Always present: opening the editor writes a
  -- starting document rather than leaving a church to face an empty canvas.
  draft jsonb not null,
  -- Bumped on every save of the draft. A save carrying a version other than
  -- this one is refused, which is how two administrators editing at once find
  -- out rather than one of them quietly losing an afternoon.
  draft_version integer not null default 1,
  -- What the public page is rendered from. Null until the church publishes.
  live jsonb,
  published_at timestamptz,
  published_by uuid,
  -- Where the site answers. Null means the church's own subdomain, which
  -- tenants.slug already gives it.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Every publish, kept, so a church that published a mistake has somewhere to
-- go back to. R22.2: a destructive action is reversible or confirmed, and a
-- publish is as public as an action gets.
create table if not exists church_site_revisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  doc jsonb not null,
  published_at timestamptz not null default now(),
  published_by uuid,
  -- What the church was doing, where it said: "added the visit page".
  note text
);

create index if not exists church_site_revision_tenant_idx
  on church_site_revisions (tenant_id, published_at desc);
