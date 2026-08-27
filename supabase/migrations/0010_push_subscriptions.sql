-- Web Push subscriptions for member-added notifications.
--
-- When a registered user is added to a ticket/trip via /api/members, the
-- server sends them a Web Push notification (see lib/push.ts). Browsers
-- register subscriptions through /api/push/subscriptions; each row is one
-- push endpoint (a user can have several devices). Sending reads rows with
-- the service role — RLS below only lets owners manage their own rows.
--
-- Additive only: new table.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions select own" on push_subscriptions for select to authenticated
  using (user_id = auth.uid());

create policy "push_subscriptions insert own" on push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

create policy "push_subscriptions delete own" on push_subscriptions for delete to authenticated
  using (user_id = auth.uid());
