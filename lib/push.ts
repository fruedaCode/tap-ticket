import 'server-only'
import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

// Server-side Web Push sending. Subscriptions live in push_subscriptions
// (migration 0010), written by /api/push/subscriptions and read here with the
// service role — RLS only exposes rows to their owner.

let vapidReady = false
function ensureVapid(): boolean {
  if (vapidReady) return true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:hello@tapticket.app', publicKey, privateKey)
  vapidReady = true
  return true
}

type Locale = 'en' | 'es' | 'ca'

// The app's i18n lives client-side; push payloads are built server-side, so
// keep a small mirror here keyed by the recipient's user_metadata.locale.
const strings: Record<Locale, { ticketTitle: string; tripTitle: string; body: (title: string) => string }> = {
  en: {
    ticketTitle: 'New shared ticket',
    tripTitle: 'New shared trip',
    body: (title) => `You were added to “${title}”`,
  },
  es: {
    ticketTitle: 'Nuevo ticket compartido',
    tripTitle: 'Nuevo viaje compartido',
    body: (title) => `Te han añadido a “${title}”`,
  },
  ca: {
    ticketTitle: 'Nou tiquet compartit',
    tripTitle: 'Nou viatge compartit',
    body: (title) => `T’han afegit a “${title}”`,
  },
}

async function recipientLocale(admin: SupabaseClient, userId: string): Promise<Locale> {
  const {
    data: { user },
  } = await admin.auth.admin.getUserById(userId)
  const locale = user?.user_metadata?.locale
  return locale === 'es' || locale === 'ca' ? locale : 'en'
}

// Notify a user that they were added to a ticket/trip. No-op when the user
// has no push subscriptions (never signed up in the browser or opted out) or
// when VAPID keys aren't configured. Never throws — push is best-effort.
export async function sendAddedToTicketPush(
  admin: SupabaseClient,
  userId: string,
  target: { kind: 'ticket' | 'trip'; id: string; title: string },
): Promise<void> {
  try {
    if (!ensureVapid()) return

    const { data: subs, error } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)
    if (error) {
      console.error('push: failed to read subscriptions', error)
      return
    }
    if (!subs?.length) return

    const s = strings[await recipientLocale(admin, userId)]
    const payload = JSON.stringify({
      title: target.kind === 'ticket' ? s.ticketTitle : s.tripTitle,
      body: s.body(target.title),
      url: target.kind === 'ticket' ? `/tickets/${target.id}` : `/trips/${target.id}`,
    })

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          )
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode
          // 404/410: the endpoint is gone for good — drop the stale row
          if (status === 404 || status === 410) {
            await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          } else {
            console.error('push: send failed', err)
          }
        }
      }),
    )
  } catch (err) {
    console.error('push: unexpected failure', err)
  }
}
