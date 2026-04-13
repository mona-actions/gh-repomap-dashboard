/**
 * DependentsTab — Lists repos that depend on the selected repo.
 *
 * Uses Graphology's `inNeighbors()` to find reverse dependencies.
 * Shows the edge type and source file for each dependent.
 */
import { useMemo, useCallback } from 'react';
import {
  DependencyTypeBadge,
  type DependencyType,
} from '@/components/shared/DependencyTypeBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';

export interface Dependent {
  repo: string;
  type: DependencyType;
  sourceFile: string;
}

interface DependentsTabProps {
  repoName: string;
}

export function DependentsTab({ repoName }: DependentsTabProps) {
  const setSelectedRepo = useUIStore((s) => s.setSelectedRepo);

  const dependents = useMemo(() => {
    const graph = useDataStore.getState().graph;
    if (!graph || !graph.hasNode(repoName)) return [];

    const result: Dependent[] = [];
    graph.forEachInEdge(repoName, (_edge, attrs, source) => {
      result.push({
        repo: source,
        type: (attrs.depType as DependencyType) ?? 'package',
        sourceFile: (attrs.sourceFile as string) ?? '',
      });
    });

    // Deduplicate by repo name, keeping the first occurrence
    const seen = new Set<string>();
    return result
      .filter((d) => {
        if (seen.has(d.repo)) return false;
        seen.add(d.repo);
        return true;
      })
      .sort((a, b) => a.repo.localeCompare(b.repo));
  }, [repoName]);

  const handleRepoClick = useCallback(
    (repo: string) => {
      setSelectedRepo(repo);
    },
    [setSelectedRepo],
  );

  if (dependents.length === 0) {
    return (
      <EmptyState
        title="No dependents"
        description="No other repositories depend on this one."
      />
    );
  }

  return (
    <div className="dependents-tab">
      <table className="dependents-tab__table" aria-label="Dependents">
        <thead>
          <tr>
            <th scope="col">Repository</th>
            <th scope="col">Type</th>
            <th scope="col">Source File</th>
          </tr>
        </thead>
        <tbody>
          {dependents.map((dep) => (
            <tr key={dep.repo} className="dependents-tab__row">
              <td>
                <button
                  className="dependents-tab__link"
                  onClick={() => handleRepoClick(dep.repo)}
                  title={`View details for ${dep.repo}`}
                >
                  {dep.repo}
                </button>
              </td>
              <td>
                <DependencyTypeBadge type={dep.type} />
              </td>
              <td>
                <code>{dep.sourceFile}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
