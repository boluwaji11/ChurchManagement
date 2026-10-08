-- R16.12, HRT-268. The typeface a letter is set in.
--
-- Stored on the mailer rather than in the words: what is kept is markdown,
-- which carries no font, so a typeface chosen inside the text would be lost
-- between the editor and the envelope.
alter table mailers add column if not exists font text not null default 'inter';
