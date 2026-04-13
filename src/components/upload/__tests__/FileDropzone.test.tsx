import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileDropzone } from '../FileDropzone';

describe('FileDropzone', () => {
  it('renders the dropzone with correct aria-label', () => {
    render(<FileDropzone onFilesSelected={vi.fn()} />);
    const zone = screen.getByRole('button', {
      name: /drop json files here or click to browse/i,
    });
    expect(zone).toBeInTheDocument();
  });

  it('renders default text content', () => {
    render(<FileDropzone onFilesSelected={vi.fn()} />);
    expect(
      screen.getByText(/drag & drop json files here/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
  });

  it('click triggers file input', async () => {
    const user = userEvent.setup();
    render(<FileDropzone onFilesSelected={vi.fn()} />);

    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    const zone = screen.getByTestId('file-dropzone');
    await user.click(zone);

    expect(clickSpy).toHaveBeenCalled();
  });

  it('accepts .json files from input', async () => {
    const onFilesSelected = vi.fn();
    render(<FileDropzone onFilesSelected={onFilesSelected} />);

    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    expect(fileInput.accept).toBe('.json');

    const file = new File(['{}'], 'test.json', { type: 'application/json' });
    await userEvent.upload(fileInput, file);

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  it('supports multiple files when multiple prop is true', () => {
    render(<FileDropzone onFilesSelected={vi.fn()} multiple={true} />);
    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    expect(fileInput.multiple).toBe(true);
  });

  it('keyboard activation with Enter triggers file picker', async () => {
    render(<FileDropzone onFilesSelected={vi.fn()} />);

    const zone = screen.getByTestId('file-dropzone');
    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    // Simulate Enter key
    fireEvent.keyDown(zone, { key: 'Enter' });
    expect(clickSpy).toHaveBeenCalled();
  });

  it('keyboard activation with Space triggers file picker', async () => {
    render(<FileDropzone onFilesSelected={vi.fn()} />);

    const zone = screen.getByTestId('file-dropzone');
    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    // Simulate Space key
    fireEvent.keyDown(zone, { key: ' ' });
    expect(clickSpy).toHaveBeenCalled();
  });

  it('shows active state text during drag-over', () => {
    render(<FileDropzone onFilesSelected={vi.fn()} />);

    const zone = screen.getByTestId('file-dropzone');

    // Simulate drag over
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } });

    expect(screen.getByText(/drop files here/i)).toBeInTheDocument();
    expect(zone.classList.contains('dropzone--active')).toBe(true);
  });

  it('filters non-json files on drop', () => {
    const onFilesSelected = vi.fn();
    render(<FileDropzone onFilesSelected={onFilesSelected} />);

    const zone = screen.getByTestId('file-dropzone');
    const jsonFile = new File(['{}'], 'data.json', {
      type: 'application/json',
    });
    const txtFile = new File(['hello'], 'readme.txt', { type: 'text/plain' });

    fireEvent.drop(zone, {
      dataTransfer: {
        files: [jsonFile, txtFile],
      },
    });

    expect(onFilesSelected).toHaveBeenCalledWith([jsonFile]);
  });
});
