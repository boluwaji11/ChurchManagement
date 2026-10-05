-- R14.1. Whether this event takes registrations at all.
--
-- A carol service and a working bee are announcements: there is a page, and
-- nobody signs up. That is a different thing from an event whose registration
-- is closed, which "registration_open" alone could not say. An event that takes
-- none hides every place, limit and question, and its public page is the page.
--
-- Everything that exists today takes them, which is what the default says.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "takes_registrations" boolean NOT NULL DEFAULT true;
