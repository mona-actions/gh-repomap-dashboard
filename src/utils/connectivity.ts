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

    const recommendedDependencies = graph
      ? externalOutbound(coreSet, graph)
      : [];
    const recommendedDependents = graph ? externalInbound(coreSet, graph) : [];

    return {
      id: cluster.id,
      coreRepos: [...cluster.repos].sort((a, b) => a.localeCompare(b)),
      coreSize: cluster.size,
      recommendedDependencies,
      recommendedDependents,
    };
  });
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

// TODO(post-migration-grouping-merge): collapse externalInbound/externalOutbound
// into a single helper parameterized by direction. Kept duplicated here so the
// canonical externalInbound on feature/migration-grouping merges cleanly.
/** Distinct external scanned outbound neighbors of a unit (excludes intra-unit edges and phantoms). */
function externalOutbound(
  members: ReadonlySet<string>,
  graph: MultiDirectedGraph,
): string[] {
  const result = new Set<string>();
  for (const repo of members) {
    if (!graph.hasNode(repo)) continue;
    for (const neighbor of graph.outboundNeighbors(repo)) {
      if (members.has(neighbor)) continue;
      if (graph.getNodeAttribute(neighbor, 'isPhantom')) continue;
      result.add(neighbor);
    }
  }
  return [...result].sort((a, b) => a.localeCompare(b));
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

/**
 * Direction-invariant fields shared by every MigrationUnit.
 *
 * Raw graph facts live here and never depend on migration direction.
 * Display-time projection (e.g. `toDisplayUnit`) flips between
 * `graphDependencies` and `graphDependents` when rendering.
 *
 * Important semantic distinction:
 *   - `graphDependencies` / `graphDependents` are **cohort-expanded REPO lists**:
 *     every scanned member of every neighboring condensation unit. A 5-member
 *     SCC predecessor contributes 5 entries here.
 *   - `externalInboundCount` / `externalOutboundCount` are **direct-neighbor
 *     scalar counts**: distinct repos with an actual edge into/out of this
 *     unit's members. The same 5-member SCC predecessor contributes whatever
 *     fraction of its members have direct edges.
 *   These are intentionally different sets — the arrays drive the prerequisites
 *   listing (cohort awareness matters), the counts drive the tie-break sort
 *   (direct importance matters).
 */
interface MigrationUnitBase {
  /** 0-based wave; wave 0 migrates first. */
  level: number;
  /**
   * Tie-break sort signal — equals `externalInboundCount` in BOTH
   * directions. Kept for backward compat with the existing UI.
   */
  dependentCount: number;
  /**
   * @deprecated Use `toDisplayUnit(unit, direction).displayPrerequisites`.
   * Backward-compat alias of `graphDependencies` (sinks-first projection).
   * Removing in v3 Stage 2 once the UI switches to the projection helper.
   */
  prerequisites: string[];
  /** Cohort-expanded scanned repos in outbound condensation neighbor units. */
  graphDependencies: string[];
  /** Cohort-expanded scanned repos in inbound condensation neighbor units. */
  graphDependents: string[];
  /** Distinct *direct* external scanned inbound count, phantom-filtered. */
  externalInboundCount: number;
  /** Distinct *direct* external scanned outbound count, phantom-filtered. */
  externalOutboundCount: number;
}

/** A migration unit is either a single scanned repo or a strongly-connected cohort. */
export type MigrationUnit =
  | (MigrationUnitBase & {
      kind: 'repo';
      repo: string;
      repos: [string];
    })
  | (MigrationUnitBase & {
      kind: 'scc';
      sccId: number;
      repos: string[];
    });

export interface MigrationWave {
  /** 0-based; wave 0 migrates first (foundations / sinks for sinks-first). */
  level: number;
  units: MigrationUnit[];
}

/**
 * Migration direction. Lives in the algorithm module because that's where
 * the concept originates; display modules re-export.
 */
export type MigrationDirection = 'sinks-first' | 'sources-first';

export interface MigrationOrderOptions {
  /**
   * `'sinks-first'` (default): foundations move first, consumers last.
   * `'sources-first'`: consumers (top-level apps) move first.
   */
  direction?: MigrationDirection;
}

/**
 * Distinct external scanned neighbors of a unit (excludes intra-unit edges
 * and phantoms). Direction selects inbound vs outbound traversal.
 */
function externalNeighbors(
  members: ReadonlySet<string>,
  graph: MultiDirectedGraph,
  direction: 'inbound' | 'outbound',
): string[] {
  const result = new Set<string>();
  for (const repo of members) {
    if (!graph.hasNode(repo)) continue;
    const neighbors =
      direction === 'inbound'
        ? graph.inboundNeighbors(repo)
        : graph.outboundNeighbors(repo);
    for (const neighbor of neighbors) {
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
 * in Wave 0; consumers move in later waves. Sources-first flips the seed and
 * propagation direction so consumers (top-level apps) move first.
 *
 * Phantoms are filtered out entirely. SCCs are kept as indivisible units. Within
 * a wave, units are sorted by external inbound count desc, ties alphabetical.
 * Display-layer chunking (e.g. by org) lives in `migrationDisplay.ts`.
 */
export function deriveMigrationOrder(
  stats: Pick<OutputData['stats'], 'clusters' | 'strong_clusters'>,
  graph: MultiDirectedGraph | null,
  options: MigrationOrderOptions = {},
): MigrationWave[] {
  if (!graph) return [];
  const direction = options.direction ?? 'sinks-first';

  const { unitOf, units } = buildUnitAssignment(stats, graph);
  if (units.length === 0) return [];

  const condensation = buildCondensation(graph, unitOf);
  const levels = levelizeCondensation(units, condensation, direction);
  const connectivity = computeUnitConnectivity(units, condensation, graph);

  const migrationUnits: MigrationUnit[] = units.map((u) => {
    const c = connectivity.get(u.id)!;
    const lvl = levels.get(u.id) ?? 0;
    const base: MigrationUnitBase = {
      level: lvl,
      dependentCount: c.externalInboundCount,
      // Backward-compat: existing UI reads `prerequisites` directly.
      prerequisites: c.graphDependencies,
      graphDependencies: c.graphDependencies,
      graphDependents: c.graphDependents,
      externalInboundCount: c.externalInboundCount,
      externalOutboundCount: c.externalOutboundCount,
    };
    if (u.sccId !== undefined) {
      return {
        kind: 'scc',
        sccId: u.sccId,
        repos: u.memberRepos,
        ...base,
      };
    }
    const [repo] = u.memberRepos;
    return {
      kind: 'repo',
      repo,
      repos: [repo],
      ...base,
    };
  });

  return assembleWaves(migrationUnits);
}

/** Internal metadata for a migration unit (pre-projection into MigrationUnit). */
interface UnitMeta {
  id: string;
  members: Set<string>;
  /** Sorted alphabetically. */
  memberRepos: string[];
  /** Set when this unit is a multi-repo SCC. */
  sccId?: number;
}

interface Condensation {
  units: string[];
  outgoing: Map<string, Set<string>>;
  incoming: Map<string, Set<string>>;
}

interface UnitConnectivity {
  graphDependencies: string[];
  graphDependents: string[];
  externalInboundCount: number;
  externalOutboundCount: number;
}

/**
 * Phase 1+2: pick scanned repos, condense multi-scanned-member SCCs into
 * shared units, and emit a stable repo→unit mapping.
 */
function buildUnitAssignment(
  stats: Pick<OutputData['stats'], 'clusters' | 'strong_clusters'>,
  graph: MultiDirectedGraph,
): { unitOf: Map<string, string>; units: UnitMeta[] } {
  const scannedRepos = new Set<string>();
  graph.forEachNode((node, attrs) => {
    if (!attrs.isPhantom) scannedRepos.add(node);
  });
  if (scannedRepos.size === 0) return { unitOf: new Map(), units: [] };

  const enrichedStrong = enrichClusters(stats.strong_clusters ?? [], graph);
  const unitOf = new Map<string, string>();
  const units: UnitMeta[] = [];

  for (const cluster of enrichedStrong) {
    if (cluster.scannedRepos.length < 2) continue;
    const id = `scc:${cluster.id}`;
    const members = new Set(cluster.scannedRepos);
    for (const repo of cluster.scannedRepos) unitOf.set(repo, id);
    units.push({
      id,
      members,
      memberRepos: [...members].sort((a, b) => a.localeCompare(b)),
      sccId: cluster.id,
    });
  }

  for (const repo of scannedRepos) {
    if (unitOf.has(repo)) continue;
    const id = `repo:${repo}`;
    unitOf.set(repo, id);
    units.push({
      id,
      members: new Set([repo]),
      memberRepos: [repo],
    });
  }

  return { unitOf, units };
}

/**
 * Phase 3+4: Iterative Kahn-style levelization on the condensation DAG.
 * Iterative + head-index pointer (not Array.shift, which is O(n)) keeps this
 * O(V+E) and stack-safe on long chains, especially in Safari/iOS.
 *
 * - sinks-first: seed with units having no outgoing condensation edges
 *   (foundations); propagate via predecessors.
 * - sources-first: seed with units having no incoming condensation edges
 *   (top-level apps); propagate via successors.
 */
function levelizeCondensation(
  units: readonly UnitMeta[],
  condensation: Condensation,
  direction: MigrationDirection,
): Map<string, number> {
  const { outgoing, incoming } = condensation;
  const seedEdges = direction === 'sinks-first' ? outgoing : incoming;
  const propagateEdges = direction === 'sinks-first' ? incoming : outgoing;

  const level = new Map<string, number>();
  const remaining = new Map<string, number>();
  const queue: string[] = [];
  let head = 0;

  for (const u of units) {
    const seedCount = seedEdges.get(u.id)?.size ?? 0;
    remaining.set(u.id, seedCount);
    if (seedCount === 0) {
      level.set(u.id, 0);
      queue.push(u.id);
    }
  }

  while (head < queue.length) {
    const u = queue[head++];
    const myLevel = level.get(u)!;
    for (const next of propagateEdges.get(u) ?? []) {
      const candidate = myLevel + 1;
      const cur = level.get(next);
      if (cur === undefined || candidate > cur) level.set(next, candidate);
      const r = (remaining.get(next) ?? 0) - 1;
      remaining.set(next, r);
      if (r === 0) queue.push(next);
    }
  }

  return level;
}

/**
 * Phase 5: per-unit raw connectivity. Direction-invariant — display layer
 * picks `graphDependencies` vs `graphDependents` based on direction.
 */
function computeUnitConnectivity(
  units: readonly UnitMeta[],
  condensation: Condensation,
  graph: MultiDirectedGraph,
): Map<string, UnitConnectivity> {
  const memberLookup = new Map<string, Set<string>>();
  for (const u of units) memberLookup.set(u.id, u.members);

  const result = new Map<string, UnitConnectivity>();
  for (const u of units) {
    const dependencyRepos = new Set<string>();
    for (const succ of condensation.outgoing.get(u.id) ?? []) {
      for (const r of memberLookup.get(succ) ?? []) dependencyRepos.add(r);
    }
    const dependentRepos = new Set<string>();
    for (const pred of condensation.incoming.get(u.id) ?? []) {
      for (const r of memberLookup.get(pred) ?? []) dependentRepos.add(r);
    }
    result.set(u.id, {
      graphDependencies: [...dependencyRepos].sort((a, b) =>
        a.localeCompare(b),
      ),
      graphDependents: [...dependentRepos].sort((a, b) => a.localeCompare(b)),
      externalInboundCount: externalNeighbors(u.members, graph, 'inbound')
        .length,
      externalOutboundCount: externalNeighbors(u.members, graph, 'outbound')
        .length,
    });
  }
  return result;
}

/** Phase 6: bucket units by level into waves; within-wave order via `sortUnits`. */
function assembleWaves(migrationUnits: MigrationUnit[]): MigrationWave[] {
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
  return sortedLevels.map((lvl) => ({
    level: lvl,
    units: sortUnits(wavesByLevel.get(lvl)!),
  }));
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
