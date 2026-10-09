-- R16.9, HRT-274. Answering one line in particular.
--
-- A group thread of thirty lines is read out of order, and "yes, that one" is
-- not an answer anybody can follow. A message may name the one it answers,
-- which is carried into the line itself rather than pasted into the words.
--
-- Set null rather than cascade: a line taken back leaves the answers to it
-- standing, because the answers are still somebody's.
alter table messages add column if not exists reply_to_id uuid
  references messages(id) on delete set null;

create index if not exists messages_reply_idx on messages (reply_to_id);
