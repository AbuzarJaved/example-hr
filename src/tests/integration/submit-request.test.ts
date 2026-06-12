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

const MOCK_REQUEST = {
  id: 'req-test-001',
  employeeId: 'emp-001',
  locationId: 'annual',
  startDate: '2026-07-01',
  endDate: '2026-07-01',
  days: 1,
  status: 'pending',
  submittedAt: Date.now(),
}

describe('useSubmitRequest — happy path via SSE', () => {
  it('creates a pending reservation optimistically before the server responds', async () => {
    // Hang the server response so we can inspect the optimistic state
    server.use(
      http.post('/api/hcm/requests', () => new Promise(() => {})),
    )

    const { result } = renderHook(
      () => ({ submit: useSubmitRequest(), res: useReservations() }),
      { wrapper: createWrapper() },
    )

    act(() => result.current.submit.mutate(PAYLOAD))

    await waitFor(() => {
      expect(result.current.res.reservations).toHaveLength(1)
      expect(result.current.res.reservations[0].status).toBe('pending')
      expect(result.current.res.reservations[0].days).toBe(1)
    })
  })

  it('confirms reservation to "confirmed" when SSE request_created event arrives', async () => {
    server.use(
      http.post('/api/hcm/requests', () =>
        HttpResponse.json({ request: MOCK_REQUEST }, { status: 201 }),
      ),
    )

    const { result } = renderHook(
      () => ({ submit: useSubmitRequest(), res: useReservations() }),
      { wrapper: createWrapper() },
    )

    act(() => result.current.submit.mutate(PAYLOAD))

    // Reservation starts pending
    await waitFor(() => expect(result.current.res.reservations[0].status).toBe('pending'))

    // Mutation resolves → onSuccess fires → EventSource is created
    await waitFor(() => result.current.submit.isSuccess)
    await waitFor(() => MockEventSource.instances.length > 0)

    // Fire the SSE event that confirms the request was created in HCM
    act(() => {
      MockEventSource.instances[0].fire({
        type: 'request_created',
        employeeId: 'emp-001',
        locationId: 'annual',
        requestId: 'req-test-001',
        timestamp: Date.now(),
      })
    })

    await waitFor(() => {
      expect(result.current.res.reservations[0].status).toBe('confirmed')
      expect(result.current.res.reservations[0].requestId).toBe('req-test-001')
    })
  })

  it('does NOT confirm on an SSE event for a different locationId', async () => {
    server.use(
      http.post('/api/hcm/requests', () =>
        HttpResponse.json({ request: MOCK_REQUEST }, { status: 201 }),
      ),
    )

    const { result } = renderHook(
      () => ({ submit: useSubmitRequest(), res: useReservations() }),
      { wrapper: createWrapper() },
    )

    act(() => result.current.submit.mutate(PAYLOAD))
    await waitFor(() => result.current.submit.isSuccess)
    await waitFor(() => MockEventSource.instances.length > 0)

    // Fire an event for a DIFFERENT cell — should be ignored
    act(() => {
      MockEventSource.instances[0].fire({
        type: 'request_created',
        employeeId: 'emp-001',
        locationId: 'sick', // wrong locationId
        requestId: 'req-test-001',
        timestamp: Date.now(),
      })
    })

    // Give React time to process any state updates
    await new Promise(r => setTimeout(r, 50))

    expect(result.current.res.reservations[0].status).toBe('pending')
  })
})
