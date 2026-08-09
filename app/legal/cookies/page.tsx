import type { Metadata } from 'next'
import { ConsentSettings } from '@/components/consent-settings'
import { LegalPage } from '@/components/legal-page'

export const metadata: Metadata = { title: 'Política de cookies — TapTicket' }

export default function CookiesPage() {
  return (
    <LegalPage id="cookies">
      <ConsentSettings />
    </LegalPage>
  )
}
