'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { es } from './es'
import { en } from './en'
import { ca } from './ca'

export type Lang = 'es' | 'en' | 'ca'
const dicts: Record<Lang, Record<string, string>> = { es, en, ca }

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string }>({
  lang: 'es',
  setLang: () => {},
  t: (k) => k,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es')
  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null
    if (saved && dicts[saved]) setLangState(saved)
  }, [])
  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }
  const t = (key: string) => dicts[lang][key] ?? dicts.en[key] ?? key
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
