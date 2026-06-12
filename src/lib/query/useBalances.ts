import { useQuery } from '@tanstack/react-query'
import { getBalances } from '@/lib/hcm/client'
import { keys } from './keys'

export function useBalances(employeeId?: string) {
  return useQuery({
    queryKey: keys.balances(employeeId),
    queryFn: () => getBalances(employeeId).then(r => r.balances),
    refetchInterval: 60_000,
  })
}
