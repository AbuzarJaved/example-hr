export const keys = {
  balance: (employeeId: string, locationId: string) =>
    ['balance', employeeId, locationId] as const,

  balances: (employeeId?: string) =>
    employeeId ? (['balances', employeeId] as const) : (['balances'] as const),

  requests: (employeeId?: string) =>
    employeeId ? (['requests', employeeId] as const) : (['requests'] as const),

  request: (id: string) => ['request', id] as const,
}
