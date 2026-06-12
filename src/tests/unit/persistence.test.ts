import { describe, it, expect, beforeEach } from 'vitest'
import {
  readLedger,
  writeLedger,
  clearLedger,
  stalePendingIds,
  PENDING_STALE_MS,
} from '@/lib/reservations/persistence'
import type { Reservation } from '@/lib/reservations/types'

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

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('readLedger returns empty array when nothing is stored', () => {
    expect(readLedger()).toEqual([])
  })

  it('writeLedger + readLedger round-trips a ledger', () => {
    const ledger = [makeReservation({ id: 'r1' }), makeReservation({ id: 'r2', days: 1 })]
    writeLedger(ledger)
    expect(readLedger()).toEqual(ledger)
  })

  it('clearLedger removes stored data', () => {
    writeLedger([makeReservation()])
    clearLedger()
    expect(readLedger()).toEqual([])
  })

  it('readLedger returns empty array on malformed JSON', () => {
    localStorage.setItem('hcm-reservation-ledger', '{broken')
    expect(readLedger()).toEqual([])
  })

  it('readLedger returns empty array on null storage value', () => {
    localStorage.removeItem('hcm-reservation-ledger')
    expect(readLedger()).toEqual([])
  })

  describe('stalePendingIds', () => {
    it('returns ids of pending reservations older than PENDING_STALE_MS', () => {
      const now = Date.now()
      const stale = makeReservation({ id: 'stale', createdAt: now - PENDING_STALE_MS - 1 })
      const fresh = makeReservation({ id: 'fresh', createdAt: now - 1000 })
      expect(stalePendingIds([stale, fresh], now)).toEqual(['stale'])
    })

    it('does not return confirmed reservations even if old', () => {
      const now = Date.now()
      const old = makeReservation({ id: 'old', status: 'confirmed', createdAt: now - PENDING_STALE_MS - 1 })
      expect(stalePendingIds([old], now)).toEqual([])
    })

    it('does not return rolled-back reservations', () => {
      const now = Date.now()
      const old = makeReservation({ id: 'rb', status: 'rolled-back', createdAt: now - PENDING_STALE_MS - 1 })
      expect(stalePendingIds([old], now)).toEqual([])
    })

    it('returns empty array when all pending reservations are fresh', () => {
      const now = Date.now()
      const fresh = makeReservation({ id: 'fresh', createdAt: now - 1000 })
      expect(stalePendingIds([fresh], now)).toEqual([])
    })

    it('returns multiple stale ids', () => {
      const now = Date.now()
      const s1 = makeReservation({ id: 's1', createdAt: now - PENDING_STALE_MS - 1 })
      const s2 = makeReservation({ id: 's2', createdAt: now - PENDING_STALE_MS - 5000 })
      const fresh = makeReservation({ id: 'f1', createdAt: now - 1000 })
      const ids = stalePendingIds([s1, s2, fresh], now)
      expect(ids).toContain('s1')
      expect(ids).toContain('s2')
      expect(ids).not.toContain('f1')
    })

    it('uses Date.now() as default timestamp', () => {
      const stale = makeReservation({ id: 'stale', createdAt: Date.now() - PENDING_STALE_MS - 1 })
      expect(stalePendingIds([stale])).toContain('stale')
    })
  })
})
