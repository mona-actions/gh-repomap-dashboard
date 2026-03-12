/**
 * SearchInput — Debounced search field for filtering repositories.
 *
 * Updates filterStore.searchQuery after a 300ms debounce.
 * Shows a clear button when the input has a value.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { SearchIcon, XCircleFillIcon } from '@primer/octicons-react';
import { useFilterStore } from '@/store/filterStore';

interface SearchInputProps {
  /** Optional result count to display */
  resultCount?: number;
}

export function SearchInput({ resultCount }: SearchInputProps) {
  const searchQuery = useFilterStore((s) => s.searchQuery);
  const setSearchQuery = useFilterStore((s) => s.setSearchQuery);

  // Local state for immediate feedback; store update is debounced
  const [localValue, setLocalValue] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local value when store changes externally (e.g., resetFilters)
  useEffect(() => {
    setLocalValue(searchQuery);
  }, [searchQuery]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalValue(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        setSearchQuery(value);
      }, 300);
    },
    [setSearchQuery],
  );

  const handleClear = useCallback(() => {
    setLocalValue('');
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setSearchQuery('');
  }, [setSearchQuery]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="search-input">
      <div className="search-input__wrapper">
        <span className="search-input__icon" aria-hidden="true">
          <SearchIcon size={16} />
        </span>
        <input
          type="search"
          className="search-input__field"
          value={localValue}
          onChange={handleChange}
          placeholder="Search repositories…"
          aria-label="Search repositories"
        />
        {localValue && (
          <button
            type="button"
            className="search-input__clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <XCircleFillIcon size={16} />
          </button>
        )}
      </div>
      {localValue && resultCount !== undefined && (
        <span className="search-input__count" role="status" aria-live="polite">
          {resultCount} results
        </span>
      )}
    </div>
  );
}
