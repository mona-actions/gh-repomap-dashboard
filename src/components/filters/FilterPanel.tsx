/**
 * FilterPanel — Sidebar filter panel with ALL filter controls.
 *
 * Composes existing filters (OrgFilter, SearchInput) with new ones
 * (DepTypeToggles, ConfidenceToggle, ArchiveToggle, ClusterSelect).
 * Shows a filter summary with visible/total counts.
 */
import { OrgFilter } from './OrgFilter';
import { SearchInput } from './SearchInput';
import { DepTypeToggles } from './DepTypeToggles';
import { EcosystemToggles } from './EcosystemToggles';
import { ConfidenceToggle } from './ConfidenceToggle';
import { ArchiveToggle } from './ArchiveToggle';
import { ClusterSelect } from './ClusterSelect';
import { ActiveFilters } from './ActiveFilters';
import { useFilterStore } from '@/store/filterStore';

export interface FilterPanelProps {
  /** Number of visible nodes after filtering */
  visibleNodes: number;
  /** Total number of nodes */
  totalNodes: number;
  /** Number of visible edges after filtering */
  visibleEdges: number;
  /** Total number of edges */
  totalEdges: number;
}

export function FilterPanel({
  visibleNodes,
  totalNodes,
  visibleEdges,
  totalEdges,
}: FilterPanelProps) {
  const resetFilters = useFilterStore((s) => s.resetFilters);

  const isFiltered = visibleNodes < totalNodes || visibleEdges < totalEdges;

  return (
    <aside className="filter-panel" aria-label="Filter controls">
      <div className="filter-panel__header">
        <h2 className="filter-panel__title">Filters</h2>
        {isFiltered && (
          <button
            type="button"
            className="filter-panel__reset"
            onClick={resetFilters}
          >
            Reset all
          </button>
        )}
      </div>

      {/* Filter summary */}
      <div className="filter-panel__summary" role="status" aria-live="polite">
        Showing {visibleNodes.toLocaleString()} of{' '}
        {totalNodes.toLocaleString()} repos, {visibleEdges.toLocaleString()}{' '}
        edges
      </div>

      <div className="filter-panel__sections">
        {/* Search */}
        <div className="filter-panel__section">
          <SearchInput resultCount={isFiltered ? visibleNodes : undefined} />
        </div>

        {/* Org filter */}
        <div className="filter-panel__section">
          <OrgFilter />
        </div>

        {/* Dependency type toggles */}
        <div className="filter-panel__section">
          <DepTypeToggles />
        </div>

        {/* Ecosystem filter (dynamic — only shown when ecosystem data exists) */}
        <div className="filter-panel__section">
          <EcosystemToggles />
        </div>

        {/* Confidence toggle */}
        <div className="filter-panel__section">
          <ConfidenceToggle />
        </div>

        {/* Archive toggle */}
        <div className="filter-panel__section">
          <ArchiveToggle />
        </div>

        {/* Cluster select */}
        <div className="filter-panel__section">
          <ClusterSelect />
        </div>
      </div>

      {/* Active filter chips */}
      <ActiveFilters />
    </aside>
  );
}