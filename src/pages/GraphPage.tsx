/**
 * GraphPage — Full-screen graph view with filter sidebar.
 *
 * Layout: FilterPanel (sidebar) + GraphContainer (main area)
 * GraphControls and GraphLegend float over the graph.
 * NodeTooltip shows on hover. Click node → set selectedRepo.
 * ViewToggle in header links to list view.
 */
import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraphContainer,
  type GraphControlMethods,
} from '@/components/graph/GraphContainer';
import { GraphControls } from '@/components/graph/GraphControls';
import { GraphLegend } from '@/components/graph/GraphLegend';
import { NodeTooltip } from '@/components/graph/NodeTooltip';
import { LayoutToggle, type LayoutMode } from '@/components/graph/LayoutToggle';
import { FilterPanel } from '@/components/filters/FilterPanel';
import { ErrorBoundary, ViewToggle, ExportMenu, type ViewMode } from '@/components/shared';
import { useFilteredGraph } from '@/hooks/useFilteredGraph';
import { useUIStore } from '@/store/uiStore';
import { useDataStore } from '@/store/dataStore';

export default function GraphPage() {
  const navigate = useNavigate();
  const filterStats = useFilteredGraph();
  const nodeCount = useDataStore((s) => s.nodeCount);
  const edgeCount = useDataStore((s) => s.edgeCount);

  // Tooltip state
  const [tooltipNode, setTooltipNode] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Layout state
  const [layout, setLayout] = useState<LayoutMode>('circular');

  // Ref for graph controls — set by GraphContainer via callback
  const graphControlsRef = useRef<GraphControlMethods | null>(null);

  // View toggle
  const handleViewChange = useCallback(
    (view: ViewMode) => {
      useUIStore.getState().setActiveView(view);
      navigate(view === 'list' ? '/list' : '/graph');
    },
    [navigate],
  );

  // Node hover handler
  const handleNodeHover = useCallback(
    (node: string | null, position?: { x: number; y: number }) => {
      setTooltipNode(node);
      setTooltipPos(position ?? null);
    },
    [],
  );

  // Graph control callbacks — delegated to ref
  const handleZoomIn = useCallback(() => {
    graphControlsRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    graphControlsRef.current?.zoomOut();
  }, []);

  const handleFitToScreen = useCallback(() => {
    graphControlsRef.current?.fitToScreen();
  }, []);

  return (
    <div className="graph-page">
      {/* Header bar */}
      <div className="graph-page__header">
        <div className="graph-page__header-left">
          <h1 className="graph-page__title">Dependency Graph</h1>
        </div>
        <div className="graph-page__header-right">
          <ExportMenu />
          <LayoutToggle layout={layout} onLayoutChange={setLayout} />
          <ViewToggle view="graph" onViewChange={handleViewChange} />
        </div>
      </div>

      {/* Mobile banner */}
      <div className="graph-mobile-banner" role="status">
        📱 Best viewed on desktop — pinch to zoom, tap to select
      </div>

      <div className="graph-page__body">
        {/* Filter sidebar */}
        <FilterPanel
          visibleNodes={filterStats.visibleNodes || nodeCount}
          totalNodes={filterStats.totalNodes || nodeCount}
          visibleEdges={filterStats.visibleEdges || edgeCount}
          totalEdges={filterStats.totalEdges || edgeCount}
        />

        {/* Main graph area */}
        <div className="graph-page__main">
          <ErrorBoundary level="view">
            <GraphContainer
              onNodeHover={handleNodeHover}
              controlsRef={graphControlsRef}
            />
          </ErrorBoundary>

          {/* Floating controls */}
          <GraphControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitToScreen={handleFitToScreen}
          />

          {/* Legend */}
          <GraphLegend />

          {/* Tooltip */}
          <NodeTooltip
            node={tooltipNode}
            position={tooltipPos ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}
