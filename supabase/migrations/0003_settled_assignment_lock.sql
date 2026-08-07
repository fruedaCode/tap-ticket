-- Settled-claim lock: once a member has a pending or confirmed settlement on a ticket,
-- their claims on that ticket's items cannot be reduced (by anyone, including themselves),
-- so a paid share can never be un-assigned or taken over by someone else.
-- Increases and brand-new claims stay allowed; rejecting the settlement lifts the lock.
-- UPDATE-only on purpose: the app un-assigns by upserting amount=0, and DELETEs only
-- happen through cascades (e.g. ticket deletion), which must keep working.

create or replace function guard_settled_assignments() returns trigger
language plpgsql as $$
declare
  v_ticket uuid;
  v_quantity numeric;
  v_old_fraction numeric;
  v_new_fraction numeric;
begin
  select ticket_id, quantity into v_ticket, v_quantity
  from ticket_items where id = old.item_id;

  if not exists (
    select 1 from settlements
    where ticket_id = v_ticket
      and from_user = old.user_id
      and status in ('pending','confirmed')
  ) then
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

  if v_new_fraction < v_old_fraction - 1e-9 then
    raise exception 'assignment_locked';
  end if;
  return new;
end $$;

create trigger guard_settled_assignments
  before update on item_assignments
  for each row execute function guard_settled_assignments();
