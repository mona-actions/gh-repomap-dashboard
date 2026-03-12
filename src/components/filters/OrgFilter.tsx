/**
 * OrgFilter — Multi-select dropdown for filtering by organization.
 *
 * Shows available organizations with checkboxes, "Select All" / "Clear All"
 * buttons, and a search field for large org lists.
 *
 * Displays selected count: "3 of 8 orgs selected".
 */
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { OrganizationIcon, ChevronDownIcon } from '@primer/octicons-react';
import { useDataStore } from '@/store/dataStore';
import { useFilterStore } from '@/store/filterStore';
import { getOrgColor } from '@/utils/colors';

export function OrgFilter() {
  const allOrgs = useDataStore((s) => s.allOrgs);
  const selectedOrgs = useFilterStore((s) => s.selectedOrgs);
  const setSelectedOrgs = useFilterStore((s) => s.setSelectedOrgs);

  const [isOpen, setIsOpen] = useState(false);
  const [orgSearch, setOrgSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOrgs = useMemo(() => {
    if (!orgSearch) return allOrgs;
    const lower = orgSearch.toLowerCase();
    return allOrgs.filter((org) => org.toLowerCase().includes(lower));
  }, [allOrgs, orgSearch]);

  const handleToggle = useCallback(
    (org: string) => {
      if (selectedOrgs.includes(org)) {
        setSelectedOrgs(selectedOrgs.filter((o) => o !== org));
      } else {
        setSelectedOrgs([...selectedOrgs, org]);
      }
    },
    [selectedOrgs, setSelectedOrgs],
  );

  const handleSelectAll = useCallback(() => {
    setSelectedOrgs([...allOrgs]);
  }, [allOrgs, setSelectedOrgs]);

  const handleClearAll = useCallback(() => {
    setSelectedOrgs([]);
  }, [setSelectedOrgs]);

  const selectedCount = selectedOrgs.length;
  const totalCount = allOrgs.length;
  const label =
    selectedCount === 0
      ? `All ${totalCount} orgs`
      : `${selectedCount} of ${totalCount} orgs`;

  return (
    <div className="org-filter" ref={dropdownRef}>
      <button
        type="button"
        className="org-filter__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Filter by organization"
      >
        <OrganizationIcon size={16} />
        <span className="org-filter__label">{label}</span>
        <ChevronDownIcon size={16} />
      </button>

      {isOpen && (
        <div className="org-filter__dropdown" role="listbox" aria-label="Organizations">
          {/* Search within dropdown */}
          {allOrgs.length > 5 && (
            <div className="org-filter__search">
              <input
                type="text"
                placeholder="Search orgs…"
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                className="org-filter__search-input"
                aria-label="Search organizations"
              />
            </div>
          )}

          {/* Select / Clear All */}
          <div className="org-filter__actions">
            <button
              type="button"
              className="org-filter__action-btn"
              onClick={handleSelectAll}
            >
              Select All
            </button>
            <button
              type="button"
              className="org-filter__action-btn"
              onClick={handleClearAll}
            >
              Clear All
            </button>
          </div>

          {/* Org list */}
          <ul className="org-filter__list">
            {filteredOrgs.map((org) => {
              const isSelected = selectedOrgs.includes(org);
              const color = getOrgColor(org, allOrgs);

              return (
                <li key={org} role="option" aria-selected={isSelected}>
                  <label className="org-filter__option">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(org)}
                    />
                    <span
                      className="org-filter__dot"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    {org}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
