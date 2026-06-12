import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { BalanceSkeleton } from '@/components/balance/BalanceSkeleton'

const meta = {
  title: 'Balance/BalanceSkeleton',
  component: BalanceSkeleton,
  tags: ['autodocs'],
} satisfies Meta<typeof BalanceSkeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
