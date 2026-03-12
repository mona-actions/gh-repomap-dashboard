/**
 * Tests for the applyFilters utility from useFilteredGraph.
 *
 * Uses a small programmatic Graphology graph to verify that each filter type
 * correctly toggles the `hidden` attribute and that stats are accurate.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MultiDirectedGraph } from 'graphology';
import { applyFilters } from '../useFilteredGraph';
import { buildSearchIndex } from '../../utils/search';
import type { FilterState } from '../../store/filterStore';

// ────────────────────────────────────────────────────────────────────────────
// Test graph factory
// ────────────────────────────────────────────────────────────────────────────

/**
 * Creates a small graph for filter testing:
 *
 * Nodes:
 *   org-a/repo-1  (org: org-a, archived: false, clusterId: 1)
 *   org-a/repo-2  (org: org-a, archived: true,  clusterId: 1)
 *   org-b/repo-3  (org: org-b, archived: false, clusterId: 2)
 *   org-b/repo-4  (org: org-b, archived: false, clusterId: 2)
 *
 * Edges:
 *   repo-1 → repo-3 (type: package, confidence: high)
 *   repo-1 → repo-4 (type: workflow, confidence: low)
 *   repo-2 → repo-3 (type: package, confidence: high)
 *   repo-3 → repo-4 (type: docker, confidence: high)
 */
function createTestGraph(): MultiDirectedGraph {
  const graph = new MultiDirectedGraph();

  graph.addNode('org-a/repo-1', {
    org: 'org-a',
    archived: false,
    clusterId: 1,
  });
  graph.addNode('org-a/repo-2', {
    org: 'org-a',
    archived: true,
    clusterId: 1,
  });
  graph.addNode('org-b/repo-3', {
    org: 'org-b',
    archived: false,
    clusterId: 2,
  });
  graph.addNode('org-b/repo-4', {
    org: 'org-b',
    archived: false,
    clusterId: 2,
  });

  graph.addEdgeWithKey('e1', 'org-a/repo-1', 'org-b/repo-3', {
    depType: 'package',
    confidence: 'high',
  });
  graph.addEdgeWithKey('e2', 'org-a/repo-1', 'org-b/repo-4', {
    depType: 'workflow',
    confidence: 'low',
  });
  graph.addEdgeWithKey('e3', 'org-a/repo-2', 'org-b/repo-3', {
    depType: 'package',
    confidence: 'high',
  });
  graph.addEdgeWithKey('e4', 'org-b/repo-3', 'org-b/repo-4', {
    depType: 'docker',
    confidence: 'high',
  });

  return graph;
}

/** Default filter state (show everything). */
function defaultFilters(): Pick<
  FilterState,
  | 'selectedOrgs'
  | 'depTypes'
  | 'ecosystems'
  | 'confidenceFilter'
  | 'showArchived'
  | 'clusterId'
  | 'searchQuery'
> {
  return {
    selectedOrgs: [],
    depTypes: [],
    ecosystems: [],
    confidenceFilter: 'all',
    showArchived: true,
    clusterId: null,
    searchQuery: '',
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('applyFilters', () => {
  let graph: MultiDirectedGraph;

  beforeEach(() => {
    graph = createTestGraph();

    // Build search index for the test graph
    buildSearchIndex([
      { id: 'org-a/repo-1', org: 'org-a', name: 'repo-1', depTypes: 'package workflow' },
      { id: 'org-a/repo-2', org: 'org-a', name: 'repo-2', depTypes: 'package' },
      { id: 'org-b/repo-3', org: 'org-b', name: 'repo-3', depTypes: 'package docker' },
      { id: 'org-b/repo-4', org: 'org-b', name: 'repo-4', depTypes: 'workflow docker' },
    ]);
  });

  describe('empty filters (show all)', () => {
    it('shows all nodes and edges', () => {
      const stats = applyFilters(graph, defaultFilters());

      expect(stats.visibleNodes).toBe(4);
      expect(stats.visibleEdges).toBe(4);
      expect(stats.totalNodes).toBe(4);
      expect(stats.totalEdges).toBe(4);
    });

    it('sets hidden=false on all nodes', () => {
      applyFilters(graph, defaultFilters());

      graph.forEachNode((_node, attrs) => {
        expect(attrs.hidden).toBe(false);
      });
    });
  });

  describe('org filter', () => {
    it('hides nodes from non-selected orgs', () => {
      const stats = applyFilters(graph, {
        ...defaultFilters(),
        selectedOrgs: ['org-a'],
      });

      // org-a has 2 nodes (repo-1 and repo-2)
      expect(stats.visibleNodes).toBe(2);

      // Check specific nodes
      expect(graph.getNodeAttribute('org-a/repo-1', 'hidden')).toBe(false);
      expect(graph.getNodeAttribute('org-a/repo-2', 'hidden')).toBe(false);
      expect(graph.getNodeAttribute('org-b/repo-3', 'hidden')).toBe(true);
      expect(graph.getNodeAttribute('org-b/repo-4', 'hidden')).toBe(true);
    });

    it('hides edges where either endpoint is hidden', () => {
      const stats = applyFilters(graph, {
        ...defaultFilters(),
        selectedOrgs: ['org-a'],
      });

      // All edges involve an org-b node, so all hidden
      expect(stats.visibleEdges).toBe(0);
    });

    it('shows edges between visible nodes', () => {
      const stats = applyFilters(graph, {
        ...defaultFilters(),
        selectedOrgs: ['org-b'],
      });

      // Only edge within org-b: repo-3 → repo-4
      expect(stats.visibleEdges).toBe(1);
      expect(graph.getEdgeAttribute('e4', 'hidden')).toBe(false);
    });
  });

  describe('archived filter', () => {
    it('hides archived nodes when showArchived=false', () => {
      const stats = applyFilters(graph, {
        ...defaultFilters(),
        showArchived: false,
      });

      // repo-2 is archived
      expect(stats.visibleNodes).toBe(3);
      expect(graph.getNodeAttribute('org-a/repo-2', 'hidden')).toBe(true);
    });

    it('hides edges connected to archived nodes', () => {
      const stats = applyFilters(graph, {
        ...defaultFilters(),
        showArchived: false,
      });

      // e3 connects archived repo-2 → repo-3, should be hidden
      expect(graph.getEdgeAttribute('e3', 'hidden')).toBe(true);
      // e1 connects repo-1 → repo-3, should be visible
      expect(graph.getEdgeAttribute('e1', 'hidden')).toBe(false);
      expect(stats.visibleEdges).toBe(3);
    });

    it('shows archived nodes when showArchived=true (default)', () => {
      const stats = applyFilters(graph, defaultFilters());
      expect(stats.visibleNodes).toBe(4);
      expect(graph.getNodeAttribute('org-a/repo-2', 'hidden')).toBe(false);
    });
  });

  describe('dep type filter', () => {
    it('hides edges of non-selected types', () => {
      const stats = applyFilters(graph, {
        ...defaultFilters(),
        depTypes: ['package'],
      });

      // All nodes visible, only 'package' edges visible (e1, e3)
      expect(stats.visibleNodes).toBe(4);
      expect(stats.visibleEdges).toBe(2);
      expect(graph.getEdgeAttribute('e1', 'hidden')).toBe(false);
      expect(graph.getEdgeAttribute('e2', 'hidden')).toBe(true); // workflow
      expect(graph.getEdgeAttribute('e3', 'hidden')).toBe(false);
      expect(graph.getEdgeAttribute('e4', 'hidden')).toBe(true); // docker
    });

    it('supports multiple selected types', () => {
      const stats = applyFilters(graph, {
        ...defaultFilters(),
        depTypes: ['package', 'docker'],
      });

      expect(stats.visibleEdges).toBe(3); // e1, e3, e4
      expect(graph.getEdgeAttribute('e2', 'hidden')).toBe(true); // workflow
    });
  });

  describe('confidence filter', () => {
    it('hides low confidence edges when set to high', () => {
      const stats = applyFilters(graph, {
        ...defaultFilters(),
        confidenceFilter: 'high',
      });

      // e2 is confidence: low
      expect(stats.visibleEdges).toBe(3);
      expect(graph.getEdgeAttribute('e2', 'hidden')).toBe(true);
      expect(graph.getEdgeAttribute('e1', 'hidden')).toBe(false);
    });

    it('shows all edges when set to all', () => {
      const stats = applyFilters(graph, {
        ...defaultFilters(),
        confidenceFilter: 'all',
      });
      expect(stats.visibleEdges).toBe(4);
    });
  });

  describe('cluster filter', () => {
    it('shows only nodes in the selected cluster', () => {
      const stats = applyFilters(graph, {
        ...defaultFilters(),
        clusterId: 1,
      });

      // Cluster 1: repo-1 and repo-2
      expect(stats.visibleNodes).toBe(2);
      expect(graph.getNodeAttribute('org-a/repo-1', 'hidden')).toBe(false);
      expect(graph.getNodeAttribute('org-a/repo-2', 'hidden')).toBe(false);
      expect(graph.getNodeAttribute('org-b/repo-3', 'hidden')).toBe(true);
    });

    it('hides cross-cluster edges', () => {
      const stats = applyFilters(graph, {
        ...defaultFilters(),
        clusterId: 2,
      });

      // Cluster 2: repo-3 and repo-4
      // Only intra-cluster edge: e4 (repo-3 → repo-4)
      expect(stats.visibleEdges).toBe(1);
      expect(graph.getEdgeAttribute('e4', 'hidden')).toBe(false);
    });
  });

  describe('search filter', () => {
    it('hides nodes that do not match search query', () => {
      const stats = applyFilters(graph, {
        ...defaultFilters(),
        searchQuery: 'repo-1',
      });

      // MiniSearch should match "repo-1" at minimum
      expect(stats.visibleNodes).toBeGreaterThanOrEqual(1);
      expect(graph.getNodeAttribute('org-a/repo-1', 'hidden')).toBe(false);
    });

    it('shows all nodes when searchQuery is empty', () => {
      const stats = applyFilters(graph, {
        ...defaultFilters(),
        searchQuery: '',
      });
      expect(stats.visibleNodes).toBe(4);
    });
  });

  describe('combined filters (AND logic)', () => {
    it('applies org filter AND archived filter', () => {
      const stats = applyFilters(graph, {
        ...defaultFilters(),
        selectedOrgs: ['org-a'],
        showArchived: false,
      });

      // org-a has repo-1 (not archived) and repo-2 (archived)
      expect(stats.visibleNodes).toBe(1);
      expect(graph.getNodeAttribute('org-a/repo-1', 'hidden')).toBe(false);
      expect(graph.getNodeAttribute('org-a/repo-2', 'hidden')).toBe(true);
    });

    it('applies dep type AND confidence filters on edges', () => {
      const stats = applyFilters(graph, {
        ...defaultFilters(),
        depTypes: ['package', 'workflow'],
        confidenceFilter: 'high',
      });

      // package+high: e1, e3. workflow+high: none (e2 is workflow+low)
      expect(stats.visibleEdges).toBe(2);
      expect(graph.getEdgeAttribute('e1', 'hidden')).toBe(false);
      expect(graph.getEdgeAttribute('e2', 'hidden')).toBe(true); // workflow + low
      expect(graph.getEdgeAttribute('e3', 'hidden')).toBe(false);
    });

    it('applies org + cluster + dep type filters together', () => {
      const stats = applyFilters(graph, {
        ...defaultFilters(),
        selectedOrgs: ['org-b'],
        clusterId: 2,
        depTypes: ['docker'],
      });

      // Nodes: org-b cluster 2 = repo-3, repo-4
      expect(stats.visibleNodes).toBe(2);
      // Edges: only docker edges between visible nodes = e4
      expect(stats.visibleEdges).toBe(1);
    });
  });

  describe('filter stats', () => {
    it('returns correct totals regardless of filters', () => {
      const stats = applyFilters(graph, {
        ...defaultFilters(),
        selectedOrgs: ['org-a'],
      });

      expect(stats.totalNodes).toBe(4);
      expect(stats.totalEdges).toBe(4);
    });

    it('visible counts match actual hidden attribute state', () => {
      const stats = applyFilters(graph, {
        ...defaultFilters(),
        selectedOrgs: ['org-b'],
        confidenceFilter: 'high',
      });

      let actualVisibleNodes = 0;
      let actualVisibleEdges = 0;

      graph.forEachNode((_node, attrs) => {
        if (!attrs.hidden) actualVisibleNodes++;
      });
      graph.forEachEdge((_edge, attrs) => {
        if (!attrs.hidden) actualVisibleEdges++;
      });

      expect(stats.visibleNodes).toBe(actualVisibleNodes);
      expect(stats.visibleEdges).toBe(actualVisibleEdges);
    });
  });

  describe('idempotency', () => {
    it('applying same filters twice produces same results', () => {
      const filters = {
        ...defaultFilters(),
        selectedOrgs: ['org-a'],
        showArchived: false,
      };

      const stats1 = applyFilters(graph, filters);
      const stats2 = applyFilters(graph, filters);

      expect(stats1).toEqual(stats2);
    });
  });
});
