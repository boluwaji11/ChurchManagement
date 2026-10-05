-- R9.5. New groups are written as drafts.
--
-- 0080 defaulted the column to published so that everything already in the
-- table kept its place on the finder. Now that the backfill is done, a group
-- created from here on starts as a draft.
alter table groups alter column status set default 'draft';
