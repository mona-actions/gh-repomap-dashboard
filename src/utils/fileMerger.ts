/**
 * Merge split JSON files with conflict detection.
 *
 * When gh-repo-map outputs data in `per-org` or `auto` split mode,
 * the frontend receives multiple JSON files that need to be merged
 * into a single OutputData. This module handles that merge with:
 *
 * - Duplicate repo detection (conflicts array)
 * - Dependency deduplication within merged repos
 * - Schema version consistency warnings
 * - Scan time consistency warnings (>1 hour apart)
 * - Metadata reconciliation (latest timestamp, union of orgs)
 *
 * @see FRONTEND_INTEGRATION.md — "Loading the Data" section
 */
import type { OutputData } from '../schemas/repomap';

export interface MergeResult {
  /** The merged OutputData combining all input files. */
  merged: OutputData;
  /** Duplicate repo keys found across files (merged by combining deps). */
  conflicts: string[];
  /** Non-fatal issues detected during merge. */
  warnings: string[];
}

/**
 * Deduplicate dependencies by `repo:type` key.
 * When merging split files, the same dependency can appear in multiple files.
 * We keep the first occurrence and discard duplicates.
 */
function deduplicateDeps(
  deps: OutputData['graph'][string]['direct'],
): OutputData['graph'][string]['direct'] {
  const seen = new Set<string>();
  return deps.filter((d) => {
    const key = `${d.repo}:${d.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Merge multiple OutputData files into a single consolidated OutputData.
 *
 * @param files - Array of validated OutputData objects to merge
 * @returns MergeResult with merged data, conflicts, and warnings
 * @throws {Error} if files array is empty
 */
export function mergeFiles(files: OutputData[]): MergeResult {
  if (files.length === 0) throw new Error('No files to merge');
  if (files.length === 1)
    return { merged: files[0], conflicts: [], warnings: [] };

  const conflicts: string[] = [];
  const warnings: string[] = [];

  // Check schema version consistency
  const versions = new Set(files.map((f) => f.schema_version));
  if (versions.size > 1) {
    warnings.push(`Mixed schema versions: ${[...versions].join(', ')}`);
  }

  // Check scan time consistency (warn if >1 hour apart)
  const times = files
    .map((f) => new Date(f.metadata.generated_at).getTime())
    .filter((t) => !isNaN(t));
  if (times.length >= 2) {
    const maxDiff = Math.max(...times) - Math.min(...times);
    if (maxDiff > 3600000) {
      warnings.push(
        'Files appear to be from different scan runs (>1 hour apart)',
      );
    }
  }

  // Deep clone first file as base (isolates merged result from inputs)
  const merged = structuredClone(files[0]);
  merged.graph = {};
  merged.unresolved = {};

  for (const file of files) {
    for (const [key, node] of Object.entries(file.graph)) {
      if (merged.graph[key]) {
        conflicts.push(key);
        // Merge deps, keep existing scan_status/annotations
        const existing = merged.graph[key];
        merged.graph[key] = {
          ...existing,
          direct: deduplicateDeps([...existing.direct, ...node.direct]),
          transitive: [...existing.transitive, ...node.transitive],
        };
      } else {
        merged.graph[key] = structuredClone(node);
      }
    }

    for (const [key, deps] of Object.entries(file.unresolved)) {
      merged.unresolved[key] = [...(merged.unresolved[key] ?? []), ...deps];
    }
  }

  // Update metadata to reflect the merged state
  merged.metadata.total_repos = Object.keys(merged.graph).length;
  merged.metadata.orgs_scanned = [
    ...new Set(files.flatMap((f) => f.metadata.orgs_scanned)),
  ];
  merged.metadata.generated_at = files
    .map((f) => f.metadata.generated_at)
    .sort()
    .pop()!;
  merged.metadata.total_repos_scanned = files.reduce(
    (sum, f) => sum + f.metadata.total_repos_scanned,
    0,
  );
  merged.metadata.total_repos_skipped = files.reduce(
    (sum, f) => sum + f.metadata.total_repos_skipped,
    0,
  );

  // Recalculate total edges from actual merged graph
  let totalEdges = 0;
  for (const node of Object.values(merged.graph)) {
    totalEdges += node.direct.length;
  }
  merged.metadata.total_edges = totalEdges;

  return { merged, conflicts, warnings };
}
