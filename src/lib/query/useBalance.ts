import { useQuery } from '@tanstack/react-query'
import { getBalance } from '@/lib/hcm/client'
import { keys } from './keys'

export function useBalance(employeeId: string, locationId: string) {
  return useQuery({
    queryKey: keys.balance(employeeId, locationId),
    queryFn: () => getBalance(employeeId, locationId).then(r => r.balance),
    refetchInterval: 60_000,
  })
}
