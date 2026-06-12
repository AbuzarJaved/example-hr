import type { NextRequest } from 'next/server'
import { isSilentFailMode, resetStore, toggleSilentFail, triggerAnniversaryBonus } from '@/lib/hcm/mock-store'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, employeeId, locationId, amount, delayMs } = body

  switch (action) {
    case 'anniversary_bonus': {
      if (!employeeId || !locationId || typeof amount !== 'number') {
        return Response.json(
          { error: 'employeeId, locationId, and amount required', code: 'MISSING_PARAMS' },
          { status: 400 },
        )
      }
      triggerAnniversaryBonus(employeeId, locationId, amount, delayMs ?? 3000)
      return Response.json({
        ok: true,
        message: `Anniversary bonus of ${amount} days scheduled for ${employeeId}:${locationId} in ${delayMs ?? 3000}ms`,
      })
    }

    case 'toggle_silent_fail': {
      const nowEnabled = toggleSilentFail()
      return Response.json({ ok: true, silentFailMode: nowEnabled })
    }

    case 'status': {
      return Response.json({ ok: true, silentFailMode: isSilentFailMode() })
    }

    case 'reset_store': {
      resetStore()
      return Response.json({ ok: true, message: 'Store reset to initial seed state' })
    }

    default:
      return Response.json(
        { error: `Unknown action: ${action}`, code: 'UNKNOWN_ACTION' },
        { status: 400 },
      )
  }
}

export async function GET() {
  return Response.json({ ok: true, silentFailMode: isSilentFailMode() })
}
