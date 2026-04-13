import { describe, it, expect } from 'vitest';
import { mergeFiles } from '../fileMerger';
import type { OutputData } from '../../schemas/repomap';

// ── Test Factories ──────────────────────────────────────────────────────────

function makeFile(
  overrides: {
    graph?: OutputData['graph'];
    unresolved?: OutputData['unresolved'];
    schema_version?: string;
    generated_at?: string;
    orgs_scanned?: string[];
    total_repos_scanned?: number;
    total_repos_skipped?: number;
  } = {},
): OutputData {
  return {
    schema_version: overrides.schema_version ?? '1.0.0',
    metadata: {
      generated_at: overrides.generated_at ?? '2024-01-01T00:00:00Z',
      tool_version: '0.1.0',
      github_host: '',
      orgs_scanned: overrides.orgs_scanned ?? ['org-a'],
      total_repos: Object.keys(overrides.graph ?? {}).length,
      total_repos_scanned: overrides.total_repos_scanned ?? 1,
      total_repos_skipped: overrides.total_repos_skipped ?? 0,
      total_edges: 0,
      scan_duration_seconds: 1,
      split_info: {
        mode: 'per-org' as const,
        file_index: 1,
        total_files: 1,
        this_file_orgs: overrides.orgs_scanned ?? ['org-a'],
      },
    },
    graph: overrides.graph ?? {},
    unresolved: overrides.unresolved ?? {},
    stats: {
      most_depended_on: [],
      dependency_type_counts: {},
      clusters: [],
      strong_clusters: [],
      circular_deps: [],
      orphan_repos: [],
    },
  } as OutputData;
}

function makeDep(
  repo: string,
  type: 'package' | 'workflow' = 'package',
): OutputData['graph'][string]['direct'][number] {
  if (type === 'workflow') {
    return {
      repo,
      type: 'workflow',
      confidence: 'high' as const,
      target_scanned: true,
      source_file: '.github/workflows/ci.yml',
      detail: {
        type: 'workflow',
        uses: `${repo}/.github/workflows/ci.yml@main`,
      },
    };
  }
  return {
    repo,
    type: 'package',
    confidence: 'high' as const,
    target_scanned: true,
    source_file: 'package.json',
    detail: {
      type: 'package',
      package_name: `@test/${repo.split('/')[1]}`,
      ecosystem: 'npm',
      version: '^1.0.0',
    },
  };
}

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

// ── Tests ───────────────────────────────────────────────────────────────────

describe('mergeFiles', () => {
  it('throws on empty files array', () => {
    expect(() => mergeFiles([])).toThrow('No files to merge');
  });

  it('returns single file as-is with no conflicts or warnings', () => {
    const file = makeFile({ graph: { 'org-a/repo-1': makeNode() } });
    const result = mergeFiles([file]);

    expect(result.merged).toBe(file); // identity, not clone
    expect(result.conflicts).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('merges two files with disjoint repos', () => {
    const file1 = makeFile({
      graph: { 'org-a/repo-1': makeNode() },
      orgs_scanned: ['org-a'],
      total_repos_scanned: 1,
    });
    const file2 = makeFile({
      graph: { 'org-b/repo-2': makeNode() },
      orgs_scanned: ['org-b'],
      total_repos_scanned: 2,
    });

    const result = mergeFiles([file1, file2]);

    expect(Object.keys(result.merged.graph)).toHaveLength(2);
    expect(result.merged.graph['org-a/repo-1']).toBeDefined();
    expect(result.merged.graph['org-b/repo-2']).toBeDefined();
    expect(result.conflicts).toEqual([]);
  });

  it('detects duplicate repos as conflicts and merges their deps', () => {
    const dep1 = makeDep('org-a/lib', 'package');
    const dep2 = makeDep('org-a/core', 'workflow');

    const file1 = makeFile({
      graph: { 'org-a/repo-1': makeNode([dep1]) },
    });
    const file2 = makeFile({
      graph: { 'org-a/repo-1': makeNode([dep2]) },
    });

    const result = mergeFiles([file1, file2]);

    expect(result.conflicts).toContain('org-a/repo-1');
    // Both deps should be present after merge
    expect(result.merged.graph['org-a/repo-1'].direct).toHaveLength(2);
  });

  it('deduplicates dependencies with same repo:type key', () => {
    const dep = makeDep('org-a/lib', 'package');

    const file1 = makeFile({
      graph: { 'org-a/repo-1': makeNode([dep]) },
    });
    const file2 = makeFile({
      graph: { 'org-a/repo-1': makeNode([dep]) },
    });

    const result = mergeFiles([file1, file2]);

    // Same repo:type should be deduplicated to 1
    expect(result.merged.graph['org-a/repo-1'].direct).toHaveLength(1);
  });

  it('warns on mixed schema versions', () => {
    const file1 = makeFile({ schema_version: '1.0.0' });
    const file2 = makeFile({ schema_version: '1.1.0' });

    const result = mergeFiles([file1, file2]);

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Mixed schema versions');
    expect(result.warnings[0]).toContain('1.0.0');
    expect(result.warnings[0]).toContain('1.1.0');
  });

  it('warns when scan times are >1 hour apart', () => {
    const file1 = makeFile({ generated_at: '2024-01-01T00:00:00Z' });
    const file2 = makeFile({ generated_at: '2024-01-01T02:00:00Z' });

    const result = mergeFiles([file1, file2]);

    expect(result.warnings).toContainEqual(
      expect.stringContaining('different scan runs'),
    );
  });

  it('does NOT warn when scan times are <1 hour apart', () => {
    const file1 = makeFile({ generated_at: '2024-01-01T00:00:00Z' });
    const file2 = makeFile({ generated_at: '2024-01-01T00:30:00Z' });

    const result = mergeFiles([file1, file2]);

    const timeWarnings = result.warnings.filter((w) =>
      w.includes('different scan runs'),
    );
    expect(timeWarnings).toHaveLength(0);
  });

  it('updates total_repos to reflect unique merged repos', () => {
    const file1 = makeFile({
      graph: { 'org-a/repo-1': makeNode(), 'org-a/repo-2': makeNode() },
    });
    const file2 = makeFile({
      graph: { 'org-b/repo-3': makeNode() },
    });

    const result = mergeFiles([file1, file2]);

    expect(result.merged.metadata.total_repos).toBe(3);
  });

  it('unions orgs_scanned across files', () => {
    const file1 = makeFile({ orgs_scanned: ['org-a', 'org-b'] });
    const file2 = makeFile({ orgs_scanned: ['org-b', 'org-c'] });

    const result = mergeFiles([file1, file2]);

    expect(result.merged.metadata.orgs_scanned.sort()).toEqual([
      'org-a',
      'org-b',
      'org-c',
    ]);
  });

  it('uses the latest generated_at timestamp', () => {
    const file1 = makeFile({ generated_at: '2024-01-01T00:00:00Z' });
    const file2 = makeFile({ generated_at: '2024-01-01T00:30:00Z' });

    const result = mergeFiles([file1, file2]);

    expect(result.merged.metadata.generated_at).toBe('2024-01-01T00:30:00Z');
  });

  it('sums total_repos_scanned and total_repos_skipped', () => {
    const file1 = makeFile({
      total_repos_scanned: 10,
      total_repos_skipped: 2,
    });
    const file2 = makeFile({
      total_repos_scanned: 15,
      total_repos_skipped: 3,
    });

    const result = mergeFiles([file1, file2]);

    expect(result.merged.metadata.total_repos_scanned).toBe(25);
    expect(result.merged.metadata.total_repos_skipped).toBe(5);
  });

  it('recalculates total_edges from merged graph', () => {
    const file1 = makeFile({
      graph: {
        'org-a/repo-1': makeNode([
          makeDep('org-a/lib'),
          makeDep('org-a/core', 'workflow'),
        ]),
      },
    });
    const file2 = makeFile({
      graph: { 'org-b/repo-2': makeNode([makeDep('org-b/utils')]) },
    });

    const result = mergeFiles([file1, file2]);

    expect(result.merged.metadata.total_edges).toBe(3);
  });

  it('merges unresolved packages across files', () => {
    const file1 = makeFile({
      unresolved: {
        'org-a/repo-1': [
          {
            package_name: 'lodash',
            ecosystem: 'npm',
            version: '^4.0.0',
            reason: 'no_matching_repo',
          },
        ],
      },
    });
    const file2 = makeFile({
      unresolved: {
        'org-a/repo-1': [
          {
            package_name: 'express',
            ecosystem: 'npm',
            version: '^5.0.0',
            reason: 'no_matching_repo',
          },
        ],
      },
    });

    const result = mergeFiles([file1, file2]);

    expect(result.merged.unresolved['org-a/repo-1']).toHaveLength(2);
  });

  it('isolates merged result from input via structuredClone', () => {
    const node = makeNode([makeDep('org-a/lib')]);
    const file1 = makeFile({ graph: { 'org-a/repo-1': node } });
    const file2 = makeFile({ graph: { 'org-b/repo-2': makeNode() } });

    const result = mergeFiles([file1, file2]);

    // Mutating the result should not affect the input
    result.merged.graph['org-a/repo-1'].direct.push(makeDep('org-a/mutated'));
    expect(file1.graph['org-a/repo-1'].direct).toHaveLength(1);
  });
});
