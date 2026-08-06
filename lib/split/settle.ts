import type { Settlement, SettlementStatus } from '@/lib/types'
import type { UserBill } from './bill'

// sum of settlements a user has made with the given status
export function getPaidByStatus(settlements: Settlement[], userId: string, status: SettlementStatus): number {
  return settlements
    .filter((s) => s.from_user === userId && s.status === status)
    .reduce((sum, s) => sum + s.amount, 0)
}

// what a user still owes: their share minus confirmed settlements
export function getOutstanding(bill: UserBill, settlements: Settlement[]): number {
  return Math.max(0, bill.total - getPaidByStatus(settlements, bill.userId, 'confirmed'))
}
