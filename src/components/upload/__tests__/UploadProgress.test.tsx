import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@primer/react';
import { UploadProgress } from '../UploadProgress';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('UploadProgress', () => {
  it('shows correct stage labels', () => {
    renderWithTheme(<UploadProgress stage="reading" />);
    expect(screen.getByText('Reading file...')).toBeInTheDocument();
    expect(screen.getByText('Parsing JSON...')).toBeInTheDocument();
    expect(screen.getByText('Validating schema...')).toBeInTheDocument();
    expect(screen.getByText('Building graph...')).toBeInTheDocument();
    expect(screen.getByText('Ready!')).toBeInTheDocument();
  });

  it('shows spinner for current stage', () => {
    renderWithTheme(<UploadProgress stage="parsing" />);
    // The current stage should have a spinner
    const progressContainer = screen.getByTestId('upload-progress');
    expect(progressContainer).toBeInTheDocument();
  });

  it('shows cancel button when onCancel is provided', () => {
    const onCancel = vi.fn();
    renderWithTheme(<UploadProgress stage="reading" onCancel={onCancel} />);
    const cancelButton = screen.getByTestId('cancel-button');
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveTextContent('Cancel');
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderWithTheme(<UploadProgress stage="reading" onCancel={onCancel} />);

    await user.click(screen.getByTestId('cancel-button'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not show cancel button when stage is ready', () => {
    const onCancel = vi.fn();
    renderWithTheme(<UploadProgress stage="ready" onCancel={onCancel} />);
    expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument();
  });

  it('shows error state with error message', () => {
    renderWithTheme(
      <UploadProgress stage="error" error="Invalid JSON format" />,
    );
    expect(screen.getByTestId('upload-error')).toBeInTheDocument();
    expect(screen.getByText('Processing failed')).toBeInTheDocument();
    expect(screen.getByText('Invalid JSON format')).toBeInTheDocument();
  });

  it('shows Try Again button in error state when onRetry provided', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderWithTheme(
      <UploadProgress
        stage="error"
        error="Something failed"
        onRetry={onRetry}
      />,
    );

    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    await user.click(retryButton);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows estimated processing time when fileSize is provided', () => {
    renderWithTheme(
      <UploadProgress stage="building" fileSize={1024 * 1024 * 5} />,
    );
    expect(screen.getByText(/estimated time/i)).toBeInTheDocument();
  });

  it('does not show estimated time when ready', () => {
    renderWithTheme(
      <UploadProgress stage="ready" fileSize={1024 * 1024 * 5} />,
    );
    expect(screen.queryByText(/estimated time/i)).not.toBeInTheDocument();
  });

  it('shows progress bar for non-error stages', () => {
    renderWithTheme(<UploadProgress stage="building" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('does not show progress bar in error state', () => {
    renderWithTheme(<UploadProgress stage="error" error="fail" />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
