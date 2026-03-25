import type { Cluster, OutputData } from '../../schemas/repomap';

function makeDep(repo: string): OutputData['graph'][string]['direct'][number] {
  return {
    repo,
    type: 'package',
    confidence: 'high',
    target_scanned: !repo.startsWith('external-org/'),
    source_file: 'package.json',
    detail: {
      type: 'package',
      package_name: repo,
      ecosystem: 'npm',
      version: '^1.0.0',
    },
  };
}

function makeNode(
  direct: OutputData['graph'][string]['direct'],
): OutputData['graph'][string] {
  return {
    scan_status: { sbom: 'done', filescan: 'done' },
    annotations: { fork_of: null, template_from: null, archived: false },
    direct,
    transitive: [],
  };
}

export const CONNECTIVITY_FIXTURE_WEAK_CLUSTERS: Cluster[] = [
  { id: 1, repos: ['org/a', 'org/b', 'org/c', 'org/d'], size: 4 },
  { id: 2, repos: ['external-org/phantom', 'org/e'], size: 2 },
];

export const CONNECTIVITY_FIXTURE_STRONG_CLUSTERS: Cluster[] = [
  { id: 1, repos: ['org/a', 'org/b'], size: 2 },
  { id: 2, repos: ['org/c', 'org/d'], size: 2 },
  { id: 3, repos: ['external-org/phantom'], size: 1 },
  { id: 4, repos: ['org/e'], size: 1 },
];

/**
 * Deterministic topology used to explain weak vs strong connectivity.
 *
 * Directed edges:
 * a -> b -> c -> d
 * ^         ^
 * |         |
 * +---------+   (a<->b and c<->d are the only mutual pairs)
 * e -> phantom
 *
 * Result:
 * - Weak groups: [a,b,c,d] and [e,phantom]
 * - Strong groups: [a,b], [c,d], [e], [phantom]
 */
export function makeConnectivityFixture(): OutputData {
  return {
    schema_version: '1.0.0',
    metadata: {
      generated_at: '2024-01-15T10:00:00Z',
      tool_version: '1.0.0',
      github_host: '',
      orgs_scanned: ['org'],
      total_repos: 5,
      total_repos_scanned: 5,
      total_repos_skipped: 0,
      total_edges: 6,
      scan_duration_seconds: 1,
      split_info: {
        mode: 'merged',
        file_index: 1,
        total_files: 1,
        this_file_orgs: ['org'],
      },
    },
    graph: {
      'org/a': makeNode([makeDep('org/b')]),
      'org/b': makeNode([makeDep('org/a'), makeDep('org/c')]),
      'org/c': makeNode([makeDep('org/d')]),
      'org/d': makeNode([makeDep('org/c')]),
      'org/e': makeNode([makeDep('external-org/phantom')]),
    },
    unresolved: {},
    stats: {
      most_depended_on: [],
      dependency_type_counts: { package: 6 },
      clusters: CONNECTIVITY_FIXTURE_WEAK_CLUSTERS,
      strong_clusters: [],
      circular_deps: [
        ['org/a', 'org/b'],
        ['org/c', 'org/d'],
      ],
      orphan_repos: [],
    },
  };
}
