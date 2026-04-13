/**
 * Layout computation Web Worker.
 *
 * Offloads graph layout algorithms to a background thread:
 * - Circular layout: instant, deterministic (good for initial render)
 * - ForceAtlas2: iterative force-directed layout (better spatial encoding)
 *
 * Both accept a serialized Graphology graph and return node positions.
 */
import { expose } from 'comlink';
import { MultiDirectedGraph } from 'graphology';
import { circular } from 'graphology-layout';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import type { NodePosition } from './types';

const api = {
  /**
   * Compute a circular layout grouped by org.
   * Instant and deterministic — useful as the initial layout before
   * a force-directed simulation runs.
   */
  computeCircularLayout(
    serializedGraph: ReturnType<MultiDirectedGraph['export']>,
  ): Record<string, NodePosition> {
    const graph = new MultiDirectedGraph();
    graph.import(serializedGraph);

    // Apply circular layout — assigns x/y attributes to each node
    circular.assign(graph);

    const positions: Record<string, NodePosition> = {};
    graph.forEachNode((node, attrs) => {
      positions[node] = {
        x: attrs.x as number,
        y: attrs.y as number,
      };
    });

    return positions;
  },

  /**
   * Compute a ForceAtlas2 force-directed layout.
   * Runs synchronously for `iterations` steps, then returns final positions.
   *
   * @param serializedGraph - Serialized Graphology graph
   * @param iterations - Number of simulation steps (default: 500)
   */
  computeForceLayout(
    serializedGraph: ReturnType<MultiDirectedGraph['export']>,
    iterations: number = 500,
  ): Record<string, NodePosition> {
    const graph = new MultiDirectedGraph();
    graph.import(serializedGraph);

    // Infer sensible settings based on graph structure
    const settings = forceAtlas2.inferSettings(graph);

    // Run layout for N iterations
    forceAtlas2.assign(graph, {
      iterations,
      settings: { ...settings, linLogMode: true },
    });

    const positions: Record<string, NodePosition> = {};
    graph.forEachNode((node, attrs) => {
      positions[node] = {
        x: attrs.x as number,
        y: attrs.y as number,
      };
    });

    return positions;
  },
};

expose(api);
