import type { MultiDirectedGraph } from 'graphology';
import type { OutputData, Cluster } from '../schemas/repomap';

/**
 * A migration cohort recommendation derived from one SCC core set.
 *
 * - `coreRepos`: repos that are mutually reachable (SCC, size >= 2)
 * - `recommendedDependencies`: one-hop outgoing neighbors (what the core depends on)
 * - `recommendedDependents`: one-hop incoming neighbors (what depends on the core)
 */
export interface MigrationCohort {
  id: number;
  coreRepos: string[];
  coreSize: number;
  recommendedDependencies: string[];
  recommendedDependents: string[];
}

/**
 * Compute strongly connected groups (SCCs) from a directed dependency graph
 * using Tarjan's algorithm (O(V + E)).
 *
 * The result is deterministic:
 * - repos inside each group are sorted alphabetically
 * - groups are sorted by size descending, then by first repo name
 * - group ids are reassigned after sorting (1-based)
 */
export function computeStrongClusters(graph: OutputData['graph']): Cluster[] {
  const adjacency = new Map<string, string[]>();

  const ensureNode = (node: string) => {
    if (!adjacency.has(node)) {
      adjacency.set(node, []);
    }
  };

  for (const [repo, node] of Object.entries(graph)) {
    ensureNode(repo);
    for (const dep of node.direct) {
      ensureNode(dep.repo);
      adjacency.get(repo)!.push(dep.repo);
    }
  }

  const indexByRepo = new Map<string, number>();
  const lowLinkByRepo = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const components: string[][] = [];
  let index = 0;

  const strongConnect = (repo: string) => {
    indexByRepo.set(repo, index);
    lowLinkByRepo.set(repo, index);
    index += 1;

    stack.push(repo);
    onStack.add(repo);

    const neighbors = adjacency.get(repo) ?? [];
    for (const neighbor of neighbors) {
      if (!indexByRepo.has(neighbor)) {
        strongConnect(neighbor);
        lowLinkByRepo.set(
          repo,
          Math.min(lowLinkByRepo.get(repo)!, lowLinkByRepo.get(neighbor)!),
        );
      } else if (onStack.has(neighbor)) {
        lowLinkByRepo.set(
          repo,
          Math.min(lowLinkByRepo.get(repo)!, indexByRepo.get(neighbor)!),
        );
      }
    }

    if (lowLinkByRepo.get(repo) !== indexByRepo.get(repo)) {
      return;
    }

    const component: string[] = [];
    let current: string | undefined;
    do {
      current = stack.pop();
      if (current) {
        onStack.delete(current);
        component.push(current);
      }
    } while (current && current !== repo);

    component.sort((a, b) => a.localeCompare(b));
    components.push(component);
  };

  const nodes = [...adjacency.keys()].sort((a, b) => a.localeCompare(b));
  for (const node of nodes) {
    if (!indexByRepo.has(node)) {
      strongConnect(node);
    }
  }

  const sortedComponents = components.sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return a[0].localeCompare(b[0]);
  });

  return sortedComponents.map((repos, i) => ({
    id: i + 1,
    repos,
    size: repos.length,
  }));
}

/**
 * Derive practical migration guidance from directed SCCs.
 *
 * Guidance model:
 * - SCCs with size >= 2 are treated as core sets that should move together.
 * - One-hop neighbors are optional context:
 *   - dependencies (outbound) are likely integration touchpoints
 *   - dependents (inbound) are likely blast-radius touchpoints
 */
export function deriveMigrationCohorts(
  strongClusters: Cluster[],
  graph: MultiDirectedGraph | null,
): MigrationCohort[] {
  const coreClusters = strongClusters.filter((cluster) => cluster.size >= 2);

  return coreClusters.map((cluster) => {
    const coreSet = new Set(cluster.repos);
    const recommendedDependencies = new Set<string>();
    const recommendedDependents = new Set<string>();

    if (graph) {
      for (const repo of cluster.repos) {
        if (!graph.hasNode(repo)) {
          continue;
        }

        for (const dep of graph.outboundNeighbors(repo)) {
          if (!coreSet.has(dep)) {
            recommendedDependencies.add(dep);
          }
        }

        for (const dependent of graph.inboundNeighbors(repo)) {
          if (!coreSet.has(dependent)) {
            recommendedDependents.add(dependent);
          }
        }
      }
    }

    return {
      id: cluster.id,
      coreRepos: [...cluster.repos].sort((a, b) => a.localeCompare(b)),
      coreSize: cluster.size,
      recommendedDependencies: [...recommendedDependencies].sort((a, b) =>
        a.localeCompare(b),
      ),
      recommendedDependents: [...recommendedDependents].sort((a, b) =>
        a.localeCompare(b),
      ),
    };
  });
}

export interface EnrichedCluster {
  id: number;
  repos: string[];
  size: number;
  scannedCount: number;
  externalCount: number;
  scannedRepos: string[];
  externalRepos: string[];
}

/**
 * Enrich a cluster with scanned/external repo breakdown.
 * Uses the `isPhantom` node attribute to classify repos.
 */
export function enrichCluster(
  cluster: Cluster,
  graph: MultiDirectedGraph | null,
): EnrichedCluster {
  const scannedRepos: string[] = [];
  const externalRepos: string[] = [];

  for (const repo of cluster.repos) {
    if (!graph) {
      scannedRepos.push(repo);
    } else if (
      graph.hasNode(repo) &&
      !graph.getNodeAttribute(repo, 'isPhantom')
    ) {
      scannedRepos.push(repo);
    } else {
      externalRepos.push(repo);
    }
  }

  scannedRepos.sort((a, b) => a.localeCompare(b));
  externalRepos.sort((a, b) => a.localeCompare(b));

  return {
    id: cluster.id,
    repos: cluster.repos,
    size: cluster.size,
    scannedCount: scannedRepos.length,
    externalCount: externalRepos.length,
    scannedRepos,
    externalRepos,
  };
}

/**
 * Enrich an array of clusters. Convenience wrapper.
 */
export function enrichClusters(
  clusters: Cluster[],
  graph: MultiDirectedGraph | null,
): EnrichedCluster[] {
  return clusters.map((c) => enrichCluster(c, graph));
}

// ────────────────────────────────────────────────────────────────────────────
// Migration order
// ────────────────────────────────────────────────────────────────────────────
//
// We condense SCCs into super-nodes first because the dependency graph is
// generally not a DAG — SCCs are the only cycle source. Once condensed,
// levelization reduces to a clean topological pass and we can recommend a
// safe migration order.
//
// Phantoms (external repos with isPhantom === true) are out of scope for
// migration entirely; this is different from "already migrated". The behavior
// overlaps in this algorithm but the framing matters for any future modes
// (e.g. "what if we adopted this external as scanned?").

/** A migration unit is either a single scanned repo or a strongly-connected cohort. */
export type MigrationUnit =
  | {
      kind: 'repo';
      repo: string;
      repos: [string];
      /** 0-based wave; wave 0 migrates first. */
      level: number;
      dependentCount: number;
      prerequisites: string[];
    }
  | {
      kind: 'scc';
      sccId: number;
      repos: string[];
      /** 0-based wave; wave 0 migrates first. */
      level: number;
      dependentCount: number;
      prerequisites: string[];
    };

export interface MigrationWave {
  /** 0-based; wave 0 migrates first (foundations / sinks). */
  level: number;
  units: MigrationUnit[];
}

export interface MigrationOrderOptions {
  /**
   * `'sinks-first'` (default): foundations move first, consumers last.
   * Only this direction is implemented today. The option is reserved
   * because flipping requires coordinated UI/copy changes (prerequisite
   * labels, tie-break copy); widen the union when the toggle is built.
   */
  direction?: 'sinks-first';
}

/** Distinct external scanned inbound neighbors of a unit (excludes intra-unit edges and phantoms). */
function externalInbound(
  members: ReadonlySet<string>,
  graph: MultiDirectedGraph,
): string[] {
  const result = new Set<string>();
  for (const repo of members) {
    if (!graph.hasNode(repo)) continue;
    for (const neighbor of graph.inboundNeighbors(repo)) {
      if (members.has(neighbor)) continue;
      if (graph.getNodeAttribute(neighbor, 'isPhantom')) continue;
      result.add(neighbor);
    }
  }
  return [...result].sort((a, b) => a.localeCompare(b));
}

/**
 * Build the condensation DAG of `graph` under a unit assignment.
 *
 * For each directed edge `a -> b` in `graph` where both endpoints are in
 * `unitOf`, emits an edge `unitOf(a) -> unitOf(b)` unless they are the same
 * unit. Self-loops and duplicate edges are removed. Returns adjacency maps.
 */
export function buildCondensation(
  graph: MultiDirectedGraph,
  unitOf: ReadonlyMap<string, string>,
): {
  units: string[];
  outgoing: Map<string, Set<string>>;
  incoming: Map<string, Set<string>>;
} {
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();

  const ensure = (id: string) => {
    if (!outgoing.has(id)) outgoing.set(id, new Set());
    if (!incoming.has(id)) incoming.set(id, new Set());
  };

  for (const id of unitOf.values()) ensure(id);

  graph.forEachDirectedEdge((_edge, _attrs, source, target) => {
    const su = unitOf.get(source);
    const tu = unitOf.get(target);
    if (!su || !tu || su === tu) return;
    outgoing.get(su)!.add(tu);
    incoming.get(tu)!.add(su);
  });

  return {
    units: [...outgoing.keys()].sort((a, b) => a.localeCompare(b)),
    outgoing,
    incoming,
  };
}

/**
 * Compute a recommended migration order from dependency direction and SCC cohorts.
 * Sinks-first by default: repos with no outgoing dependencies (foundations) move
 * in Wave 0; consumers move in later waves.
 *
 * Phantoms are filtered out entirely. SCCs are kept as indivisible units. Within
 * a wave, units are sorted by external dependent count desc, ties alphabetical.
 * Display-layer chunking (e.g. by org) lives in `migrationDisplay.ts`.
 */
export function deriveMigrationOrder(
  stats: Pick<OutputData['stats'], 'clusters' | 'strong_clusters'>,
  graph: MultiDirectedGraph | null,
  // Reserved for a future direction toggle; only sinks-first is supported today.
  _options: MigrationOrderOptions = {},
): MigrationWave[] {
  if (!graph) return [];

  // 1. Working node set: scanned (non-phantom) repos that exist in the graph.
  const scannedRepos = new Set<string>();
  graph.forEachNode((node, attrs) => {
    if (!attrs.isPhantom) scannedRepos.add(node);
  });
  if (scannedRepos.size === 0) return [];

  // 2. Repo -> unit id. SCCs (with 2+ scanned members) become shared units;
  //    other scanned repos are singletons. Reuses enrichClusters for phantom
  //    filtering so behavior stays consistent with other connectivity views.
  const enrichedStrong = enrichClusters(stats.strong_clusters ?? [], graph);
  const repoToUnit = new Map<string, string>();
  const unitMembers = new Map<string, Set<string>>();
  const sccUnitToId = new Map<string, number>();

  for (const cluster of enrichedStrong) {
    if (cluster.scannedRepos.length < 2) continue;
    const unitId = `scc:${cluster.id}`;
    sccUnitToId.set(unitId, cluster.id);
    const members = new Set(cluster.scannedRepos);
    unitMembers.set(unitId, members);
    for (const repo of cluster.scannedRepos) {
      repoToUnit.set(repo, unitId);
    }
  }

  for (const repo of scannedRepos) {
    if (repoToUnit.has(repo)) continue;
    const unitId = `repo:${repo}`;
    repoToUnit.set(repo, unitId);
    unitMembers.set(unitId, new Set([repo]));
  }

  // 3. Condensation DAG.
  const { units, outgoing, incoming } = buildCondensation(graph, repoToUnit);

  // 4. Iterative Kahn-style levelization. Sinks (no outgoing edges) get level 0;
  //    a unit's level is 1 + max(successor level). Iterative + head-index pointer
  //    (not Array.shift, which is O(n)) to keep this O(V+E) and stack-safe on
  //    long chains, especially in Safari/iOS.
  const level = new Map<string, number>();
  const remainingOut = new Map<string, number>();
  const queue: string[] = [];
  let head = 0;

  for (const u of units) {
    const out = outgoing.get(u)!.size;
    remainingOut.set(u, out);
    if (out === 0) {
      level.set(u, 0);
      queue.push(u);
    }
  }

  while (head < queue.length) {
    const u = queue[head++];
    const myLevel = level.get(u)!;
    for (const pred of incoming.get(u) ?? []) {
      const succLevel = level.get(pred);
      const candidate = myLevel + 1;
      if (succLevel === undefined || candidate > succLevel) {
        level.set(pred, candidate);
      }
      const remaining = (remainingOut.get(pred) ?? 0) - 1;
      remainingOut.set(pred, remaining);
      if (remaining === 0) queue.push(pred);
    }
  }

  // 5. Build MigrationUnit per unit id, attaching the wave level directly so
  //    callers don't need a parallel-array lookup to recover it.
  const migrationUnits: MigrationUnit[] = [];

  for (const unitId of units) {
    const members = unitMembers.get(unitId)!;
    const memberRepos = [...members].sort((a, b) => a.localeCompare(b));
    const dependents = externalInbound(members, graph);

    // Prerequisites = scanned repos in immediate condensation-successor units.
    const prereqs = new Set<string>();
    for (const succUnit of outgoing.get(unitId) ?? []) {
      for (const repo of unitMembers.get(succUnit) ?? []) {
        prereqs.add(repo);
      }
    }
    const prerequisites = [...prereqs].sort((a, b) => a.localeCompare(b));

    const lvl = level.get(unitId) ?? 0;

    const sccId = sccUnitToId.get(unitId);
    if (sccId !== undefined) {
      migrationUnits.push({
        kind: 'scc',
        sccId,
        repos: memberRepos,
        level: lvl,
        dependentCount: dependents.length,
        prerequisites,
      });
    } else {
      const [repo] = memberRepos;
      migrationUnits.push({
        kind: 'repo',
        repo,
        repos: [repo],
        level: lvl,
        dependentCount: dependents.length,
        prerequisites,
      });
    }
  }

  // 6. Group into waves by level. Within-wave grouping is now a display concern
  //    (see splitWavesForDisplay in migrationDisplay.ts).
  const wavesByLevel = new Map<number, MigrationUnit[]>();
  for (const unit of migrationUnits) {
    let bucket = wavesByLevel.get(unit.level);
    if (!bucket) {
      bucket = [];
      wavesByLevel.set(unit.level, bucket);
    }
    bucket.push(unit);
  }

  const sortedLevels = [...wavesByLevel.keys()].sort((a, b) => a - b);
  const waves: MigrationWave[] = sortedLevels.map((lvl) => ({
    level: lvl,
    units: sortUnits(wavesByLevel.get(lvl)!),
  }));

  return waves;
}

/** Sort units by dependent count desc, ties alphabetical on first repo. */
export function sortUnits(units: MigrationUnit[]): MigrationUnit[] {
  return [...units].sort((a, b) => {
    if (b.dependentCount !== a.dependentCount) {
      return b.dependentCount - a.dependentCount;
    }
    return a.repos[0].localeCompare(b.repos[0]);
  });
}

/** Sum of external dependent counts across units. */
export function totalDependents(units: MigrationUnit[]): number {
  return units.reduce((acc, u) => acc + u.dependentCount, 0);
}

/** True iff every scanned repo is part of a single mutual-dependency cohort. */
export function isAllOneSCC(waves: MigrationWave[]): boolean {
  return (
    waves.length === 1 &&
    waves[0].units.length === 1 &&
    waves[0].units[0].kind === 'scc'
  );
}
