-- R13.3. The repeat mark, only where it is still true.
--
-- Gifts recorded before a gift knew which subscription raised it carry the
-- mark with nothing to tie it to, so stopping the repeating gift cannot take
-- it off. Those are cleared here, along with any whose subscription has since
-- been cancelled. A gift collected by a subscription that is still running
-- keeps its mark.
update gifts g
   set recurring = false, updated_at = now()
 where g.recurring
   and (
     g.stripe_subscription_id is null
     or exists (
       select 1 from recurring_gifts r
        where r.stripe_subscription_id = g.stripe_subscription_id
          and r.status = 'canceled'
     )
   );
