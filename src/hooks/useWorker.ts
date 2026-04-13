/**
 * React hooks for managing Web Worker lifecycle with Comlink.
 *
 * Each hook:
 * 1. Instantiates a Web Worker on mount
 * 2. Wraps it with Comlink for transparent RPC
 * 3. Terminates the worker on unmount (prevents memory leaks)
 * 4. Provides stable callback references via useCallback
 */
import { useRef, useEffect, useCallback } from 'react';
import { wrap, type Remote } from 'comlink';
import type { DataWorkerApi, LayoutWorkerApi } from '../workers/types';

/**
 * Hook for the data processing worker.
 *
 * Provides `processFile` and `mergeAndProcess` methods that run
 * JSON parsing, Zod validation, and Graphology graph construction
 * on a background thread.
 *
 * @example
 * ```tsx
 * const { processFile } = useDataWorker();
 * const result = await processFile(jsonText);
 * // result.serialized, result.metadata, etc.
 * ```
 */
export function useDataWorker() {
  const workerRef = useRef<Worker | null>(null);
  const apiRef = useRef<Remote<DataWorkerApi> | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/data.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;
    apiRef.current = wrap<DataWorkerApi>(worker);

    return () => {
      worker.terminate();
      workerRef.current = null;
      apiRef.current = null;
    };
  }, []);

  const processFile = useCallback(async (text: string) => {
    if (!apiRef.current) throw new Error('Worker not initialized');
    return apiRef.current.processFile(text);
  }, []);

  const mergeAndProcess = useCallback(async (texts: string[]) => {
    if (!apiRef.current) throw new Error('Worker not initialized');
    return apiRef.current.mergeAndProcess(texts);
  }, []);

  return { processFile, mergeAndProcess };
}

/**
 * Hook for the layout computation worker.
 *
 * Provides `computeCircularLayout` and `computeForceLayout` methods
 * that run graph layout algorithms on a background thread.
 *
 * @example
 * ```tsx
 * const { computeCircularLayout } = useLayoutWorker();
 * const positions = await computeCircularLayout(serializedGraph);
 * ```
 */
export function useLayoutWorker() {
  const workerRef = useRef<Worker | null>(null);
  const apiRef = useRef<Remote<LayoutWorkerApi> | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/layout.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;
    apiRef.current = wrap<LayoutWorkerApi>(worker);

    return () => {
      worker.terminate();
      workerRef.current = null;
      apiRef.current = null;
    };
  }, []);

  const computeCircularLayout = useCallback(
    async (
      serializedGraph: Parameters<LayoutWorkerApi['computeCircularLayout']>[0],
    ) => {
      if (!apiRef.current) throw new Error('Worker not initialized');
      return apiRef.current.computeCircularLayout(serializedGraph);
    },
    [],
  );

  const computeForceLayout = useCallback(
    async (
      serializedGraph: Parameters<LayoutWorkerApi['computeForceLayout']>[0],
      iterations?: number,
    ) => {
      if (!apiRef.current) throw new Error('Worker not initialized');
      return apiRef.current.computeForceLayout(serializedGraph, iterations);
    },
    [],
  );

  return { computeCircularLayout, computeForceLayout };
}
