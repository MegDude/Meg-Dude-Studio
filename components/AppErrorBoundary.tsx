import React from 'react';

type AppErrorBoundaryState = {
  error: Error | null;
};

class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application render failed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-white text-navy-900 flex items-center justify-center p-6">
          <div className="dp-panel max-w-xl w-full p-6 text-center">
            <h1 className="text-2xl font-semibold mb-3">Something went wrong</h1>
            <p className="text-sm text-navy-600 mb-5">
              The workspace hit an unexpected rendering error. Reload the page or reset the workspace to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="dp-kicker text-navy-900 hover:text-[#C8A96A]"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
