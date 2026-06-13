import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { http, HttpResponse } from 'msw'
import { within, userEvent, expect } from 'storybook/test'
import { ApprovalActions } from '@/components/manager/ApprovalActions'
import { makeRequest, sseHandler } from './mocks/handlers'

const pendingRequest = makeRequest({ id: 'req-001', status: 'pending' })

const meta = {
  title: 'Manager/ApprovalActions',
  component: ApprovalActions,
  tags: ['autodocs'],
  args: {
    request: pendingRequest,
    reviewedBy: 'mgr-001',
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ApprovalActions>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {
  parameters: {
    msw: {
      handlers: [
        http.patch('/api/hcm/requests/:id', () =>
          HttpResponse.json({ request: makeRequest({ status: 'approved' }) }),
        ),
        sseHandler(),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Verify both action buttons are present before interaction
    await expect(canvas.getByRole('button', { name: 'Approve request' })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Deny request' })).toBeInTheDocument()

    // Click approve — mutation resolves immediately (MSW handler returns approved)
    await userEvent.click(canvas.getByRole('button', { name: 'Approve request' }))

    // Post-mutation: component shows "Approved ✓" feedback
    await expect(canvas.findByText('Approved ✓')).resolves.toBeInTheDocument()
  },
}

export const Approving: Story = {
  parameters: {
    msw: {
      handlers: [
        // hangs so the loading state stays visible
        http.patch('/api/hcm/requests/:id', () => new Promise(() => {})),
        sseHandler(),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Click approve — MSW hangs the request so isPending stays true
    await userEvent.click(canvas.getByRole('button', { name: 'Approve request' }))
    // Button should now be disabled with spinner
    await expect(canvas.getByRole('button', { name: 'Approve request' })).toBeDisabled()
  },
}

export const Denying: Story = {
  parameters: {
    msw: {
      handlers: [
        http.patch('/api/hcm/requests/:id', () => new Promise(() => {})),
        sseHandler(),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Open the deny dialog
    await userEvent.click(canvas.getByRole('button', { name: 'Deny request' }))
    // Confirm deny — MSW hangs the request so isDenying stays true
    const dialog = canvas.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Deny Request' }))
    // Confirm button should be disabled/loading
    await expect(within(dialog).getByRole('button', { name: 'Deny Request' })).toBeDisabled()
  },
}

export const ApproveError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.patch('/api/hcm/requests/:id', () =>
          HttpResponse.json({ error: 'Request already processed', code: 'ALREADY_PROCESSED' }, { status: 422 }),
        ),
        sseHandler(),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Approve request' }))
    // After 422 the mutation isError=true; buttons remain visible (not actioned)
    await expect(canvas.getByRole('button', { name: 'Approve request' })).toBeInTheDocument()
  },
}
