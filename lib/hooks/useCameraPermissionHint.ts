'use client'
import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n'

const isIosChrome = () => /CriOS/.test(navigator.userAgent)

// Chrome on iOS renders the <input capture> camera in-app, so it's gated by
// Chrome's own Camera permission in iOS Settings. When denied, the camera
// sheet opens with a black viewfinder and a dead shutter — all inside native
// UI the page can't observe. The Permissions API can't detect this: WebKit
// doesn't reliably support the 'camera' query, and it would only reflect the
// per-site permission, not the OS-level app toggle that causes this. The only
// real probe is getUserMedia, and its prompt grants the OS permission too.
//
// The probe must NOT run inside the tap handler: iOS only honors a file
// input's .click() synchronously within the user gesture, and awaiting
// getUserMedia first makes the later click silently do nothing. So with
// probeOnMount the probe runs on mount and the tap just reads the result.
//
// As a fallback for other silent failures (e.g. the iOS 17 Chrome bug where
// the change event never fires), if the page regains focus after a camera
// attempt without a file being selected, we also warn.
export function useCameraPermissionHint({ probeOnMount = false } = {}) {
  const { t } = useI18n()
  const awaitingRef = useRef(false)
  const permissionRef = useRef<'unknown' | 'granted' | 'denied'>('unknown')

  const warn = useCallback(() => {
    toast.warning(t('Camera not working?'), {
      description: t('Allow camera access for Chrome in your iPhone Settings, or upload from your gallery instead.'),
    })
  }, [t])

  const probe = useCallback(async () => {
    if (!isIosChrome() || !navigator.mediaDevices?.getUserMedia) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((track) => track.stop())
      permissionRef.current = 'granted'
    } catch {
      permissionRef.current = 'denied'
    }
  }, [])

  useEffect(() => {
    if (!isIosChrome()) return
    if (probeOnMount) void probe()
    const onFocus = () => {
      // the user may have just toggled the permission in iOS Settings
      if (permissionRef.current === 'denied') void probe()
      if (!awaitingRef.current) return
      // the change event fires right around focus; give it a moment to win
      setTimeout(() => {
        if (!awaitingRef.current) return
        awaitingRef.current = false
        warn()
      }, 800)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [probe, probeOnMount, warn])

  const notifyFileSelected = useCallback(() => { awaitingRef.current = false }, [])

  // Must stay synchronous so the caller can open the file input within the
  // tap gesture. When the probe found the OS permission denied, warn instead
  // of opening the broken black camera.
  const openCamera = useCallback((open: () => void) => {
    if (permissionRef.current === 'denied') {
      warn()
      return
    }
    awaitingRef.current = true
    open()
  }, [warn])

  return { openCamera, notifyFileSelected }
}
