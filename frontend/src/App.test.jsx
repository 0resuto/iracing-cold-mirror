import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

describe('App Component', () => {
  it('renders without crashing', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
    
    // Check if the History tab exists (it has title="History")
    expect(screen.getByTitle(/History/i)).toBeInTheDocument();
  });
});
