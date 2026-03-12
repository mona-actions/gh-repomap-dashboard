/**
 * SortableHeader — Clickable column header with sort indicators.
 *
 * Renders as a flex-based div cell (matching RepoRow's div layout)
 * with aria-sort for screen readers.
 */

export type SortDirection = 'ascending' | 'descending' | 'none';

export interface SortConfig {
  column: string;
  direction: SortDirection;
}

interface SortableHeaderProps {
  /** Column identifier */
  column: string;
  /** Display label */
  label: string;
  /** Current sort state */
  sort: SortConfig;
  /** Callback when header is clicked */
  onSort: (column: string) => void;
  /** Column width — must match the corresponding RepoRow cell */
  width?: string;
}

export function SortableHeader({
  column,
  label,
  sort,
  onSort,
  width,
}: SortableHeaderProps) {
  const isActive = sort.column === column;
  const direction: SortDirection = isActive ? sort.direction : 'none';

  const handleClick = () => {
    onSort(column);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSort(column);
    }
  };

  return (
    <div
      className={`sortable-header ${isActive ? 'sortable-header--active' : ''}`}
      aria-sort={direction}
      role="columnheader"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{ cursor: 'pointer', userSelect: 'none', width }}
    >
      <span className="sortable-header__content">
        {label}
        <span className="sortable-header__indicator" aria-hidden="true">
          {direction === 'ascending' && ' ▲'}
          {direction === 'descending' && ' ▼'}
          {direction === 'none' && ' ⇅'}
        </span>
      </span>
    </div>
  );
}
