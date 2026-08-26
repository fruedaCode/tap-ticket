-- Trip invitations: give trips a share_token like tickets have (0001) so an
-- invite email can carry a join link, plus a join_trip rpc mirroring
-- join_ticket. ADDITIVE ONLY, per 0005's convention.

alter table trips add column share_token text not null unique default encode(gen_random_bytes(15), 'hex');

-- join via share token (idempotent); trip membership grants no item
-- assignments — those are created per ticket by join_ticket
create or replace function join_trip(p_trip_id uuid, p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from trip_members m where m.trip_id = p_trip_id and m.user_id = v_uid)
     and not exists (select 1 from trips t where t.id = p_trip_id and t.share_token = p_token) then
    raise exception 'invalid_token';
  end if;
  insert into trip_members (trip_id, user_id, role)
  values (p_trip_id, v_uid, 'member')
  on conflict (trip_id, user_id) do nothing;
end $$;
