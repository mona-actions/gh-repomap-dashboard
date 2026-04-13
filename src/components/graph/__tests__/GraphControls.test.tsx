/**
 * Tests for GraphControls component.
 *
 * Verifies zoom buttons, fit-to-screen, and fullscreen toggle render correctly
 * and fire the expected callbacks.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphControls } from '../GraphControls';

describe('GraphControls', () => {
  const defaultProps = {
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onFitToScreen: vi.fn(),
  };

  it('renders zoom in button', () => {
    render(<GraphControls {...defaultProps} />);
    expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
  });

  it('renders zoom out button', () => {
    render(<GraphControls {...defaultProps} />);
    expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
  });

  it('renders fit to screen button', () => {
    render(<GraphControls {...defaultProps} />);
    expect(screen.getByLabelText('Fit to screen')).toBeInTheDocument();
  });

  it('renders fullscreen toggle button', () => {
    render(<GraphControls {...defaultProps} />);
    expect(screen.getByLabelText('Enter fullscreen')).toBeInTheDocument();
  });

  it('calls onZoomIn when zoom in is clicked', async () => {
    const onZoomIn = vi.fn();
    const user = userEvent.setup();
    render(<GraphControls {...defaultProps} onZoomIn={onZoomIn} />);

    await user.click(screen.getByLabelText('Zoom in'));
    expect(onZoomIn).toHaveBeenCalledTimes(1);
  });

  it('calls onZoomOut when zoom out is clicked', async () => {
    const onZoomOut = vi.fn();
    const user = userEvent.setup();
    render(<GraphControls {...defaultProps} onZoomOut={onZoomOut} />);

    await user.click(screen.getByLabelText('Zoom out'));
    expect(onZoomOut).toHaveBeenCalledTimes(1);
  });

  it('calls onFitToScreen when fit button is clicked', async () => {
    const onFitToScreen = vi.fn();
    const user = userEvent.setup();
    render(<GraphControls {...defaultProps} onFitToScreen={onFitToScreen} />);

    await user.click(screen.getByLabelText('Fit to screen'));
    expect(onFitToScreen).toHaveBeenCalledTimes(1);
  });

  it('has toolbar role with label', () => {
    render(<GraphControls {...defaultProps} />);
    expect(screen.getByRole('toolbar')).toHaveAttribute(
      'aria-label',
      'Graph controls',
    );
  });
});
