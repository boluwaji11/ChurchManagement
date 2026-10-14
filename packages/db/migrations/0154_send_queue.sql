-- HRT-141, R16.6. A send that survives the browser closing, and one that waits.
--
-- Until now a send ran inside the request: the church watched a spinner, and
-- closing the tab halfway through left four hundred people written to once and
-- the rest never. Every copy is written down first, as a row waiting its turn,
-- and a worker takes them in batches. What the church sees is progress against
-- rows that already exist rather than a number that only the request knows.

alter table email_recipients
  alter column state set default 'queued';

alter table email_sends
  -- When this should go. Null means now, which is what every send has been.
  add column if not exists send_at timestamptz,
  -- Which batch the worker is on, so two workers cannot take the same one.
  add column if not exists claimed_at timestamptz;

-- The worker's own question: which sends have copies still waiting, oldest
-- first. Partial, because a church's finished sends are the great majority and
-- none of them are ever an answer to it.
create index if not exists email_send_due_idx
  on email_sends (send_at)
  where state in ('queued', 'sending');

create index if not exists email_recipient_waiting_idx
  on email_recipients (send_id)
  where state = 'queued';
