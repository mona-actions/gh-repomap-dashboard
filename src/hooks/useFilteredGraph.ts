/**
 * Hook and utility for applying filters to the Graphology graph.
 *
 * Filters work by toggling the `hidden` attribute on nodes and edges.
 * Sigma.js natively respects `hidden` — no graph rebuild is needed,
 * which makes filtering O(n+m) with zero allocations beyond the stats object.
 *
 * The `applyFilters` function is exported separately for independent testing.
 */
import { useEffect, useState } from 'react';
import type { MultiDirectedGraph } from 'graphology';
import { useDataStore } from '../store/dataStore';
import { useFilterStore, type FilterState } from '../store/filterStore';
import { searchRepos } from '../utils/search';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface FilterStats {
  visibleNodes: number;
  visibleEdges: number;
  totalNodes: number;
  totalEdges: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Pure filter application (testable without React)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Apply filters to a Graphology graph by setting the `hidden` attribute
 * on nodes and edges. Returns visibility statistics.
 *
 * Filter logic (AND semantics — all conditions must pass):
 *
 * **Nodes:**
 * - Org filter: node's org must be in selectedOrgs (empty = no filter)
 * - Archived filter: archived nodes are hidden unless showArchived is true
 * - Cluster filter: node must belong to the selected cluster
 * - Search filter: node must appear in MiniSearch results
 *
 * **Edges:**
 * - Both endpoints must be visible
 * - Type filter: edge type must be in depTypes (empty = no filter)
 * - Confidence filter: if 'high', only high-confidence edges are shown
 */
export function applyFilters(
  graph: MultiDirectedGraph,
  filters: Pick<
    FilterState,
    | 'selectedOrgs'
    | 'depTypes'
    | 'ecosystems'
    | 'confidenceFilter'
    | 'showArchived'
    | 'clusterId'
    | 'searchQuery'
  >,
): FilterStats {
  let visibleNodes = 0;
  let visibleEdges = 0;

  // Build search match set if there's a query
  const searchMatches = filters.searchQuery
    ? new Set(searchRepos(filters.searchQuery, 10_000).map((r) => r.id))
    : null;

  // Phase 1: filter nodes
  graph.forEachNode((node, attrs) => {
    const visible =
      (filters.selectedOrgs.length === 0 ||
        filters.selectedOrgs.includes(attrs.org as string)) &&
      (!(attrs.archived as boolean) || filters.showArchived) &&
      (filters.clusterId === null ||
        (attrs.clusterId as number) === filters.clusterId) &&
      (searchMatches === null || searchMatches.has(node));

    graph.setNodeAttribute(node, 'hidden', !visible);
    if (visible) visibleNodes++;
  });

  // Phase 2: filter edges (both endpoints must be visible first)
  graph.forEachEdge((edge, attrs, source, target) => {
    const sourceHidden = graph.getNodeAttribute(source, 'hidden') as boolean;
    const targetHidden = graph.getNodeAttribute(target, 'hidden') as boolean;

    const visible =
      !sourceHidden &&
      !targetHidden &&
      (filters.depTypes.length === 0 ||
        filters.depTypes.includes(attrs.depType as string)) &&
      (filters.ecosystems.length === 0 ||
        filters.ecosystems.includes(attrs.ecosystem as string)) &&
      (filters.confidenceFilter === 'all' ||
        (attrs.confidence as string) === 'high');

    graph.setEdgeAttribute(edge, 'hidden', !visible);
    if (visible) visibleEdges++;
  });

  return {
    visibleNodes,
    visibleEdges,
    totalNodes: graph.order,
    totalEdges: graph.size,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// React hook
// ────────────────────────────────────────────────────────────────────────────

const EMPTY_STATS: FilterStats = {
  visibleNodes: 0,
  visibleEdges: 0,
  totalNodes: 0,
  totalEdges: 0,
};

/**
 * Subscribes to filter store changes and applies them to the Graphology graph.
 *
 * Uses useState to track filter stats so the component re-renders when
 * filter visibility changes. Sigma.js reads `hidden` attributes directly
 * from the graph on each frame.
 */
export function useFilteredGraph(): FilterStats {
  // Compute initial stats synchronously (before first render completes)
  const [stats, setStats] = useState<FilterStats>(() => {
    const graph = useDataStore.getState().graph;
    if (!graph) return EMPTY_STATS;
    return applyFilters(graph, useFilterStore.getState());
  });

  useEffect(() => {
    // Apply filters whenever the filter store changes
    const unsub = useFilterStore.subscribe(() => {
      const graph = useDataStore.getState().graph;
      if (!graph) return;

      const filters = useFilterStore.getState();
      setStats(applyFilters(graph, filters));
    });

    return unsub;
  }, []);

  return stats;
}
