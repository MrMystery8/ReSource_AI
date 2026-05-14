import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

/**
 * React Error Boundary that catches rendering errors in child components
 * and displays a user-friendly error screen instead of a blank page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    this.setState({ errorInfo: errorInfo.componentStack ?? null });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-6">
          <div className="card max-w-lg w-full p-8 text-center space-y-6">
            {/* Error Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-danger-50 border border-danger-100">
              <AlertTriangle className="w-8 h-8 text-danger-500" />
            </div>

            {/* Title */}
            <div>
              <h1 className="text-xl font-bold text-text-primary mb-2">
                Something went wrong
              </h1>
              <p className="text-sm text-text-secondary">
                An unexpected error occurred while rendering the application.
                This has been logged to the console for debugging.
              </p>
            </div>

            {/* Error Details */}
            {this.state.error && (
              <div className="text-left p-4 rounded-xl bg-stone-50 border border-border-subtle overflow-auto max-h-40">
                <p className="text-xs font-mono text-danger-500 break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs font-mono text-text-muted mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.slice(0, 500)}
                  </pre>
                )}
              </div>
            )}

            {/* Retry Button */}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-text-primary text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
