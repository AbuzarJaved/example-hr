import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { OptimisticRequestRow } from '@/components/request/OptimisticRequestRow'
import type { Reservation } from '@/lib/reservations/types'

const base: Reservation = {
  id: 'res-story-1',
  employeeId: 'emp-001',
  locationId: 'annual',
  days: 3,
  requestId: null,
  status: 'pending',
  createdAt: Date.now() - 5000,
  updatedAt: Date.now() - 5000,
}

const meta = {
  title: 'Request/OptimisticRequestRow',
  component: OptimisticRequestRow,
  tags: ['autodocs'],
  args: { reservation: base },
} satisfies Meta<typeof OptimisticRequestRow>

export default meta
type Story = StoryObj<typeof meta>

export const Pending: Story = {}

export const Confirmed: Story = {
  args: { reservation: { ...base, status: 'confirmed', requestId: 'req-001' } },
}

export const RolledBack: Story = {
  args: { reservation: { ...base, status: 'rolled-back' } },
}

export const SilentFailureDetected: Story = {
  args: { reservation: { ...base, status: 'silent-failure-detected' } },
}

export const Expired: Story = {
  args: { reservation: { ...base, status: 'expired' } },
}
