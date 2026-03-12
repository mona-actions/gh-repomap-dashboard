import { describe, it, expect } from 'vitest';
import { estimateProcessingTime } from '../memoryCheck';

describe('estimateProcessingTime', () => {
  it('returns "a few seconds" for small files (<10MB)', () => {
    expect(estimateProcessingTime(1024)).toBe('a few seconds');
    expect(estimateProcessingTime(5 * 1024 * 1024)).toBe('a few seconds');
  });

  it('returns "5-10 seconds" for medium files (10-50MB)', () => {
    expect(estimateProcessingTime(10 * 1024 * 1024)).toBe('5-10 seconds');
    expect(estimateProcessingTime(30 * 1024 * 1024)).toBe('5-10 seconds');
  });

  it('returns "10-20 seconds" for large files (50-100MB)', () => {
    expect(estimateProcessingTime(50 * 1024 * 1024)).toBe('10-20 seconds');
    expect(estimateProcessingTime(80 * 1024 * 1024)).toBe('10-20 seconds');
  });

  it('returns "20-40 seconds" for very large files (≥100MB)', () => {
    expect(estimateProcessingTime(100 * 1024 * 1024)).toBe('20-40 seconds');
    expect(estimateProcessingTime(500 * 1024 * 1024)).toBe('20-40 seconds');
  });

  it('handles zero bytes', () => {
    expect(estimateProcessingTime(0)).toBe('a few seconds');
  });

  it('correctly handles boundary at exactly 10MB', () => {
    // 10MB exactly → NOT "a few seconds" (condition is mb < 10)
    const tenMB = 10 * 1024 * 1024;
    expect(estimateProcessingTime(tenMB)).toBe('5-10 seconds');
    // Just under 10MB
    expect(estimateProcessingTime(tenMB - 1)).toBe('a few seconds');
  });
});
