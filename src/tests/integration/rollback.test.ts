import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { useSubmitRequest } from '@/lib/query/useSubmitRequest'
import { useReservations } from '@/lib/reservations/useReservations'
import { MockEventSource, MockBroadcastChannel, createWrapper } from './helpers'

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn(), dismiss: vi.fn() },
}))

const server = setupServer()

beforeAll(() => {
  vi.stubGlobal('EventSource', MockEventSource)
  vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)
  server.listen({ onUnhandledRequest: 'warn' })
})

afterAll(() => {
  server.close()
  vi.unstubAllGlobals()
})

afterEach(() => {
  server.resetHandlers()
  MockEventSource.clear()
  MockBroadcastChannel.clear()
  localStorage.clear()
})

const PAYLOAD = {
  employeeId: 'emp-001',
  locationId: 'annual' as const,
  startDate: '2026-07-01',
  endDate: '2026-07-01',
  days: 1,
}

describe('useSubmitRequest — server errors roll back the reservation', () => {
  it('rolls back reservation to "rolled-back" on 422 INSUFFICIENT_BALANCE', async () => {
    server.use(
      http.post('/api/hcm/requests', () =>
        HttpResponse.json(
          { error: 'Insufficient balance', code: 'INSUFFICIENT_BALANCE' },
          { status: 422 },
        ),
      ),
    )

    const { result } = renderHook(
      () => ({ submit: useSubmitRequest(), res: useReservations() }),
      { wrapper: createWrapper() },
    )

    act(() => result.current.submit.mutate(PAYLOAD))

    // Optimistic reservation is added first
    await waitFor(() => expect(result.current.res.reservations).toHaveLength(1))

    // Then the error causes a rollback
    await waitFor(() => result.current.submit.isError)
    await waitFor(() => {
      expect(result.current.res.reservations[0].status).toBe('rolled-back')
    })
  })

  it('rolls back reservation on 500 server error', async () => {
    server.use(
      http.post('/api/hcm/requests', () =>
        HttpResponse.json({ error: 'Internal server error' }, { status: 500 }),
      ),
    )

    const { result } = renderHook(
      () => ({ submit: useSubmitRequest(), res: useReservations() }),
      { wrapper: createWrapper() },
    )

    act(() => result.current.submit.mutate(PAYLOAD))
    await waitFor(() => result.current.submit.isError)
    await waitFor(() => {
      expect(result.current.res.reservations[0].status).toBe('rolled-back')
    })
  })

  it('rolls back reservation on network failure', async () => {
    server.use(
      http.post('/api/hcm/requests', () => {
        throw new Error('network error')
      }),
    )

    const { result } = renderHook(
      () => ({ submit: useSubmitRequest(), res: useReservations() }),
      { wrapper: createWrapper() },
    )

    act(() => result.current.submit.mutate(PAYLOAD))
    await waitFor(() => result.current.submit.isError)
    await waitFor(() => {
      expect(result.current.res.reservations[0].status).toBe('rolled-back')
    })
  })
})
