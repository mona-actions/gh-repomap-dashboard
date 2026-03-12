import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useDataStore } from './store/dataStore';

// Mock Web Workers (not available in happy-dom)
vi.stubGlobal(
  'Worker',
  class MockWorker {
    onmessage: ((e: MessageEvent) => void) | null = null;
    postMessage = vi.fn();
    terminate = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
  },
);

// Must import App AFTER Worker stub is in place
const { default: App } = await import('./App');

describe('App', () => {
  beforeEach(() => {
    // Reset data store to ensure no data is loaded
    useDataStore.getState().reset();
  });

  it('renders the app header with dashboard name', () => {
    render(<App />);
    expect(screen.getByText('gh-repomap-dashboard')).toBeInTheDocument();
  });

  it('renders the upload page when no data is loaded', () => {
    render(<App />);
    expect(
      screen.getByText(/upload a.*json file/i),
    ).toBeInTheDocument();
  });

  it('renders the skip link', () => {
    render(<App />);
    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
  });
});
