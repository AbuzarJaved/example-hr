import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { RequestStatusBadge } from '@/components/request/RequestStatusBadge'

const meta = {
  title: 'Request/RequestStatusBadge',
  component: RequestStatusBadge,
  tags: ['autodocs'],
} satisfies Meta<typeof RequestStatusBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Pending: Story = { args: { status: 'pending' } }
export const Confirmed: Story = { args: { status: 'confirmed' } }
export const Approved: Story = { args: { status: 'approved' } }
export const Denied: Story = { args: { status: 'denied' } }
export const RolledBack: Story = { args: { status: 'rolled-back' } }
export const SilentFailureDetected: Story = { args: { status: 'silent-failure-detected' } }
export const Expired: Story = { args: { status: 'expired' } }
