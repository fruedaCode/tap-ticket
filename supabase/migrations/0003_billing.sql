-- Subscription plans + Stripe billing.
--
-- Three plans:
--   * free     — 4 scans per week (rolling 7-day window)
--   * standard — 10 scans per week, paid via Stripe (€2.50/mo)
--   * pro      — unlimited scans, paid via Stripe (€10/mo)
--
-- Plan + Stripe attribution live on `profiles` (1:1 with auth.users). The
-- Stripe webhook updates these columns via the service-role client; end users
-- can read them but never write them (see the locked-down update policy).

alter table profiles
  add column plan text not null default 'free'
    check (plan in ('free', 'standard', 'pro'));

alter table profiles
  add column stripe_customer_id text;

alter table profiles
  add column stripe_subscription_id text;

alter table profiles
  add column subscription_status text;

alter table profiles
  add column subscription_current_period_end timestamptz;

create unique index profiles_stripe_customer_id_idx
  on profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- Lock down the "profiles update own" policy: users may still edit their own
-- display_name/photo_url, but plan and Stripe columns must round-trip
-- unchanged — only the service role (webhook/checkout) may write them.
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
  );
