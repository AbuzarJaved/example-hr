import type { NextRequest } from 'next/server'
import {
  createRequest,
  getAllRequests,
  getRequestsForEmployee,
  notifySubscribers,
  shouldSilentFail,
} from '@/lib/hcm/mock-store'
import type { LeaveType } from '@/lib/hcm/types'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const employeeId = searchParams.get('employeeId')

  const requests = employeeId ? getRequestsForEmployee(employeeId) : getAllRequests()
  return Response.json({ requests })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { employeeId, locationId, startDate, endDate, days } = body

  if (!employeeId || !locationId || !startDate || !endDate || typeof days !== 'number') {
    return Response.json(
      { error: 'employeeId, locationId, startDate, endDate, and days are required', code: 'MISSING_PARAMS' },
      { status: 400 },
    )
  }

  if (days <= 0) {
    return Response.json({ error: 'days must be positive', code: 'INVALID_DAYS' }, { status: 400 })
  }

  if (shouldSilentFail()) {
    // Silent failure: return a plausible-looking success but don't mutate
    const fakeId = `req-sfail-${Date.now()}`
    return Response.json({
      request: {
        id: fakeId,
        employeeId,
        locationId,
        startDate,
        endDate,
        days,
        status: 'pending',
        submittedAt: Date.now(),
      },
    })
  }

  const result = createRequest({ employeeId, locationId: locationId as LeaveType, startDate, endDate, days })

  if ('error' in result) {
    const status = result.code === 'INSUFFICIENT_BALANCE' ? 422 : 400
    return Response.json(result, { status })
  }

  notifySubscribers({
    type: 'request_created',
    employeeId,
    locationId: locationId as LeaveType,
    requestId: result.id,
    timestamp: Date.now(),
  })

  return Response.json({ request: result }, { status: 201 })
}
