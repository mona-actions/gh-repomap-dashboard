/**
 * Hook that orchestrates the file loading pipeline.
 *
 * Coordinates between the data worker, data store loading stages,
 * and error handling. Provides loadFiles, loadFromUrl, and loadDemo
 * functions for the upload page.
 */
import { useCallback } from 'react';
import { useDataWorker } from './useWorker';
import { useDataStore } from '@/store/dataStore';

export function useDataLoader() {
  const { processFile, mergeAndProcess } = useDataWorker();

  const loadFiles = useCallback(
    async (files: File[]) => {
      const { setLoadingStage, setError, loadFromProcessResult, reset } =
        useDataStore.getState();

      try {
        reset();
        setLoadingStage('reading');
        const texts = await Promise.all(files.map((f) => f.text()));

        setLoadingStage('parsing');
        // Small delay to allow UI to update before heavy processing
        await new Promise((r) => setTimeout(r, 50));

        setLoadingStage('building');
        const result =
          files.length === 1
            ? await processFile(texts[0])
            : await mergeAndProcess(texts);

        loadFromProcessResult(result);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoadingStage('error');
        return false;
      }
    },
    [processFile, mergeAndProcess],
  );

  const loadFromUrl = useCallback(
    async (url: string) => {
      const { setLoadingStage, setError, loadFromProcessResult, reset } =
        useDataStore.getState();

      try {
        reset();
        setLoadingStage('reading');
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();

        setLoadingStage('parsing');
        await new Promise((r) => setTimeout(r, 50));

        setLoadingStage('building');
        const result = await processFile(text);

        loadFromProcessResult(result);
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch URL',
        );
        setLoadingStage('error');
        return false;
      }
    },
    [processFile],
  );

  const loadDemo = useCallback(async () => {
    const { setLoadingStage, setError, loadFromProcessResult, reset } =
      useDataStore.getState();

    try {
      reset();
      setLoadingStage('reading');

      // Fetch the small.json fixture bundled with the app
      const response = await fetch('/fixtures/small.json');
      if (!response.ok) {
        throw new Error(`Could not load demo data (HTTP ${response.status})`);
      }
      const text = await response.text();

      setLoadingStage('parsing');
      await new Promise((r) => setTimeout(r, 50));

      setLoadingStage('building');
      const result = await processFile(text);

      loadFromProcessResult(result);
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load demo data',
      );
      setLoadingStage('error');
      return false;
    }
  }, [processFile]);

  const resetData = useCallback(() => {
    useDataStore.getState().reset();
  }, []);

  return { loadFiles, loadFromUrl, loadDemo, resetData };
}
