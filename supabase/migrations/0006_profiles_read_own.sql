-- GDPR data minimization (Art. 5(1)(c)), part 2 of 2 — RESTRICTIVE.
--
-- The original "profiles read" policy let any authenticated user read every
-- profile row, including email and the Stripe billing columns added in 0003.
-- This closes that: users may read only their own profile row.
--
-- DEPLOY ORDER: run this only AFTER the release that reads co-member names from
-- public_member_profiles (migration 0005) is live. Any older release still does
-- `from('profiles')` for co-members, and would show every participant as "?"
-- from the moment this runs.

drop policy if exists "profiles read" on profiles;
create policy "profiles read own" on profiles for select to authenticated using (id = auth.uid());
