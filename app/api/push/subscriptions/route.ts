import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Web Push subscription management. Browsers register one row per endpoint
// (a user can have several devices); /api/members reads them server-side to
// notify users when they're added to a ticket/trip. RLS scopes rows to the
// owner, so the session client is enough here.
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const endpoint = body?.endpoint
  const p256dh = body?.keys?.p256dh
  const auth = body?.keys?.auth
  if (
    typeof endpoint !== 'string' ||
    typeof p256dh !== 'string' ||
    typeof auth !== 'string' ||
    !endpoint.startsWith('https://')
  ) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // upsert on endpoint so re-subscribing the same browser refreshes the keys
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: user.id, endpoint, p256dh, auth }, { onConflict: 'endpoint' })
  if (error) {
    console.error('push: failed to save subscription', error)
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const endpoint = body?.endpoint
  if (typeof endpoint !== 'string') {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) {
    console.error('push: failed to delete subscription', error)
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
