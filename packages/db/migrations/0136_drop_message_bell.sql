-- R16.9, R24.6, HRT-271. A message rings nothing.
--
-- The bell is for things that need answering somewhere else in the product. A
-- message is answered in the inbox, which now carries its own count in the
-- same bar, so a bell line beside it said the same thing twice and left the
-- reader two places to clear.
delete from notifications where kind = 'message';
