-- R14.2. Publishing is the only thing that opens an event's public page.
--
-- There were two switches and both had to be on, so an event a church had
-- published could still answer 404 with nothing on screen saying why. The
-- column stays, because dropping one is not a thing to do to a live table, and
-- nothing reads it any more.
update events set listed = true where not listed;
