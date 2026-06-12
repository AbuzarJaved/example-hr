import type { NextRequest } from 'next/server'
import { approveRequest, denyRequest, getRequest, shouldSilentFail } from '@/lib/hcm/mock-store'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const request = getRequest(id)
  if (!request) {
    return Response.json({ error: 'Request not found', code: 'NOT_FOUND' }, { status: 404 })
  }
  return Response.json({ request })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json()
  const { action, reviewedBy, notes } = body

  if (!action || !reviewedBy) {
    return Response.json(
      { error: 'action and reviewedBy are required', code: 'MISSING_PARAMS' },
      { status: 400 },
    )
  }

  if (action !== 'approve' && action !== 'deny') {
    return Response.json({ error: 'action must be approve or deny', code: 'INVALID_ACTION' }, { status: 400 })
  }

  if (shouldSilentFail()) {
    // Silent failure: return current state as-is without mutating or emitting SSE
    const current = getRequest(id)
    if (!current) return Response.json({ error: 'Request not found', code: 'NOT_FOUND' }, { status: 404 })
    return Response.json({ request: current })
  }

  const result = action === 'approve' ? approveRequest(id, reviewedBy) : denyRequest(id, reviewedBy, notes)

  if ('error' in result) {
    const status = result.code === 'NOT_FOUND' ? 404 : 422
    return Response.json(result, { status })
  }

  return Response.json({ request: result })
}
