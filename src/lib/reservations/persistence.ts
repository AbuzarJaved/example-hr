import type { ReservationState } from './types'

const STORAGE_KEY = 'hcm-reservation-ledger'

export const PENDING_STALE_MS = 5 * 60 * 1000

export function readLedger(): ReservationState {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ReservationState
  } catch {
    return []
  }
}

export function writeLedger(state: ReservationState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // quota exceeded or private browsing — degrade gracefully
  }
}

export function clearLedger(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export function stalePendingIds(state: ReservationState, now = Date.now()): string[] {
  return state
    .filter(r => r.status === 'pending' && now - r.createdAt > PENDING_STALE_MS)
    .map(r => r.id)
}
