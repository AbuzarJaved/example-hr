import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import { StaleIndicator } from '@/components/balance/StaleIndicator'

const meta = {
  title: 'Balance/StaleIndicator',
  component: StaleIndicator,
  tags: ['autodocs'],
  args: { onDismiss: fn() },
} satisfies Meta<typeof StaleIndicator>

export default meta
type Story = StoryObj<typeof meta>

export const Visible: Story = {
  args: { visible: true },
}

export const Hidden: Story = {
  args: { visible: false },
}
