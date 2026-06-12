import { describe, it, expect } from 'vitest'
import { reservationReducer, initialState } from '@/lib/reservations/reservationReducer'
import type { ReservationState } from '@/lib/reservations/types'

function add(state: ReservationState, id: string, days = 3) {
  return reservationReducer(state, {
    type: 'ADD',
    payload: { id, employeeId: 'emp-001', locationId: 'annual', days },
  })
}

describe('reservationReducer', () => {
  describe('ADD', () => {
    it('appends a pending reservation with null requestId', () => {
      const state = add(initialState, 'r1')
      expect(state).toHaveLength(1)
      expect(state[0]).toMatchObject({
        id: 'r1',
        status: 'pending',
        days: 3,
        requestId: null,
        employeeId: 'emp-001',
        locationId: 'annual',
      })
    })

    it('sets createdAt and updatedAt close to now', () => {
      const before = Date.now()
      const state = add(initialState, 'r1')
      expect(state[0].createdAt).toBeGreaterThanOrEqual(before)
      expect(state[0].updatedAt).toBeGreaterThanOrEqual(before)
    })

    it('does not mutate existing entries', () => {
      const s1 = add(initialState, 'r1')
      const s2 = add(s1, 'r2', 1)
      expect(s2).toHaveLength(2)
      expect(s1).toHaveLength(1) // original unchanged
    })
  })

  describe('CONFIRM', () => {
    it('sets status to confirmed and records requestId', () => {
      const state = reservationReducer(add(initialState, 'r1'), {
        type: 'CONFIRM',
        payload: { id: 'r1', requestId: 'req-abc' },
      })
      expect(state[0]).toMatchObject({ status: 'confirmed', requestId: 'req-abc' })
    })

    it('only updates the matching reservation', () => {
      let state = add(initialState, 'r1')
      state = add(state, 'r2')
      state = reservationReducer(state, { type: 'CONFIRM', payload: { id: 'r1', requestId: 'req-abc' } })
      expect(state[0].status).toBe('confirmed')
      expect(state[1].status).toBe('pending')
    })

    it('is a no-op for unknown id', () => {
      const state = reservationReducer(initialState, { type: 'CONFIRM', payload: { id: 'nope', requestId: 'req-1' } })
      expect(state).toHaveLength(0)
    })
  })

  describe('ROLLBACK', () => {
    it('sets status to rolled-back', () => {
      const state = reservationReducer(add(initialState, 'r1'), {
        type: 'ROLLBACK',
        payload: { id: 'r1' },
      })
      expect(state[0].status).toBe('rolled-back')
    })

    it('preserves other reservations unchanged', () => {
      let state = add(initialState, 'r1')
      state = add(state, 'r2')
      state = reservationReducer(state, { type: 'ROLLBACK', payload: { id: 'r1' } })
      expect(state[1].status).toBe('pending')
    })
  })

  describe('SILENT_FAILURE_DETECTED', () => {
    it('sets status to silent-failure-detected', () => {
      const state = reservationReducer(add(initialState, 'r1'), {
        type: 'SILENT_FAILURE_DETECTED',
        payload: { id: 'r1' },
      })
      expect(state[0].status).toBe('silent-failure-detected')
    })
  })

  describe('EXPIRE', () => {
    it('sets status to expired', () => {
      const state = reservationReducer(add(initialState, 'r1'), {
        type: 'EXPIRE',
        payload: { id: 'r1' },
      })
      expect(state[0].status).toBe('expired')
    })
  })

  describe('concurrent mutations', () => {
    it('handles multiple pending reservations for same cell independently', () => {
      let state = initialState
      state = add(state, 'r1', 3)
      state = add(state, 'r2', 2)
      state = reservationReducer(state, { type: 'CONFIRM', payload: { id: 'r1', requestId: 'req-1' } })
      state = reservationReducer(state, { type: 'ROLLBACK', payload: { id: 'r2' } })

      expect(state[0]).toMatchObject({ status: 'confirmed', requestId: 'req-1' })
      expect(state[1]).toMatchObject({ status: 'rolled-back' })
    })

    it('updatedAt is newer than createdAt after a transition', () => {
      const s1 = add(initialState, 'r1')
      const createdAt = s1[0].createdAt
      const s2 = reservationReducer(s1, { type: 'CONFIRM', payload: { id: 'r1', requestId: 'req-1' } })
      expect(s2[0].updatedAt).toBeGreaterThanOrEqual(createdAt)
    })
  })
})
