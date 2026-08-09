'use client'

// Legal documents (privacy, terms, cookies, LSSI notice). They live outside the
// flat `t()` dictionaries in lib/i18n because they are multi-paragraph documents,
// not UI strings: each locale exports the whole document as JSX.
//
// Controller/operator identity is injected from lib/legal/company.ts so the
// placeholders are filled in exactly once, not 12 times.

import type { ReactNode } from 'react'
import { useI18n, type Lang } from '@/lib/i18n'
import { en } from './en'
import { es } from './es'
import { ca } from './ca'

export type LegalDocId = 'privacy' | 'terms' | 'cookies' | 'aviso-legal'
export type LegalDoc = { title: string; body: ReactNode }
export type LegalDocs = Record<LegalDocId, LegalDoc>

const docs: Record<Lang, LegalDocs> = { en, es, ca }

// English is the fallback for any locale whose document is not translated yet.
export function useLegalDoc(id: LegalDocId): LegalDoc {
  const { lang } = useI18n()
  return docs[lang]?.[id] ?? en[id]
}
