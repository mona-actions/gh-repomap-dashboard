/**
 * Shared type definitions for Web Workers.
 *
 * These types define the API contracts for the data and layout workers,
 * used by both worker implementations and the React hooks that consume them.
 */
import type { MultiDirectedGraph } from 'graphology';
import type { OutputData } from '../schemas/repomap';

/** Result of processing a repo-map JSON file into a Graphology graph. */
export interface ProcessResult {
  /** Serialized Graphology graph (plain object, transferable across workers). */
  serialized: ReturnType<MultiDirectedGraph['export']>;
  /** Scan metadata (timestamps, orgs, counts). */
  metadata: OutputData['metadata'];
  /** Pre-computed analytics from the CLI tool. */
  stats: OutputData['stats'];
  /** Packages that couldn't be mapped to a scanned repo. */
  unresolved: OutputData['unresolved'];
  /** Total number of nodes in the graph (including phantoms). */
  nodeCount: number;
  /** Total number of edges in the graph. */
  edgeCount: number;
}

/** API exposed by the data processing worker via Comlink. */
export interface DataWorkerApi {
  /** Parse, validate, and build a graph from a single JSON file. */
  processFile(jsonText: string): Promise<ProcessResult>;
  /** Parse, validate, merge, and build a graph from multiple split JSON files. */
  mergeAndProcess(jsonTexts: string[]): Promise<ProcessResult>;
}

/** Position coordinates for a graph node. */
export interface NodePosition {
  x: number;
  y: number;
}

/** API exposed by the layout computation worker via Comlink. */
export interface LayoutWorkerApi {
  /** Compute a circular layout (instant, deterministic). */
  computeCircularLayout(
    serializedGraph: ReturnType<MultiDirectedGraph['export']>,
  ): Record<string, NodePosition>;
  /** Compute a ForceAtlas2 layout (iterative, configurable). */
  computeForceLayout(
    serializedGraph: ReturnType<MultiDirectedGraph['export']>,
    iterations?: number,
  ): Record<string, NodePosition>;
}