/**
 * Accessible drag-and-drop file upload zone.
 *
 * Supports:
 * - Drag & drop files onto the zone
 * - Click to browse via hidden file input
 * - Keyboard activation (Enter/Space)
 * - Visual feedback on drag-over
 * - Configurable accept pattern and multiple file support
 */
import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { FileIcon } from '@primer/octicons-react';

export interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
}

export function FileDropzone({
  onFilesSelected,
  accept = '.json',
  multiple = true,
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.name.endsWith('.json'),
      );
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected],
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length > 0) {
        onFilesSelected(files);
      }
      // Reset the input so re-selecting the same file triggers change
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [onFilesSelected],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Drop JSON files here or click to browse"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-testid="file-dropzone"
      className={`dropzone ${isDragOver ? 'dropzone--active' : ''}`}
    >
      <div className="dropzone__icon">
        <FileIcon size={48} />
      </div>
      <span className="dropzone__title">
        {isDragOver ? 'Drop files here' : 'Drag & drop JSON files here'}
      </span>
      <span className="dropzone__subtitle">or click to browse</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        style={{ display: 'none' }}
        aria-hidden="true"
        data-testid="file-input"
      />
    </div>
  );
}
