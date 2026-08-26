-- TapTicket trips: group tickets under a shared trip so its members get one
-- aggregated overview ("who consumed what"). ADDITIVE ONLY, per 0005's convention.
-- Trip members reach trip tickets through the is_trip_member_of_ticket(...) branch
-- added to the existing member policies (read + claim); receipt editing stays
-- ticket-member-only, and deleting a trip detaches its tickets
-- (on delete set null) instead of deleting them.

create table trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table trip_members (
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('owner','member')),
  primary key (trip_id, user_id)
);

alter table tickets add column trip_id uuid references trips(id) on delete set null;

create index tickets_trip_idx on tickets(trip_id);
create index trip_members_user_idx on trip_members(user_id);

-- helper: is current user a member of a trip
create or replace function is_trip_member(p_trip_id uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from trip_members m where m.trip_id = p_trip_id and m.user_id = auth.uid())
$$;

-- helper: does the ticket belong to a trip the current user is a member of
create or replace function is_trip_member_of_ticket(p_ticket_id uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1
    from tickets t
    join trip_members m on m.trip_id = t.trip_id
    where t.id = p_ticket_id and m.user_id = auth.uid()
  )
$$;

-- create a trip with its initial member set (the creator becomes owner); the
-- trip_members policies deliberately allow no client inserts, so adding rows
-- for other users must go through this rpc (same pattern as join_ticket)
create or replace function create_trip(p_name text, p_member_ids uuid[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
declare v_trip_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  insert into trips (owner_id, name) values (v_uid, p_name) returning id into v_trip_id;
  insert into trip_members (trip_id, user_id, role) values (v_trip_id, v_uid, 'owner');
  insert into trip_members (trip_id, user_id, role)
  select v_trip_id, m, 'member'
  from unnest(p_member_ids) as m
  where m <> v_uid
  on conflict (trip_id, user_id) do nothing;
  return v_trip_id;
end $$;

-- add a registered user by email (caller must be a trip member)
create or replace function add_trip_member_by_email(p_trip_id uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
declare v_target uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from trip_members m where m.trip_id = p_trip_id and m.user_id = v_uid) then
    raise exception 'not_a_member';
  end if;
  select id into v_target from profiles where lower(email) = lower(p_email);
  if v_target is null then raise exception 'user_not_found'; end if;
  insert into trip_members (trip_id, user_id, role)
  values (p_trip_id, v_target, 'member')
  on conflict (trip_id, user_id) do nothing;
end $$;

-- trip co-members need each other's display data on the trip overview, under the
-- same minimization rules as ticket co-members (0005)
create or replace function shares_trip_with(p_user_id uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1
    from trip_members mine
    join trip_members theirs on theirs.trip_id = mine.trip_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user_id
  )
$$;

create or replace view public_member_profiles as
  select p.id, p.display_name, p.photo_url
  from profiles p
  where p.id = auth.uid() or shares_ticket_with(p.id) or shares_trip_with(p.id);

-- RLS
alter table trips enable row level security;
alter table trip_members enable row level security;

create policy "trips member read" on trips for select to authenticated using (is_trip_member(id));
create policy "trips insert own" on trips for insert to authenticated with check (owner_id = auth.uid());
create policy "trips owner update" on trips for update to authenticated using (owner_id = auth.uid());
create policy "trips owner delete" on trips for delete to authenticated using (owner_id = auth.uid());

create policy "trip members member read" on trip_members for select to authenticated using (is_trip_member(trip_id));
create policy "trip members delete self or owner" on trip_members for delete to authenticated
  using (user_id = auth.uid() or exists (select 1 from trips t where t.id = trip_id and t.owner_id = auth.uid()));
-- no client insert/update: membership is created only via create_trip / add_trip_member_by_email,
-- and removing a trip member never touches their assignments (no trigger on trip_members)

-- widen the existing member policies with a trip branch (drop + recreate, additive or-branches)
drop policy "tickets member read" on tickets;
create policy "tickets member read" on tickets for select to authenticated
  using (is_ticket_member(id) or is_trip_member_of_ticket(id));

-- a ticket may only be moved INTO a trip the actor belongs to; an unchanged
-- trip_id always passes so trip tickets stay editable by ticket members who
-- are not in the trip, and detaching (trip_id := null) stays open to members
drop policy "tickets member update" on tickets;
create policy "tickets member update" on tickets for update to authenticated
  using (is_ticket_member(id))
  with check (
    is_ticket_member(id)
    and (
      trip_id is null
      or is_trip_member(trip_id)
      or trip_id = (select t.trip_id from tickets t where t.id = tickets.id)
    )
  );

drop policy "items member read" on ticket_items;
create policy "items member read" on ticket_items for select to authenticated
  using (is_ticket_member(ticket_id) or is_trip_member_of_ticket(ticket_id));

drop policy "members member read" on ticket_members;
create policy "members member read" on ticket_members for select to authenticated
  using (is_ticket_member(ticket_id) or is_trip_member_of_ticket(ticket_id));

drop policy "assignments member read" on item_assignments;
create policy "assignments member read" on item_assignments for select to authenticated
  using (exists (select 1 from ticket_items i where i.id = item_id
                 and (is_ticket_member(i.ticket_id) or is_trip_member_of_ticket(i.ticket_id))));
drop policy "assignments member insert" on item_assignments;
create policy "assignments member insert" on item_assignments for insert to authenticated
  with check (exists (select 1 from ticket_items i where i.id = item_id
                      and (is_ticket_member(i.ticket_id) or is_trip_member_of_ticket(i.ticket_id))));
drop policy "assignments member update" on item_assignments;
create policy "assignments member update" on item_assignments for update to authenticated
  using (exists (select 1 from ticket_items i where i.id = item_id
                 and (is_ticket_member(i.ticket_id) or is_trip_member_of_ticket(i.ticket_id))));
drop policy "assignments member delete" on item_assignments;
create policy "assignments member delete" on item_assignments for delete to authenticated
  using (exists (select 1 from ticket_items i where i.id = item_id
                 and (is_ticket_member(i.ticket_id) or is_trip_member_of_ticket(i.ticket_id))));

-- trip members can view receipt photos of trip tickets
drop policy "members read ticket images" on storage.objects;
create policy "members read ticket images" on storage.objects for select to authenticated
  using (bucket_id = 'ticket-images'
         and (is_ticket_member(name::uuid) or is_trip_member_of_ticket(name::uuid)));

-- realtime
alter publication supabase_realtime add table trips;
alter publication supabase_realtime add table trip_members;

-- trip-only members get live updates on trip tickets too
drop policy "ticket members can read realtime" on realtime.messages;
create policy "ticket members can read realtime"
  on realtime.messages for select to authenticated
  using (
    case
      when realtime.topic() ~ '^ticket:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then is_ticket_member(substring(realtime.topic() from 8)::uuid)
           or is_trip_member_of_ticket(substring(realtime.topic() from 8)::uuid)
      else false
    end
  );

-- trip channels use topic 'trip:<trip uuid>' — members only
create policy "trip members can read realtime"
  on realtime.messages for select to authenticated
  using (
    case
      when realtime.topic() ~ '^trip:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then is_trip_member(substring(realtime.topic() from 6)::uuid)
      else false
    end
  );

-- per-user trip list channel, topic 'trip_list:<user uuid>'
create policy "users read own trip list realtime"
  on realtime.messages for select to authenticated
  using (realtime.topic() = 'trip_list:' || auth.uid()::text);
