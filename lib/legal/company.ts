// Identity of the data controller / service operator, rendered verbatim into the
// privacy policy, the terms and the LSSI-CE legal notice.
//
// TODO(legal): have the rendered pages reviewed by counsel before advertising.
// The pages print these values as-is, so a wrong value is visible rather than
// silently missing — that is deliberate.
export const COMPANY = {
  name: 'TapTicket',
  taxId: '48327703B',
  address: 'C/Murcia 12, Barcelona 08027',
  // Registro Mercantil entry. LSSI-CE art. 10.1(b) only requires this for
  // entities actually entered in a public registry; a sole trader (autónomo) is
  // not, so leaving this empty omits the line from the legal notice entirely.
  registry: '',
  contactEmail: 'fernandoruedaoliva@gmail.com',
  privacyEmail: 'fernandoruedaoliva@gmail.com',
} as const

// Shown as "last updated" on every legal page. Bump when the text changes.
export const LAST_UPDATED = '2026-08-09'
