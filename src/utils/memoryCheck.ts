/**
 * Client-side memory detection and processing time estimation.
 *
 * Uses the (Chrome-only) navigator.deviceMemory API to provide
 * guidance on how large a file the browser can comfortably process.
 * Falls back gracefully when the API is unavailable.
 */

export interface MemoryInfo {
  /** Device memory in GB (Chrome-only; null if unavailable). */
  deviceMemoryGB: number | null;
  /** Human-readable recommendation for maximum file size. */
  estimatedFileLimit: string;
  /** True when device memory is <4 GB. */
  isLowMemory: boolean;
}

/**
 * Checks available device memory and returns guidance.
 *
 * Note: `navigator.deviceMemory` is only available in Chromium-based
 * browsers. Returns null/unknown for Firefox, Safari, etc.
 */
export function checkMemory(): MemoryInfo {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const deviceMemoryGB = nav.deviceMemory ?? null;
  const isLowMemory = deviceMemoryGB !== null && deviceMemoryGB < 4;

  let estimatedFileLimit = 'Unknown';
  if (deviceMemoryGB !== null) {
    if (deviceMemoryGB >= 8) estimatedFileLimit = '~200MB (10K+ repos)';
    else if (deviceMemoryGB >= 4) estimatedFileLimit = '~100MB (5K repos)';
    else estimatedFileLimit = '~50MB (2K repos)';
  }

  return { deviceMemoryGB, estimatedFileLimit, isLowMemory };
}

/**
 * Estimates processing time for a given file size.
 *
 * Based on empirical measurements of JSON parsing + Graphology graph
 * construction on mid-range hardware.
 */
export function estimateProcessingTime(fileSizeBytes: number): string {
  const mb = fileSizeBytes / (1024 * 1024);
  if (mb < 10) return 'a few seconds';
  if (mb < 50) return '5-10 seconds';
  if (mb < 100) return '10-20 seconds';
  return '20-40 seconds';
}
