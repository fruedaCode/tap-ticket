import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { sendAddedToTicketPush } from '@/lib/push'

// Add-or-invite: if the email is registered, add them as a member; otherwise
// send a signup invitation whose link lands them on the ticket/trip.
// Doing the lookup server-side keeps the failing rpc out of the browser.
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const ticketId = body?.ticketId
  const tripId = body?.tripId
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const isTicket = typeof ticketId === 'string'
  const isTrip = !isTicket && typeof tripId === 'string'
  if ((!isTicket && !isTrip) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // RLS ("tickets member read" / "trips member read") hides the row for
  // non-members, so a missing row is the membership check
  const { data: target } = isTicket
    ? await supabase.from('tickets').select('share_token, title').eq('id', ticketId).maybeSingle()
    : await supabase.from('trips').select('share_token, title').eq('id', tripId).maybeSingle()
  if (!target) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const admin = getAdminSupabase()
  // profiles is RLS-locked for the client (0006) — the lookup needs the service role.
  // emails can contain LIKE wildcards (_), so escape the ilike pattern
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', email.replace(/[%_\\]/g, '\\$&'))
    .maybeSingle()

  // A profile row alone doesn't mean "signed up": inviteUserByEmail creates
  // the auth.users/profiles rows as soon as an invite is sent, so someone who
  // was invited before but never signed in would otherwise be added silently.
  // Treat them as unregistered and re-send the invitation email instead.
  let signedUp = false
  if (profile) {
    const {
      data: { user: invitee },
    } = await admin.auth.admin.getUserById(profile.id)
    signedUp = !!invitee?.last_sign_in_at
  }

  if (profile && signedUp) {
    // already registered — add them directly; the rpc re-checks caller membership
    const { error } = isTicket
      ? await supabase.rpc('add_member_by_email', { p_ticket_id: ticketId, p_email: email })
      : await supabase.rpc('add_trip_member_by_email', { p_trip_id: tripId, p_email: email })
    if (error) {
      console.error('members: failed to add member', error)
      return NextResponse.json({ error: 'add_failed' }, { status: 500 })
    }
    // best-effort push notification; no-op when the member has no subscription
    await sendAddedToTicketPush(admin, profile.id, {
      kind: isTicket ? 'ticket' : 'trip',
      id: isTicket ? ticketId : tripId,
      title: target.title,
    })
    return NextResponse.json({ ok: true, invited: false })
  }

  // behind fly.io's proxy request.url carries the internal listener; the public origin arrives in the forwarded headers
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const origin = host ? `${proto}://${host}` : new URL(request.url).origin
  const joinPath = isTicket
    ? `/join?ticketId=${ticketId}&token=${target.share_token}`
    : `/join?tripId=${tripId}&token=${target.share_token}`
  const next = encodeURIComponent(joinPath)

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${next}`,
    // the invitee has no profile yet — reuse the inviter's locale so the email is localized
    data: { locale: user.user_metadata?.locale },
  })
  if (error) {
    console.error('members: failed to invite user', error)
    return NextResponse.json({ error: 'invite_failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, invited: true })
}
