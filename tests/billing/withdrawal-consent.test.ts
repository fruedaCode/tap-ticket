import { describe, expect, it } from 'vitest'
import { WITHDRAWAL_CONSENT_TEXT, WITHDRAWAL_CONSENT_VERSION } from '@/lib/legal/withdrawal'

// The consent text is the exact formula art. 102 TRLGDCU requires for waiving
// the 14-day withdrawal right at checkout (terms.md §5). Stored
// `legal_consents` rows are the legal evidence of what each user accepted, so
// any edit must ship with a version bump — this test pins both.
describe('withdrawal consent', () => {
  it('keeps the exact legal formula', () => {
    expect(WITHDRAWAL_CONSENT_TEXT).toBe(
      'Solicito que la prestación del servicio comience de forma inmediata y renuncio expresamente a mi derecho de desistimiento una vez el servicio se haya prestado por completo en el periodo de suscripción contratado.',
    )
  })

  it('has a dated version tag', () => {
    expect(WITHDRAWAL_CONSENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/)
  })
})
