import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'

export const metadata: Metadata = { title: 'Términos del servicio' }

export default function TermsPage() {
  return <LegalPage id="terms" />
}
