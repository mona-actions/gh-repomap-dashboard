/**
 * ConfidenceToggle — Toggle between "All" and "High only" confidence.
 *
 * Updates filterStore.confidenceFilter.
 */
import { useFilterStore } from '@/store/filterStore';

export function ConfidenceToggle() {
  const confidenceFilter = useFilterStore((s) => s.confidenceFilter);
  const setConfidenceFilter = useFilterStore((s) => s.setConfidenceFilter);

  return (
    <div className="confidence-toggle">
      <h4 className="filter-section__title">Confidence</h4>
      <div
        className="confidence-toggle__options"
        role="radiogroup"
        aria-label="Confidence filter"
      >
        <button
          type="button"
          className={`confidence-toggle__btn ${confidenceFilter === 'all' ? 'confidence-toggle__btn--active' : ''}`}
          onClick={() => setConfidenceFilter('all')}
          role="radio"
          aria-checked={confidenceFilter === 'all'}
        >
          All
        </button>
        <button
          type="button"
          className={`confidence-toggle__btn ${confidenceFilter === 'high' ? 'confidence-toggle__btn--active' : ''}`}
          onClick={() => setConfidenceFilter('high')}
          role="radio"
          aria-checked={confidenceFilter === 'high'}
        >
          High only
        </button>
      </div>
    </div>
  );
}