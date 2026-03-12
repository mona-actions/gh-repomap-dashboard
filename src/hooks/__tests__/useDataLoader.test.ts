import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDataStore } from '@/store/dataStore';

// Mock the useDataWorker hook before importing useDataLoader
const mockProcessFile = vi.fn();
const mockMergeAndProcess = vi.fn();

vi.mock('../useWorker', () => ({
  useDataWorker: () => ({
    processFile: mockProcessFile,
    mergeAndProcess: mockMergeAndProcess,
  }),
}));

// Import after mock setup
const { useDataLoader } = await import('../useDataLoader');

describe('useDataLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDataStore.getState().reset();
  });

  describe('loadFiles', () => {
    it('processes a single file successfully', async () => {
      const mockResult = {
        serialized: { nodes: [], edges: [], attributes: {}, options: {} },
        metadata: { orgs: [], timestamp: '' },
        stats: {},
        unresolved: [],
        nodeCount: 10,
        edgeCount: 5,
      };
      mockProcessFile.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useDataLoader());

      const file = new File(['{"test": true}'], 'test.json', {
        type: 'application/json',
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.loadFiles([file]);
      });

      expect(success).toBe(true);
      expect(mockProcessFile).toHaveBeenCalledWith('{"test": true}');
      expect(useDataStore.getState().loadingStage).toBe('ready');
    });

    it('processes multiple files with mergeAndProcess', async () => {
      const mockResult = {
        serialized: { nodes: [], edges: [], attributes: {}, options: {} },
        metadata: { orgs: [], timestamp: '' },
        stats: {},
        unresolved: [],
        nodeCount: 20,
        edgeCount: 10,
      };
      mockMergeAndProcess.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useDataLoader());

      const file1 = new File(['{"file": 1}'], 'a.json', {
        type: 'application/json',
      });
      const file2 = new File(['{"file": 2}'], 'b.json', {
        type: 'application/json',
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.loadFiles([file1, file2]);
      });

      expect(success).toBe(true);
      expect(mockMergeAndProcess).toHaveBeenCalledWith([
        '{"file": 1}',
        '{"file": 2}',
      ]);
    });

    it('handles errors during processing', async () => {
      mockProcessFile.mockRejectedValue(new Error('Invalid JSON'));

      const { result } = renderHook(() => useDataLoader());

      const file = new File(['not json'], 'bad.json', {
        type: 'application/json',
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.loadFiles([file]);
      });

      expect(success).toBe(false);
      expect(useDataStore.getState().loadingStage).toBe('error');
      expect(useDataStore.getState().error).toBe('Invalid JSON');
    });

    it('handles non-Error exceptions', async () => {
      mockProcessFile.mockRejectedValue('string error');

      const { result } = renderHook(() => useDataLoader());

      const file = new File(['{}'], 'test.json', {
        type: 'application/json',
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.loadFiles([file]);
      });

      expect(success).toBe(false);
      expect(useDataStore.getState().error).toBe('Unknown error');
    });
  });

  describe('loadFromUrl', () => {
    it('fetches and processes from URL successfully', async () => {
      const mockResult = {
        serialized: { nodes: [], edges: [], attributes: {}, options: {} },
        metadata: { orgs: [], timestamp: '' },
        stats: {},
        unresolved: [],
        nodeCount: 5,
        edgeCount: 3,
      };
      mockProcessFile.mockResolvedValue(mockResult);

      // Mock fetch
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{"data": true}'),
      });

      const { result } = renderHook(() => useDataLoader());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.loadFromUrl('https://example.com/data.json');
      });

      expect(success).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://example.com/data.json',
      );
      expect(mockProcessFile).toHaveBeenCalledWith('{"data": true}');
    });

    it('handles HTTP errors', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() => useDataLoader());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.loadFromUrl(
          'https://example.com/missing.json',
        );
      });

      expect(success).toBe(false);
      expect(useDataStore.getState().loadingStage).toBe('error');
      expect(useDataStore.getState().error).toBe('HTTP 404');
    });

    it('handles network errors', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(
        new Error('Network error'),
      );

      const { result } = renderHook(() => useDataLoader());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.loadFromUrl(
          'https://example.com/timeout.json',
        );
      });

      expect(success).toBe(false);
      expect(useDataStore.getState().error).toBe('Network error');
    });
  });

  describe('resetData', () => {
    it('resets the data store', async () => {
      // Set some state first
      useDataStore.setState({
        loadingStage: 'error',
        error: 'some error',
      });

      const { result } = renderHook(() => useDataLoader());

      act(() => {
        result.current.resetData();
      });

      expect(useDataStore.getState().loadingStage).toBe('idle');
      expect(useDataStore.getState().error).toBeNull();
    });
  });
});
