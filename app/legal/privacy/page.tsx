import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'

export const metadata: Metadata = { title: 'Política de privacidad — TapTicket' }

export default function PrivacyPage() {
  return <LegalPage id="privacy" />
}
