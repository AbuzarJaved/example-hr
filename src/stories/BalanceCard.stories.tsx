import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { http, HttpResponse } from 'msw'
import { BalanceCard } from '@/components/balance/BalanceCard'
import { makeBalance, sseHandler } from './mocks/handlers'

const meta = {
  title: 'Balance/BalanceCard',
  component: BalanceCard,
  tags: ['autodocs'],
  args: {
    employeeId: 'emp-001',
    locationId: 'annual' as const,
    label: 'Annual Leave',
  },
} satisfies Meta<typeof BalanceCard>

export default meta
type Story = StoryObj<typeof meta>

export const Loaded: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/hcm/balance', () =>
          HttpResponse.json({ balance: makeBalance({ available: 12, used: 3, total: 15 }) }),
        ),
        sseHandler(),
      ],
    },
  },
}

export const FullBalance: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/hcm/balance', () =>
          HttpResponse.json({ balance: makeBalance({ available: 15, used: 0, total: 15 }) }),
        ),
        sseHandler(),
      ],
    },
  },
}

export const LowBalance: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/hcm/balance', () =>
          HttpResponse.json({ balance: makeBalance({ available: 1, used: 14, total: 15 }) }),
        ),
        sseHandler(),
      ],
    },
  },
}

export const ZeroBalance: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/hcm/balance', () =>
          HttpResponse.json({ balance: makeBalance({ available: 0, used: 15, total: 15 }) }),
        ),
        sseHandler(),
      ],
    },
  },
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        // delay forever so the skeleton stays visible
        http.get('/api/hcm/balance', () => new Promise(() => {})),
      ],
    },
  },
}

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/hcm/balance', () =>
          HttpResponse.json({ error: 'Service unavailable' }, { status: 503 }),
        ),
      ],
    },
  },
}
