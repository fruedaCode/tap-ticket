-- TapTicket initial schema
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  share_token text not null unique,
  restaurant jsonb not null default '{}',
  invoice jsonb not null default '{}',
  totals jsonb not null default '{}',
  img_path text not null,
  created_at timestamptz not null default now()
);

create table ticket_items (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  position int not null,
  quantity numeric not null,
  description text not null,
  price numeric not null,
  discount_percentage numeric not null default 0,
  discount_amount numeric not null default 0,
  split_among int not null default 0
);

create table item_assignments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references ticket_items(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  payment_type text not null check (payment_type in ('unit','percentage')),
  amount numeric not null default 0,
  unique (item_id, user_id)
);

create table ticket_members (
  ticket_id uuid not null references tickets(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('owner','member')),
  seen boolean not null default false,
  primary key (ticket_id, user_id)
);

create index ticket_items_ticket_idx on ticket_items(ticket_id);
create index item_assignments_item_idx on item_assignments(item_id);
create index item_assignments_user_idx on item_assignments(user_id);
create index ticket_members_user_idx on ticket_members(user_id);

-- profile auto-creation on signup
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, display_name, photo_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- helper: is current user a member of a ticket
create or replace function is_ticket_member(p_ticket_id uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from ticket_members m where m.ticket_id = p_ticket_id and m.user_id = auth.uid())
$$;

-- join via share token (idempotent)
create or replace function join_ticket(p_ticket_id uuid, p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from ticket_members m where m.ticket_id = p_ticket_id and m.user_id = v_uid)
     and not exists (select 1 from tickets t where t.id = p_ticket_id and t.share_token = p_token) then
    raise exception 'invalid_token';
  end if;
  insert into ticket_members (ticket_id, user_id, role, seen)
  values (p_ticket_id, v_uid, 'member', false)
  on conflict (ticket_id, user_id) do nothing;
  insert into item_assignments (item_id, user_id, payment_type, amount)
  select i.id, v_uid, case when i.split_among > 0 then 'percentage' else 'unit' end, 0
  from ticket_items i
  where i.ticket_id = p_ticket_id
  on conflict (item_id, user_id) do nothing;
end $$;

-- add a registered user by email (caller must be a member)
create or replace function add_member_by_email(p_ticket_id uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
declare v_target uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from ticket_members m where m.ticket_id = p_ticket_id and m.user_id = v_uid) then
    raise exception 'not_a_member';
  end if;
  select id into v_target from profiles where lower(email) = lower(p_email);
  if v_target is null then raise exception 'user_not_found'; end if;
  insert into ticket_members (ticket_id, user_id, role, seen)
  values (p_ticket_id, v_target, 'member', false)
  on conflict (ticket_id, user_id) do nothing;
  insert into item_assignments (item_id, user_id, payment_type, amount)
  select i.id, v_target, case when i.split_among > 0 then 'percentage' else 'unit' end, 0
  from ticket_items i
  where i.ticket_id = p_ticket_id
  on conflict (item_id, user_id) do nothing;
end $$;

-- when a member is removed, drop their assignments on that ticket
create or replace function remove_member_assignments() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from item_assignments a
  using ticket_items i
  where a.item_id = i.id and i.ticket_id = old.ticket_id and a.user_id = old.user_id;
  return old;
end $$;

create trigger on_member_removed
  after delete on ticket_members
  for each row execute function remove_member_assignments();

-- RLS
alter table profiles enable row level security;
alter table tickets enable row level security;
alter table ticket_items enable row level security;
alter table item_assignments enable row level security;
alter table ticket_members enable row level security;

create policy "profiles read" on profiles for select to authenticated using (true);
create policy "profiles update own" on profiles for update to authenticated using (id = auth.uid());

create policy "tickets insert own" on tickets for insert to authenticated with check (owner_id = auth.uid());
create policy "tickets member read" on tickets for select to authenticated using (is_ticket_member(id));
create policy "tickets member update" on tickets for update to authenticated using (is_ticket_member(id));
create policy "tickets owner delete" on tickets for delete to authenticated using (owner_id = auth.uid());

create policy "items member read" on ticket_items for select to authenticated using (is_ticket_member(ticket_id));
create policy "items member insert" on ticket_items for insert to authenticated with check (is_ticket_member(ticket_id));
create policy "items member update" on ticket_items for update to authenticated using (is_ticket_member(ticket_id));
create policy "items member delete" on ticket_items for delete to authenticated using (is_ticket_member(ticket_id));

create policy "assignments member read" on item_assignments for select to authenticated
  using (exists (select 1 from ticket_items i where i.id = item_id and is_ticket_member(i.ticket_id)));
create policy "assignments member insert" on item_assignments for insert to authenticated
  with check (exists (select 1 from ticket_items i where i.id = item_id and is_ticket_member(i.ticket_id)));
create policy "assignments member update" on item_assignments for update to authenticated
  using (exists (select 1 from ticket_items i where i.id = item_id and is_ticket_member(i.ticket_id)));
create policy "assignments member delete" on item_assignments for delete to authenticated
  using (exists (select 1 from ticket_items i where i.id = item_id and is_ticket_member(i.ticket_id)));

create policy "members member read" on ticket_members for select to authenticated using (is_ticket_member(ticket_id));
create policy "members update own seen" on ticket_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members member delete" on ticket_members for delete to authenticated using (is_ticket_member(ticket_id));
-- no client insert policy: membership is created only via join_ticket / add_member_by_email / ticket insert path

-- realtime
alter publication supabase_realtime add table tickets;
alter publication supabase_realtime add table ticket_items;
alter publication supabase_realtime add table item_assignments;
alter publication supabase_realtime add table ticket_members;

-- storage bucket for receipt photos (private)
insert into storage.buckets (id, name, public) values ('ticket-images', 'ticket-images', false);

create policy "members read ticket images" on storage.objects for select to authenticated
  using (bucket_id = 'ticket-images' and is_ticket_member(name::uuid));
create policy "users upload ticket images" on storage.objects for insert to authenticated
  with check (bucket_id = 'ticket-images');
create policy "owners delete ticket images" on storage.objects for delete to authenticated
  using (bucket_id = 'ticket-images' and is_ticket_member(name::uuid));
