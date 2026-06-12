'use client'

import type { HcmRequest, LeaveType } from '@/lib/hcm/types'
import { BalanceAtDecisionTime } from './BalanceAtDecisionTime'
import { ApprovalActions } from './ApprovalActions'
import { RequestStatusBadge } from '@/components/request/RequestStatusBadge'

// Demo-only name map — a real implementation reads from auth/HR service
const EMPLOYEE_NAMES: Record<string, string> = {
  'emp-001': 'Alice',
  'emp-002': 'Bob',
  'emp-003': 'Charlie',
  'mgr-001': 'Diana',
}

const LEAVE_LABELS: Record<LeaveType, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  personal: 'Personal Leave',
}

interface PendingRequestCardProps {
  request: HcmRequest
  reviewedBy: string
}

export function PendingRequestCard({ request, reviewedBy }: PendingRequestCardProps) {
  const employeeName = EMPLOYEE_NAMES[request.employeeId] ?? request.employeeId
  const isPending = request.status === 'pending'

  return (
    <article
      className="rounded-xl border border-zinc-100 bg-white p-5 shadow-sm space-y-4"
      aria-label={`Request from ${employeeName}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-zinc-900">{employeeName}</p>
          <p className="text-sm text-zinc-500">
            {LEAVE_LABELS[request.locationId]} · {request.days}d
          </p>
        </div>
        <RequestStatusBadge status={request.status} />
      </div>

      {/* Date range */}
      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <span className="font-medium">{request.startDate}</span>
        <span className="text-zinc-300">→</span>
        <span className="font-medium">{request.endDate}</span>
      </div>

      {/* Fresh balance — always fetched at decision time */}
      <BalanceAtDecisionTime
        employeeId={request.employeeId}
        locationId={request.locationId}
        requestedDays={request.days}
      />

      {/* Actions — only for pending requests */}
      {isPending && (
        <div className="border-t border-zinc-100 pt-4">
          <ApprovalActions request={request} reviewedBy={reviewedBy} />
        </div>
      )}
    </article>
  )
}
