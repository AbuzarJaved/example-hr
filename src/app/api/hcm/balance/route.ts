import type { NextRequest } from 'next/server'
import { getBalance, notifySubscribers, setBalance, shouldSilentFail } from '@/lib/hcm/mock-store'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const employeeId = searchParams.get('employeeId')
  const locationId = searchParams.get('locationId')

  if (!employeeId || !locationId) {
    return Response.json({ error: 'employeeId and locationId are required', code: 'MISSING_PARAMS' }, { status: 400 })
  }

  const balance = getBalance(employeeId, locationId)
  if (!balance) {
    return Response.json({ error: 'Balance not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  return Response.json({ balance })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { employeeId, locationId, available } = body

  if (!employeeId || !locationId || typeof available !== 'number') {
    return Response.json({ error: 'employeeId, locationId, and available are required', code: 'MISSING_PARAMS' }, { status: 400 })
  }

  if (shouldSilentFail()) {
    // Silent failure: return 200 OK but don't mutate and don't notify SSE
    const current = getBalance(employeeId, locationId)
    if (!current) return Response.json({ error: 'Balance not found', code: 'NOT_FOUND' }, { status: 404 })
    return Response.json({ balance: current })
  }

  const updated = setBalance(employeeId, locationId, available)
  if (!updated) {
    return Response.json({ error: 'Balance not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  notifySubscribers({
    type: 'balance_updated',
    employeeId,
    locationId,
    balance: updated,
    timestamp: Date.now(),
  })

  return Response.json({ balance: updated })
}
