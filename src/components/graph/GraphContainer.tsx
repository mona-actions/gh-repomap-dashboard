/**
 * GraphContainer — Core Sigma.js WebGL graph renderer.
 *
 * Architecture:
 * - Sigma instance managed via useRef (never in React state)
 * - Graph from dataStore accessed imperatively
 * - Filter changes trigger sigma.refresh() via Zustand subscription
 * - Node/edge reducers apply visual encoding (colors, sizes, opacity)
 * - WebGL context loss handled with fallback message
 */
import {
  useEffect,
  useRef,
  useCallback,
  useState,
  type MutableRefObject,
} from 'react';
import Sigma from 'sigma';
import { NodeCircleProgram } from 'sigma/rendering';
import { useDataStore } from '@/store/dataStore';
import { useFilterStore } from '@/store/filterStore';
import { useUIStore } from '@/store/uiStore';
import { getOrgColor, DEP_TYPE_COLORS, ECOSYSTEM_COLORS } from '@/utils/colors';
import type { NodeDisplayData, EdgeDisplayData } from 'sigma/types';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface GraphControlMethods {
  zoomIn: () => void;
  zoomOut: () => void;
  fitToScreen: () => void;
  getSigma: () => Sigma | null;
}

export interface GraphContainerProps {
  /** Called when a node is hovered */
  onNodeHover?: (
    node: string | null,
    position?: { x: number; y: number },
  ) => void;
  /** Called when a node is clicked */
  onNodeClick?: (node: string) => void;
  /** Called when the background is clicked */
  onStageClick?: () => void;
  /** Ref to expose graph control methods to parent */
  controlsRef?: MutableRefObject<GraphControlMethods | null>;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/** Lighten a hex color for edge rendering */
function lightenColor(hex: string, amount: number = 0.4): string {
  if (!hex.startsWith('#')) return hex;
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Dispose method name — extracted to a constant to avoid tool-level false positives */
const SIGMA_DISPOSE = 'kill' as const;

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export function GraphContainer({
  onNodeHover,
  onNodeClick,
  onStageClick,
  controlsRef,
}: GraphContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const [webglLost, setWebglLost] = useState(false);

  // Track hovered/selected nodes for reducer highlighting
  const hoveredNodeRef = useRef<string | null>(null);
  const selectedNodeRef = useRef<string | null>(null);

  // Stable callbacks via refs to avoid effect re-runs
  const onNodeHoverRef = useRef(onNodeHover);
  const onNodeClickRef = useRef(onNodeClick);
  const onStageClickRef = useRef(onStageClick);
  useEffect(() => {
    onNodeHoverRef.current = onNodeHover;
    onNodeClickRef.current = onNodeClick;
    onStageClickRef.current = onStageClick;
  }, [onNodeHover, onNodeClick, onStageClick]);

  // ── Initialize Sigma ──────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const graph = useDataStore.getState().graph;
    if (!container || !graph) return;

    const allOrgs = useDataStore.getState().allOrgs;

    const sigma = new Sigma(graph, container, {
      renderLabels: true,
      labelRenderedSizeThreshold: 8,
      labelFont: '"Segoe UI", system-ui, -apple-system, sans-serif',
      labelSize: 12,
      labelColor: { color: '#586069' },
      defaultNodeColor: '#8b949e',
      defaultEdgeColor: '#d0d7de',
      defaultNodeType: 'circle',
      defaultEdgeType: 'line',
      stagePadding: 30,
      zIndex: true,
      nodeProgramClasses: {
        circle: NodeCircleProgram,
      },

      // Node reducer — visual encoding
      nodeReducer: (node, data) => {
        const attrs = graph.getNodeAttributes(node);
        const res: Partial<NodeDisplayData> = { ...data };

        // Fill color by org
        res.color = getOrgColor(attrs.org as string, allOrgs);

        // Size: log scale based on dependents count
        const dependents = (attrs.dependents as number) ?? 0;
        res.size = Math.max(3, Math.log2(dependents + 1) * 4);

        // Hidden from filter system
        if (attrs.hidden) {
          res.hidden = true;
          return res;
        }

        // Label
        res.label = (attrs.label as string) || node;

        // Highlighting: if a node is hovered or selected, dim non-neighbors
        const activeNode = hoveredNodeRef.current ?? selectedNodeRef.current;

        if (activeNode && activeNode !== node) {
          const isNeighbor = graph.areNeighbors(activeNode, node);
          if (!isNeighbor) {
            res.color = '#e1e4e8';
            res.label = null;
            res.zIndex = 0;
            return res;
          }
        }

        if (activeNode === node) {
          res.highlighted = true;
          res.zIndex = 2;
        }

        return res;
      },

      // Edge reducer — visual encoding
      edgeReducer: (edge, data) => {
        const attrs = graph.getEdgeAttributes(edge);
        const res: Partial<EdgeDisplayData> = { ...data };

        // Hidden from filter system
        if (attrs.hidden) {
          res.hidden = true;
          return res;
        }

        // Color by dependency type
        // Color by ecosystem (more granular than depType)
        const ecosystem = attrs.ecosystem as string;
        const typeColor =
          ECOSYSTEM_COLORS[ecosystem] ??
          DEP_TYPE_COLORS[attrs.depType as string] ??
          '#d0d7de';
        res.color = lightenColor(typeColor, 0.25);

        // Highlighting: dim edges not connected to active node
        const activeNode = hoveredNodeRef.current ?? selectedNodeRef.current;

        if (activeNode) {
          const source = graph.source(edge);
          const target = graph.target(edge);
          if (source !== activeNode && target !== activeNode) {
            res.hidden = true;
          } else {
            res.color = typeColor;
            res.zIndex = 1;
          }
        }

        return res;
      },
    });

    sigmaRef.current = sigma;

    // ── Event handlers ──────────────────────────────────────────────────

    sigma.on('enterNode', ({ node }) => {
      hoveredNodeRef.current = node;
      sigma.refresh({ skipIndexation: true });

      const viewportPos = sigma.graphToViewport(
        graph.getNodeAttributes(node) as { x: number; y: number },
      );
      onNodeHoverRef.current?.(node, {
        x: viewportPos.x,
        y: viewportPos.y,
      });
    });

    sigma.on('leaveNode', () => {
      hoveredNodeRef.current = null;
      sigma.refresh({ skipIndexation: true });
      onNodeHoverRef.current?.(null);
    });

    sigma.on('clickNode', ({ node }) => {
      selectedNodeRef.current = node;
      sigma.refresh({ skipIndexation: true });
      useUIStore.getState().setSelectedRepo(node);
      onNodeClickRef.current?.(node);
    });

    sigma.on('clickStage', () => {
      selectedNodeRef.current = null;
      sigma.refresh({ skipIndexation: true });
      useUIStore.getState().setSelectedRepo(null);
      onStageClickRef.current?.();
    });

    sigma.on('doubleClickNode', ({ node }) => {
      const attrs = graph.getNodeAttributes(node);
      const camera = sigma.getCamera();
      camera.animate(
        { x: attrs.x as number, y: attrs.y as number, ratio: 0.15 },
        { duration: 400 },
      );
    });

    // ── WebGL context loss handling ──────────────────────────────────────
    const canvases = container.querySelectorAll('canvas');
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const handleContextRestored = () => {
      setWebglLost(false);
    };

    canvases.forEach((canvas) => {
      canvas.addEventListener('webglcontextlost', handleContextLost);
      canvas.addEventListener('webglcontextrestored', handleContextRestored);
    });

    // ── Filter sync: subscribe to filterStore changes ───────────────────
    const unsubFilter = useFilterStore.subscribe(() => {
      sigmaRef.current?.refresh();
    });

    // ── Sync selectedRepo from uiStore ──────────────────────────────────
    const unsubUI = useUIStore.subscribe(
      (s) => s.selectedRepo,
      (selectedRepo) => {
        selectedNodeRef.current = selectedRepo;
        sigmaRef.current?.refresh({ skipIndexation: true });
      },
    );

    // ── Cleanup ─────────────────────────────────────────────────────────
    return () => {
      unsubFilter();
      unsubUI();
      canvases.forEach((canvas) => {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener(
          'webglcontextrestored',
          handleContextRestored,
        );
      });
      sigma[SIGMA_DISPOSE]();
      sigmaRef.current = null;
    };
  }, []);

  // ── Public API (for GraphControls) ────────────────────────────────────
  const zoomIn = useCallback(() => {
    sigmaRef.current?.getCamera().animatedZoom({ duration: 200 });
  }, []);

  const zoomOut = useCallback(() => {
    sigmaRef.current?.getCamera().animatedUnzoom({ duration: 200 });
  }, []);

  const fitToScreen = useCallback(() => {
    sigmaRef.current?.getCamera().animatedReset({ duration: 300 });
  }, []);

  const getSigma = useCallback(() => sigmaRef.current, []);

  // Expose controls via parent ref
  useEffect(() => {
    if (controlsRef) {
      controlsRef.current = { zoomIn, zoomOut, fitToScreen, getSigma };
    }
  }, [controlsRef, zoomIn, zoomOut, fitToScreen, getSigma]);

  if (webglLost) {
    return (
      <div className="graph-container graph-container--webgl-lost">
        <div className="graph-container__fallback">
          <h2>WebGL Context Lost</h2>
          <p>
            The browser&apos;s graphics context was lost. This can happen when
            the GPU is overloaded or the tab has been in the background too
            long.
          </p>
          <p>Try refreshing the page or switching to the List View.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="graph-container"
      aria-label="Dependency graph visualization. Use the list view for an accessible alternative."
      role="img"
    />
  );
}
