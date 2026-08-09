-- GDPR data minimization (Art. 5(1)(c)), part 1 of 2 — ADDITIVE ONLY.
--
-- Safe to run against a database still serving the previous release: it only
-- adds a function and a view, and leaves the permissive "profiles read" policy
-- in place. 0006 removes that policy and must run only AFTER the release that
-- reads from the view below is live — see the deploy order note in the README.

-- helper: does the caller share at least one ticket with p_user_id?
-- security definer so the view can filter rows without the caller needing read
-- access to the other member's ticket_members rows.
create or replace function shares_ticket_with(p_user_id uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1
    from ticket_members mine
    join ticket_members theirs on theirs.ticket_id = mine.ticket_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user_id
  )
$$;

-- Display data for rendering co-members on ticket screens. Deliberately NOT a
-- security_invoker view: it runs with owner rights so it can read past the
-- "profiles read own" policy 0006 adds, and the where clause — evaluated per
-- request via auth.uid() — is what limits the rows. Only id/display_name/
-- photo_url are projected, so email and the stripe_* columns are unreachable
-- through it.
create or replace view public_member_profiles as
  select p.id, p.display_name, p.photo_url
  from profiles p
  where p.id = auth.uid() or shares_ticket_with(p.id);

grant select on public_member_profiles to authenticated;
