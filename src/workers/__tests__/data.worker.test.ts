/**
 * Tests for the data processing pipeline.
 *
 * Tests the core logic in `src/utils/dataProcessor.ts` directly —
 * no Web Worker needed. The worker file is a thin Comlink wrapper,
 * so testing the pure functions gives us full coverage of the business logic.
 */
import { describe, it, expect } from 'vitest';
import {
  processFile,
  mergeAndProcess,
  deduplicateDeps,
} from '../../utils/dataProcessor';
import type { OutputData } from '../../schemas/repomap';

// ────────────────────────────────────────────────────────────────────────────
// Test Fixtures
// ────────────────────────────────────────────────────────────────────────────

/** Minimal valid OutputData structure for testing. */
function makeValidOutput(
  overrides: Partial<OutputData> = {},
): OutputData {
  return {
    schema_version: '1.0.0',
    metadata: {
      generated_at: '2024-01-15T10:00:00Z',
      tool_version: '1.0.0',
      github_host: '',
      orgs_scanned: ['my-org'],
      total_repos: 2,
      total_repos_scanned: 2,
      total_repos_skipped: 0,
      total_edges: 1,
      scan_duration_seconds: 42,
      split_info: {
        mode: 'merged',
        file_index: 1,
        total_files: 1,
        this_file_orgs: ['my-org'],
      },
    },
    graph: {
      'my-org/api-service': {
        scan_status: { sbom: 'done', filescan: 'done' },
        annotations: { fork_of: null, template_from: null, archived: false },
        direct: [
          {
            repo: 'my-org/shared-lib',
            type: 'package',
            confidence: 'high',
            target_scanned: true,
            source_file: 'package.json',
            detail: {
              type: 'package',
              package_name: '@my-org/shared-lib',
              ecosystem: 'npm',
              version: '^2.0.0',
            },
          },
        ],
        transitive: [],
      },
      'my-org/shared-lib': {
        scan_status: { sbom: 'done', filescan: 'done' },
        annotations: { fork_of: null, template_from: null, archived: false },
        direct: [],
        transitive: [],
      },
    },
    unresolved: {
      'my-org/api-service': [
        {
          package_name: 'lodash',
          ecosystem: 'npm',
          version: '^4.17.21',
          reason: 'no_matching_repo',
        },
      ],
    },
    stats: {
      most_depended_on: [
        { repo: 'my-org/shared-lib', direct_dependents: 1 },
      ],
      dependency_type_counts: { package: 1 },
      clusters: [
        {
          id: 1,
          repos: ['my-org/api-service', 'my-org/shared-lib'],
          size: 2,
        },
      ],
      circular_deps: [],
      orphan_repos: [],
    },
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// processFile
// ────────────────────────────────────────────────────────────────────────────

describe('processFile', () => {
  it('produces correct node and edge counts for valid JSON', () => {
    const data = makeValidOutput();
    const result = processFile(JSON.stringify(data));

    // 2 known repos = 2 nodes (both exist in graph, no phantoms needed)
    expect(result.nodeCount).toBe(2);
    // 1 direct dependency = 1 edge
    expect(result.edgeCount).toBe(1);
  });

  it('creates phantom nodes for unscanned dependency targets', () => {
    const data = makeValidOutput({
      graph: {
        'my-org/api-service': {
          scan_status: { sbom: 'done', filescan: 'done' },
          annotations: {
            fork_of: null,
            template_from: null,
            archived: false,
          },
          direct: [
            {
              repo: 'external-org/unknown-lib',
              type: 'package',
              confidence: 'high',
              target_scanned: false,
              source_file: 'package.json',
              detail: {
                type: 'package',
                package_name: 'unknown-lib',
                ecosystem: 'npm',
                version: '^1.0.0',
              },
            },
          ],
          transitive: [],
        },
      },
    });

    const result = processFile(JSON.stringify(data));

    // 1 known node + 1 phantom node
    expect(result.nodeCount).toBe(2);
    expect(result.edgeCount).toBe(1);

    // Verify the phantom node exists in the serialized graph
    const phantomNode = result.serialized.nodes.find(
      (n) => n.key === 'external-org/unknown-lib',
    );
    expect(phantomNode).toBeDefined();
    const phantomAttrs = phantomNode?.attributes;
    expect(phantomAttrs?.isPhantom).toBe(true);
    expect(phantomAttrs?.org).toBe('external-org');
    expect(phantomAttrs?.scanStatus).toEqual({
      sbom: 'unknown',
      filescan: 'unknown',
    });
  });

  it('uses deterministic edge keys to prevent duplicates', () => {
    const data = makeValidOutput({
      graph: {
        'my-org/svc-a': {
          scan_status: { sbom: 'done', filescan: 'done' },
          annotations: {
            fork_of: null,
            template_from: null,
            archived: false,
          },
          direct: [
            {
              repo: 'my-org/svc-b',
              type: 'package',
              confidence: 'high',
              target_scanned: true,
              source_file: 'package.json',
              detail: {
                type: 'package',
                package_name: '@my-org/svc-b',
                ecosystem: 'npm',
                version: '^1.0.0',
              },
            },
            // Duplicate edge: same target and type
            {
              repo: 'my-org/svc-b',
              type: 'package',
              confidence: 'low',
              target_scanned: true,
              source_file: 'go.mod',
              detail: {
                type: 'package',
                package_name: '@my-org/svc-b',
                ecosystem: 'go',
                version: 'v1.0.0',
              },
            },
          ],
          transitive: [],
        },
        'my-org/svc-b': {
          scan_status: { sbom: 'done', filescan: 'done' },
          annotations: {
            fork_of: null,
            template_from: null,
            archived: false,
          },
          direct: [],
          transitive: [],
        },
      },
    });

    const result = processFile(JSON.stringify(data));

    // Only 1 edge despite 2 deps with same repo:type
    expect(result.edgeCount).toBe(1);

    // Verify the edge key format
    const edge = result.serialized.edges[0];
    expect(edge.key).toBe('my-org/svc-a→my-org/svc-b:package');
  });

  it('allows multiple edges of different types between the same nodes', () => {
    const data = makeValidOutput({
      graph: {
        'my-org/svc-a': {
          scan_status: { sbom: 'done', filescan: 'done' },
          annotations: {
            fork_of: null,
            template_from: null,
            archived: false,
          },
          direct: [
            {
              repo: 'my-org/svc-b',
              type: 'package',
              confidence: 'high',
              target_scanned: true,
              source_file: 'package.json',
              detail: {
                type: 'package',
                package_name: '@my-org/svc-b',
                ecosystem: 'npm',
                version: '^1.0.0',
              },
            },
            {
              repo: 'my-org/svc-b',
              type: 'workflow',
              confidence: 'high',
              target_scanned: true,
              source_file: '.github/workflows/ci.yml',
              detail: {
                type: 'workflow',
                uses: 'my-org/svc-b/.github/workflows/build.yml@main',
              },
            },
          ],
          transitive: [],
        },
        'my-org/svc-b': {
          scan_status: { sbom: 'done', filescan: 'done' },
          annotations: {
            fork_of: null,
            template_from: null,
            archived: false,
          },
          direct: [],
          transitive: [],
        },
      },
    });

    const result = processFile(JSON.stringify(data));

    // 2 edges: different types between same nodes
    expect(result.edgeCount).toBe(2);
  });

  it('throws SyntaxError on invalid JSON', () => {
    expect(() => processFile('{ not valid json')).toThrow(SyntaxError);
  });

  it('throws with user-friendly errors on invalid schema', () => {
    // Missing required fields
    const invalid = { schema_version: '1.0.0' };
    expect(() => processFile(JSON.stringify(invalid))).toThrow(
      /Schema validation failed/,
    );
  });

  it('throws with detailed path info for nested schema errors', () => {
    const invalid = {
      schema_version: '1.0.0',
      metadata: {
        generated_at: '2024-01-15T10:00:00Z',
        // missing required fields
      },
      graph: {},
      unresolved: {},
      stats: {},
    };
    try {
      processFile(JSON.stringify(invalid));
      expect.fail('Should have thrown');
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain('Schema validation failed');
      // Should include path information
      expect(msg).toContain('metadata');
    }
  });

  it('computes dependents count (inDegree) correctly', () => {
    const data = makeValidOutput({
      graph: {
        'my-org/a': {
          scan_status: { sbom: 'done', filescan: 'done' },
          annotations: {
            fork_of: null,
            template_from: null,
            archived: false,
          },
          direct: [
            {
              repo: 'my-org/c',
              type: 'package',
              confidence: 'high',
              target_scanned: true,
              source_file: 'package.json',
              detail: {
                type: 'package',
                package_name: 'c',
                ecosystem: 'npm',
                version: '^1.0.0',
              },
            },
          ],
          transitive: [],
        },
        'my-org/b': {
          scan_status: { sbom: 'done', filescan: 'done' },
          annotations: {
            fork_of: null,
            template_from: null,
            archived: false,
          },
          direct: [
            {
              repo: 'my-org/c',
              type: 'package',
              confidence: 'high',
              target_scanned: true,
              source_file: 'package.json',
              detail: {
                type: 'package',
                package_name: 'c',
                ecosystem: 'npm',
                version: '^2.0.0',
              },
            },
          ],
          transitive: [],
        },
        'my-org/c': {
          scan_status: { sbom: 'done', filescan: 'done' },
          annotations: {
            fork_of: null,
            template_from: null,
            archived: false,
          },
          direct: [],
          transitive: [],
        },
      },
    });

    const result = processFile(JSON.stringify(data));

    // Node C should have 2 dependents (A and B both depend on it)
    const nodeC = result.serialized.nodes.find((n) => n.key === 'my-org/c');
    expect(nodeC).toBeDefined();
    const attrsC = nodeC?.attributes;
    expect(attrsC?.dependents).toBe(2);
    expect(attrsC?.directDeps).toBe(0);

    // Nodes A and B should have 0 dependents and 1 direct dep each
    const nodeA = result.serialized.nodes.find((n) => n.key === 'my-org/a');
    const attrsA = nodeA?.attributes;
    expect(attrsA?.dependents).toBe(0);
    expect(attrsA?.directDeps).toBe(1);
  });

  it('preserves metadata, stats, and unresolved in the result', () => {
    const data = makeValidOutput();
    const result = processFile(JSON.stringify(data));

    expect(result.metadata.generated_at).toBe('2024-01-15T10:00:00Z');
    expect(result.metadata.orgs_scanned).toEqual(['my-org']);
    expect(result.stats.most_depended_on).toHaveLength(1);
    expect(result.unresolved['my-org/api-service']).toHaveLength(1);
  });

  it('sets correct node attributes for known repos', () => {
    const data = makeValidOutput({
      graph: {
        'my-org/archived-repo': {
          scan_status: { sbom: 'done', filescan: 'skipped' },
          annotations: {
            fork_of: 'upstream/original',
            template_from: null,
            archived: true,
          },
          direct: [],
          transitive: [],
        },
      },
    });

    const result = processFile(JSON.stringify(data));
    const node = result.serialized.nodes.find(
      (n) => n.key === 'my-org/archived-repo',
    );
    const attrs = node?.attributes;

    expect(attrs?.org).toBe('my-org');
    expect(attrs?.archived).toBe(true);
    expect(attrs?.isPhantom).toBe(false);
    expect(attrs?.forkOf).toBe('upstream/original');
    expect(attrs?.scanStatus).toEqual({
      sbom: 'done',
      filescan: 'skipped',
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// deduplicateDeps
// ────────────────────────────────────────────────────────────────────────────

describe('deduplicateDeps', () => {
  it('removes duplicate dependencies by repo:type key', () => {
    const deps: OutputData['graph'][string]['direct'] = [
      {
        repo: 'org/a',
        type: 'package',
        confidence: 'high',
        target_scanned: true,
        source_file: 'package.json',
        detail: {
          type: 'package',
          package_name: 'a',
          ecosystem: 'npm',
          version: '^1.0.0',
        },
      },
      {
        repo: 'org/a',
        type: 'package',
        confidence: 'low',
        target_scanned: true,
        source_file: 'go.mod',
        detail: {
          type: 'package',
          package_name: 'a',
          ecosystem: 'go',
          version: 'v1.0.0',
        },
      },
      {
        repo: 'org/a',
        type: 'workflow',
        confidence: 'high',
        target_scanned: true,
        source_file: '.github/workflows/ci.yml',
        detail: {
          type: 'workflow',
          uses: 'org/a/.github/workflows/build.yml@main',
        },
      },
    ];

    const result = deduplicateDeps(deps);

    // First 'org/a:package' kept, second removed. 'org/a:workflow' is different type.
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('package');
    expect(result[1].type).toBe('workflow');
  });

  it('preserves order (keeps first occurrence)', () => {
    const deps: OutputData['graph'][string]['direct'] = [
      {
        repo: 'org/x',
        type: 'package',
        confidence: 'high',
        target_scanned: true,
        source_file: 'first.json',
        detail: {
          type: 'package',
          package_name: 'x',
          ecosystem: 'npm',
          version: '^1.0.0',
        },
      },
      {
        repo: 'org/x',
        type: 'package',
        confidence: 'low',
        target_scanned: false,
        source_file: 'second.json',
        detail: {
          type: 'package',
          package_name: 'x',
          ecosystem: 'npm',
          version: '^2.0.0',
        },
      },
    ];

    const result = deduplicateDeps(deps);
    expect(result).toHaveLength(1);
    expect(result[0].source_file).toBe('first.json');
  });

  it('returns empty array for empty input', () => {
    expect(deduplicateDeps([])).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// mergeAndProcess
// ────────────────────────────────────────────────────────────────────────────

describe('mergeAndProcess', () => {
  function makeFileForOrg(
    org: string,
    repos: Record<string, OutputData['graph'][string]>,
    generatedAt: string = '2024-01-15T10:00:00Z',
  ): string {
    const data: OutputData = {
      schema_version: '1.0.0',
      metadata: {
        generated_at: generatedAt,
        tool_version: '1.0.0',
        github_host: '',
        orgs_scanned: [org],
        total_repos: Object.keys(repos).length,
        total_repos_scanned: Object.keys(repos).length,
        total_repos_skipped: 0,
        total_edges: 0,
        scan_duration_seconds: 10,
        split_info: {
          mode: 'per-org',
          file_index: 1,
          total_files: 2,
          this_file_orgs: [org],
        },
      },
      graph: repos,
      unresolved: {},
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        circular_deps: [],
        orphan_repos: [],
      },
    };
    return JSON.stringify(data);
  }

  it('merges graphs from multiple files', () => {
    const file1 = makeFileForOrg('org-a', {
      'org-a/svc-1': {
        scan_status: { sbom: 'done', filescan: 'done' },
        annotations: {
          fork_of: null,
          template_from: null,
          archived: false,
        },
        direct: [],
        transitive: [],
      },
    });

    const file2 = makeFileForOrg('org-b', {
      'org-b/svc-2': {
        scan_status: { sbom: 'done', filescan: 'done' },
        annotations: {
          fork_of: null,
          template_from: null,
          archived: false,
        },
        direct: [],
        transitive: [],
      },
    });

    const result = mergeAndProcess([file1, file2]);

    expect(result.nodeCount).toBe(2);
    expect(result.metadata.orgs_scanned).toContain('org-a');
    expect(result.metadata.orgs_scanned).toContain('org-b');
    expect(result.metadata.total_repos).toBe(2);
  });

  it('detects duplicate repos and merges their dependencies', () => {
    const file1 = makeFileForOrg('org-a', {
      'org-a/shared': {
        scan_status: { sbom: 'done', filescan: 'done' },
        annotations: {
          fork_of: null,
          template_from: null,
          archived: false,
        },
        direct: [
          {
            repo: 'org-a/dep-1',
            type: 'package',
            confidence: 'high',
            target_scanned: true,
            source_file: 'package.json',
            detail: {
              type: 'package',
              package_name: 'dep-1',
              ecosystem: 'npm',
              version: '^1.0.0',
            },
          },
        ],
        transitive: [],
      },
    });

    const file2 = makeFileForOrg('org-a', {
      'org-a/shared': {
        scan_status: { sbom: 'done', filescan: 'done' },
        annotations: {
          fork_of: null,
          template_from: null,
          archived: false,
        },
        direct: [
          {
            repo: 'org-a/dep-2',
            type: 'workflow',
            confidence: 'high',
            target_scanned: true,
            source_file: '.github/workflows/ci.yml',
            detail: {
              type: 'workflow',
              uses: 'org-a/dep-2/.github/workflows/build.yml@main',
            },
          },
        ],
        transitive: [],
      },
    });

    const result = mergeAndProcess([file1, file2]);

    // shared node + 2 phantom nodes for dep-1 and dep-2
    expect(result.nodeCount).toBe(3);
    // 2 edges: one package, one workflow
    expect(result.edgeCount).toBe(2);
  });

  it('deduplicates dependencies during merge', () => {
    const makeDep = (
      repo: string,
      type: string,
    ): OutputData['graph'][string]['direct'][number] => ({
      repo,
      type: type as 'package',
      confidence: 'high',
      target_scanned: true,
      source_file: 'package.json',
      detail: {
        type: 'package' as const,
        package_name: repo.split('/')[1],
        ecosystem: 'npm',
        version: '^1.0.0',
      },
    });

    const file1 = makeFileForOrg('org-a', {
      'org-a/shared': {
        scan_status: { sbom: 'done', filescan: 'done' },
        annotations: {
          fork_of: null,
          template_from: null,
          archived: false,
        },
        direct: [makeDep('org-a/lib', 'package')],
        transitive: [],
      },
    });

    // Same repo with same dep = should be deduplicated
    const file2 = makeFileForOrg('org-a', {
      'org-a/shared': {
        scan_status: { sbom: 'done', filescan: 'done' },
        annotations: {
          fork_of: null,
          template_from: null,
          archived: false,
        },
        direct: [makeDep('org-a/lib', 'package')],
        transitive: [],
      },
    });

    const result = mergeAndProcess([file1, file2]);

    // Only 1 edge after dedup (same repo:type)
    expect(result.edgeCount).toBe(1);
  });

  it('uses the latest generated_at timestamp', () => {
    const file1 = makeFileForOrg('org-a', {}, '2024-01-10T10:00:00Z');
    const file2 = makeFileForOrg('org-b', {}, '2024-01-15T10:00:00Z');

    const result = mergeAndProcess([file1, file2]);
    expect(result.metadata.generated_at).toBe('2024-01-15T10:00:00Z');
  });

  it('throws with file-index error for invalid file', () => {
    const validFile = makeFileForOrg('org-a', {});
    const invalidJson = '{ invalid }';

    expect(() => mergeAndProcess([validFile, invalidJson])).toThrow();
  });

  it('throws with file-index info when schema validation fails', () => {
    const validFile = makeFileForOrg('org-a', {});
    const invalidSchema = JSON.stringify({ schema_version: '1.0.0' });

    try {
      mergeAndProcess([validFile, invalidSchema]);
      expect.fail('Should have thrown');
    } catch (e) {
      expect((e as Error).message).toContain('File 2 validation failed');
    }
  });

  it('deduplicates orgs_scanned across files', () => {
    const file1 = makeFileForOrg('org-a', {}, '2024-01-10T10:00:00Z');
    const file2 = makeFileForOrg('org-a', {}, '2024-01-15T10:00:00Z');

    const result = mergeAndProcess([file1, file2]);
    expect(result.metadata.orgs_scanned).toEqual(['org-a']);
  });
});
