import type { Preview } from '@storybook/nextjs-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initialize, mswLoader } from 'msw-storybook-addon'
import React from 'react'
import { Toaster } from 'react-hot-toast'
import '../src/app/globals.css'

// Initialize MSW
initialize({
  onUnhandledRequest: 'bypass',
})

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    msw: {
      handlers: [],
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
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
          <Story />
          <Toaster position="bottom-right" />
        </QueryClientProvider>
      )
    },
  ],
}

export default preview
