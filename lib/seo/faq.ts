// FAQ items as i18n keys, shared by the visible landing FAQ section and the
// FAQPage JSON-LD so the structured data can never drift from the page copy.
export const FAQ_ITEMS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'Can I scan a receipt with AI?',
    a: "Yes. Snap a photo of any restaurant, bar or shop receipt and TapTicket's AI reads every line item, price and tax — no typing.",
  },
  {
    q: 'How do I split a bill with friends?',
    a: "Scan the ticket, share the link and everyone taps what they had. TapTicket works out each person's share in real time, so you can split the bill without a calculator.",
  },
  {
    q: 'Do my friends need to install an app?',
    a: 'No. They open the link in their browser, claim their items and see what they owe. No account, no download.',
  },
  {
    q: 'What if we shared a dish?',
    a: 'Any item can be claimed by several people and TapTicket divides its price between them automatically.',
  },
  {
    q: 'Is TapTicket free?',
    a: 'Yes. The Free plan includes 4 scans a week at no cost, and paid plans raise the limit up to unlimited scans.',
  },
]
