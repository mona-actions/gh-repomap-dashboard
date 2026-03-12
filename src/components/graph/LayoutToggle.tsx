/**
 * LayoutToggle — Switch between circular and force-directed layouts.
 *
 * Circular layout is instant and deterministic.
 * ForceAtlas2 runs in a web worker with progress indication.
 */
import { useState, useCallback } from 'react';
import { Spinner } from '@primer/react';
import { useDataStore } from '@/store/dataStore';
import { useLayoutWorker } from '@/hooks/useWorker';

export type LayoutMode = 'circular' | 'force';

export interface LayoutToggleProps {
  /** Currently active layout */
  layout: LayoutMode;
  /** Called when layout changes */
  onLayoutChange: (layout: LayoutMode) => void;
}

export function LayoutToggle({ layout, onLayoutChange }: LayoutToggleProps) {
  const [isComputing, setIsComputing] = useState(false);
  const { computeCircularLayout, computeForceLayout } = useLayoutWorker();

  const applyPositions = useCallback(
    (positions: Record<string, { x: number; y: number }>) => {
      const graph = useDataStore.getState().graph;
      if (!graph) return;

      for (const [node, pos] of Object.entries(positions)) {
        if (graph.hasNode(node)) {
          graph.setNodeAttribute(node, 'x', pos.x);
          graph.setNodeAttribute(node, 'y', pos.y);
        }
      }
    },
    [],
  );

  const handleCircular = useCallback(async () => {
    const graph = useDataStore.getState().graph;
    if (!graph) return;

    setIsComputing(true);
    try {
      const serialized = graph.export();
      const positions = await computeCircularLayout(serialized);
      applyPositions(positions);
      onLayoutChange('circular');
    } finally {
      setIsComputing(false);
    }
  }, [computeCircularLayout, applyPositions, onLayoutChange]);

  const handleForce = useCallback(async () => {
    const graph = useDataStore.getState().graph;
    if (!graph) return;

    setIsComputing(true);
    try {
      const serialized = graph.export();
      const positions = await computeForceLayout(serialized, 300);
      applyPositions(positions);
      onLayoutChange('force');
    } finally {
      setIsComputing(false);
    }
  }, [computeForceLayout, applyPositions, onLayoutChange]);

  return (
    <div className="layout-toggle" role="radiogroup" aria-label="Layout mode">
      <button
        type="button"
        className={`layout-toggle__btn ${layout === 'circular' ? 'layout-toggle__btn--active' : ''}`}
        onClick={handleCircular}
        disabled={isComputing}
        role="radio"
        aria-checked={layout === 'circular'}
      >
        Circular
      </button>
      <button
        type="button"
        className={`layout-toggle__btn ${layout === 'force' ? 'layout-toggle__btn--active' : ''}`}
        onClick={handleForce}
        disabled={isComputing}
        role="radio"
        aria-checked={layout === 'force'}
      >
        {isComputing && layout !== 'force' ? (
          <>
            <Spinner size="small" />
            <span>Computing…</span>
          </>
        ) : (
          'Force-directed'
        )}
      </button>
      {isComputing && (
        <button
          type="button"
          className="layout-toggle__cancel"
          onClick={() => setIsComputing(false)}
          aria-label="Cancel layout computation"
        >
          Cancel
        </button>
      )}
    </div>
  );
}