// Withdrawal-right consent (art. 102 TRLGDCU) — the exact checkbox formula
// shown at checkout before subscribing to a paid plan (see terms.md §5 and
// /plans). Shared by the client (dialog text) and the server (checkout route,
// which stores it as evidence).
//
// The text is legally significant: edit it only with legal review, and ALWAYS
// bump the version when it changes — the rows stored in `legal_consents` are
// the proof of which exact text each user saw and accepted (art. 101 TRLGDCU
// puts the burden of proof on the business).
export const WITHDRAWAL_CONSENT_VERSION = '2026-08-28.1'

export const WITHDRAWAL_CONSENT_TEXT =
  'Solicito que la prestación del servicio comience de forma inmediata y renuncio expresamente a mi derecho de desistimiento una vez el servicio se haya prestado por completo en el periodo de suscripción contratado.'
