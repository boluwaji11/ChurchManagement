-- HRT-344, R16.6. A claimed copy that never left goes back in the queue.
--
-- The worker claims twenty-five copies in one statement and marks them
-- 'sending', then sends them one at a time. An invocation killed part way
-- through, which at a ten second limit is every batch of any size, left the
-- remainder marked 'sending' with nothing in the product able to tell a stuck
-- row from one in flight. Those rows were then invisible: the due-sends query
-- counts only 'queued', so a send whose remaining copies were all 'sending'
-- reported nothing waiting and was never picked up again, while the progress
-- the church was watching counted them as outstanding and never completed.
--
-- The claim time is what makes a stuck row recoverable: old enough and still
-- 'sending' means the worker that took it is gone.
alter table email_recipients
  add column if not exists claimed_at timestamptz;

-- The claim runs on the owner connection, so row-level security does not apply
-- and no tenant predicate is written. Every other index on this table leads
-- with tenant_id, so none of them could serve it and the claim scanned the
-- table and sorted it, once a batch, for every send. This table grows by one
-- row per recipient per send and is the fastest growing in the schema.
create index if not exists email_recipient_claim_idx
  on email_recipients (send_id, at)
  where state = 'queued';

-- Finding the stuck rows, which is a small set and wants its own small index.
create index if not exists email_recipient_stuck_idx
  on email_recipients (claimed_at)
  where state = 'sending';
