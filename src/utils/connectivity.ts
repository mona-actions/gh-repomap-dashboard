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
