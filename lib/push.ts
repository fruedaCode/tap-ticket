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
const strings: Record<
  Locale,
  { title: (kind: 'ticket' | 'trip') => string; body: (kind: 'ticket' | 'trip', target: string) => string }
> = {
  en: {
    title: (kind) => (kind === 'ticket' ? 'New shared ticket' : 'New shared trip'),
    body: (kind, target) =>
      target
        ? `You were added to “${target}”`
        : `You were added to a shared ${kind === 'ticket' ? 'ticket' : 'trip'}`,
  },
  es: {
    title: (kind) => (kind === 'ticket' ? 'Nuevo ticket compartido' : 'Nuevo viaje compartido'),
    body: (kind, target) =>
      target
        ? `Te han añadido a “${target}”`
        : `Te han añadido a ${kind === 'ticket' ? 'un ticket' : 'un viaje'} compartido`,
  },
  ca: {
    title: (kind) => (kind === 'ticket' ? 'Nou tiquet compartit' : 'Nou viatge compartit'),
    body: (kind, target) =>
      target
        ? `T’han afegit a “${target}”`
        : `T’han afegit a ${kind === 'ticket' ? 'un tiquet' : 'un viatge'} compartit`,
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
      title: s.title(target.kind),
      body: s.body(target.kind, target.title),
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
