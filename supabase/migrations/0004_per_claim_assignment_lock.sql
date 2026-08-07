-- Refine the settled-claim lock from 0003: instead of freezing ALL claims of any user
-- with an active settlement, only lock the claims their payments already cover.
-- Payments are not item-attributed, so the same waterfall rule as the client applies:
-- each member's active payments cover their claimed shares in ticket (position) order;
-- a claim is locked only once the pool reaches the end of that item's share.

create or replace function guard_settled_assignments() returns trigger
language plpgsql as $$
declare
  v_ticket uuid;
  v_quantity numeric;
  v_pool numeric;
  v_cumulative numeric;
  v_old_fraction numeric;
  v_new_fraction numeric;
begin
  select ticket_id, quantity into v_ticket, v_quantity
  from ticket_items where id = old.item_id;

  -- the user's active payment pool on this ticket
  select coalesce(sum(amount), 0) into v_pool
  from settlements
  where ticket_id = v_ticket
    and from_user = old.user_id
    and status in ('pending','confirmed');

  if v_pool <= 0 then
    return new;
  end if;

  -- normalize both sides to a fraction of the item so unit/percentage compare fairly
  v_old_fraction := case
    when old.payment_type = 'unit' then case when v_quantity > 0 then old.amount / v_quantity else 0 end
    else old.amount
  end;
  v_new_fraction := case
    when new.payment_type = 'unit' then case when v_quantity > 0 then new.amount / v_quantity else 0 end
    else new.amount
  end;

  -- increases and no-ops stay allowed
  if v_new_fraction >= v_old_fraction - 1e-9 then
    return new;
  end if;

  -- reduction attempt: locked only when the payment pool already covers this claim,
  -- i.e. it reaches the cumulative share of the user's claims up to and including
  -- this item in position order
  select coalesce(sum(share), 0) into v_cumulative
  from (
    select i.position,
           sum(case when a.payment_type = 'unit'
                    then case when i.quantity > 0 then a.amount / i.quantity else 0 end
                    else a.amount end)
           * (case when i.discount_amount > 0 then i.price - i.discount_amount
                   when i.discount_percentage > 0 then i.price - i.price * i.discount_percentage / 100
                   else i.price end) as share
    from ticket_items i
    join item_assignments a on a.item_id = i.id and a.user_id = old.user_id
    where i.ticket_id = v_ticket
    group by i.id, i.position
  ) s
  where s.position <= (select position from ticket_items where id = old.item_id);

  if v_pool + 0.005 >= v_cumulative then
    raise exception 'assignment_locked';
  end if;
  return new;
end $$;
