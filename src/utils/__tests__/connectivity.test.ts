import { describe, it, expect } from 'vitest';
import { MultiDirectedGraph } from 'graphology';
import type { OutputData } from '../../schemas/repomap';
import { computeStrongClusters, deriveMigrationCohorts } from '../connectivity';

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
