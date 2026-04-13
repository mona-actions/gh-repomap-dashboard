/**
 * OrphanRepos — Lists repos with no inbound or outbound edges.
 *
 * These repos can be migrated independently since they have no
 * dependency relationships. Clicking a repo opens its detail panel.
 */
import { useCallback } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';

export function OrphanRepos() {
  const stats = useDataStore((s) => s.stats);
  const setSelectedRepo = useUIStore((s) => s.setSelectedRepo);

  const orphans = stats?.orphan_repos ?? [];

  const handleRepoClick = useCallback(
    (repo: string) => {
      setSelectedRepo(repo);
    },
    [setSelectedRepo],
  );

  if (orphans.length === 0) {
    return (
      <div className="orphan-repos">
        <p className="orphan-repos__empty">
          No orphan repositories. All repos have at least one dependency
          connection.
        </p>
      </div>
    );
  }

  return (
    <div className="orphan-repos">
      <div className="orphan-repos__header">
        <h3 className="orphan-repos__title">
          Orphan Repositories ({orphans.length})
        </h3>
      </div>

      <p className="orphan-repos__description">
        These repos have no connections and can be migrated independently.
      </p>

      <ul className="orphan-repos__list" aria-label="Orphan repositories">
        {orphans.map((repo) => (
          <li key={repo} className="orphan-repos__item">
            <button
              className="orphan-repos__link"
              onClick={() => handleRepoClick(repo)}
              title={`View details for ${repo}`}
            >
              {repo}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
