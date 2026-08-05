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
        <div className="w-full h-screen flex flex-col items-center justify-center bg-brand-bg text-brand-10 p-6 text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Something went wrong</h2>
          <p className="text-brand-10/60 text-sm max-w-md mb-4">
            An unexpected error occurred while rendering telemetry visuals.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-brand-60 hover:bg-brand-60/80 text-xs font-semibold rounded-md transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
