/**
 * Tests for the gh-repo-map v1.0.0 Zod schemas.
 *
 * Coverage:
 * - Valid complete data parses correctly
 * - Missing optional fields receive defaults
 * - Wrong schema_version still parses (version check is separate)
 * - Malformed dependencies (wrong type, missing fields)
 * - Each dependency type's detail shape validates
 * - Discriminated union narrows types correctly
 * - validateSchema returns user-friendly error messages
 * - Passthrough preserves unknown fields
 */
import { describe, it, expect } from 'vitest';
import {
  SplitInfoSchema,
  MetadataSchema,
  ScanStatusSchema,
  AnnotationsSchema,
  PackageDetailSchema,
  WorkflowDetailSchema,
  ActionDetailSchema,
  SubmoduleDetailSchema,
  DockerDetailSchema,
  TerraformDetailSchema,
  ScriptDetailSchema,
  DependencyDetailSchema,
  DirectDependencySchema,
  TransitiveDependencySchema,
  RepoNodeSchema,
  UnresolvedPackageSchema,
  StatsSchema,
  OutputSchema,
  validateSchema,
  type OutputData,
  type DirectDependency,
  type DependencyDetail,
} from '../repomap';

// ────────────────────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────────────────────

/** Minimal valid fixture matching the v1.0.0 schema. */
function createValidFixture(): Record<string, unknown> {
  return {
    schema_version: '1.0.0',
    metadata: {
      generated_at: '2024-01-15T10:30:00Z',
      tool_version: '1.2.3',
      github_host: '',
      orgs_scanned: ['my-org', 'partner-org'],
      total_repos: 100,
      total_repos_scanned: 95,
      total_repos_skipped: 5,
      total_edges: 250,
      scan_duration_seconds: 45.2,
      split_info: {
        mode: 'merged' as const,
        file_index: 1,
        total_files: 1,
        this_file_orgs: ['my-org', 'partner-org'],
      },
    },
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
          {
            repo: 'my-org/ci-workflows',
            type: 'workflow',
            confidence: 'high',
            target_scanned: true,
            source_file: '.github/workflows/ci.yml',
            detail: {
              type: 'workflow',
              uses: 'my-org/ci-workflows/.github/workflows/build.yml@main',
            },
          },
        ],
        transitive: [
          {
            repo: 'my-org/core-utils',
            via: ['my-org/shared-lib'],
            type: 'package',
            depth: 2,
          },
        ],
      },
      'my-org/shared-lib': {
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
        { repo: 'my-org/shared-lib', direct_dependents: 42 },
      ],
      dependency_type_counts: {
        package: 150,
        workflow: 30,
        action: 25,
      },
      clusters: [
        {
          id: 1,
          repos: ['my-org/api-service', 'my-org/shared-lib'],
          size: 2,
        },
      ],
      strong_clusters: [
        {
          id: 1,
          repos: ['my-org/api-service'],
          size: 1,
        },
      ],
      circular_deps: [['my-org/svc-a', 'my-org/svc-b']],
      orphan_repos: ['my-org/abandoned-project'],
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// SplitInfoSchema
// ────────────────────────────────────────────────────────────────────────────

describe('SplitInfoSchema', () => {
  it('parses valid split info with mode=merged', () => {
    const result = SplitInfoSchema.safeParse({
      mode: 'merged',
      file_index: 1,
      total_files: 1,
      this_file_orgs: ['org-a'],
    });
    expect(result.success).toBe(true);
  });

  it('parses valid split info with mode=per-org', () => {
    const result = SplitInfoSchema.safeParse({
      mode: 'per-org',
      file_index: 2,
      total_files: 5,
      this_file_orgs: ['org-b'],
    });
    expect(result.success).toBe(true);
  });

  it('parses valid split info with mode=auto', () => {
    const result = SplitInfoSchema.safeParse({
      mode: 'auto',
      file_index: 1,
      total_files: 3,
      this_file_orgs: ['org-a', 'org-b'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid mode', () => {
    const result = SplitInfoSchema.safeParse({
      mode: 'invalid',
      file_index: 1,
      total_files: 1,
      this_file_orgs: [],
    });
    expect(result.success).toBe(false);
  });

  it('preserves unknown fields via passthrough', () => {
    const result = SplitInfoSchema.parse({
      mode: 'merged',
      file_index: 1,
      total_files: 1,
      this_file_orgs: [],
      future_field: 'hello',
    });
    expect(result).toHaveProperty('future_field', 'hello');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// MetadataSchema
// ────────────────────────────────────────────────────────────────────────────

describe('MetadataSchema', () => {
  it('parses complete metadata', () => {
    const fixture = createValidFixture();
    const result = MetadataSchema.safeParse(fixture.metadata);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orgs_scanned).toEqual(['my-org', 'partner-org']);
      expect(result.data.scan_duration_seconds).toBe(45.2);
    }
  });

  it('rejects metadata with missing required fields', () => {
    const result = MetadataSchema.safeParse({
      generated_at: '2024-01-15T10:30:00Z',
      // missing all other fields
    });
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// ScanStatusSchema & AnnotationsSchema
// ────────────────────────────────────────────────────────────────────────────

describe('ScanStatusSchema', () => {
  it('parses valid scan status', () => {
    const result = ScanStatusSchema.safeParse({
      sbom: 'done',
      filescan: 'done',
    });
    expect(result.success).toBe(true);
  });

  it('accepts any string values (not enum-restricted)', () => {
    const result = ScanStatusSchema.safeParse({
      sbom: 'skipped',
      filescan: 'error',
    });
    expect(result.success).toBe(true);
  });
});

describe('AnnotationsSchema', () => {
  it('parses annotations with null fork_of and template_from', () => {
    const result = AnnotationsSchema.safeParse({
      fork_of: null,
      template_from: null,
      archived: false,
    });
    expect(result.success).toBe(true);
  });

  it('parses annotations with non-null fork_of', () => {
    const result = AnnotationsSchema.safeParse({
      fork_of: 'upstream-org/original-repo',
      template_from: null,
      archived: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fork_of).toBe('upstream-org/original-repo');
      expect(result.data.archived).toBe(true);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Dependency Detail Schemas — each type individually
// ────────────────────────────────────────────────────────────────────────────

describe('PackageDetailSchema', () => {
  it('parses valid package detail', () => {
    const result = PackageDetailSchema.safeParse({
      type: 'package',
      package_name: '@my-org/shared-lib',
      ecosystem: 'npm',
      version: '^2.0.0',
    });
    expect(result.success).toBe(true);
  });

  it('rejects package detail with wrong type literal', () => {
    const result = PackageDetailSchema.safeParse({
      type: 'workflow',
      package_name: 'test',
      ecosystem: 'npm',
      version: '1.0.0',
    });
    expect(result.success).toBe(false);
  });

  it('rejects package detail missing package_name', () => {
    const result = PackageDetailSchema.safeParse({
      type: 'package',
      ecosystem: 'npm',
      version: '1.0.0',
    });
    expect(result.success).toBe(false);
  });
});

describe('WorkflowDetailSchema', () => {
  it('parses valid workflow detail', () => {
    const result = WorkflowDetailSchema.safeParse({
      type: 'workflow',
      uses: 'my-org/ci/.github/workflows/build.yml@main',
    });
    expect(result.success).toBe(true);
  });
});

describe('ActionDetailSchema', () => {
  it('parses valid action detail', () => {
    const result = ActionDetailSchema.safeParse({
      type: 'action',
      uses: 'actions/checkout@v4',
    });
    expect(result.success).toBe(true);
  });
});

describe('SubmoduleDetailSchema', () => {
  it('parses valid submodule detail', () => {
    const result = SubmoduleDetailSchema.safeParse({
      type: 'submodule',
      url: 'https://github.com/my-org/shared.git',
      path: 'vendor/shared',
    });
    expect(result.success).toBe(true);
  });
});

describe('DockerDetailSchema', () => {
  it('parses valid docker detail', () => {
    const result = DockerDetailSchema.safeParse({
      type: 'docker',
      image: 'ghcr.io/my-org/base-image:latest',
    });
    expect(result.success).toBe(true);
  });
});

describe('TerraformDetailSchema', () => {
  it('parses valid terraform detail with ref', () => {
    const result = TerraformDetailSchema.safeParse({
      type: 'terraform',
      source: 'github.com/my-org/terraform-modules//vpc',
      ref: 'v1.2.0',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ref).toBe('v1.2.0');
    }
  });

  it('parses valid terraform detail without optional ref', () => {
    const result = TerraformDetailSchema.safeParse({
      type: 'terraform',
      source: 'github.com/my-org/terraform-modules//vpc',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ref).toBeUndefined();
    }
  });
});

describe('ScriptDetailSchema', () => {
  it('parses valid script detail', () => {
    const result = ScriptDetailSchema.safeParse({
      type: 'script',
      match: 'my-org/deploy-tool',
      match_type: 'github_url',
    });
    expect(result.success).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// DependencyDetailSchema — discriminated union
// ────────────────────────────────────────────────────────────────────────────

describe('DependencyDetailSchema (discriminated union)', () => {
  it('parses package type correctly', () => {
    const result = DependencyDetailSchema.safeParse({
      type: 'package',
      package_name: 'lodash',
      ecosystem: 'npm',
      version: '^4.0.0',
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === 'package') {
      // TypeScript should narrow this correctly
      expect(result.data.package_name).toBe('lodash');
      expect(result.data.ecosystem).toBe('npm');
    }
  });

  it('parses workflow type correctly', () => {
    const result = DependencyDetailSchema.safeParse({
      type: 'workflow',
      uses: 'org/repo/.github/workflows/ci.yml@main',
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === 'workflow') {
      expect(result.data.uses).toBe(
        'org/repo/.github/workflows/ci.yml@main',
      );
    }
  });

  it('rejects unknown discriminator value', () => {
    const result = DependencyDetailSchema.safeParse({
      type: 'unknown_type',
      foo: 'bar',
    });
    expect(result.success).toBe(false);
  });

  it('rejects data with missing discriminator', () => {
    const result = DependencyDetailSchema.safeParse({
      package_name: 'test',
      ecosystem: 'npm',
      version: '1.0.0',
    });
    expect(result.success).toBe(false);
  });

  it('rejects package detail with missing required fields for that type', () => {
    const result = DependencyDetailSchema.safeParse({
      type: 'package',
      // missing package_name, ecosystem, version
    });
    expect(result.success).toBe(false);
  });

  it('narrows type correctly for all 7 dependency types', () => {
    const testCases: Array<{ input: Record<string, unknown>; expectedType: string }> = [
      {
        input: { type: 'package', package_name: 'x', ecosystem: 'npm', version: '1' },
        expectedType: 'package',
      },
      {
        input: { type: 'workflow', uses: 'org/repo/.github/workflows/ci.yml@main' },
        expectedType: 'workflow',
      },
      {
        input: { type: 'action', uses: 'actions/checkout@v4' },
        expectedType: 'action',
      },
      {
        input: { type: 'submodule', url: 'https://example.com/repo.git', path: 'vendor/lib' },
        expectedType: 'submodule',
      },
      {
        input: { type: 'docker', image: 'nginx:latest' },
        expectedType: 'docker',
      },
      {
        input: { type: 'terraform', source: 'github.com/org/mod//sub' },
        expectedType: 'terraform',
      },
      {
        input: { type: 'script', match: 'org/tool', match_type: 'github_url' },
        expectedType: 'script',
      },
    ];

    for (const { input, expectedType } of testCases) {
      const result = DependencyDetailSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(expectedType);
      }
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// DirectDependencySchema
// ────────────────────────────────────────────────────────────────────────────

describe('DirectDependencySchema', () => {
  it('parses a valid direct dependency', () => {
    const result = DirectDependencySchema.safeParse({
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
    });
    expect(result.success).toBe(true);
  });

  it('rejects dependency with missing repo field', () => {
    const result = DirectDependencySchema.safeParse({
      type: 'package',
      confidence: 'high',
      target_scanned: true,
      source_file: 'package.json',
      detail: {
        type: 'package',
        package_name: 'test',
        ecosystem: 'npm',
        version: '1.0.0',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects dependency with invalid type', () => {
    const result = DirectDependencySchema.safeParse({
      repo: 'my-org/lib',
      type: 'invalid_type',
      confidence: 'high',
      target_scanned: true,
      source_file: 'package.json',
      detail: {
        type: 'package',
        package_name: 'test',
        ecosystem: 'npm',
        version: '1.0.0',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects dependency with invalid confidence level', () => {
    const result = DirectDependencySchema.safeParse({
      repo: 'my-org/lib',
      type: 'package',
      confidence: 'medium',
      target_scanned: true,
      source_file: 'package.json',
      detail: {
        type: 'package',
        package_name: 'test',
        ecosystem: 'npm',
        version: '1.0.0',
      },
    });
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TransitiveDependencySchema
// ────────────────────────────────────────────────────────────────────────────

describe('TransitiveDependencySchema', () => {
  it('parses valid transitive dependency', () => {
    const result = TransitiveDependencySchema.safeParse({
      repo: 'my-org/core-utils',
      via: ['my-org/shared-lib'],
      type: 'package',
      depth: 2,
    });
    expect(result.success).toBe(true);
  });

  it('defaults via to empty array when missing', () => {
    const result = TransitiveDependencySchema.safeParse({
      repo: 'my-org/core-utils',
      type: 'package',
      depth: 2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.via).toEqual([]);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// RepoNodeSchema
// ────────────────────────────────────────────────────────────────────────────

describe('RepoNodeSchema', () => {
  it('parses a complete repo node', () => {
    const fixture = createValidFixture();
    const graph = fixture.graph as Record<string, unknown>;
    const result = RepoNodeSchema.safeParse(graph['my-org/api-service']);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.direct).toHaveLength(2);
      expect(result.data.transitive).toHaveLength(1);
    }
  });

  it('defaults direct and transitive to empty arrays when missing', () => {
    const result = RepoNodeSchema.safeParse({
      scan_status: { sbom: 'done', filescan: 'done' },
      annotations: { fork_of: null, template_from: null, archived: false },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.direct).toEqual([]);
      expect(result.data.transitive).toEqual([]);
    }
  });

  it('preserves unknown fields via passthrough', () => {
    const result = RepoNodeSchema.parse({
      scan_status: { sbom: 'done', filescan: 'done' },
      annotations: { fork_of: null, template_from: null, archived: false },
      future_section: { data: 'preserved' },
    });
    expect(result).toHaveProperty('future_section');
    expect((result as Record<string, unknown>).future_section).toEqual({
      data: 'preserved',
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// UnresolvedPackageSchema
// ────────────────────────────────────────────────────────────────────────────

describe('UnresolvedPackageSchema', () => {
  it('parses a valid unresolved package', () => {
    const result = UnresolvedPackageSchema.safeParse({
      package_name: 'lodash',
      ecosystem: 'npm',
      version: '^4.17.21',
      reason: 'no_matching_repo',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unresolved package with missing fields', () => {
    const result = UnresolvedPackageSchema.safeParse({
      package_name: 'lodash',
      // missing ecosystem, version, reason
    });
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// StatsSchema
// ────────────────────────────────────────────────────────────────────────────

describe('StatsSchema', () => {
  it('parses complete stats', () => {
    const fixture = createValidFixture();
    const result = StatsSchema.safeParse(fixture.stats);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.most_depended_on).toHaveLength(1);
      expect(result.data.orphan_repos).toContain('my-org/abandoned-project');
    }
  });

  it('defaults all arrays and records when stats is empty object', () => {
    const result = StatsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.most_depended_on).toEqual([]);
      expect(result.data.dependency_type_counts).toEqual({});
      expect(result.data.clusters).toEqual([]);
      expect(result.data.strong_clusters).toEqual([]);
      expect(result.data.circular_deps).toEqual([]);
      expect(result.data.orphan_repos).toEqual([]);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// OutputSchema — full integration
// ────────────────────────────────────────────────────────────────────────────

describe('OutputSchema', () => {
  it('parses a complete valid fixture', () => {
    const fixture = createValidFixture();
    const result = OutputSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schema_version).toBe('1.0.0');
      expect(Object.keys(result.data.graph)).toHaveLength(2);
      expect(result.data.stats.most_depended_on[0].repo).toBe(
        'my-org/shared-lib',
      );
    }
  });

  it('parses with a different schema_version (no version enforcement)', () => {
    const fixture = createValidFixture();
    fixture.schema_version = '2.0.0-beta.1';
    const result = OutputSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schema_version).toBe('2.0.0-beta.1');
    }
  });

  it('defaults graph and unresolved to empty when missing', () => {
    const fixture = createValidFixture();
    delete fixture.graph;
    delete fixture.unresolved;
    const result = OutputSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.graph).toEqual({});
      expect(result.data.unresolved).toEqual({});
    }
  });

  it('preserves unknown top-level fields via passthrough', () => {
    const fixture = createValidFixture();
    (fixture as Record<string, unknown>).experimental_feature = {
      enabled: true,
    };
    const result = OutputSchema.parse(fixture);
    expect(result).toHaveProperty('experimental_feature');
  });

  it('rejects data missing required metadata', () => {
    const result = OutputSchema.safeParse({
      schema_version: '1.0.0',
      // missing metadata, stats
    });
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// validateSchema helper
// ────────────────────────────────────────────────────────────────────────────

describe('validateSchema', () => {
  it('returns success with typed data for valid input', () => {
    const fixture = createValidFixture();
    const result = validateSchema(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      const data: OutputData = result.data;
      expect(data.schema_version).toBe('1.0.0');
      expect(data.metadata.tool_version).toBe('1.2.3');
    }
  });

  it('returns failure with user-friendly errors for invalid input', () => {
    const result = validateSchema({ schema_version: 123 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      // Each error should include the field path
      for (const error of result.errors) {
        expect(typeof error).toBe('string');
        expect(error).toContain(':');
      }
    }
  });

  it('caps errors at 10 to avoid overwhelming users', () => {
    // Provide completely wrong data to generate many errors
    const result = validateSchema({
      schema_version: 123,
      metadata: {
        generated_at: 999,
        tool_version: 999,
        github_host: 999,
        orgs_scanned: 'not-an-array',
        total_repos: 'not-a-number',
        total_repos_scanned: 'not-a-number',
        total_repos_skipped: 'not-a-number',
        total_edges: 'not-a-number',
        scan_duration_seconds: 'not-a-number',
        split_info: {
          mode: 'invalid',
          file_index: 'nan',
          total_files: 'nan',
          this_file_orgs: 'not-array',
        },
      },
      stats: {
        most_depended_on: 'not-array',
        dependency_type_counts: 'not-record',
        clusters: 'not-array',
        strong_clusters: 'not-array',
        circular_deps: 'not-array',
        orphan_repos: 'not-array',
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeLessThanOrEqual(10);
    }
  });

  it('returns meaningful path in error messages', () => {
    const fixture = createValidFixture();
    // Corrupt a nested field
    (fixture.metadata as Record<string, unknown>).total_repos = 'not-a-number';
    const result = validateSchema(fixture);
    expect(result.success).toBe(false);
    if (!result.success) {
      const metadataErrors = result.errors.filter((e) =>
        e.startsWith('metadata.'),
      );
      expect(metadataErrors.length).toBeGreaterThan(0);
    }
  });

  it('returns failure for completely non-object input', () => {
    const result = validateSchema('just a string');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('returns failure for null input', () => {
    const result = validateSchema(null);
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Type-level tests (compile-time verification)
// ────────────────────────────────────────────────────────────────────────────

describe('TypeScript type inference', () => {
  it('inferred DirectDependency type has correct shape', () => {
    const dep: DirectDependency = {
      repo: 'org/repo',
      type: 'package',
      confidence: 'high',
      target_scanned: true,
      source_file: 'package.json',
      detail: {
        type: 'package',
        package_name: 'test',
        ecosystem: 'npm',
        version: '1.0.0',
      },
    };
    expect(dep.repo).toBe('org/repo');
  });

  it('DependencyDetail union type narrows on type field', () => {
    const detail: DependencyDetail = {
      type: 'docker',
      image: 'nginx:latest',
    };

    // Runtime narrowing
    if (detail.type === 'docker') {
      expect(detail.image).toBe('nginx:latest');
    }

    const pkgDetail: DependencyDetail = {
      type: 'package',
      package_name: 'zod',
      ecosystem: 'npm',
      version: '^3.0.0',
    };

    if (pkgDetail.type === 'package') {
      expect(pkgDetail.package_name).toBe('zod');
    }
  });
});
