import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'

export const metadata: Metadata = { title: 'Términos del servicio — TapTicket' }

export default function TermsPage() {
  return <LegalPage id="terms" />
}
