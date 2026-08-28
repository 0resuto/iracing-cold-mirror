import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'cold-mirror-widgets/style.css'
import '@0resuto/ui-kit/style.css'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@0resuto/ui-kit'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </QueryClientProvider>
    </ToastProvider>
  </StrictMode>,
)
