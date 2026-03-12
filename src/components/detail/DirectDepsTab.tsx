/**
 * DirectDepsTab — Lists direct outgoing dependencies for a repo.
 *
 * Each row shows: target repo, DependencyTypeBadge, ConfidenceIndicator,
 * source file, and type-specific detail (version, uses, etc.).
 * Clicking a dependency navigates to that repo's detail panel.
 */
import { useMemo, useCallback } from 'react';
import { DependencyTypeBadge, type DependencyType } from '@/components/shared/DependencyTypeBadge';
import { ConfidenceIndicator } from '@/components/shared/ConfidenceIndicator';
import { EmptyState } from '@/components/shared/EmptyState';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';

export interface DirectDep {
  target: string;
  type: DependencyType;
  confidence: 'high' | 'low';
  sourceFile: string;
  detail: string;
}

interface DirectDepsTabProps {
  repoName: string;
}

/** Extract a human-readable detail string from edge attributes. */
function formatDetail(attrs: Record<string, unknown>): string {
  if (attrs.version) return `v${attrs.version}`;
  if (attrs.uses) return String(attrs.uses);
  if (attrs.image) return String(attrs.image);
  if (attrs.source) return String(attrs.source);
  if (attrs.match) return String(attrs.match);
  if (attrs.url) return String(attrs.url);
  return '';
}

export function DirectDepsTab({ repoName }: DirectDepsTabProps) {
  const setSelectedRepo = useUIStore((s) => s.setSelectedRepo);

  const deps = useMemo(() => {
    const graph = useDataStore.getState().graph;
    if (!graph || !graph.hasNode(repoName)) return [];

    const result: DirectDep[] = [];
    graph.forEachOutEdge(repoName, (_edge, attrs, _source, target) => {
      result.push({
        target,
        type: (attrs.depType as DependencyType) ?? 'package',
        confidence: (attrs.confidence as 'high' | 'low') ?? 'high',
        sourceFile: (attrs.sourceFile as string) ?? '',
        detail: formatDetail(attrs),
      });
    });
    return result.sort((a, b) => a.target.localeCompare(b.target));
  }, [repoName]);

  const handleDepClick = useCallback(
    (target: string) => {
      setSelectedRepo(target);
    },
    [setSelectedRepo],
  );

  if (deps.length === 0) {
    return (
      <EmptyState
        title="No direct dependencies"
        description="This repository has no outgoing dependency edges."
      />
    );
  }

  return (
    <div className="direct-deps-tab">
      <table
        className="direct-deps-tab__table"
        aria-label="Direct dependencies"
      >
        <thead>
          <tr>
            <th scope="col">Repository</th>
            <th scope="col">Type</th>
            <th scope="col">Confidence</th>
            <th scope="col">Source File</th>
            <th scope="col">Detail</th>
          </tr>
        </thead>
        <tbody>
          {deps.map((dep, i) => (
            <tr
              key={`${dep.target}-${dep.type}-${i}`}
              className="direct-deps-tab__row"
            >
              <td>
                <button
                  className="direct-deps-tab__link"
                  onClick={() => handleDepClick(dep.target)}
                  title={`View details for ${dep.target}`}
                >
                  {dep.target}
                </button>
              </td>
              <td>
                <DependencyTypeBadge type={dep.type} />
              </td>
              <td>
                <ConfidenceIndicator confidence={dep.confidence} />
              </td>
              <td>
                <code className="direct-deps-tab__file">{dep.sourceFile}</code>
              </td>
              <td className="direct-deps-tab__detail">{dep.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
