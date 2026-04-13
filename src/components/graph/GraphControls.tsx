/**
 * GraphControls — Floating control panel over the graph.
 *
 * Provides zoom in/out, fit-to-screen, and fullscreen toggle buttons.
 * Positioned absolutely over the GraphContainer.
 */
import {
  PlusIcon,
  DashIcon,
  ScreenFullIcon,
  ScreenNormalIcon,
  MoveToStartIcon,
} from '@primer/octicons-react';
import { useState, useCallback } from 'react';

export interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
}

export function GraphControls({
  onZoomIn,
  onZoomOut,
  onFitToScreen,
}: GraphControlsProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      const graphEl = document.querySelector('.graph-page__main');
      if (graphEl) {
        graphEl.requestFullscreen().then(() => setIsFullscreen(true));
      }
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  return (
    <div className="graph-controls" role="toolbar" aria-label="Graph controls">
      <button
        type="button"
        className="graph-controls__btn"
        onClick={onZoomIn}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <PlusIcon size={16} />
      </button>
      <button
        type="button"
        className="graph-controls__btn"
        onClick={onZoomOut}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <DashIcon size={16} />
      </button>
      <div className="graph-controls__separator" role="separator" />
      <button
        type="button"
        className="graph-controls__btn"
        onClick={onFitToScreen}
        aria-label="Fit to screen"
        title="Fit to screen"
      >
        <MoveToStartIcon size={16} />
      </button>
      <button
        type="button"
        className="graph-controls__btn"
        onClick={handleFullscreen}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? (
          <ScreenNormalIcon size={16} />
        ) : (
          <ScreenFullIcon size={16} />
        )}
      </button>
    </div>
  );
}
