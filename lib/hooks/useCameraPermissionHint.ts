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
// real probe is getUserMedia: it rejects when the OS permission is off, and
// when the user accepts its prompt, that grant fixes <input capture> too.
// As a fallback for other silent failures (e.g. the iOS 17 Chrome bug where
// the change event never fires), if the page regains focus after a camera
// attempt without a file being selected, we also warn.
export function useCameraPermissionHint() {
  const { t } = useI18n()
  const awaitingRef = useRef(false)

  const warn = useCallback(() => {
    toast.warning(t('Camera not working?'), {
      description: t('Allow camera access for Chrome in your iPhone Settings, or upload from your gallery instead.'),
    })
  }, [t])

  useEffect(() => {
    if (!isIosChrome()) return
    const onFocus = () => {
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
  }, [warn])

  const notifyFileSelected = useCallback(() => { awaitingRef.current = false }, [])

  // Probes the camera before opening the native picker: on iOS Chrome a
  // rejected getUserMedia means the OS-level permission is off, so we warn
  // instead of opening the broken black camera. Anywhere else it just opens.
  const openCamera = useCallback(async (open: () => void) => {
    if (!isIosChrome() || !navigator.mediaDevices?.getUserMedia) {
      open()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((track) => track.stop())
      awaitingRef.current = true
      open()
    } catch {
      warn()
    }
  }, [warn])

  return { openCamera, notifyFileSelected }
}
