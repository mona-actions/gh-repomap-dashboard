/**
 * FilterBar — Inline filter bar that sits above content.
 *
 * Composes OrgFilter, SearchInput, and ActiveFilters.
 * Persists across dashboard/list views.
 */
import { OrgFilter } from './OrgFilter';
import { SearchInput } from './SearchInput';
import { ActiveFilters } from './ActiveFilters';

interface FilterBarProps {
  /** Optional result count to show in the search input */
  resultCount?: number;
}

export function FilterBar({ resultCount }: FilterBarProps) {
  return (
    <div className="filter-bar" role="search" aria-label="Filter repositories">
      <div className="filter-bar__controls">
        <SearchInput resultCount={resultCount} />
        <OrgFilter />
      </div>
      <ActiveFilters />
    </div>
  );
}
