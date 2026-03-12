/**
 * ClusterExplorer — Connected components from stats.clusters.
 *
 * Sorted by size (largest first). Each cluster shows its ID, size,
 * and a truncated list of repos with "show more" support.
 * Clicking a cluster filters the graph/list to that cluster.
 */
import { useState, useCallback } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useFilterStore } from '@/store/filterStore';
import { useUIStore } from '@/store/uiStore';

const INITIAL_SHOW = 5;

export function ClusterExplorer() {
  const stats = useDataStore((s) => s.stats);
  const setClusterId = useFilterStore((s) => s.setClusterId);
  const setSelectedRepo = useUIStore((s) => s.setSelectedRepo);
  const activeClusterId = useFilterStore((s) => s.clusterId);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const clusters = [...(stats?.clusters ?? [])].sort((a, b) => b.size - a.size);

  const toggleExpand = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleFilterCluster = useCallback(
    (id: number) => {
      setClusterId(activeClusterId === id ? null : id);
    },
    [setClusterId, activeClusterId],
  );

  const handleRepoClick = useCallback(
    (repo: string) => {
      setSelectedRepo(repo);
    },
    [setSelectedRepo],
  );

  if (clusters.length === 0) {
    return (
      <div className="cluster-explorer">
        <p className="cluster-explorer__empty">
          No cluster data available.
        </p>
      </div>
    );
  }

  return (
    <div className="cluster-explorer">
      <div className="cluster-explorer__header">
        <h3 className="cluster-explorer__title">
          Clusters ({clusters.length})
        </h3>
      </div>

      <div className="cluster-explorer__list">
        {clusters.map((cluster) => {
          const isExpanded = expanded.has(cluster.id);
          const visibleRepos = isExpanded
            ? cluster.repos
            : cluster.repos.slice(0, INITIAL_SHOW);
          const hasMore = cluster.repos.length > INITIAL_SHOW;

          return (
            <div
              key={cluster.id}
              className={`cluster-explorer__cluster ${
                activeClusterId === cluster.id
                  ? 'cluster-explorer__cluster--active'
                  : ''
              }`}
            >
              <div className="cluster-explorer__cluster-header">
                <span className="cluster-explorer__cluster-info">
                  <strong>Cluster {cluster.id}</strong> — {cluster.size} repos
                </span>
                <button
                  className="cluster-explorer__filter-btn"
                  onClick={() => handleFilterCluster(cluster.id)}
                  aria-pressed={activeClusterId === cluster.id}
                >
                  {activeClusterId === cluster.id
                    ? 'Clear Filter'
                    : 'View in Graph'}
                </button>
              </div>

              <ul className="cluster-explorer__repo-list">
                {visibleRepos.map((repo) => (
                  <li key={repo}>
                    <button
                      className="cluster-explorer__repo-link"
                      onClick={() => handleRepoClick(repo)}
                      title={`View details for ${repo}`}
                    >
                      {repo}
                    </button>
                  </li>
                ))}
              </ul>

              {hasMore && (
                <button
                  className="cluster-explorer__show-more"
                  onClick={() => toggleExpand(cluster.id)}
                >
                  {isExpanded
                    ? 'Show less'
                    : `Show ${cluster.repos.length - INITIAL_SHOW} more…`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
