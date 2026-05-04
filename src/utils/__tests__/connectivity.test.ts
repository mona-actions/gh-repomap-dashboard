import { describe, it, expect } from 'vitest';
import { MultiDirectedGraph } from 'graphology';
import type { OutputData } from '../../schemas/repomap';
import {
  buildCondensation,
  computeStrongClusters,
  deriveMigrationCohorts,
  deriveMigrationOrder,
  enrichCluster,
  enrichClusters,
} from '../connectivity';

function makeNode(
  direct: OutputData['graph'][string]['direct'] = [],
): OutputData['graph'][string] {
  return {
    scan_status: { sbom: 'done', filescan: 'done' },
    annotations: { fork_of: null, template_from: null, archived: false },
    direct,
    transitive: [],
  };
}

function makeDep(repo: string): OutputData['graph'][string]['direct'][number] {
  return {
    repo,
    type: 'package',
    confidence: 'high',
    target_scanned: true,
    source_file: 'package.json',
    detail: {
      type: 'package',
      package_name: repo,
      ecosystem: 'npm',
      version: '^1.0.0',
    },
  };
}

describe('computeStrongClusters', () => {
  it('computes SCC groups and sorts by size descending', () => {
    const graph: OutputData['graph'] = {
      'org/a': makeNode([makeDep('org/b')]),
      'org/b': makeNode([makeDep('org/a'), makeDep('org/c')]),
      'org/c': makeNode([makeDep('org/d')]),
      'org/d': makeNode([makeDep('org/c')]),
      'org/e': makeNode([makeDep('org/phantom')]),
    };

    const result = computeStrongClusters(graph);

    expect(result).toEqual([
      { id: 1, repos: ['org/a', 'org/b'], size: 2 },
      { id: 2, repos: ['org/c', 'org/d'], size: 2 },
      { id: 3, repos: ['org/e'], size: 1 },
      { id: 4, repos: ['org/phantom'], size: 1 },
    ]);
  });

  it('returns an empty array for an empty graph', () => {
    expect(computeStrongClusters({})).toEqual([]);
  });
});

describe('deriveMigrationCohorts', () => {
  it('builds SCC core recommendations with one-hop context', () => {
    const graph = new MultiDirectedGraph();
    const repos = [
      'org/a',
      'org/b',
      'org/dep1',
      'org/dep2',
      'org/in1',
      'org/in2',
      'org/solo',
    ];

    for (const repo of repos) {
      graph.addNode(repo);
    }

    graph.addDirectedEdge('org/a', 'org/dep1');
    graph.addDirectedEdge('org/b', 'org/dep2');
    graph.addDirectedEdge('org/in1', 'org/a');
    graph.addDirectedEdge('org/in2', 'org/b');
    graph.addDirectedEdge('org/in1', 'org/b');

    const result = deriveMigrationCohorts(
      [
        { id: 7, repos: ['org/b', 'org/a'], size: 2 },
        { id: 8, repos: ['org/solo'], size: 1 },
      ],
      graph,
    );

    expect(result).toEqual([
      {
        id: 7,
        coreRepos: ['org/a', 'org/b'],
        coreSize: 2,
        recommendedDependencies: ['org/dep1', 'org/dep2'],
        recommendedDependents: ['org/in1', 'org/in2'],
      },
    ]);
  });

  it('still returns core cohorts when graph is unavailable', () => {
    const result = deriveMigrationCohorts(
      [{ id: 1, repos: ['org/a', 'org/b'], size: 2 }],
      null,
    );

    expect(result).toEqual([
      {
        id: 1,
        coreRepos: ['org/a', 'org/b'],
        coreSize: 2,
        recommendedDependencies: [],
        recommendedDependents: [],
      },
    ]);
  });
});

describe('enrichCluster', () => {
  it('splits scanned and external repos correctly', () => {
    const graph = new MultiDirectedGraph();
    graph.addNode('org/a', { isPhantom: false, org: 'org', archived: false });
    graph.addNode('org/b', { isPhantom: false, org: 'org', archived: false });
    graph.addNode('ext/c', { isPhantom: true, org: 'ext', archived: false });

    const result = enrichCluster(
      { id: 1, repos: ['org/a', 'org/b', 'ext/c'], size: 3 },
      graph,
    );

    expect(result.scannedCount).toBe(2);
    expect(result.externalCount).toBe(1);
    expect(result.scannedRepos).toEqual(['org/a', 'org/b']);
    expect(result.externalRepos).toEqual(['ext/c']);
  });

  it('treats missing nodes as external', () => {
    const graph = new MultiDirectedGraph();
    graph.addNode('org/a', { isPhantom: false, org: 'org', archived: false });

    const result = enrichCluster(
      { id: 1, repos: ['org/a', 'org/missing'], size: 2 },
      graph,
    );

    expect(result.scannedCount).toBe(1);
    expect(result.externalCount).toBe(1);
    expect(result.scannedRepos).toEqual(['org/a']);
    expect(result.externalRepos).toEqual(['org/missing']);
  });

  it('handles null graph by treating all as scanned', () => {
    const result = enrichCluster(
      { id: 1, repos: ['org/a', 'org/b'], size: 2 },
      null,
    );

    expect(result.scannedCount).toBe(2);
    expect(result.externalCount).toBe(0);
    expect(result.scannedRepos).toEqual(['org/a', 'org/b']);
    expect(result.externalRepos).toEqual([]);
  });

  it('preserves original cluster id and size', () => {
    const graph = new MultiDirectedGraph();
    graph.addNode('org/a', { isPhantom: false, org: 'org', archived: false });

    const result = enrichCluster({ id: 42, repos: ['org/a'], size: 1 }, graph);

    expect(result.id).toBe(42);
    expect(result.size).toBe(1);
  });

  it('enrichClusters processes array', () => {
    const graph = new MultiDirectedGraph();
    graph.addNode('org/a', { isPhantom: false, org: 'org', archived: false });
    graph.addNode('ext/b', { isPhantom: true, org: 'ext', archived: false });

    const result = enrichClusters(
      [
        { id: 1, repos: ['org/a'], size: 1 },
        { id: 2, repos: ['ext/b'], size: 1 },
      ],
      graph,
    );

    expect(result).toHaveLength(2);
    expect(result[0].scannedCount).toBe(1);
    expect(result[0].externalCount).toBe(0);
    expect(result[1].scannedCount).toBe(0);
    expect(result[1].externalCount).toBe(1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Migration order
// ────────────────────────────────────────────────────────────────────────────

interface BuildOpts {
  scanned: string[];
  phantom?: string[];
  edges: Array<[string, string]>;
}

function buildGraph({ scanned, phantom = [], edges }: BuildOpts) {
  const graph = new MultiDirectedGraph();
  for (const repo of scanned) graph.addNode(repo, { isPhantom: false });
  for (const repo of phantom) graph.addNode(repo, { isPhantom: true });
  for (const [a, b] of edges) graph.addDirectedEdge(a, b);
  return graph;
}

describe('buildCondensation', () => {
  it('emits one edge per distinct unit pair and drops self-loops', () => {
    const graph = buildGraph({
      scanned: ['org/a', 'org/b', 'org/c'],
      edges: [
        ['org/a', 'org/b'],
        ['org/a', 'org/b'],
        ['org/b', 'org/c'],
      ],
    });
    const unitOf = new Map([
      ['org/a', 'u:ab'],
      ['org/b', 'u:ab'],
      ['org/c', 'u:c'],
    ]);
    const { units, outgoing } = buildCondensation(graph, unitOf);
    expect(units.sort()).toEqual(['u:ab', 'u:c']);
    // a->b is intra-unit (dropped); a->b duplicate dropped; b->c → u:ab -> u:c.
    expect([...outgoing.get('u:ab')!]).toEqual(['u:c']);
    expect(outgoing.get('u:c')!.size).toBe(0);
  });
});

describe('deriveMigrationOrder', () => {
  it('returns empty array when graph is null', () => {
    expect(
      deriveMigrationOrder({ clusters: [], strong_clusters: [] }, null),
    ).toEqual([]);
  });

  it('returns empty array when only phantoms exist', () => {
    const graph = buildGraph({ scanned: [], phantom: ['ext/x'], edges: [] });
    expect(
      deriveMigrationOrder({ clusters: [], strong_clusters: [] }, graph),
    ).toEqual([]);
  });

  it('places sinks in wave 0 and sources in higher waves (chain)', () => {
    const graph = buildGraph({
      scanned: ['org/a', 'org/b', 'org/c'],
      edges: [
        ['org/a', 'org/b'],
        ['org/b', 'org/c'],
      ],
    });
    const waves = deriveMigrationOrder(
      { clusters: [], strong_clusters: [] },
      graph,
    );
    expect(waves.map((w) => w.level)).toEqual([0, 1, 2]);
    expect(waves[0].units[0].repos).toEqual(['org/c']);
    expect(waves[1].units[0].repos).toEqual(['org/b']);
    expect(waves[2].units[0].repos).toEqual(['org/a']);
  });

  it('groups diamond dependencies into 3 waves with siblings in wave 1', () => {
    const graph = buildGraph({
      scanned: ['org/a', 'org/b', 'org/c', 'org/d'],
      edges: [
        ['org/a', 'org/b'],
        ['org/a', 'org/c'],
        ['org/b', 'org/d'],
        ['org/c', 'org/d'],
      ],
    });
    const waves = deriveMigrationOrder(
      { clusters: [], strong_clusters: [] },
      graph,
    );
    expect(waves).toHaveLength(3);
    expect(waves[0].units.map((u) => u.repos[0])).toEqual(['org/d']);
    expect(waves[1].units.map((u) => u.repos[0]).sort()).toEqual([
      'org/b',
      'org/c',
    ]);
    expect(waves[2].units.map((u) => u.repos[0])).toEqual(['org/a']);
  });

  it('treats an SCC as one indivisible unit', () => {
    const graph = buildGraph({
      scanned: ['org/a', 'org/b', 'org/c', 'org/leaf'],
      edges: [
        ['org/a', 'org/b'],
        ['org/b', 'org/c'],
        ['org/c', 'org/a'],
        ['org/c', 'org/leaf'],
      ],
    });
    const waves = deriveMigrationOrder(
      {
        clusters: [],
        strong_clusters: [
          { id: 1, repos: ['org/a', 'org/b', 'org/c'], size: 3 },
        ],
      },
      graph,
    );
    expect(waves).toHaveLength(2);
    expect(waves[0].units[0].kind).toBe('repo');
    expect(waves[0].units[0].repos).toEqual(['org/leaf']);
    const sccUnit = waves[1].units[0];
    expect(sccUnit.kind).toBe('scc');
    expect(sccUnit.repos).toEqual(['org/a', 'org/b', 'org/c']);
  });

  it('excludes phantom-leaves from any wave', () => {
    const graph = buildGraph({
      scanned: ['org/a'],
      phantom: ['ext/x'],
      edges: [['org/a', 'ext/x']],
    });
    const waves = deriveMigrationOrder(
      { clusters: [], strong_clusters: [] },
      graph,
    );
    expect(waves).toHaveLength(1);
    expect(waves[0].level).toBe(0);
    expect(waves[0].units).toHaveLength(1);
    expect(waves[0].units[0].repos).toEqual(['org/a']);
  });

  it('SCC dependentCount excludes intra-SCC edges', () => {
    const graph = buildGraph({
      scanned: ['org/a', 'org/b', 'org/c', 'org/in'],
      edges: [
        ['org/a', 'org/b'],
        ['org/b', 'org/a'],
        ['org/a', 'org/c'],
        ['org/c', 'org/a'],
        ['org/b', 'org/c'],
        ['org/c', 'org/b'],
        ['org/in', 'org/a'],
      ],
    });
    const waves = deriveMigrationOrder(
      {
        clusters: [],
        strong_clusters: [
          { id: 1, repos: ['org/a', 'org/b', 'org/c'], size: 3 },
        ],
      },
      graph,
    );
    const sccUnit = waves[0].units.find((u) => u.kind === 'scc');
    expect(sccUnit).toBeDefined();
    // Only org/in is an external inbound; intra-SCC edges are not counted.
    expect(sccUnit!.dependentCount).toBe(1);
  });

  it('places orphans in wave 0 as independent units when not clustered', () => {
    const graph = buildGraph({
      scanned: ['org/orphan-a', 'org/orphan-b'],
      edges: [],
    });
    const waves = deriveMigrationOrder(
      { clusters: [], strong_clusters: [] },
      graph,
    );
    expect(waves).toHaveLength(1);
    expect(waves[0].units).toHaveLength(2);
    expect(waves[0].units.every((u) => u.dependentCount === 0)).toBe(true);
  });

  it('breaks ties alphabetically when dependentCount matches', () => {
    const graph = buildGraph({
      scanned: ['org/z', 'org/a', 'org/m'],
      edges: [],
    });
    const waves = deriveMigrationOrder(
      { clusters: [], strong_clusters: [] },
      graph,
    );
    expect(waves[0].units.map((u) => u.repos[0])).toEqual([
      'org/a',
      'org/m',
      'org/z',
    ]);
  });

  it('handles long chains without stack overflow (~500 nodes)', () => {
    const N = 500;
    const scanned = Array.from({ length: N }, (_, i) => `org/r${i}`);
    const edges: Array<[string, string]> = [];
    for (let i = 0; i < N - 1; i++) {
      edges.push([scanned[i], scanned[i + 1]]);
    }
    const graph = buildGraph({ scanned, edges });
    const waves = deriveMigrationOrder(
      { clusters: [], strong_clusters: [] },
      graph,
    );
    expect(waves).toHaveLength(N);
    expect(waves[0].units[0].repos).toEqual([scanned[N - 1]]);
    expect(waves[N - 1].units[0].repos).toEqual([scanned[0]]);
  });

  it('whole-graph SCC produces a single wave with one unit', () => {
    const graph = buildGraph({
      scanned: ['org/a', 'org/b', 'org/c'],
      edges: [
        ['org/a', 'org/b'],
        ['org/b', 'org/c'],
        ['org/c', 'org/a'],
      ],
    });
    const waves = deriveMigrationOrder(
      {
        clusters: [],
        strong_clusters: [
          { id: 1, repos: ['org/a', 'org/b', 'org/c'], size: 3 },
        ],
      },
      graph,
    );
    expect(waves).toHaveLength(1);
    expect(waves[0].units).toHaveLength(1);
    expect(waves[0].units[0].kind).toBe('scc');
    expect(waves[0].units[0].repos).toEqual(['org/a', 'org/b', 'org/c']);
  });

  it('exposes prerequisites populated from immediate successor units', () => {
    const graph = buildGraph({
      scanned: ['org/a', 'org/b', 'org/c'],
      edges: [
        ['org/a', 'org/b'],
        ['org/a', 'org/c'],
      ],
    });
    const waves = deriveMigrationOrder(
      { clusters: [], strong_clusters: [] },
      graph,
    );
    const aUnit = waves
      .flatMap((w) => w.units)
      .find((u) => u.repos[0] === 'org/a');
    expect(aUnit).toBeDefined();
    expect(aUnit!.prerequisites).toEqual(['org/b', 'org/c']);
  });

  it('attaches level on each MigrationUnit consistent with its containing wave', () => {
    const graph = buildGraph({
      scanned: ['org/a', 'org/b', 'org/c'],
      edges: [
        ['org/a', 'org/b'],
        ['org/b', 'org/c'],
      ],
    });
    const waves = deriveMigrationOrder(
      { clusters: [], strong_clusters: [] },
      graph,
    );
    for (const wave of waves) {
      for (const unit of wave.units) {
        expect(unit.level).toBe(wave.level);
      }
    }
  });

  it('preserves the SCC ⊆ WCC invariant on real fixture data', () => {
    // Build a graph and compute strong clusters from it; every strong cluster
    // must be entirely contained in some weak cluster (SCC ⊆ WCC).
    const graphData: OutputData['graph'] = {
      'org/a': makeNode([makeDep('org/b')]),
      'org/b': makeNode([makeDep('org/a')]),
      'org/c': makeNode([makeDep('org/d')]),
      'org/d': makeNode([makeDep('org/c')]),
    };
    const strong = computeStrongClusters(graphData);
    const weak = [
      { id: 1, repos: ['org/a', 'org/b'], size: 2 },
      { id: 2, repos: ['org/c', 'org/d'], size: 2 },
    ];
    for (const scc of strong) {
      const sccSet = new Set(scc.repos);
      const containing = weak.find((wc) =>
        scc.repos.every((r) => wc.repos.includes(r)),
      );
      expect(containing).toBeDefined();
      // And no wc fragment of the scc lives in a different cluster.
      const others = weak.filter((wc) => wc !== containing);
      for (const other of others) {
        for (const r of other.repos) {
          expect(sccSet.has(r)).toBe(false);
        }
      }
    }
  });
});
