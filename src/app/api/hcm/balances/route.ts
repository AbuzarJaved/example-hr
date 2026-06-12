import type { NextRequest } from 'next/server'
import { getAllBalances, getBalancesForEmployee } from '@/lib/hcm/mock-store'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const employeeId = searchParams.get('employeeId')

  const balances = employeeId ? getBalancesForEmployee(employeeId) : getAllBalances()
  return Response.json({ balances })
}
