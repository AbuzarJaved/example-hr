import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { http, HttpResponse } from 'msw'
import { PendingRequestCard } from '@/components/manager/PendingRequestCard'
import { makeBalance, makeRequest, sseHandler } from './mocks/handlers'

const meta = {
  title: 'Manager/PendingRequestCard',
  component: PendingRequestCard,
  tags: ['autodocs'],
  args: {
    request: makeRequest({ id: 'req-001', employeeId: 'emp-001', locationId: 'annual', days: 3, status: 'pending' }),
    reviewedBy: 'mgr-001',
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PendingRequestCard>

export default meta
type Story = StoryObj<typeof meta>

const healthyBalance = http.get('/api/hcm/balance', () =>
  HttpResponse.json({ balance: makeBalance({ available: 15, used: 0, total: 15 }) }),
)

export const LoadingBalance: Story = {
  parameters: {
    msw: {
      handlers: [
        // Balance fetch hangs — shows loading state inside card
        http.get('/api/hcm/balance', () => new Promise(() => {})),
        sseHandler(),
      ],
    },
  },
}

export const BalanceSufficient: Story = {
  parameters: {
    msw: {
      handlers: [
        healthyBalance,
        http.patch('/api/hcm/requests/:id', () =>
          HttpResponse.json({ request: makeRequest({ status: 'approved' }) }),
        ),
        sseHandler(),
      ],
    },
  },
}

export const BalanceInsufficient: Story = {
  args: {
    request: makeRequest({ days: 14 }),
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/hcm/balance', () =>
          HttpResponse.json({ balance: makeBalance({ available: 2, used: 13, total: 15 }) }),
        ),
        sseHandler(),
      ],
    },
  },
}

export const Approved: Story = {
  args: {
    request: makeRequest({
      status: 'approved',
      reviewedBy: 'mgr-001',
      reviewedAt: Date.now() - 60_000,
    }),
  },
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

export const Denied: Story = {
  args: {
    request: makeRequest({
      status: 'denied',
      reviewedBy: 'mgr-001',
      reviewedAt: Date.now() - 60_000,
      notes: 'Peak period — insufficient cover',
    }),
  },
  parameters: {
    msw: {
      handlers: [healthyBalance, sseHandler()],
    },
  },
}
