-- User feedback with scan-credit rewards.
--
-- Users can submit a 1-5 star rating plus an optional comment. Each rewarded
-- submission grants +2 one-time scan credits, capped at 3 rewards per user
-- (see submit_feedback). Only submissions that include a comment earn the
-- reward; rating-only feedback is stored but unrewarded and does not consume
-- a reward slot. Credits live on profiles.extra_scans and are consumed one
-- per scan once the weekly plan quota is exhausted (/api/scan). They never
-- expire. Failed scans refund the credit (refund_extra_scan).
--
-- Additive only: new column, new table, new functions; the "profiles update
-- own" policy is recreated with the extra_scans round-trip guard added.

alter table profiles
  add column extra_scans int not null default 0 check (extra_scans >= 0);

-- Users may still edit their own display_name/photo_url, but extra_scans must
-- round-trip unchanged — only the service role / security definer functions
-- below may write it.
drop policy "profiles update own" on profiles;
create policy "profiles update own" on profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and plan = (select plan from profiles where id = auth.uid())
    and stripe_customer_id is not distinct from
        (select stripe_customer_id from profiles where id = auth.uid())
    and stripe_subscription_id is not distinct from
        (select stripe_subscription_id from profiles where id = auth.uid())
    and subscription_status is not distinct from
        (select subscription_status from profiles where id = auth.uid())
    and subscription_current_period_end is not distinct from
        (select subscription_current_period_end from profiles where id = auth.uid())
    and extra_scans = (select extra_scans from profiles where id = auth.uid())
  );

create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 2000),
  rewarded boolean not null default false,
  created_at timestamptz not null default now()
);

create index feedback_user_id_idx on feedback (user_id);

alter table feedback enable row level security;

-- Users can read their own submissions (the dialog shows "reward x/3 used").
-- Inserts/updates go exclusively through submit_feedback — no write policies.
create policy "feedback select own" on feedback for select to authenticated
  using (user_id = auth.uid());

-- Store one feedback submission and grant the scan reward atomically, so the
-- 3-reward cap cannot be raced by concurrent submissions. Only submissions
-- with a non-empty comment earn the reward. Returns json:
--   { rewarded, extra_scans, rewards_used }
create or replace function submit_feedback(p_rating int, p_comment text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_feedback_id uuid;
  v_rewards_used int;
  v_rewarded boolean := false;
  v_extra_scans int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'rating must be between 1 and 5';
  end if;

  insert into feedback (user_id, rating, comment)
  values (auth.uid(), p_rating, coalesce(p_comment, ''))
  returning id into v_feedback_id;

  select count(*) into v_rewards_used
  from feedback
  where user_id = auth.uid() and rewarded;

  if v_rewards_used < 3 and char_length(btrim(coalesce(p_comment, ''))) > 0 then
    update feedback set rewarded = true where id = v_feedback_id;
    update profiles set extra_scans = extra_scans + 2
    where id = auth.uid()
    returning extra_scans into v_extra_scans;
    v_rewarded := true;
    v_rewards_used := v_rewards_used + 1;
  else
    select extra_scans into v_extra_scans from profiles where id = auth.uid();
  end if;

  return json_build_object(
    'rewarded', v_rewarded,
    'extra_scans', v_extra_scans,
    'rewards_used', v_rewards_used
  );
end;
$$;

-- Consume one credit when the weekly quota is exhausted. Atomic: the update
-- only succeeds while the balance is positive, so concurrent scans can never
-- drive it negative. Returns whether a credit was consumed.
create or replace function consume_extra_scan()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_consumed boolean;
begin
  update profiles set extra_scans = extra_scans - 1
  where id = auth.uid() and extra_scans > 0
  returning true into v_consumed;
  return coalesce(v_consumed, false);
end;
$$;

-- Give a credit back when a scan that consumed one fails and is rolled back.
create or replace function refund_extra_scan()
returns void
language sql
security definer
set search_path = public
as $$
  update profiles set extra_scans = extra_scans + 1 where id = auth.uid();
$$;
