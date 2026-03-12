/**
 * Zustand store for the loaded repo-map data.
 *
 * Holds the Graphology graph instance, metadata, stats, and unresolved packages.
 * The graph is deserialized from a ProcessResult (produced by the data worker)
 * and is accessed imperatively (never in a selector) to avoid re-render storms.
 *
 * Uses `subscribeWithSelector` middleware for fine-grained subscriptions.
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { MultiDirectedGraph } from 'graphology';
import type { OutputData } from '../schemas/repomap';
import type { ProcessResult } from '../workers/types';

// ────────────────────────────────────────────────────────────────────────────
// State shape
// ────────────────────────────────────────────────────────────────────────────

export interface DataState {
  // Core data
  graph: MultiDirectedGraph | null;
  metadata: OutputData['metadata'] | null;
  stats: OutputData['stats'] | null;
  unresolved: OutputData['unresolved'] | null;

  // Loading state
  isLoading: boolean;
  loadingStage:
    | 'idle'
    | 'reading'
    | 'parsing'
    | 'validating'
    | 'building'
    | 'ready'
    | 'error';
  error: string | null;

  // Derived (set once on load)
  allOrgs: string[];
  nodeCount: number;
  edgeCount: number;

  // Actions
  setLoadingStage: (stage: DataState['loadingStage']) => void;
  setError: (error: string) => void;
  loadFromProcessResult: (result: ProcessResult) => void;
  reset: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Initial values (reused by `reset`)
// ────────────────────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  graph: null,
  metadata: null,
  stats: null,
  unresolved: null,
  isLoading: false,
  loadingStage: 'idle' as const,
  error: null,
  allOrgs: [] as string[],
  nodeCount: 0,
  edgeCount: 0,
};

// ────────────────────────────────────────────────────────────────────────────
// Store
// ────────────────────────────────────────────────────────────────────────────

export const useDataStore = create<DataState>()(
  subscribeWithSelector((set) => ({
    ...INITIAL_STATE,

    setLoadingStage: (stage) => {
      const isLoading =
        stage !== 'idle' && stage !== 'ready' && stage !== 'error';
      set({ loadingStage: stage, isLoading });
    },

    setError: (error) => {
      set({ error, loadingStage: 'error', isLoading: false });
    },

    loadFromProcessResult: (result: ProcessResult) => {
      // Deserialize the graph from the worker's serialized format
      const graph = new MultiDirectedGraph();
      graph.import(result.serialized);

      // Extract unique org names from node attributes
      const orgSet = new Set<string>();
      graph.forEachNode((_node, attrs) => {
        if (attrs.org) {
          orgSet.add(attrs.org as string);
        }
      });
      const allOrgs = [...orgSet].sort();

      set({
        graph,
        metadata: result.metadata,
        stats: result.stats,
        unresolved: result.unresolved,
        nodeCount: result.nodeCount,
        edgeCount: result.edgeCount,
        allOrgs,
        loadingStage: 'ready',
        isLoading: false,
        error: null,
      });
    },

    reset: () => {
      set(INITIAL_STATE);
    },
  })),
);

// ────────────────────────────────────────────────────────────────────────────
// Fine-grained selectors
//
// Use these in components so they only re-render when the specific slice
// they care about actually changes.
//
// ⚠ NEVER create a selector for `graph` — access it imperatively:
//   useDataStore.getState().graph
// ────────────────────────────────────────────────────────────────────────────

export const useMetadata = () => useDataStore((s) => s.metadata);
export const useStats = () => useDataStore((s) => s.stats);
export const useUnresolved = () => useDataStore((s) => s.unresolved);
export const useIsLoading = () => useDataStore((s) => s.isLoading);
export const useLoadingStage = () => useDataStore((s) => s.loadingStage);
export const useDataError = () => useDataStore((s) => s.error);
export const useAllOrgs = () => useDataStore((s) => s.allOrgs);
export const useNodeCount = () => useDataStore((s) => s.nodeCount);
export const useEdgeCount = () => useDataStore((s) => s.edgeCount);
