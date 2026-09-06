// Identity of the data controller / service operator, rendered verbatim into the
// privacy policy, the terms and the LSSI-CE legal notice.
//
// TODO(legal): have the rendered pages reviewed by counsel before advertising.
// LEGAL STATUS: operated by a natural person — unlimited personal liability
// (art. 1911 CC). Form an SL before scaling beyond beta; no clause in the
// terms changes that.
// The operator's personal name, tax ID and postal address are deliberately NOT
// published: the pages identify the service by its trade name and offer the
// full details on request by email. LSSI-CE art. 10.1(a) and GDPR art. 13
// expect the operator to be identifiable, so publish a business address (never
// a home one) here once there is one.
export const COMPANY = {
  name: 'TapTicket',
  // Registro Mercantil entry. LSSI-CE art. 10.1(b) only requires this for
  // entities actually entered in a public registry; a sole trader (autónomo) is
  // not, so leaving this empty omits the line from the legal notice entirely.
  registry: '',
  // Any address at tapticket.es reaches the operator (catch-all).
  contactEmail: 'support@tapticket.es',
  privacyEmail: 'privacy@tapticket.es',
} as const

// Shown as "last updated" on every legal page. Bump when the text changes.
export const LAST_UPDATED = '2026-09-06'
