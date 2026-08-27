'use client'
import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n'

// Chrome on iOS renders the <input capture> camera in-app, so it's gated by
// Chrome's own Camera permission in iOS Settings. When denied, the camera
// sheet opens with a black viewfinder and a dead shutter — all inside native
// UI the page can't observe. Heuristic: if the page regains focus after a
// camera attempt without a file being selected, warn the user.
export function useCameraPermissionHint() {
  const { t } = useI18n()
  const awaitingRef = useRef(false)

  useEffect(() => {
    // CriOS = Chrome on iOS; Safari hands off to the system camera, which
    // doesn't need per-app permission, so only Chrome can hit the black screen
    if (!/CriOS/.test(navigator.userAgent)) return
    const onFocus = () => {
      if (!awaitingRef.current) return
      // the change event fires right around focus; give it a moment to win
      setTimeout(() => {
        if (!awaitingRef.current) return
        awaitingRef.current = false
        toast.warning(t('Camera not working?'), {
          description: t('Allow camera access for Chrome in your iPhone Settings, or upload from your gallery instead.'),
        })
      }, 800)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [t])

  const notifyCameraOpened = useCallback(() => { awaitingRef.current = true }, [])
  const notifyFileSelected = useCallback(() => { awaitingRef.current = false }, [])
  return { notifyCameraOpened, notifyFileSelected }
}
