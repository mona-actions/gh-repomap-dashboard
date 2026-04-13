/**
 * Multi-stage progress indicator for file processing.
 *
 * Shows the current stage with checkmarks for completed stages,
 * a spinner for the active stage, and error handling with retry.
 */
import { Spinner, Flash, Button, ProgressBar } from '@primer/react';
import { CheckCircleFillIcon, XCircleFillIcon } from '@primer/octicons-react';
import { estimateProcessingTime } from '@/utils/memoryCheck';

type Stage =
  | 'reading'
  | 'parsing'
  | 'validating'
  | 'building'
  | 'ready'
  | 'error';

export interface UploadProgressProps {
  stage: Stage;
  error?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  fileSize?: number;
}

interface StageInfo {
  key: Stage;
  label: string;
}

const STAGES: StageInfo[] = [
  { key: 'reading', label: 'Reading file...' },
  { key: 'parsing', label: 'Parsing JSON...' },
  { key: 'validating', label: 'Validating schema...' },
  { key: 'building', label: 'Building graph...' },
  { key: 'ready', label: 'Ready!' },
];

function getStageIndex(stage: Stage): number {
  return STAGES.findIndex((s) => s.key === stage);
}

function getProgressPercent(stage: Stage): number {
  if (stage === 'error') return 0;
  const idx = getStageIndex(stage);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / STAGES.length) * 100);
}

export function UploadProgress({
  stage,
  error,
  onCancel,
  onRetry,
  fileSize,
}: UploadProgressProps) {
  const currentIndex = getStageIndex(stage);
  const isError = stage === 'error';
  const isReady = stage === 'ready';

  return (
    <div
      className="upload-progress"
      data-testid="upload-progress"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '24px',
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      {/* Progress bar */}
      {!isError && (
        <ProgressBar
          progress={getProgressPercent(stage)}
          aria-label="File processing progress"
          style={{ marginBottom: '8px' }}
        />
      )}

      {/* Stage list */}
      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {STAGES.map((s, idx) => {
          const isCompleted = !isError && currentIndex > idx;
          const isCurrent = !isError && currentIndex === idx;

          return (
            <li
              key={s.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color:
                  isCompleted || isCurrent
                    ? 'var(--fgColor-default, #1f2328)'
                    : 'var(--fgColor-muted, #636c76)',
              }}
            >
              {isCompleted ? (
                <CheckCircleFillIcon
                  size={16}
                  fill="var(--fgColor-success, #1a7f37)"
                />
              ) : isCurrent ? (
                <Spinner size="small" />
              ) : (
                <span
                  style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '2px solid var(--borderColor-default, #d0d7de)',
                  }}
                />
              )}
              <span
                style={{
                  fontWeight: isCurrent ? 600 : 400,
                  fontSize: '14px',
                }}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Estimated time */}
      {fileSize !== null && fileSize !== undefined && !isReady && !isError && (
        <p
          style={{
            fontSize: '12px',
            color: 'var(--fgColor-muted, #636c76)',
            textAlign: 'center',
            margin: 0,
          }}
        >
          Estimated time: {estimateProcessingTime(fileSize)}
        </p>
      )}

      {/* Error state */}
      {isError && error && (
        <Flash variant="danger" data-testid="upload-error">
          <div
            style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}
          >
            <XCircleFillIcon size={16} />
            <div>
              <strong style={{ display: 'block' }}>Processing failed</strong>
              <span style={{ fontSize: '14px', fontFamily: 'monospace' }}>
                {error}
              </span>
            </div>
          </div>
        </Flash>
      )}

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'center',
          marginTop: '8px',
        }}
      >
        {isError && onRetry && (
          <Button variant="primary" onClick={onRetry}>
            Try Again
          </Button>
        )}
        {!isReady && onCancel && (
          <Button
            variant="danger"
            onClick={onCancel}
            data-testid="cancel-button"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
