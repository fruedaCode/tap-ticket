import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'

export const metadata: Metadata = { title: 'Aviso legal' }

export default function AvisoLegalPage() {
  return <LegalPage id="aviso-legal" />
}
