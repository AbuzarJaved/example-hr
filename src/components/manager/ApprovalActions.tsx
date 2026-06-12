'use client'

import { useState } from 'react'
import type { HcmRequest } from '@/lib/hcm/types'
import { useApproveRequest, useDenyRequest } from '@/lib/query/useApproveRequest'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'

interface ApprovalActionsProps {
  request: HcmRequest
  reviewedBy: string
  onActionComplete?: () => void
}

export function ApprovalActions({ request, reviewedBy, onActionComplete }: ApprovalActionsProps) {
  const [denyOpen, setDenyOpen] = useState(false)
  const [notes, setNotes] = useState('')

  const {
    mutate: approve,
    isPending: isApproving,
    isSuccess: approveSuccess,
  } = useApproveRequest()

  const {
    mutate: deny,
    isPending: isDenying,
    isSuccess: denySuccess,
  } = useDenyRequest()

  const isActioned = approveSuccess || denySuccess
  const isBusy = isApproving || isDenying

  const handleApprove = () => {
    approve(
      {
        requestId: request.id,
        reviewedBy,
        employeeId: request.employeeId,
        locationId: request.locationId,
      },
      { onSuccess: onActionComplete },
    )
  }

  const handleDenyConfirm = () => {
    deny(
      {
        requestId: request.id,
        reviewedBy,
        employeeId: request.employeeId,
        locationId: request.locationId,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setDenyOpen(false)
          onActionComplete?.()
        },
      },
    )
  }

  if (isActioned) {
    return (
      <p className="text-xs font-medium text-zinc-400">
        {approveSuccess ? 'Approved ✓' : 'Denied ✓'}
      </p>
    )
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={isBusy}
          aria-label="Approve request"
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isApproving ? <Spinner size="sm" /> : null}
          Approve
        </button>
        <button
          onClick={() => setDenyOpen(true)}
          disabled={isBusy}
          aria-label="Deny request"
          className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {isDenying ? <Spinner size="sm" /> : null}
          Deny
        </button>
      </div>

      <Dialog
        open={denyOpen}
        title="Deny time-off request?"
        onConfirm={handleDenyConfirm}
        onCancel={() => setDenyOpen(false)}
        confirmLabel="Deny Request"
        isLoading={isDenying}
        variant="danger"
      >
        <div className="mt-3 space-y-2">
          <label htmlFor="deny-notes" className="block text-sm font-medium text-zinc-700">
            Reason <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <textarea
            id="deny-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Add a reason for the employee…"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </div>
      </Dialog>
    </>
  )
}
