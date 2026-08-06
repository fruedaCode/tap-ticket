import type { InferredTicket } from '@/lib/types'
import type { ScanInput, TicketScanner } from './types'

export class MockScanner implements TicketScanner {
  async scan(_input: ScanInput): Promise<InferredTicket> {
    return {
      restaurant: { name: 'PICARDIA CAFE S.L.', address: 'C/ Mallorca 123, Barcelona', phone: '931234567', NIF: 'B-12345678' },
      invoice: { type: 'FACTURA SIMPLIFICADA', operation_number: '1DD4F067-115', table: '12', date: '04/12/2024', cashier: '' },
      items: [
        { quantity: 2, description: 'Tapa Aperitivo', unitPrice: 3.0, price: 6.0, discount_percentage: null, discount_amount: null },
        { quantity: 2, description: 'Vermut de la casa', unitPrice: 3.5, price: 7.0, discount_percentage: null, discount_amount: null },
        { quantity: 1, description: 'Parmigiano Fries', unitPrice: 4.4, price: 4.4, discount_percentage: null, discount_amount: null },
        { quantity: 1, description: 'Caña', unitPrice: 1.5, price: 1.5, discount_percentage: null, discount_amount: null },
      ],
      totals: { base: 17.18, tax: { percentage: 10, amount: 1.72 }, total_without_tax: 17.18, total_with_tax: 18.9 },
    }
  }
}
