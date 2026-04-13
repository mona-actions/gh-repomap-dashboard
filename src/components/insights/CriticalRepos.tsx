/**
 * CriticalRepos — Full ranked view of most-depended-on repositories.
 *
 * Displays `stats.most_depended_on` as a sortable table with rank,
 * repo name, dependent count, and a visual bar indicator.
 * Clicking a repo opens its detail panel.
 */
import { useState, useMemo, useCallback } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';

type SortMode = 'dependents' | 'alphabetical';

export function CriticalRepos() {
  const stats = useDataStore((s) => s.stats);
  const setSelectedRepo = useUIStore((s) => s.setSelectedRepo);
  const [sortMode, setSortMode] = useState<SortMode>('dependents');

  const items = useMemo(() => {
    const raw = stats?.most_depended_on ?? [];
    const sorted = [...raw];
    if (sortMode === 'alphabetical') {
      sorted.sort((a, b) => a.repo.localeCompare(b.repo));
    }
    // Default is already sorted by dependents from the data
    return sorted;
  }, [stats, sortMode]);

  const maxDependents = useMemo(
    () => Math.max(1, ...items.map((i) => i.direct_dependents)),
    [items],
  );

  const handleRepoClick = useCallback(
    (repo: string) => {
      setSelectedRepo(repo);
    },
    [setSelectedRepo],
  );

  if (items.length === 0) {
    return (
      <div className="critical-repos">
        <p className="critical-repos__empty">No dependency data available.</p>
      </div>
    );
  }

  return (
    <div className="critical-repos">
      <div className="critical-repos__header">
        <h3 className="critical-repos__title">Most Depended-On Repositories</h3>
        <div className="critical-repos__sort">
          <label htmlFor="critical-sort">Sort by: </label>
          <select
            id="critical-sort"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
          >
            <option value="dependents">Dependents</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>
      </div>

      <table
        className="critical-repos__table"
        aria-label="Critical repositories"
      >
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Repository</th>
            <th scope="col">Dependents</th>
            <th scope="col" aria-label="Impact bar">
              Impact
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.repo} className="critical-repos__row">
              <td className="critical-repos__rank">{i + 1}</td>
              <td>
                <button
                  className="critical-repos__link"
                  onClick={() => handleRepoClick(item.repo)}
                  title={`View details for ${item.repo}`}
                >
                  {item.repo}
                </button>
              </td>
              <td className="critical-repos__count">
                {item.direct_dependents}
              </td>
              <td className="critical-repos__bar-cell">
                <div
                  className="critical-repos__bar"
                  style={{
                    width: `${(item.direct_dependents / maxDependents) * 100}%`,
                  }}
                  role="meter"
                  aria-valuenow={item.direct_dependents}
                  aria-valuemin={0}
                  aria-valuemax={maxDependents}
                  aria-label={`${item.direct_dependents} dependents`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
