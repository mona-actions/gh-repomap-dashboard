/**
 * CircularDeps — Displays circular dependency cycles from stats.
 *
 * Each cycle is rendered as a chain of arrows (repo-a → repo-b → repo-a).
 * Uses attention/warning styling. Clicking any repo opens its detail panel.
 */
import { useCallback } from 'react';
import { AlertIcon } from '@primer/octicons-react';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';

export function CircularDeps() {
  const stats = useDataStore((s) => s.stats);
  const setSelectedRepo = useUIStore((s) => s.setSelectedRepo);

  const cycles = stats?.circular_deps ?? [];

  const handleRepoClick = useCallback(
    (repo: string) => {
      setSelectedRepo(repo);
    },
    [setSelectedRepo],
  );

  if (cycles.length === 0) {
    return (
      <div className="circular-deps">
        <div className="circular-deps__success">
          <p>✅ No circular dependencies detected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="circular-deps">
      <div className="circular-deps__header">
        <AlertIcon size={16} className="circular-deps__icon" />
        <h3 className="circular-deps__title">
          Circular Dependencies ({cycles.length})
        </h3>
      </div>

      <p className="circular-deps__description">
        These cycles are Repo Groups (Strong): each repo can reach the others by
        following dependency direction. Resolve them for clean migration
        ordering.
      </p>

      <ul
        className="circular-deps__list"
        aria-label="Circular dependency cycles"
      >
        {cycles.map((cycle, i) => (
          <li key={i} className="circular-deps__cycle">
            <span className="circular-deps__cycle-label">Cycle {i + 1}:</span>
            <span className="circular-deps__cycle-path">
              {cycle.map((repo, j) => (
                <span key={j}>
                  <button
                    className="circular-deps__repo-link"
                    onClick={() => handleRepoClick(repo)}
                    title={`View details for ${repo}`}
                  >
                    {repo}
                  </button>
                  {j < cycle.length - 1 && (
                    <span className="circular-deps__arrow" aria-hidden="true">
                      {' → '}
                    </span>
                  )}
                </span>
              ))}
              {/* Close the cycle: arrow back to first */}
              <span className="circular-deps__arrow" aria-hidden="true">
                {' → '}
              </span>
              <button
                className="circular-deps__repo-link"
                onClick={() => handleRepoClick(cycle[0])}
              >
                {cycle[0]}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
