import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { http, HttpResponse } from 'msw'
import { BalanceGrid } from '@/components/balance/BalanceGrid'
import { makeBalance, sseHandler } from './mocks/handlers'

const meta = {
  title: 'Balance/BalanceGrid',
  component: BalanceGrid,
  tags: ['autodocs'],
  args: { employeeId: 'emp-001' },
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof BalanceGrid>

export default meta
type Story = StoryObj<typeof meta>

const allBalances = [
  makeBalance({ locationId: 'annual', available: 15, used: 0, total: 15 }),
  makeBalance({ locationId: 'sick', available: 10, used: 0, total: 10 }),
  makeBalance({ locationId: 'personal', available: 5, used: 0, total: 5 }),
]

function perCardHandlers(balances: ReturnType<typeof makeBalance>[]) {
  return [
    http.get('/api/hcm/balance', ({ request }) => {
      const url = new URL(request.url)
      const locationId = url.searchParams.get('locationId')
      const b = balances.find(bl => bl.locationId === locationId) ?? balances[0]
      return HttpResponse.json({ balance: b })
    }),
    sseHandler(),
  ]
}

export const AllFull: Story = {
  parameters: { msw: { handlers: perCardHandlers(allBalances) } },
}

export const AllDepleted: Story = {
  parameters: {
    msw: {
      handlers: perCardHandlers([
        makeBalance({ locationId: 'annual', available: 0, used: 15, total: 15 }),
        makeBalance({ locationId: 'sick', available: 0, used: 10, total: 10 }),
        makeBalance({ locationId: 'personal', available: 0, used: 5, total: 5 }),
      ]),
    },
  },
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [http.get('/api/hcm/balance', () => new Promise(() => {}))],
    },
  },
}
