import { Badge } from '@/components/ui/Badge'
import type { ReservationStatus } from '@/lib/reservations/types'
import type { HcmRequest } from '@/lib/hcm/types'

type AnyStatus = ReservationStatus | HcmRequest['status']

interface RequestStatusBadgeProps {
  status: AnyStatus
}

const labelMap: Record<AnyStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  approved: 'Approved',
  denied: 'Denied',
  'rolled-back': 'Rolled back',
  'silent-failure-detected': 'Needs retry',
  expired: 'Expired',
}

const variantMap: Record<AnyStatus, 'warning' | 'success' | 'error' | 'info' | 'muted'> = {
  pending: 'warning',
  confirmed: 'success',
  approved: 'success',
  denied: 'error',
  'rolled-back': 'error',
  'silent-failure-detected': 'error',
  expired: 'muted',
}

export function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
  return (
    <Badge variant={variantMap[status]}>
      {labelMap[status] ?? status}
    </Badge>
  )
}
