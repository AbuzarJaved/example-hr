'use client'

import { useState, type FormEvent } from 'react'
import type { LeaveType } from '@/lib/hcm/types'
import { useBalance } from '@/lib/query/useBalance'
import { useDisplayedBalance } from '@/lib/query/useDisplayedBalance'
import { useSubmitRequest } from '@/lib/query/useSubmitRequest'
import { Spinner } from '@/components/ui/Spinner'

interface RequestFormProps {
  employeeId: string
  onSuccess?: () => void
}

const LEAVE_TYPES: { id: LeaveType; label: string }[] = [
  { id: 'annual', label: 'Annual Leave' },
  { id: 'sick', label: 'Sick Leave' },
  { id: 'personal', label: 'Personal Leave' },
]

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function countWeekdays(start: string, end: string): number {
  if (!start || !end || end < start) return 0
  let count = 0
  const cur = new Date(start + 'T12:00:00')
  const endDate = new Date(end + 'T12:00:00')
  while (cur <= endDate) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function todayIso() {
  return toIsoDate(new Date())
}

export function RequestForm({ employeeId, onSuccess }: RequestFormProps) {
  const [locationId, setLocationId] = useState<LeaveType>('annual')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const days = countWeekdays(startDate, endDate)
  const { data: balance } = useBalance(employeeId, locationId)
  const displayed = useDisplayedBalance(balance, employeeId, locationId)

  const { mutate: submit, isPending, isError, error } = useSubmitRequest()

  const canSubmit = days > 0 && (displayed === undefined || days <= displayed)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    submit(
      { employeeId, locationId, startDate, endDate, days },
      {
        onSuccess: () => {
          setStartDate('')
          setEndDate('')
          onSuccess?.()
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-100 bg-white p-5 shadow-sm space-y-4">
      <h2 className="text-base font-semibold text-zinc-900">Request Time Off</h2>

      <div className="space-y-1">
        <label htmlFor="leave-type" className="block text-sm font-medium text-zinc-700">
          Leave Type
        </label>
        <select
          id="leave-type"
          value={locationId}
          onChange={e => setLocationId(e.target.value as LeaveType)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        >
          {LEAVE_TYPES.map(lt => (
            <option key={lt.id} value={lt.id}>
              {lt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="start-date" className="block text-sm font-medium text-zinc-700">
            Start Date
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            min={todayIso()}
            onChange={e => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="end-date" className="block text-sm font-medium text-zinc-700">
            End Date
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            min={startDate || todayIso()}
            onChange={e => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </div>
      </div>

      {days > 0 && (
        <p className="text-sm text-zinc-500">
          <span className="font-medium text-zinc-800">{days}</span> working day{days !== 1 ? 's' : ''}
          {displayed !== undefined && (
            <>
              {' '}· {displayed} available
              {days > displayed && (
                <span className="ml-1 font-medium text-red-600">(insufficient balance)</span>
              )}
            </>
          )}
        </p>
      )}

      {isError && (
        <p className="text-sm text-red-600" role="alert">
          {(error as Error)?.message ?? 'Submission failed. Please try again.'}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit || isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending && <Spinner size="sm" />}
        {isPending ? 'Submitting…' : 'Submit Request'}
      </button>
    </form>
  )
}
