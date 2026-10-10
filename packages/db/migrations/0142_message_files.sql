-- R16.9, R16.14, HRT-280. What is sent with a message.
--
-- A church sends the rota as a photograph of a whiteboard and the consent
-- form as a PDF. A conversation that carries neither sends people back to
-- email, which is the one place the church cannot see what was said.
create table if not exists message_files (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  message_id uuid not null references messages(id) on delete cascade,
  file_id uuid not null references stored_files(id) on delete cascade,
  label text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists message_file_tenant_idx on message_files (tenant_id);
create index if not exists message_file_message_idx on message_files (message_id, position);
create unique index if not exists message_file_once on message_files (message_id, file_id);
