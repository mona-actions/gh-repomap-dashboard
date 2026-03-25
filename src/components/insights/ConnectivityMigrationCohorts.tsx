import { useMemo, useState } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';
import { deriveMigrationCohorts } from '@/utils/connectivity';

const INITIAL_REPO_CHIPS = 8;
const INITIAL_COHORTS = 8;

interface RepoChipListProps {
  title: string;
  repos: string[];
  emptyMessage: string;
  onRepoClick: (repo: string) => void;
}

function RepoChipList({
  title,
  repos,
  emptyMessage,
  onRepoClick,
}: RepoChipListProps) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = repos.length > INITIAL_REPO_CHIPS;
  const visibleRepos = expanded ? repos : repos.slice(0, INITIAL_REPO_CHIPS);

  return (
    <div className="migration-cohorts__group">
      <h5 className="migration-cohorts__group-title">{title}</h5>
      {repos.length === 0 ? (
        <p className="migration-cohorts__empty-list">{emptyMessage}</p>
      ) : (
        <>
          <ul className="migration-cohorts__repo-list">
            {visibleRepos.map((repo) => (
              <li key={repo}>
                <button
                  className="migration-cohorts__repo-link"
                  onClick={() => onRepoClick(repo)}
                  title={`View details for ${repo}`}
                >
                  {repo}
                </button>
              </li>
            ))}
          </ul>
          {hasMore && (
            <button
              className="migration-cohorts__show-more"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded
                ? 'Show less'
                : `Show ${repos.length - INITIAL_REPO_CHIPS} more…`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function ConnectivityMigrationCohorts() {
  const stats = useDataStore((s) => s.stats);
  const setSelectedRepo = useUIStore((s) => s.setSelectedRepo);
  const [visibleCohorts, setVisibleCohorts] = useState(INITIAL_COHORTS);

  const cohorts = useMemo(() => {
    const graph = useDataStore.getState().graph;
    return deriveMigrationCohorts(stats?.strong_clusters ?? [], graph);
  }, [stats]);

  const visible = cohorts.slice(0, visibleCohorts);
  const hasMoreCohorts = cohorts.length > visibleCohorts;

  const handleRepoClick = (repo: string) => {
    setSelectedRepo(repo);
  };

  return (
    <section
      className="migration-cohorts"
      aria-labelledby="migration-cohorts-title"
    >
      <h3 id="migration-cohorts-title" className="migration-cohorts__title">
        Migration Cohort Guidance (SCC-based)
      </h3>
      <p className="migration-cohorts__description">
        Recommendations only: SCC core sets (size 2+) indicate repos that are
        tightly coupled and are usually safer to move together. Optional one-hop
        context can help size rollout risk, but it is not a strict requirement.
      </p>

      {cohorts.length === 0 ? (
        <p className="migration-cohorts__empty">
          No SCC core sets with 2+ repos found. Migration can likely be planned
          per repo with normal dependency checks.
        </p>
      ) : (
        <>
          <div className="migration-cohorts__list">
            {visible.map((cohort) => (
              <article key={cohort.id} className="migration-cohorts__card">
                <header className="migration-cohorts__card-header">
                  <h4 className="migration-cohorts__card-title">
                    Core Set {cohort.id} — {cohort.coreSize} repos
                  </h4>
                  <p className="migration-cohorts__card-meta">
                    Recommended one-hop context:{' '}
                    {cohort.recommendedDependents.length} dependents,{' '}
                    {cohort.recommendedDependencies.length} dependencies
                  </p>
                </header>

                <p className="migration-cohorts__note">
                  Must-move-together recommendation based on mutual reachability
                  in directed dependencies. Confirm with service ownership and
                  release constraints.
                </p>

                <RepoChipList
                  title="Core repos"
                  repos={cohort.coreRepos}
                  emptyMessage="No core repos"
                  onRepoClick={handleRepoClick}
                />

                <details className="migration-cohorts__details">
                  <summary>Optional one-hop cohort context</summary>
                  <div className="migration-cohorts__one-hop-grid">
                    <RepoChipList
                      title="Direct dependents (inbound)"
                      repos={cohort.recommendedDependents}
                      emptyMessage="No direct dependents outside this core"
                      onRepoClick={handleRepoClick}
                    />
                    <RepoChipList
                      title="Direct dependencies (outbound)"
                      repos={cohort.recommendedDependencies}
                      emptyMessage="No direct dependencies outside this core"
                      onRepoClick={handleRepoClick}
                    />
                  </div>
                </details>
              </article>
            ))}
          </div>

          {hasMoreCohorts && (
            <button
              className="migration-cohorts__show-more"
              onClick={() =>
                setVisibleCohorts((count) => count + INITIAL_COHORTS)
              }
            >
              Show {Math.min(INITIAL_COHORTS, cohorts.length - visibleCohorts)}{' '}
              more cohorts
            </button>
          )}
        </>
      )}
    </section>
  );
}
