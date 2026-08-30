-- Assignment capacity lock: the claims on an item can never exceed 100% of it.
-- The client caps the stepper at the remaining share, but that cap is computed from
-- local (possibly stale) state; this trigger enforces the invariant regardless of
-- what any client sends, so a settled share can never be exceeded by late claims.

create or replace function guard_assignment_capacity() returns trigger
language plpgsql as $$
declare
  v_quantity numeric;
  v_total numeric;
  v_new_fraction numeric;
begin
  -- serialize concurrent claims on the same item
  select quantity into v_quantity
  from ticket_items where id = new.item_id for update;

  v_new_fraction := case
    when new.payment_type = 'unit' then case when v_quantity > 0 then new.amount / v_quantity else 0 end
    else new.amount
  end;

  -- fraction claimed by everyone else on this item
  select coalesce(sum(case
    when a.payment_type = 'unit' then case when v_quantity > 0 then a.amount / v_quantity else 0 end
    else a.amount
  end), 0) into v_total
  from item_assignments a
  where a.item_id = new.item_id and a.user_id <> new.user_id;

  if v_total + v_new_fraction > 1 + 1e-9 then
    raise exception 'assignment_overflow';
  end if;
  return new;
end $$;

create trigger guard_assignment_capacity
  before insert or update on item_assignments
  for each row execute function guard_assignment_capacity();
