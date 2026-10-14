-- HRT-141, R16.6. Where the way out points, kept with the send.
--
-- The worker has no request to read a host from, and the unsubscribe link in a
-- message has to be absolute. The request that queued the send does know, so
-- it writes it down once rather than the worker guessing at it.
alter table email_sends
  add column if not exists origin text;
