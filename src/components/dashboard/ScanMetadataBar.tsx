/**
 * ScanMetadataBar — Compact bar showing scan context.
 *
 * Displays: tool version, GitHub host, scan duration, and when the scan
 * was generated (as a relative "time ago" string).
 */
import {
  VersionsIcon,
  GlobeIcon,
  ClockIcon,
  CalendarIcon,
} from '@primer/octicons-react';
import type { OutputData } from '@/schemas/repomap';

interface ScanMetadataBarProps {
  metadata: OutputData['metadata'] | null;
}

/**
 * Formats a duration in seconds into a human-readable string.
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/**
 * Formats an ISO 8601 timestamp as a relative "time ago" string.
 */
export function timeAgo(isoDate: string): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return 'Unknown';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

interface MetadataItem {
  icon: React.ElementType;
  label: string;
  value: string;
}

export function ScanMetadataBar({ metadata }: ScanMetadataBarProps) {
  if (!metadata) return null;

  const items: MetadataItem[] = [
    {
      icon: VersionsIcon,
      label: 'Version',
      value: `v${metadata.tool_version}`,
    },
    {
      icon: GlobeIcon,
      label: 'Host',
      value: metadata.github_host || 'github.com',
    },
    {
      icon: ClockIcon,
      label: 'Duration',
      value: formatDuration(metadata.scan_duration_seconds),
    },
    {
      icon: CalendarIcon,
      label: 'Generated',
      value: timeAgo(metadata.generated_at),
    },
  ];

  return (
    <div className="scan-metadata-bar" role="region" aria-label="Scan metadata">
      {items.map((item) => (
        <span key={item.label} className="scan-metadata-bar__item">
          <item.icon size={14} />
          <span className="scan-metadata-bar__label">{item.label}:</span>
          <span className="scan-metadata-bar__value">{item.value}</span>
        </span>
      ))}
    </div>
  );
}
