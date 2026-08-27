'use client'

// Browser-side helpers for Web Push: subscribe/unsubscribe and sync the
// subscription with /api/push/subscriptions. Used by the prompt card on the
// tickets page and the toggle on the account page.

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  )
}

// The service worker is only registered in production
// (components/service-worker-registration.tsx); use getRegistration instead of
// .ready so dev sessions don't hang waiting for an active worker.
async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export type PushState = {
  permission: NotificationPermission
  subscribed: boolean
}

export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return { permission: 'denied', subscribed: false }
  const registration = await getRegistration()
  const subscription = registration ? await registration.pushManager.getSubscription() : null
  return { permission: Notification.permission, subscribed: !!subscription }
}

// Requests permission if needed, subscribes the browser, and stores the
// subscription server-side. Returns whether notifications are now enabled.
export async function subscribeToPush(): Promise<boolean> {
  const registration = await getRegistration()
  if (!registration) return false
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false
  }
  if (Notification.permission !== 'granted') return false

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      ) as BufferSource,
    }))

  const res = await fetch('/api/push/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  })
  return res.ok
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const registration = await getRegistration()
  if (!registration) return false
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return true

  const res = await fetch('/api/push/subscriptions', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  })
  await subscription.unsubscribe().catch(() => {})
  return res.ok
}
