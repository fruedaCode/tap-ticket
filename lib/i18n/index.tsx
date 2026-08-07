'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { es } from './es'
import { en } from './en'
import { ca } from './ca'

export type Lang = 'es' | 'en' | 'ca'
const dicts: Record<Lang, Record<string, string>> = { es, en, ca }

// Keeps auth.users.user_metadata.locale in sync with the app language so
// Supabase auth emails (magic link, etc.) can localize via {{ .Data.locale }}.
function syncLocaleToUserMetadata(lang: Lang) {
  const supabase = createClient()
  supabase.auth
    .getSession()
    .then(({ data: { session } }) => {
      const user = session?.user
      if (user && user.user_metadata?.locale !== lang) {
        supabase.auth.updateUser({ data: { locale: lang } })
      }
    })
    .catch(() => {})
}

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string }>({
  lang: 'es',
  setLang: () => {},
  t: (k) => k,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es')
  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null
    const current = saved && dicts[saved] ? saved : 'es'
    if (current !== 'es') queueMicrotask(() => setLangState(current))
    syncLocaleToUserMetadata(current)
  }, [])
  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('lang', l)
    syncLocaleToUserMetadata(l)
  }
  const t = (key: string) => dicts[lang][key] ?? dicts.en[key] ?? key
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
