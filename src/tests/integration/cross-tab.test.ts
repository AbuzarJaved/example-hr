import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useReservations } from '@/lib/reservations/useReservations'
import { MockBroadcastChannel, createWrapper } from './helpers'

const CHANNEL_NAME = 'hcm-reservation-ledger'

beforeAll(() => {
  vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  MockBroadcastChannel.clear()
  localStorage.clear()
})

function getReservationChannel() {
  return MockBroadcastChannel.instances.find(ch => ch.name === CHANNEL_NAME)!
}

describe('ReservationProvider — BroadcastChannel cross-tab sync', () => {
  it('applies an ADD action received from another tab', async () => {
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })

    await waitFor(() => MockBroadcastChannel.instances.length > 0)
    const channel = getReservationChannel()

    act(() => {
      channel.receive({
        type: 'ADD',
        payload: { id: 'cross-tab-r1', employeeId: 'emp-002', locationId: 'annual', days: 2 },
      })
    })

    await waitFor(() => {
      expect(result.current.reservations).toHaveLength(1)
      expect(result.current.reservations[0].id).toBe('cross-tab-r1')
      expect(result.current.reservations[0].employeeId).toBe('emp-002')
      expect(result.current.reservations[0].status).toBe('pending')
    })
  })

  it('applies a CONFIRM action received from another tab', async () => {
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })

    // First add a reservation locally so there is something to confirm
    act(() => result.current.addReservation('r-to-confirm', 'emp-001', 'annual', 3))
    await waitFor(() => result.current.reservations).then(() =>
      expect(result.current.reservations[0].status).toBe('pending'),
    )

    await waitFor(() => MockBroadcastChannel.instances.length > 0)

    act(() => {
      getReservationChannel().receive({
        type: 'CONFIRM',
        payload: { id: 'r-to-confirm', requestId: 'req-from-other-tab' },
      })
    })

    await waitFor(() => {
      expect(result.current.reservations[0].status).toBe('confirmed')
      expect(result.current.reservations[0].requestId).toBe('req-from-other-tab')
    })
  })

  it('applies a ROLLBACK action received from another tab', async () => {
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })

    act(() => result.current.addReservation('r-to-rollback', 'emp-001', 'sick', 2))
    await waitFor(() => expect(result.current.reservations[0].status).toBe('pending'))
    await waitFor(() => MockBroadcastChannel.instances.length > 0)

    act(() => {
      getReservationChannel().receive({
        type: 'ROLLBACK',
        payload: { id: 'r-to-rollback', reason: 'cancelled-by-other-tab' },
      })
    })

    await waitFor(() => {
      expect(result.current.reservations[0].status).toBe('rolled-back')
    })
  })

  it('broadcasts outgoing ADD actions so other tabs can receive them', async () => {
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })
    await waitFor(() => MockBroadcastChannel.instances.length > 0)

    const channel = getReservationChannel()
    const postMessageSpy = vi.spyOn(channel, 'postMessage')

    act(() => result.current.addReservation('r-outgoing', 'emp-001', 'personal', 1))

    await waitFor(() => expect(result.current.reservations).toHaveLength(1))

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ADD' }),
    )
  })
})
