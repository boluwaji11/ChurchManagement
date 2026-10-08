-- R1.10, R2.1. School year stops being a column the product ships.
--
-- It is a question some churches ask and most do not, and a church that asks
-- it wants its own bands anyway: a school in England has Year 7 where one in
-- Missouri has 6th grade. It is in the custom field library instead, where a
-- church takes it up if it wants it and names the bands itself.
alter table members drop column if exists school_level;
