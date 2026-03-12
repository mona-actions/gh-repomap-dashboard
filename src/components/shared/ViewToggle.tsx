import { SegmentedControl } from '@primer/react';
import { ListUnorderedIcon, GraphIcon } from '@primer/octicons-react';

export type ViewMode = 'list' | 'graph';

interface ViewToggleProps {
  /** The currently active view */
  view: ViewMode;
  /** Called when the user switches views */
  onViewChange: (view: ViewMode) => void;
}

const VIEWS: readonly ViewMode[] = ['list', 'graph'] as const;

/**
 * Segmented control for switching between List and Graph views.
 */
export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  const selectedIndex = VIEWS.indexOf(view);

  const handleChange = (index: number) => {
    onViewChange(VIEWS[index]);
  };

  return (
    <SegmentedControl
      aria-label="View mode"
      onChange={handleChange}
      size="small"
    >
      <SegmentedControl.Button
        selected={selectedIndex === 0}
        leadingVisual={ListUnorderedIcon}
      >
        List
      </SegmentedControl.Button>
      <SegmentedControl.Button
        selected={selectedIndex === 1}
        leadingVisual={GraphIcon}
      >
        Graph
      </SegmentedControl.Button>
    </SegmentedControl>
  );
}
