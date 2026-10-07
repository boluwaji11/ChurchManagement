-- R13.6, R13.17. Who gave, where the giver has no record yet.
--
-- A stranger gives from the church's own website before anybody has written
-- them into the directory. The name and the address they typed are kept on the
-- gift so a statement can be written in January and so the church can match
-- them to a person later.
alter table gifts
  add column if not exists giver_name text,
  add column if not exists giver_email text;
