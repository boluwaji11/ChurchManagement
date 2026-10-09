-- R16.9, HRT-273. Changing a line, and taking one back.
--
-- Everybody sends the wrong thing eventually, and a product where the only
-- answer is a second message saying "sorry, I meant Tuesday" is a product
-- people apologise to.
--
-- Taken back rather than erased: the row stays, the words go, and the line
-- says it was taken back so the conversation still reads in order. The audit
-- trigger on this table holds what was there, which is the rule for every
-- other record a church keeps.
alter table messages add column if not exists edited_at timestamptz;
alter table messages add column if not exists deleted_at timestamptz;
