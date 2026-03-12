/**
 * Landing page displayed when no data is loaded.
 *
 * Provides three ways to load data:
 * 1. Drag & drop / file browse via FileDropzone
 * 2. URL input to fetch remote JSON
 * 3. "Load demo data" button for quick exploration
 *
 * Shows an UploadProgress indicator during processing.
 */
import { useState, useCallback, type FormEvent } from 'react';
import { Button, Heading, TextInput } from '@primer/react';
import { BeakerIcon, LinkExternalIcon } from '@primer/octicons-react';
import { FileDropzone } from './FileDropzone';
import { UploadProgress } from './UploadProgress';
import { useDataLoader } from '@/hooks/useDataLoader';
import { useDataStore } from '@/store/dataStore';

export function UploadPage() {
  const { loadFiles, loadFromUrl, loadDemo, resetData } = useDataLoader();
  const loadingStage = useDataStore((s) => s.loadingStage);
  const error = useDataStore((s) => s.error);

  const [url, setUrl] = useState('');
  const [lastFileSize, setLastFileSize] = useState<number | undefined>();

  const isProcessing =
    loadingStage !== 'idle' &&
    loadingStage !== 'ready' &&
    loadingStage !== 'error';

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      setLastFileSize(totalSize);
      void loadFiles(files);
    },
    [loadFiles],
  );

  const handleUrlSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!url.trim()) return;
      setLastFileSize(undefined);
      void loadFromUrl(url.trim());
    },
    [url, loadFromUrl],
  );

  const handleLoadDemo = useCallback(() => {
    setLastFileSize(undefined);
    void loadDemo();
  }, [loadDemo]);

  const handleCancel = useCallback(() => {
    resetData();
  }, [resetData]);

  const handleRetry = useCallback(() => {
    resetData();
  }, [resetData]);

  // Show progress when actively processing
  if (isProcessing || loadingStage === 'error') {
    return (
      <div className="upload-page upload-page--centered">
        <UploadProgress
          stage={loadingStage}
          error={error ?? undefined}
          onCancel={handleCancel}
          onRetry={handleRetry}
          fileSize={lastFileSize}
        />
      </div>
    );
  }

  return (
    <div className="upload-page upload-page--centered">
      {/* Header / Blankslate-style content */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Heading as="h1" variant="large">
          Dependency Graph Visualizer
        </Heading>
        <p
          style={{
            fontSize: '16px',
            color: 'var(--fgColor-muted, #636c76)',
            maxWidth: '480px',
            margin: '8px auto 0',
          }}
        >
          Upload a <code>gh-repo-map</code> JSON file to visualize your
          inter-repository dependency graph.
        </p>
      </div>

      {/* File Dropzone */}
      <div style={{ width: '100%', marginBottom: '24px' }}>
        <FileDropzone onFilesSelected={handleFilesSelected} />
      </div>

      {/* Divider */}
      <div className="upload-page__divider">
        <hr />
        <span>OR</span>
        <hr />
      </div>

      {/* URL Input */}
      <form
        onSubmit={handleUrlSubmit}
        style={{
          display: 'flex',
          gap: '8px',
          width: '100%',
          marginBottom: '24px',
        }}
      >
        <TextInput
          aria-label="URL to JSON file"
          placeholder="Paste a URL to a JSON file..."
          value={url}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
          style={{ flex: 1 }}
          leadingVisual={LinkExternalIcon}
        />
        <Button type="submit" variant="primary" disabled={!url.trim()}>
          Fetch
        </Button>
      </form>

      {/* Demo data button */}
      <Button
        variant="invisible"
        leadingVisual={BeakerIcon}
        onClick={handleLoadDemo}
      >
        Load demo data
      </Button>
    </div>
  );
}
