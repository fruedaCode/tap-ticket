import { expect, it } from 'vitest'
import { getActivePaid, getCoveredClaims, getOutstanding, getPaidByStatus, getSettledItemIds, getSettledTotal } from '@/lib/split'
import type { ItemAssignment, Settlement } from '@/lib/types'

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

const item = (id: string, price: number, assignments: ItemAssignment[]) => ({
  id,
  quantity: 1,
  price,
  discount_percentage: 0,
  discount_amount: 0,
  assignments,
})
const claim = (itemId: string, userId: string, amount: number, payment_type: 'unit' | 'percentage' = 'unit'): ItemAssignment =>
  ({ id: `${itemId}-${userId}`, item_id: itemId, user_id: userId, payment_type, amount })

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

it('active paid sums pending and confirmed, not rejected', () => {
  const settlements = [
    settlement({ id: 's1', amount: 5, status: 'confirmed' }),
    settlement({ id: 's2', amount: 4, status: 'pending' }),
    settlement({ id: 's3', amount: 3, status: 'rejected' }),
    settlement({ id: 's4', amount: 9, status: 'confirmed', from_user: 'u2' }),
  ]
  expect(getActivePaid(settlements, 'u1')).toBe(9)
  expect(getActivePaid(settlements, 'u2')).toBe(9)
  expect(getActivePaid([], 'u1')).toBe(0)
})

it('outstanding subtracts active (non-rejected) settlements', () => {
  const settlements = [
    settlement({ id: 's1', amount: 5, status: 'confirmed' }),
    settlement({ id: 's2', amount: 4, status: 'pending' }),
    settlement({ id: 's3', amount: 3, status: 'rejected' }),
  ]
  expect(getOutstanding(bill, settlements)).toBe(3)
})

it('outstanding never goes below zero', () => {
  const settlements = [settlement({ id: 's1', amount: 20, status: 'pending' })]
  expect(getOutstanding(bill, settlements)).toBe(0)
  expect(getOutstanding(bill, [])).toBe(12)
})

it('settled total sums active settlements across all users', () => {
  const settlements = [
    settlement({ id: 's1', amount: 5, status: 'confirmed' }),
    settlement({ id: 's2', amount: 9, status: 'confirmed', from_user: 'u2' }),
    settlement({ id: 's3', amount: 4, status: 'pending' }),
    settlement({ id: 's4', amount: 2, status: 'rejected' }),
  ]
  expect(getSettledTotal(settlements)).toBe(18)
  expect(getSettledTotal([])).toBe(0)
})

it('covered claims follow the payment waterfall per user', () => {
  const items = [
    item('i1', 5.5, [claim('i1', 'u1', 1)]),
    item('i2', 5.5, [claim('i2', 'u1', 1)]),
  ]
  // paying 5.5 covers the first claim only — the second stays un-assignable
  const covered = getCoveredClaims(items, [settlement({ amount: 5.5, status: 'pending' })])
  expect(covered.has('i1:u1')).toBe(true)
  expect(covered.has('i2:u1')).toBe(false)
  // no payments, nothing covered
  expect(getCoveredClaims(items, []).size).toBe(0)
  // rejected payments cover nothing
  expect(getCoveredClaims(items, [settlement({ amount: 11, status: 'rejected' })]).size).toBe(0)
})

it('a payment covers claimed items in ticket order, not all of them at once', () => {
  const items = [
    item('i1', 5.5, [claim('i1', 'u1', 1)]),
    item('i2', 5.5, [claim('i2', 'u1', 1)]),
  ]
  // paying 5.5 settles only the first item
  expect([...getSettledItemIds(items, [settlement({ amount: 5.5, status: 'pending' })])]).toEqual(['i1'])
  // paying the full 11 settles both
  expect(getSettledItemIds(items, [settlement({ amount: 11, status: 'pending' })]).size).toBe(2)
})

it('a shared item is settled only when every claimant has paid their share of it', () => {
  const items = [item('i1', 10, [claim('i1', 'u1', 0.5, 'percentage'), claim('i1', 'u2', 0.5, 'percentage')])]
  expect(getSettledItemIds(items, [settlement({ amount: 5 })]).size).toBe(0)
  const both = [settlement({ id: 's1', amount: 5 }), settlement({ id: 's2', amount: 5, from_user: 'u2' })]
  expect(getSettledItemIds(items, both).has('i1')).toBe(true)
})

it('rejected payments do not settle items, and unpaid items stay unsettled', () => {
  const items = [item('i1', 5.5, [claim('i1', 'u1', 1)])]
  expect(getSettledItemIds(items, [settlement({ amount: 5.5, status: 'rejected' })]).size).toBe(0)
  // fully paid but not fully assigned
  const partial = [item('i2', 5.5, [])]
  expect(getSettledItemIds(partial, [settlement({ amount: 5.5 })]).size).toBe(0)
})
