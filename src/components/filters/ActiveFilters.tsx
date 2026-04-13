/**
 * ActiveFilters — Shows chips for currently active filters.
 *
 * Each chip has a × button to remove that filter.
 * "Clear all filters" button appears when any filters are active.
 */
import { XIcon } from '@primer/octicons-react';
import { useFilterStore } from '@/store/filterStore';

export function ActiveFilters() {
  const selectedOrgs = useFilterStore((s) => s.selectedOrgs);
  const searchQuery = useFilterStore((s) => s.searchQuery);
  const depTypes = useFilterStore((s) => s.depTypes);
  const showArchived = useFilterStore((s) => s.showArchived);
  const setSelectedOrgs = useFilterStore((s) => s.setSelectedOrgs);
  const setSearchQuery = useFilterStore((s) => s.setSearchQuery);
  const setDepTypes = useFilterStore((s) => s.setDepTypes);
  const setShowArchived = useFilterStore((s) => s.setShowArchived);
  const resetFilters = useFilterStore((s) => s.resetFilters);

  const chips: { label: string; onRemove: () => void }[] = [];

  // Org chips
  for (const org of selectedOrgs) {
    chips.push({
      label: `Org: ${org}`,
      onRemove: () => setSelectedOrgs(selectedOrgs.filter((o) => o !== org)),
    });
  }

  // Search chip
  if (searchQuery) {
    chips.push({
      label: `Search: "${searchQuery}"`,
      onRemove: () => setSearchQuery(''),
    });
  }

  // Dep type chips
  for (const type of depTypes) {
    chips.push({
      label: `Type: ${type}`,
      onRemove: () => setDepTypes(depTypes.filter((t) => t !== type)),
    });
  }

  // Archived filter chip
  if (!showArchived) {
    chips.push({
      label: 'Hide archived',
      onRemove: () => setShowArchived(true),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="active-filters" role="region" aria-label="Active filters">
      <div className="active-filters__chips">
        {chips.map((chip) => (
          <span key={chip.label} className="active-filters__chip">
            {chip.label}
            <button
              type="button"
              className="active-filters__chip-remove"
              onClick={chip.onRemove}
              aria-label={`Remove filter: ${chip.label}`}
            >
              <XIcon size={12} />
            </button>
          </span>
        ))}
      </div>
      <button
        type="button"
        className="active-filters__clear-all"
        onClick={resetFilters}
      >
        Clear all filters
      </button>
    </div>
  );
}
