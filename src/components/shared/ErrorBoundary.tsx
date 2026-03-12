import { Component, type ReactNode } from 'react';
import { Flash, Button } from '@primer/react';

interface Props {
  /** Custom fallback UI to render when an error is caught */
  fallback?: ReactNode;
  /** Callback invoked with the error and React component stack */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /**
   * Controls the severity message shown in the default fallback:
   * - `app`    — full-page crash messaging
   * - `view`   — section-level; other parts still work
   * - `widget` — single component failure (default)
   */
  level?: 'app' | 'view' | 'widget';
  children: ReactNode;
}

interface State {
  error: Error | null;
}

const MESSAGES: Record<NonNullable<Props['level']>, string> = {
  app: 'The application encountered an unexpected error.',
  view: 'This view encountered an error. Other parts of the app still work.',
  widget: 'This component failed to render.',
};

/**
 * React error boundary that catches render errors in its subtree.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary level="view">
 *   <SomeRiskyView />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    console.error(
      `[ErrorBoundary:${this.props.level ?? 'widget'}]`,
      error,
      errorInfo,
    );
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      const level = this.props.level ?? 'widget';

      return (
        <Flash variant="danger" style={{ margin: 12 }}>
          <p>
            <strong>{MESSAGES[level]}</strong>
          </p>
          <p style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
            {this.state.error.message}
          </p>
          <Button onClick={this.handleReset} style={{ marginTop: 8 }}>
            Try Again
          </Button>
        </Flash>
      );
    }

    return this.props.children;
  }
}
