import type { Preview } from '@storybook/nextjs-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initialize, mswLoader } from 'msw-storybook-addon'
import React from 'react'
import { Toaster } from 'react-hot-toast'
import { ReservationProvider } from '../src/lib/reservations/ReservationContext'
import '../src/app/globals.css'

initialize({ onUnhandledRequest: 'bypass' })

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    msw: { handlers: [] },
    a11y: { test: 'todo' },
  },
  loaders: [mswLoader],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 0 },
          mutations: { retry: false },
        },
      })
      return (
        <QueryClientProvider client={queryClient}>
          <ReservationProvider>
            <Story />
            <Toaster position="bottom-right" />
          </ReservationProvider>
        </QueryClientProvider>
      )
    },
  ],
}

export default preview
