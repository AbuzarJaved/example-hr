import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type React from 'react'
import { useReservationExpiry } from '@/lib/reservations/useReservationExpiry'
import type { Reservation, ReservationAction } from '@/lib/reservations/types'

const PENDING_EXPIRY_MS = 5 * 60 * 1000
const EXPIRY_SWEEP_INTERVAL_MS = 60_000

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'res-1',
    employeeId: 'emp-001',
    locationId: 'annual',
    days: 3,
    requestId: null,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

describe('useReservationExpiry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('dispatches EXPIRE for pending reservations older than 5 minutes when sweep runs', () => {
    const now = Date.now()
    const stale = makeReservation({ id: 'stale', createdAt: now - PENDING_EXPIRY_MS - 1000 })
    const fresh = makeReservation({ id: 'fresh', createdAt: now - 1000 })
    const dispatch = vi.fn<(a: ReservationAction) => void>()

    renderHook(() => useReservationExpiry([stale, fresh], dispatch as React.Dispatch<ReservationAction>))

    act(() => {
      vi.advanceTimersByTime(EXPIRY_SWEEP_INTERVAL_MS)
    })

    const expiredIds = (dispatch.mock.calls as Array<[ReservationAction]>)
      .filter(([a]) => a.type === 'EXPIRE')
      .map(([a]) => (a as Extract<ReservationAction, { type: 'EXPIRE' }>).payload.id)

    expect(expiredIds).toContain('stale')
    expect(expiredIds).not.toContain('fresh')
  })

  it('does not dispatch EXPIRE for non-pending reservations even if old', () => {
    const now = Date.now()
    const confirmed = makeReservation({ id: 'c1', status: 'confirmed', createdAt: now - PENDING_EXPIRY_MS - 1000 })
    const dispatch = vi.fn<(a: ReservationAction) => void>()

    renderHook(() => useReservationExpiry([confirmed], dispatch as React.Dispatch<ReservationAction>))

    act(() => {
      vi.advanceTimersByTime(EXPIRY_SWEEP_INTERVAL_MS)
    })

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('sweeps again after the second interval fires', () => {
    const now = Date.now()
    const stale = makeReservation({ id: 'stale', createdAt: now - PENDING_EXPIRY_MS - 1000 })
    const dispatch = vi.fn<(a: ReservationAction) => void>()

    renderHook(() => useReservationExpiry([stale], dispatch as React.Dispatch<ReservationAction>))

    act(() => {
      vi.advanceTimersByTime(EXPIRY_SWEEP_INTERVAL_MS * 2)
    })

    const expireCalls = (dispatch.mock.calls as Array<[ReservationAction]>).filter(([a]) => a.type === 'EXPIRE')
    expect(expireCalls.length).toBeGreaterThanOrEqual(2)
  })

  it('clears the interval on unmount', () => {
    const dispatch = vi.fn()
    const { unmount } = renderHook(() => useReservationExpiry([], dispatch))

    unmount()

    act(() => {
      vi.advanceTimersByTime(EXPIRY_SWEEP_INTERVAL_MS * 3)
    })

    expect(dispatch).not.toHaveBeenCalled()
  })
})
