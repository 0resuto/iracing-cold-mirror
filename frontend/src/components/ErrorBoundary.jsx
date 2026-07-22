import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Frontend ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-6 text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Something went wrong</h2>
          <p className="text-zinc-400 text-sm max-w-md mb-4">
            An unexpected error occurred while rendering telemetry visuals.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-md transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
