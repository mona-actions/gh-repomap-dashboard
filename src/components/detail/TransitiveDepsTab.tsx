/**
 * TransitiveDepsTab — Lazy-loaded transitive dependencies for a repo.
 *
 * Loads transitive dependency data from the graph node attributes
 * only when the tab is activated. Groups dependencies by depth level.
 */
import { useEffect, useMemo, useCallback, useReducer } from 'react';
import { Spinner } from '@primer/react';
import {
  DependencyTypeBadge,
  type DependencyType,
} from '@/components/shared/DependencyTypeBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';

export interface TransitiveDep {
  repo: string;
  via: string[];
  type: DependencyType;
  depth: number;
}

interface TransitiveDepsTabProps {
  repoName: string;
}

type State = { loading: boolean; deps: TransitiveDep[] };
type Action =
  | { type: 'startLoading' }
  | { type: 'loaded'; deps: TransitiveDep[] };

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case 'startLoading':
      return { loading: true, deps: [] };
    case 'loaded':
      return { loading: false, deps: action.deps };
  }
}

export function TransitiveDepsTab({ repoName }: TransitiveDepsTabProps) {
  const [state, dispatch] = useReducer(reducer, { loading: true, deps: [] });
  const setSelectedRepo = useUIStore((s) => s.setSelectedRepo);

  // Lazy load: use a microtask to defer loading and show the spinner
  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'startLoading' });

    const timer = setTimeout(() => {
      const graph = useDataStore.getState().graph;
      if (!graph || !graph.hasNode(repoName)) {
        if (!cancelled) dispatch({ type: 'loaded', deps: [] });
        return;
      }

      const attrs = graph.getNodeAttributes(repoName);
      const transitive = (attrs.transitive as TransitiveDep[]) ?? [];
      if (!cancelled) dispatch({ type: 'loaded', deps: transitive });
    }, 50);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [repoName]);

  // Group by depth
  const grouped = useMemo(() => {
    const groups = new Map<number, TransitiveDep[]>();
    for (const dep of state.deps) {
      const depth = dep.depth ?? 2;
      if (!groups.has(depth)) groups.set(depth, []);
      groups.get(depth)!.push(dep);
    }
    return [...groups.entries()].sort(([a], [b]) => a - b);
  }, [state.deps]);

  const handleRepoClick = useCallback(
    (repo: string) => {
      setSelectedRepo(repo);
    },
    [setSelectedRepo],
  );

  if (state.loading) {
    return (
      <div
        className="transitive-deps-tab__loading"
        role="status"
        aria-label="Loading transitive dependencies"
      >
        <Spinner size="medium" />
        <p>Loading transitive dependencies…</p>
      </div>
    );
  }

  if (state.deps.length === 0) {
    return (
      <EmptyState
        title="No transitive dependencies"
        description="This repository has no transitive dependency chains."
      />
    );
  }

  return (
    <div className="transitive-deps-tab">
      {grouped.map(([depth, items]) => (
        <section key={depth} className="transitive-deps-tab__group">
          <h3 className="transitive-deps-tab__group-title">
            Depth {depth} ({items.length})
          </h3>
          <table
            className="transitive-deps-tab__table"
            aria-label={`Transitive dependencies at depth ${depth}`}
          >
            <thead>
              <tr>
                <th scope="col">Repository</th>
                <th scope="col">Type</th>
                <th scope="col">Via</th>
              </tr>
            </thead>
            <tbody>
              {items.map((dep, i) => (
                <tr key={`${dep.repo}-${i}`}>
                  <td>
                    <button
                      className="transitive-deps-tab__link"
                      onClick={() => handleRepoClick(dep.repo)}
                      title={`View details for ${dep.repo}`}
                    >
                      {dep.repo}
                    </button>
                  </td>
                  <td>
                    <DependencyTypeBadge type={dep.type} />
                  </td>
                  <td className="transitive-deps-tab__via">
                    {dep.via.length > 0 ? dep.via.join(' → ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
