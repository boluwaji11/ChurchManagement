-- R16.12, HRT-268. How big the letter is set.
--
-- In points, which is the unit a church reads off its own Word menu and the
-- unit a printer works in. Eleven is what an office letter has been typed at
-- since the typewriter gave way to the laser printer.
alter table mailers add column if not exists font_size integer not null default 11;
