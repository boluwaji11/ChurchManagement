-- R2.x. The two the sweep in 0090 did not reach.
--
-- `notes` was missed because 0090 was already recorded as applied when its
-- loop was corrected, and an event's contact names a member like every other
-- reference does.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'notes' and column_name = 'person_id'
  ) then
    alter table notes rename column person_id to member_id;
  end if;

  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'events'
       and column_name = 'contact_person_id'
  ) then
    alter table events rename column contact_person_id to contact_member_id;
  end if;
end $$;
