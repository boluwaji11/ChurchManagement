-- R18.x, HRT-278. A report belongs to whoever built it.
--
-- Everybody's saved reports sat in one list, so a staff member's working list
-- was on the screen of everybody else who opens Reports. A report is private
-- to the person who wrote it until somebody who runs the church puts it in
-- front of everyone.
alter table saved_reports add column if not exists shared_at timestamptz;

create index if not exists saved_reports_mine_idx
  on saved_reports (tenant_id, created_by_user_id, shared_at);
