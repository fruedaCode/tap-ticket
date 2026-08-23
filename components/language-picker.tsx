'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n, type Lang } from '@/lib/i18n'

const LANGS: Lang[] = ['es', 'en', 'ca']

export function LanguagePicker({ id }: { id?: string }) {
  const { lang, setLang, t } = useI18n()
  return (
    <Select value={lang} onValueChange={(value) => setLang(value as Lang)}>
      <SelectTrigger id={id} className="w-full" aria-label={t('Select language')}>
        <SelectValue>{(value) => t(value as Lang)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {LANGS.map((l) => (
          <SelectItem key={l} value={l}>
            {t(l)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
