-- GDPR data minimization (Art. 5(1)(c)): the original "profiles read" policy let
-- any authenticated user read every profile row — including email and the Stripe
-- billing columns added in 0003. Users may now read only their own profile row.
--
-- Co-member display data (name + avatar) is served instead by the
-- public_member_profiles view below, which exposes three non-sensitive columns
-- and only for users the caller actually shares a ticket with.

drop policy if exists "profiles read" on profiles;
create policy "profiles read own" on profiles for select to authenticated using (id = auth.uid());

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
-- "profiles read own" policy, and the where clause — evaluated per request via
-- auth.uid() — is what limits the rows. Only id/display_name/photo_url are
-- projected, so email and the stripe_* columns are unreachable through it.
create or replace view public_member_profiles as
  select p.id, p.display_name, p.photo_url
  from profiles p
  where p.id = auth.uid() or shares_ticket_with(p.id);

grant select on public_member_profiles to authenticated;
