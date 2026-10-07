-- R11.2. A church writes the list itself.
--
-- The first cut of this filled the table with our eight the moment a screen
-- read it, which put a list in front of a church that it had never chosen. The
-- eight are offered to a plan while the table is empty, so clearing what was
-- seeded leaves every plan reading exactly as it did.
delete from plan_item_kinds where name is null;
