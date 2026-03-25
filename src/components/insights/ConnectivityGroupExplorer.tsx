import { useCallback, useMemo, useState } from 'react';
import type { Cluster } from '@/schemas/repomap';
import { useUIStore } from '@/store/uiStore';

const INITIAL_SHOW = 5;

interface ConnectivityGroupExplorerProps {
  groups: Cluster[];
  title: string;
  description: string;
  emptyMessage: string;
  groupLabel: string;
  groupHint: 'Weak' | 'Strong';
  graphFilter?: {
    activeGroupId: number | null;
    onToggleGroup: (id: number) => void;
  };
}

export function ConnectivityGroupExplorer({
  groups,
  title,
  description,
  emptyMessage,
  groupLabel,
  groupHint,
  graphFilter,
}: ConnectivityGroupExplorerProps) {
  const setSelectedRepo = useUIStore((s) => s.setSelectedRepo);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [focusedGroupId, setFocusedGroupId] = useState<number | null>(null);

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => b.size - a.size),
    [groups],
  );

  const visibleGroups = useMemo(() => {
    if (focusedGroupId === null) return sortedGroups;
    return sortedGroups.filter((group) => group.id === focusedGroupId);
  }, [focusedGroupId, sortedGroups]);

  const toggleExpand = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleRepoClick = useCallback(
    (repo: string) => {
      setSelectedRepo(repo);
    },
    [setSelectedRepo],
  );

  if (sortedGroups.length === 0) {
    return (
      <div className="cluster-explorer">
        <p className="cluster-explorer__empty">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="cluster-explorer">
      <div className="cluster-explorer__header">
        <h3 className="cluster-explorer__title">
          {title} ({sortedGroups.length})
        </h3>
        <p className="cluster-explorer__description">{description}</p>
      </div>

      {focusedGroupId !== null && (
        <button
          className="cluster-explorer__focus-btn"
          onClick={() => setFocusedGroupId(null)}
          aria-label="Show all groups"
        >
          Show all groups
        </button>
      )}

      <div className="cluster-explorer__list">
        {visibleGroups.map((group) => {
          const isExpanded = expanded.has(group.id);
          const visibleRepos = isExpanded
            ? group.repos
            : group.repos.slice(0, INITIAL_SHOW);
          const hasMore = group.repos.length > INITIAL_SHOW;
          const isGraphFiltered = graphFilter?.activeGroupId === group.id;
          const isFocused = focusedGroupId === group.id;

          return (
            <div
              key={group.id}
              className={`cluster-explorer__cluster ${
                isGraphFiltered ? 'cluster-explorer__cluster--active' : ''
              }`}
            >
              <div className="cluster-explorer__cluster-header">
                <span className="cluster-explorer__cluster-info">
                  <strong>
                    {groupLabel} {group.id} ({groupHint})
                  </strong>{' '}
                  — {group.size} repos
                </span>

                <div className="cluster-explorer__actions">
                  {graphFilter && (
                    <button
                      className="cluster-explorer__filter-btn"
                      onClick={() => graphFilter.onToggleGroup(group.id)}
                      aria-pressed={isGraphFiltered}
                    >
                      {isGraphFiltered ? 'Clear Graph Filter' : 'View in Graph'}
                    </button>
                  )}

                  <button
                    className="cluster-explorer__focus-btn"
                    onClick={() =>
                      setFocusedGroupId(isFocused ? null : group.id)
                    }
                    aria-pressed={isFocused}
                  >
                    {isFocused ? 'Clear Focus' : 'Focus Group'}
                  </button>
                </div>
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
                  onClick={() => toggleExpand(group.id)}
                >
                  {isExpanded
                    ? 'Show less'
                    : `Show ${group.repos.length - INITIAL_SHOW} more…`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
