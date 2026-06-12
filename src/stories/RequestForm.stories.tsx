import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { http, HttpResponse } from 'msw'
import { RequestForm } from '@/components/request/RequestForm'
import { makeBalance, makeRequest, sseHandler } from './mocks/handlers'

const meta = {
  title: 'Request/RequestForm',
  component: RequestForm,
  tags: ['autodocs'],
  args: { employeeId: 'emp-001' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof RequestForm>

export default meta
type Story = StoryObj<typeof meta>

const healthyHandlers = [
  http.get('/api/hcm/balance', () =>
    HttpResponse.json({ balance: makeBalance({ available: 15, used: 0 }) }),
  ),
  sseHandler(),
]

export const Idle: Story = {
  parameters: {
    msw: {
      handlers: [
        ...healthyHandlers,
        http.post('/api/hcm/requests', () =>
          HttpResponse.json({ request: makeRequest() }, { status: 201 }),
        ),
      ],
    },
  },
}

export const InsufficientBalance: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/hcm/balance', () =>
          HttpResponse.json({ balance: makeBalance({ available: 1, used: 14 }) }),
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
          HttpResponse.json({ balance: makeBalance({ available: 0, used: 15 }) }),
        ),
        sseHandler(),
      ],
    },
  },
}

export const SubmitError: Story = {
  parameters: {
    msw: {
      handlers: [
        ...healthyHandlers,
        http.post('/api/hcm/requests', () =>
          HttpResponse.json({ error: 'Service temporarily unavailable', code: 'SERVICE_ERROR' }, { status: 503 }),
        ),
      ],
    },
  },
}
