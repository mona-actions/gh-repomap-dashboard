import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@primer/react';
import { ErrorBoundary } from '../ErrorBoundary';

/* ---------- helpers ---------- */

/** A component that throws on render — used to trigger the error boundary. */
function Bomb({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('💥 Boom');
  return <p>All clear</p>;
}

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

/* ---------- tests ---------- */

describe('ErrorBoundary', () => {
  // Suppress noisy console.error from React + our boundary during expected throws
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error occurs', () => {
    renderWithTheme(
      <ErrorBoundary>
        <p>Hello world</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('catches an error and shows the default widget-level message', () => {
    renderWithTheme(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(
      screen.getByText('This component failed to render.'),
    ).toBeInTheDocument();
    expect(screen.getByText('💥 Boom')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    renderWithTheme(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(
      screen.queryByText('This component failed to render.'),
    ).not.toBeInTheDocument();
  });

  it.each([
    ['app', 'The application encountered an unexpected error.'],
    [
      'view',
      'This view encountered an error. Other parts of the app still work.',
    ],
    ['widget', 'This component failed to render.'],
  ] as const)('shows correct message for level="%s"', (level, expected) => {
    renderWithTheme(
      <ErrorBoundary level={level}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('calls onError callback with error and errorInfo', () => {
    const onError = vi.fn();

    renderWithTheme(
      <ErrorBoundary onError={onError}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: '💥 Boom' }),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });

  it('resets error state when "Try Again" is clicked', async () => {
    const user = userEvent.setup();

    // We need a component whose throw-behaviour we can control externally.
    let shouldThrow = true;

    function ConditionalBomb() {
      if (shouldThrow) throw new Error('💥 Boom');
      return <p>Recovered</p>;
    }

    renderWithTheme(
      <ErrorBoundary>
        <ConditionalBomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText('💥 Boom')).toBeInTheDocument();

    // Fix the problem, then click retry
    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('Recovered')).toBeInTheDocument();
    expect(screen.queryByText('💥 Boom')).not.toBeInTheDocument();
  });
});
