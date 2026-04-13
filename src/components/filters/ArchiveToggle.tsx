/**
 * ArchiveToggle — Toggle to show/hide archived repositories.
 *
 * Updates filterStore.showArchived.
 */
import { useFilterStore } from '@/store/filterStore';

export function ArchiveToggle() {
  const showArchived = useFilterStore((s) => s.showArchived);
  const setShowArchived = useFilterStore((s) => s.setShowArchived);

  return (
    <div className="archive-toggle">
      <h4 className="filter-section__title">Archived Repos</h4>
      <label className="archive-toggle__label">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
          className="archive-toggle__checkbox"
        />
        <span>Show archived</span>
      </label>
    </div>
  );
}
