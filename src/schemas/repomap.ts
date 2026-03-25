/**
 * Zod schemas for the gh-repo-map v1.0.0 JSON output format.
 *
 * These schemas define the contract between the CLI tool and the dashboard.
 * All schemas use `.passthrough()` so additive patch-level fields (v1.0.x)
 * don't break validation. Optional arrays default to `[]` for resilience.
 *
 * @see FRONTEND_INTEGRATION.md for the full specification.
 */
import { z } from 'zod';

// ────────────────────────────────────────────────────────────────────────────
// Split Info
// ────────────────────────────────────────────────────────────────────────────

export const SplitInfoSchema = z
  .object({
    /** How the output was split: single file, per-org, or auto-detected. */
    mode: z.enum(['merged', 'per-org', 'auto']),
    /** 1-based index of this file within the split set. */
    file_index: z.number(),
    /** Total number of files in the split set. */
    total_files: z.number(),
    /** Organizations whose data is contained in this file. */
    this_file_orgs: z.array(z.string()),
  })
  .passthrough();

// ────────────────────────────────────────────────────────────────────────────
// Metadata
// ────────────────────────────────────────────────────────────────────────────

export const MetadataSchema = z
  .object({
    /** ISO 8601 timestamp when the scan completed. */
    generated_at: z.string(),
    /** CLI version that produced this file (semver). */
    tool_version: z.string(),
    /** GitHub hostname. Empty string means github.com. */
    github_host: z.string(),
    /** List of organizations that were scanned. */
    orgs_scanned: z.array(z.string()),
    /** Total repos discovered across all scanned orgs. */
    total_repos: z.number(),
    /** Repos successfully scanned. */
    total_repos_scanned: z.number(),
    /** Repos skipped (errors, empty, etc.). */
    total_repos_skipped: z.number(),
    /** Total dependency edges in the graph. */
    total_edges: z.number(),
    /** Wall-clock scan duration in seconds. */
    scan_duration_seconds: z.number(),
    /** File splitting metadata. */
    split_info: SplitInfoSchema,
  })
  .passthrough();

// ────────────────────────────────────────────────────────────────────────────
// Dependency Detail — discriminated union on `type`
// ────────────────────────────────────────────────────────────────────────────

/** Package manager dependency (npm, Go, Maven, pip, etc.) */
export const PackageDetailSchema = z
  .object({
    type: z.literal('package'),
    package_name: z.string(),
    ecosystem: z.string(),
    version: z.string(),
  })
  .passthrough();

/** GitHub Actions reusable workflow reference. */
export const WorkflowDetailSchema = z
  .object({
    type: z.literal('workflow'),
    uses: z.string(),
  })
  .passthrough();

/** GitHub Actions action reference. */
export const ActionDetailSchema = z
  .object({
    type: z.literal('action'),
    uses: z.string(),
  })
  .passthrough();

/** Git submodule reference. */
export const SubmoduleDetailSchema = z
  .object({
    type: z.literal('submodule'),
    url: z.string(),
    path: z.string(),
  })
  .passthrough();

/** Docker image reference from a known registry. */
export const DockerDetailSchema = z
  .object({
    type: z.literal('docker'),
    image: z.string(),
  })
  .passthrough();

/** Terraform module source reference. */
export const TerraformDetailSchema = z
  .object({
    type: z.literal('terraform'),
    source: z.string(),
    /** Optional git ref (tag, branch, commit). */
    ref: z.string().optional(),
  })
  .passthrough();

/** Script-based reference found via regex (lower confidence). */
export const ScriptDetailSchema = z
  .object({
    type: z.literal('script'),
    match: z.string(),
    match_type: z.string(),
  })
  .passthrough();

/**
 * Discriminated union of all dependency detail shapes.
 * The `type` field determines which detail fields are present.
 */
export const DependencyDetailSchema = z.discriminatedUnion('type', [
  PackageDetailSchema,
  WorkflowDetailSchema,
  ActionDetailSchema,
  SubmoduleDetailSchema,
  DockerDetailSchema,
  TerraformDetailSchema,
  ScriptDetailSchema,
]);

// ────────────────────────────────────────────────────────────────────────────
// Direct & Transitive Dependencies
// ────────────────────────────────────────────────────────────────────────────

export const DirectDependencySchema = z
  .object({
    /** Target repository in "org/repo" format. */
    repo: z.string(),
    /** Dependency type — determines detail shape. */
    type: z.enum([
      'package',
      'workflow',
      'action',
      'submodule',
      'docker',
      'terraform',
      'script',
    ]),
    /** Confidence level: high = structured manifest, low = regex match. */
    confidence: z.enum(['high', 'low']),
    /** Whether the target repo was also scanned. */
    target_scanned: z.boolean(),
    /** Source file where the dependency was discovered. */
    source_file: z.string(),
    /** Type-specific detail (shape depends on `type`). */
    detail: DependencyDetailSchema,
  })
  .passthrough();

export const TransitiveDependencySchema = z
  .object({
    /** Target repository in "org/repo" format. */
    repo: z.string(),
    /** Intermediate repos forming the transitive chain. */
    via: z.array(z.string()).default([]),
    /** Dependency type of the final hop. */
    type: z.enum([
      'package',
      'workflow',
      'action',
      'submodule',
      'docker',
      'terraform',
      'script',
    ]),
    /** Number of hops from the source repo. */
    depth: z.number(),
  })
  .passthrough();

// ────────────────────────────────────────────────────────────────────────────
// Repo Node
// ────────────────────────────────────────────────────────────────────────────

export const ScanStatusSchema = z
  .object({
    /** SBOM scan status. */
    sbom: z.string(),
    /** File-based scan status. */
    filescan: z.string(),
  })
  .passthrough();

export const AnnotationsSchema = z
  .object({
    /** Parent repo if this is a fork, null otherwise. */
    fork_of: z.string().nullable(),
    /** Template repo if this was created from a template, null otherwise. */
    template_from: z.string().nullable(),
    /** Whether the repo is archived. */
    archived: z.boolean(),
  })
  .passthrough();

export const RepoNodeSchema = z
  .object({
    /** Scan status for different scan methods. */
    scan_status: ScanStatusSchema,
    /** Repository annotations (fork, template, archived). */
    annotations: AnnotationsSchema,
    /** Direct dependencies of this repo. Defaults to [] if missing. */
    direct: z.array(DirectDependencySchema).default([]),
    /** Transitive dependencies of this repo. Defaults to [] if missing. */
    transitive: z.array(TransitiveDependencySchema).default([]),
  })
  .passthrough();

// ────────────────────────────────────────────────────────────────────────────
// Unresolved Packages
// ────────────────────────────────────────────────────────────────────────────

export const UnresolvedPackageSchema = z
  .object({
    /** Package name that couldn't be resolved. */
    package_name: z.string(),
    /** Package ecosystem (npm, go, maven, etc.). */
    ecosystem: z.string(),
    /** Version constraint from the manifest. */
    version: z.string(),
    /** Why the package couldn't be resolved. */
    reason: z.string(),
  })
  .passthrough();

// ────────────────────────────────────────────────────────────────────────────
// Stats
// ────────────────────────────────────────────────────────────────────────────

export const MostDependedOnSchema = z
  .object({
    repo: z.string(),
    direct_dependents: z.number(),
  })
  .passthrough();

export const ClusterSchema = z
  .object({
    id: z.number(),
    repos: z.array(z.string()),
    size: z.number(),
  })
  .passthrough();

export const StatsSchema = z
  .object({
    /** Repos ranked by number of direct dependents (blast radius). */
    most_depended_on: z.array(MostDependedOnSchema).default([]),
    /** Count of edges by dependency type. */
    dependency_type_counts: z.record(z.string(), z.number()).default({}),
    /** Connected Repo Groups (Weak) — migration-oriented groups that ignore direction. */
    clusters: z.array(ClusterSchema).default([]),
    /** Mutual dependency groups in the directed graph (strong connectivity). */
    strong_clusters: z.array(ClusterSchema).default([]),
    /** Circular dependency cycles that need attention. */
    circular_deps: z.array(z.array(z.string())).default([]),
    /** Repos with zero inbound or outbound edges. */
    orphan_repos: z.array(z.string()).default([]),
  })
  .passthrough();

// ────────────────────────────────────────────────────────────────────────────
// Top-level Output Schema
// ────────────────────────────────────────────────────────────────────────────

export const OutputSchema = z
  .object({
    /** Schema version (semver). Used for compatibility checking. */
    schema_version: z.string(),
    /** Scan context, timing, and file-split metadata. */
    metadata: MetadataSchema,
    /** Map of "org/repo" → RepoNode. The core dependency graph. */
    graph: z.record(z.string(), RepoNodeSchema).default({}),
    /** Map of "org/repo" → unresolved packages for that repo. */
    unresolved: z
      .record(z.string(), z.array(UnresolvedPackageSchema))
      .default({}),
    /** Pre-computed analytics and summary statistics. */
    stats: StatsSchema,
  })
  .passthrough();

// ────────────────────────────────────────────────────────────────────────────
// Inferred TypeScript Types
// ────────────────────────────────────────────────────────────────────────────

export type SplitInfo = z.infer<typeof SplitInfoSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
export type PackageDetail = z.infer<typeof PackageDetailSchema>;
export type WorkflowDetail = z.infer<typeof WorkflowDetailSchema>;
export type ActionDetail = z.infer<typeof ActionDetailSchema>;
export type SubmoduleDetail = z.infer<typeof SubmoduleDetailSchema>;
export type DockerDetail = z.infer<typeof DockerDetailSchema>;
export type TerraformDetail = z.infer<typeof TerraformDetailSchema>;
export type ScriptDetail = z.infer<typeof ScriptDetailSchema>;
export type DependencyDetail = z.infer<typeof DependencyDetailSchema>;
export type DirectDependency = z.infer<typeof DirectDependencySchema>;
export type TransitiveDependency = z.infer<typeof TransitiveDependencySchema>;
export type ScanStatus = z.infer<typeof ScanStatusSchema>;
export type Annotations = z.infer<typeof AnnotationsSchema>;
export type RepoNode = z.infer<typeof RepoNodeSchema>;
export type UnresolvedPackage = z.infer<typeof UnresolvedPackageSchema>;
export type MostDependedOn = z.infer<typeof MostDependedOnSchema>;
export type Cluster = z.infer<typeof ClusterSchema>;
export type Stats = z.infer<typeof StatsSchema>;
export type OutputData = z.infer<typeof OutputSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Validation Helper
// ────────────────────────────────────────────────────────────────────────────

export type ValidationSuccess = { success: true; data: OutputData };
export type ValidationFailure = { success: false; errors: string[] };
export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validates raw JSON data against the OutputSchema.
 *
 * Returns a discriminated union so callers can branch safely:
 * ```ts
 * const result = validateSchema(data);
 * if (result.success) {
 *   // result.data is fully typed OutputData
 * } else {
 *   // result.errors is string[] of human-readable messages
 * }
 * ```
 *
 * Errors are capped at 10 to avoid overwhelming the user.
 */
export function validateSchema(data: unknown): ValidationResult {
  const result = OutputSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .slice(0, 10);
    return { success: false, errors };
  }
  return { success: true, data: result.data };
}
