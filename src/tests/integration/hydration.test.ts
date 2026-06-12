import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useReservations } from '@/lib/reservations/useReservations'
import { MockBroadcastChannel, createWrapper } from './helpers'
import type { ReservationState } from '@/lib/reservations/types'

const STORAGE_KEY = 'hcm-reservation-ledger'

beforeAll(() => {
  vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  MockBroadcastChannel.clear()
  localStorage.clear()
  vi.useRealTimers()
})

function writeToStorage(state: ReservationState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

describe('ReservationProvider — localStorage hydration', () => {
  it('restores reservations from localStorage on mount', async () => {
    const saved: ReservationState = [
      {
        id: 'hydrated-r1',
        employeeId: 'emp-001',
        locationId: 'annual',
        days: 3,
        requestId: null,
        status: 'pending',
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000,
      },
    ]
    writeToStorage(saved)

    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.reservations).toHaveLength(1)
      expect(result.current.reservations[0].id).toBe('hydrated-r1')
      expect(result.current.reservations[0].status).toBe('pending')
    })
  })

  it('hydrates multiple reservations with different statuses', async () => {
    const saved: ReservationState = [
      {
        id: 'r-confirmed',
        employeeId: 'emp-001',
        locationId: 'annual',
        days: 2,
        requestId: 'req-abc',
        status: 'confirmed',
        createdAt: Date.now() - 60000,
        updatedAt: Date.now() - 55000,
      },
      {
        id: 'r-pending',
        employeeId: 'emp-001',
        locationId: 'sick',
        days: 1,
        requestId: null,
        status: 'pending',
        createdAt: Date.now() - 10000,
        updatedAt: Date.now() - 10000,
      },
    ]
    writeToStorage(saved)

    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.reservations).toHaveLength(2))
    const ids = result.current.reservations.map(r => r.id)
    expect(ids).toContain('r-confirmed')
    expect(ids).toContain('r-pending')
  })

  it('starts with empty state when localStorage is empty', async () => {
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })
    expect(result.current.reservations).toHaveLength(0)
  })

  it('starts with empty state when localStorage contains malformed JSON', async () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{')
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })
    expect(result.current.reservations).toHaveLength(0)
  })
})

describe('ReservationProvider — expiry sweep via useReservationExpiry', () => {
  it('expires pending reservations older than 5 minutes after the 60-second sweep', async () => {
    vi.useFakeTimers()

    const OLD_TS = Date.now() - 6 * 60 * 1000 // 6 minutes ago
    const saved: ReservationState = [
      {
        id: 'old-pending',
        employeeId: 'emp-001',
        locationId: 'annual',
        days: 1,
        requestId: null,
        status: 'pending',
        createdAt: OLD_TS,
        updatedAt: OLD_TS,
      },
    ]
    writeToStorage(saved)

    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })

    // Hydration is synchronous — should be pending at mount
    expect(result.current.reservations[0].status).toBe('pending')

    // Advance past one sweep interval; act() flushes the resulting React update
    await act(async () => {
      vi.advanceTimersByTime(60_001)
    })

    // Direct assertion — waitFor hangs with fake timers since RTL polling uses setTimeout
    expect(result.current.reservations[0].status).toBe('expired')
  })

  it('does NOT expire recently-created pending reservations during the sweep', async () => {
    vi.useFakeTimers()

    const RECENT_TS = Date.now() - 30 * 1000 // 30 seconds ago — well under 5 minutes
    const saved: ReservationState = [
      {
        id: 'recent-pending',
        employeeId: 'emp-001',
        locationId: 'annual',
        days: 1,
        requestId: null,
        status: 'pending',
        createdAt: RECENT_TS,
        updatedAt: RECENT_TS,
      },
    ]
    writeToStorage(saved)

    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })

    await act(async () => {
      vi.advanceTimersByTime(60_001)
    })

    // Still pending — hasn't reached the 5-minute threshold
    expect(result.current.reservations[0].status).toBe('pending')
  })
})
