-- R13.10. A counting session is what was counted.
--
-- It asked for a declared total first and then checked the entered lines
-- against it. That is the control an auditor asks about, and it is a second
-- number for a volunteer to produce before they are allowed to write down
-- the first. A session now holds the fund and the amount, and the total is
-- the sum of its lines.
alter table gift_batches
  drop column if exists expected_cents,
  drop column if exists variance_note;
