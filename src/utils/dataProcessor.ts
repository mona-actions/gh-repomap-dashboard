/**
 * Core data processing logic for repo-map JSON files.
 *
 * This module contains the pure business logic for:
 * - Parsing and validating JSON against the OutputSchema
 * - Building a Graphology MultiDirectedGraph from validated data
 * - Merging multiple split files with conflict detection
 *
 * Extracted from the Web Worker so the logic is independently testable.
 * The data.worker.ts file imports and exposes these functions via Comlink.
 */
import { MultiDirectedGraph } from 'graphology';
import { validateSchema, type OutputData } from '../schemas/repomap';
import { computeStrongClusters } from './connectivity';
import type { ProcessResult } from '../workers/types';

/**
 * Deduplicate dependencies by `repo:type` key.
 * When merging split files, the same dependency can appear in multiple files.
 * We keep the first occurrence and discard duplicates.
 */
export function deduplicateDeps(
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
 * Build a Graphology MultiDirectedGraph from validated OutputData.
 *
 * Strategy:
 * 1. Add all known (scanned) repos as nodes with their annotations
 * 2. Walk edges, creating "phantom" nodes for unscanned targets
 * 3. Use deterministic edge keys (`source→target:type`) to prevent duplicates
 * 4. Compute inDegree/outDegree as `dependents`/`directDeps` attributes
 */
function buildGraph(data: OutputData): MultiDirectedGraph {
  const graph = new MultiDirectedGraph();

  // Build a cluster lookup: repo → clusterId
  const clusterMap = new Map<string, number>();
  if (data.stats?.clusters) {
    for (const cluster of data.stats.clusters) {
      for (const repo of cluster.repos) {
        clusterMap.set(repo, cluster.id);
      }
    }
  }

  // Add all known nodes from the graph map.
  // Sigma.js requires every node to have numeric x/y coordinates.
  // Use a circular layout to distribute nodes evenly — ForceAtlas2
  // can refine positions later via the layout worker.
  const nodeEntries = Object.entries(data.graph);
  const nodeCount = nodeEntries.length;

  for (let i = 0; i < nodeCount; i++) {
    const [fullName, repo] = nodeEntries[i];
    const [org] = fullName.split('/');
    const angle = (2 * Math.PI * i) / Math.max(nodeCount, 1);
    const radius = 100;

    graph.addNode(fullName, {
      org,
      archived: repo.annotations.archived,
      scanStatus: repo.scan_status,
      isPhantom: false,
      forkOf: repo.annotations.fork_of,
      templateFrom: repo.annotations.template_from,
      clusterId: clusterMap.get(fullName) ?? null,
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }

  // Add edges, creating phantom nodes for unscanned targets
  for (const [fullName, repo] of Object.entries(data.graph)) {
    for (const dep of repo.direct) {
      // Create phantom node if target doesn't exist in the graph
      if (!graph.hasNode(dep.repo)) {
        const [org] = dep.repo.split('/');
        const phantomIndex = graph.order;
        const angle = (2 * Math.PI * phantomIndex) / Math.max(nodeCount, 1);
        const radius = 150; // outer ring for phantom nodes

        graph.addNode(dep.repo, {
          org,
          archived: false,
          scanStatus: { sbom: 'unknown', filescan: 'unknown' },
          isPhantom: true,
          forkOf: null,
          templateFrom: null,
          clusterId: clusterMap.get(dep.repo) ?? null,
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
        });
      }

      // Deterministic edge key prevents duplicate edges
      const edgeKey = `${fullName}→${dep.repo}:${dep.type}`;
      if (!graph.hasEdge(edgeKey)) {
        // Derive ecosystem: for packages use the actual ecosystem,
        // for other types the type itself IS the ecosystem
        const ecosystem =
          dep.detail.type === 'package'
            ? (dep.detail.ecosystem || 'unknown-package')
            : dep.type;

        graph.addEdgeWithKey(edgeKey, fullName, dep.repo, {
          depType: dep.type,
          confidence: dep.confidence,
          targetScanned: dep.target_scanned,
          sourceFile: dep.source_file,
          detail: dep.detail,
          ecosystem,
        });
      }
    }
  }

  // Compute degree-based attributes for each node
  graph.forEachNode((node) => {
    graph.setNodeAttribute(node, 'dependents', graph.inDegree(node));
    graph.setNodeAttribute(node, 'directDeps', graph.outDegree(node));
  });

  return graph;
}

/**
 * Process a single repo-map JSON string.
 *
 * Pipeline: JSON.parse → Zod validate → build graph → serialize
 *
 * @throws {SyntaxError} if the JSON is malformed
 * @throws {Error} if schema validation fails (with user-friendly messages)
 */
export function processFile(jsonText: string): ProcessResult {
  // 1. Parse JSON (throws SyntaxError on invalid JSON)
  const raw: unknown = JSON.parse(jsonText);

  // 2. Validate with Zod schema
  const result = validateSchema(raw);
  if (!result.success) {
    throw new Error(`Schema validation failed: ${result.errors.join('; ')}`);
  }
  const data = result.data;

  // 3. Build Graphology graph
  const graph = buildGraph(data);

  // 4. Compute directed strong-connectivity groups (SCCs)
  const strongClusters = computeStrongClusters(data.graph);
  const stats = {
    ...data.stats,
    strong_clusters: strongClusters,
  };

  // 5. Export serializable graph + metadata
  return {
    serialized: graph.export(),
    metadata: data.metadata,
    stats,
    unresolved: data.unresolved,
    nodeCount: graph.order,
    edgeCount: graph.size,
  };
}

/**
 * Merge multiple split JSON files and process the combined result.
 *
 * Handles:
 * - Schema validation per file (with file-index error messages)
 * - Graph map merging with duplicate repo conflict detection
 * - Dependency deduplication within merged repos
 * - Unresolved package merging
 * - Metadata reconciliation (latest timestamp, union of orgs)
 *
 * @throws {SyntaxError} if any JSON is malformed
 * @throws {Error} if any file fails schema validation
 */
export function mergeAndProcess(jsonTexts: string[]): ProcessResult {
  // Parse and validate each file independently
  const files: OutputData[] = [];
  for (let i = 0; i < jsonTexts.length; i++) {
    const raw: unknown = JSON.parse(jsonTexts[i]);
    const result = validateSchema(raw);
    if (!result.success) {
      throw new Error(
        `File ${i + 1} validation failed: ${result.errors.join('; ')}`,
      );
    }
    files.push(result.data);
  }

  // Merge graphs with conflict detection
  const mergedGraph: OutputData['graph'] = {};
  const mergedUnresolved: OutputData['unresolved'] = {};
  const conflicts: string[] = [];

  for (const file of files) {
    for (const [key, node] of Object.entries(file.graph)) {
      if (mergedGraph[key]) {
        conflicts.push(key);
        // Merge dependency arrays, deduplicating by repo:type
        mergedGraph[key] = {
          ...mergedGraph[key],
          direct: deduplicateDeps([
            ...mergedGraph[key].direct,
            ...node.direct,
          ]),
        };
      } else {
        mergedGraph[key] = node;
      }
    }
    for (const [key, deps] of Object.entries(file.unresolved)) {
      mergedUnresolved[key] = [...(mergedUnresolved[key] ?? []), ...deps];
    }
  }

  if (conflicts.length > 0) {
    console.warn(`Merged ${conflicts.length} duplicate repos:`, conflicts);
  }

  // Reconcile metadata: latest timestamp, union of orgs, updated repo count
  const metadata = { ...files[0].metadata };
  metadata.generated_at = files
    .map((f) => f.metadata.generated_at)
    .sort()
    .pop()!;
  metadata.total_repos = Object.keys(mergedGraph).length;
  metadata.orgs_scanned = [
    ...new Set(files.flatMap((f) => f.metadata.orgs_scanned)),
  ];

  // Use first file's stats as base (pre-computed by CLI, can't easily re-merge)
  const stats = files[0].stats;

  // Build merged data and process through the standard pipeline
  const mergedData: OutputData = {
    schema_version: files[0].schema_version,
    metadata,
    graph: mergedGraph,
    unresolved: mergedUnresolved,
    stats,
  };

  return processFile(JSON.stringify(mergedData));
}