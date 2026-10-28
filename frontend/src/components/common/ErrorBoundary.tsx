import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary.
 * Catches any React render crash and displays a readable error card
 * instead of a blank page.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught React error:', error, info);
  }

  handleReload = () => {
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-slate-900 border border-rose-900/50 rounded-3xl p-8 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-900/30 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Something went wrong</h1>
            <p className="text-xs text-slate-400">
              The application encountered an unexpected error. Please reload to try again.
            </p>
            {this.state.error && (
              <pre className="text-left text-[11px] text-rose-300 bg-rose-950/30 border border-rose-900/40 rounded-xl p-3 overflow-auto max-h-40">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack?.split('\n').slice(0, 8).join('\n')}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Back to Login
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
