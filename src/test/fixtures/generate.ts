/// <reference types="node" />
/**
 * Synthetic repo-map test data generator.
 *
 * Generates realistic OutputData fixtures at various scales for testing
 * the dashboard's visualization, search, and merge capabilities.
 *
 * Usage:
 *   npx tsx src/test/fixtures/generate.ts
 *
 * Exports `generate()` for programmatic use in tests.
 */
import type { OutputData, DependencyDetail } from '../../schemas/repomap';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface GenerateOptions {
  repoCount: number;
  orgCount: number;
  avgDepsPerRepo: number;
  /** Probability (0-1) of inserting circular dependencies. */
  circularDepChance: number;
  /** Probability (0-1) of a dependency targeting a phantom (unscanned) repo. */
  phantomNodeChance: number;
  /** Probability (0-1) of a repo being marked as archived. */
  archivedChance: number;
}

const ECOSYSTEMS = ['npm', 'go', 'maven', 'pip', 'cargo', 'nuget'];
const DEP_TYPES = [
  'package',
  'workflow',
  'action',
  'docker',
  'submodule',
  'terraform',
  'script',
] as const;

type DepType = (typeof DEP_TYPES)[number];

/**
 * Build a type-specific detail object for a dependency.
 * The `type` field in the detail matches the dependency type.
 */
function makeDetail(depType: DepType, targetRepo: string): DependencyDetail {
  const [org, name] = targetRepo.split('/');
  const ecosystem = ECOSYSTEMS[Math.floor(Math.random() * ECOSYSTEMS.length)];

  switch (depType) {
    case 'package':
      return {
        type: 'package',
        package_name: `@${org}/${name}`,
        ecosystem,
        version: `^${Math.floor(Math.random() * 5)}.0.0`,
      };
    case 'workflow':
      return {
        type: 'workflow',
        uses: `${targetRepo}/.github/workflows/ci.yml@main`,
      };
    case 'action':
      return {
        type: 'action',
        uses: `${targetRepo}@v${Math.floor(Math.random() * 3) + 1}`,
      };
    case 'docker':
      return { type: 'docker', image: `ghcr.io/${targetRepo}:latest` };
    case 'submodule':
      return {
        type: 'submodule',
        url: `https://github.com/${targetRepo}.git`,
        path: `vendor/${name}`,
      };
    case 'terraform':
      return {
        type: 'terraform',
        source: `github.com/${targetRepo}//modules/vpc`,
      };
    case 'script':
      return { type: 'script', match: targetRepo, match_type: 'url' };
  }
}

/**
 * Generate synthetic repo-map data at the specified scale.
 */
export function generate(options: GenerateOptions): OutputData {
  const {
    repoCount,
    orgCount,
    avgDepsPerRepo,
    circularDepChance,
    phantomNodeChance,
    archivedChance,
  } = options;

  // Generate org names (deterministic based on index)
  const orgs = Array.from(
    { length: orgCount },
    (_, i) => `org-${String.fromCharCode(65 + i).toLowerCase()}lpha`,
  );

  // Generate repo names distributed across orgs
  const repos: string[] = [];
  const suffixes = [
    'api',
    'web',
    'lib',
    'core',
    'utils',
    'shared',
    'service',
    'cli',
    'sdk',
    'infra',
  ];
  for (let i = 0; i < repoCount; i++) {
    const org = orgs[i % orgCount];
    const suffix = suffixes[i % suffixes.length];
    repos.push(`${org}/${suffix}-${Math.floor(i / 10)}`);
  }

  const graph: OutputData['graph'] = {};
  const unresolved: OutputData['unresolved'] = {};

  for (const repo of repos) {
    const depCount = Math.max(
      0,
      Math.floor(avgDepsPerRepo + (Math.random() - 0.5) * avgDepsPerRepo),
    );
    const direct: OutputData['graph'][string]['direct'] = [];

    for (let d = 0; d < depCount; d++) {
      const isPhantom = Math.random() < phantomNodeChance;
      const targetIdx = Math.floor(Math.random() * repoCount);
      const targetRepo = isPhantom
        ? `external-org/phantom-${targetIdx}`
        : repos[targetIdx];

      if (targetRepo === repo) continue; // no self-deps

      const depType = DEP_TYPES[Math.floor(Math.random() * DEP_TYPES.length)];
      const detail = makeDetail(depType, targetRepo);

      direct.push({
        repo: targetRepo,
        type: depType,
        confidence: Math.random() > 0.2 ? 'high' : 'low',
        target_scanned: !isPhantom,
        source_file:
          depType === 'package' ? 'package.json' : '.github/workflows/ci.yml',
        detail,
      });
    }

    // Add some unresolved external deps
    if (Math.random() < 0.3) {
      const pkgNames = ['lodash', 'express', 'axios', 'react', 'vue'];
      unresolved[repo] = [
        {
          package_name:
            pkgNames[Math.floor(Math.random() * pkgNames.length)],
          ecosystem: 'npm',
          version: '^4.0.0',
          reason: 'no_matching_repo',
        },
      ];
    }

    graph[repo] = {
      scan_status: { sbom: 'done', filescan: 'done' },
      annotations: {
        fork_of: null,
        template_from: null,
        archived: Math.random() < archivedChance,
      },
      direct,
      transitive: [], // Keep transitive empty for fixture simplicity
    };
  }

  // Add circular deps
  const circularDeps: string[][] = [];
  if (circularDepChance > 0 && repos.length >= 2) {
    for (
      let i = 0;
      i < Math.ceil(repoCount * circularDepChance * 0.01);
      i++
    ) {
      const a = repos[Math.floor(Math.random() * repos.length)];
      const b = repos[Math.floor(Math.random() * repos.length)];
      if (a !== b) circularDeps.push([a, b]);
    }
  }

  // Compute stats from the generated graph
  const depCounts = new Map<string, number>();
  for (const node of Object.values(graph)) {
    for (const dep of node.direct) {
      depCounts.set(dep.repo, (depCounts.get(dep.repo) ?? 0) + 1);
    }
  }

  const mostDependedOn = [...depCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([repo, count]) => ({ repo, direct_dependents: count }));

  const typeCounts: Record<string, number> = {};
  for (const node of Object.values(graph)) {
    for (const dep of node.direct) {
      typeCounts[dep.type] = (typeCounts[dep.type] ?? 0) + 1;
    }
  }

  const orphans = Object.entries(graph)
    .filter(
      ([key, node]) => node.direct.length === 0 && !depCounts.has(key),
    )
    .map(([key]) => key);

  let totalEdges = 0;
  for (const node of Object.values(graph)) totalEdges += node.direct.length;

  return {
    schema_version: '1.0.0',
    metadata: {
      generated_at: new Date().toISOString(),
      tool_version: '0.1.0',
      github_host: '',
      orgs_scanned: orgs,
      total_repos: repoCount,
      total_repos_scanned: repoCount,
      total_repos_skipped: 0,
      total_edges: totalEdges,
      scan_duration_seconds: repoCount * 0.1,
      split_info: {
        mode: 'merged',
        file_index: 1,
        total_files: 1,
        this_file_orgs: orgs,
      },
    },
    graph,
    unresolved,
    stats: {
      most_depended_on: mostDependedOn,
      dependency_type_counts: typeCounts,
      clusters: [
        {
          id: 1,
          repos: repos.slice(0, Math.min(5, repos.length)),
          size: Math.min(5, repos.length),
        },
      ],
      circular_deps: circularDeps,
      orphan_repos: orphans.slice(0, 10),
    },
  } as OutputData;
}

// ──────────────────────────────────────────────────────────────────────────
// CLI entry point — generate fixture files when run directly
// ──────────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  const outDir = path.dirname(__filename);

  const configs = [
    {
      name: 'small',
      repoCount: 50,
      orgCount: 3,
      avgDepsPerRepo: 4,
      circularDepChance: 0.1,
      phantomNodeChance: 0.1,
      archivedChance: 0.05,
    },
    {
      name: 'medium',
      repoCount: 1000,
      orgCount: 5,
      avgDepsPerRepo: 6,
      circularDepChance: 0.05,
      phantomNodeChance: 0.08,
      archivedChance: 0.1,
    },
    {
      name: 'edge-cases',
      repoCount: 100,
      orgCount: 10,
      avgDepsPerRepo: 8,
      circularDepChance: 0.2,
      phantomNodeChance: 0.3,
      archivedChance: 0.2,
    },
  ];

  for (const config of configs) {
    const data = generate(config);
    fs.writeFileSync(
      path.join(outDir, `${config.name}.json`),
      JSON.stringify(data, null, 2),
    );
    console.warn(
      `Generated ${config.name}.json: ${Object.keys(data.graph).length} repos, ${data.metadata.total_edges} edges`,
    );
  }
}
