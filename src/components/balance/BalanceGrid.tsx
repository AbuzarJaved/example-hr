'use client'

import type { LeaveType } from '@/lib/hcm/types'
import { BalanceCard } from './BalanceCard'

const LEAVE_TYPES: { id: LeaveType; label: string }[] = [
  { id: 'annual', label: 'Annual Leave' },
  { id: 'sick', label: 'Sick Leave' },
  { id: 'personal', label: 'Personal Leave' },
]

interface BalanceGridProps {
  employeeId: string
}

export function BalanceGrid({ employeeId }: BalanceGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {LEAVE_TYPES.map(({ id, label }) => (
        <BalanceCard key={id} employeeId={employeeId} locationId={id} label={label} />
      ))}
    </div>
  )
}
