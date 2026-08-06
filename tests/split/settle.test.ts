import { expect, it } from 'vitest'
import { getOutstanding, getPaidByStatus } from '@/lib/split'
import type { Settlement } from '@/lib/types'

function settlement(overrides: Partial<Settlement>): Settlement {
  return {
    id: 's1',
    ticket_id: 't1',
    from_user: 'u1',
    amount: 5,
    proof_path: 't1/s1.jpg',
    status: 'pending',
    created_at: '2026-01-01',
    resolved_at: null,
    ...overrides,
  }
}

const bill = { userId: 'u1', items: [], total: 12 }

it('sums settlements by from_user and status', () => {
  const settlements = [
    settlement({ id: 's1', amount: 5, status: 'confirmed' }),
    settlement({ id: 's2', amount: 3, status: 'confirmed' }),
    settlement({ id: 's3', amount: 4, status: 'pending' }),
    settlement({ id: 's4', amount: 2, status: 'rejected' }),
    settlement({ id: 's5', amount: 9, status: 'confirmed', from_user: 'u2' }),
  ]
  expect(getPaidByStatus(settlements, 'u1', 'confirmed')).toBe(8)
  expect(getPaidByStatus(settlements, 'u1', 'pending')).toBe(4)
  expect(getPaidByStatus(settlements, 'u1', 'rejected')).toBe(2)
  expect(getPaidByStatus(settlements, 'u2', 'confirmed')).toBe(9)
})

it('outstanding subtracts confirmed settlements only', () => {
  const settlements = [
    settlement({ id: 's1', amount: 5, status: 'confirmed' }),
    settlement({ id: 's2', amount: 4, status: 'pending' }),
    settlement({ id: 's3', amount: 3, status: 'rejected' }),
  ]
  expect(getOutstanding(bill, settlements)).toBe(7)
})

it('outstanding never goes below zero', () => {
  const settlements = [settlement({ id: 's1', amount: 20, status: 'confirmed' })]
  expect(getOutstanding(bill, settlements)).toBe(0)
  expect(getOutstanding(bill, [])).toBe(12)
})
