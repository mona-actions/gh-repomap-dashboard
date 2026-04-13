/**
 * RepoListView — Virtualized list of repositories.
 *
 * Uses @tanstack/react-virtual for efficient rendering of large datasets.
 * Built with div-based flex rows instead of `<table>` to avoid the
 * position:absolute vs table-layout conflict in virtualized rendering.
 *
 * Supports sorting via SortableHeader and keyboard navigation.
 */
import { useRef, useMemo, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SortableHeader, type SortConfig } from './SortableHeader';
import { RepoRow, type RepoRowData } from './RepoRow';
import type { DependencyType } from '@/components/shared/DependencyTypeBadge';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';
import { useFilterStore } from '@/store/filterStore';

const ROW_HEIGHT = 48;

/** Column widths as percentages — shared by header and rows. */
export const COLUMN_WIDTHS = {
  name: '30%',
  org: '15%',
  directDeps: '12%',
  dependents: '12%',
  types: '20%',
  status: '11%',
} as const;

/** Extract repo data from the Graphology graph for table display. */
function extractRepoRows(): RepoRowData[] {
  const graph = useDataStore.getState().graph;
  if (!graph) return [];

  const rows: RepoRowData[] = [];

  graph.forEachNode((node, attrs) => {
    if (attrs.hidden) return;

    const org = (attrs.org as string) || '';
    const name = node.includes('/') ? node.split('/').slice(1).join('/') : node;

    const directDeps = graph.outDegree(node);
    const dependents = graph.inDegree(node);

    const typeSet = new Set<DependencyType>();
    const ecoSet = new Set<string>();
    graph.forEachOutEdge(node, (_edge, edgeAttrs) => {
      if (edgeAttrs.depType) {
        typeSet.add(edgeAttrs.depType as DependencyType);
      }
      if (edgeAttrs.ecosystem) {
        ecoSet.add(edgeAttrs.ecosystem as string);
      }
    });

    rows.push({
      id: node,
      org,
      name,
      directDeps,
      dependents,
      depTypes: [...typeSet].sort(),
      ecosystems: [...ecoSet].sort(),
      archived: Boolean(attrs.archived),
    });
  });

  return rows;
}

function compareValues(
  a: RepoRowData,
  b: RepoRowData,
  column: string,
  direction: 'ascending' | 'descending',
): number {
  let cmp = 0;

  switch (column) {
    case 'name':
      cmp = a.id.localeCompare(b.id);
      break;
    case 'org':
      cmp = a.org.localeCompare(b.org);
      break;
    case 'directDeps':
      cmp = a.directDeps - b.directDeps;
      break;
    case 'dependents':
      cmp = a.dependents - b.dependents;
      break;
    case 'types':
      cmp = a.depTypes.length - b.depTypes.length;
      break;
    case 'status':
      cmp = Number(a.archived) - Number(b.archived);
      break;
    default:
      cmp = 0;
  }

  return direction === 'descending' ? -cmp : cmp;
}

export function RepoListView() {
  const parentRef = useRef<HTMLDivElement>(null);
  const allOrgs = useDataStore((s) => s.allOrgs);
  const selectedRepo = useUIStore((s) => s.selectedRepo);
  const setSelectedRepo = useUIStore((s) => s.setSelectedRepo);

  const searchQuery = useFilterStore((s) => s.searchQuery);
  const selectedOrgs = useFilterStore((s) => s.selectedOrgs);
  const showArchived = useFilterStore((s) => s.showArchived);

  const [sort, setSort] = useState<SortConfig>({
    column: 'name',
    direction: 'ascending',
  });

  const handleSort = useCallback((column: string) => {
    setSort((prev) => {
      if (prev.column === column) {
        return {
          column,
          direction:
            prev.direction === 'ascending' ? 'descending' : 'ascending',
        };
      }
      return { column, direction: 'ascending' };
    });
  }, []);

  const handleRowClick = useCallback(
    (repoId: string) => {
      setSelectedRepo(repoId === selectedRepo ? null : repoId);
    },
    [selectedRepo, setSelectedRepo],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(
    () => extractRepoRows(),
    [searchQuery, selectedOrgs, showArchived],
  );

  const sortedRows = useMemo(() => {
    if (sort.direction === 'none') return rows;
    return [...rows].sort((a, b) =>
      compareValues(
        a,
        b,
        sort.column,
        sort.direction as 'ascending' | 'descending',
      ),
    );
  }, [rows, sort]);

  const virtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (sortedRows.length === 0) {
    return (
      <div className="repo-list-empty" role="status">
        <p style={{ color: 'var(--fgColor-muted, #636c76)', padding: '24px' }}>
          No repositories match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="repo-list-view">
      <div
        ref={parentRef}
        className="repo-list-view__scroll"
        style={{ overflow: 'auto', maxHeight: 'calc(100vh - 180px)' }}
      >
        {/* Flex-based header row */}
        <div className="repo-list-view__header" role="row" aria-rowindex={1}>
          <SortableHeader
            column="name"
            label="Repository"
            sort={sort}
            onSort={handleSort}
            width={COLUMN_WIDTHS.name}
          />
          <SortableHeader
            column="org"
            label="Org"
            sort={sort}
            onSort={handleSort}
            width={COLUMN_WIDTHS.org}
          />
          <SortableHeader
            column="directDeps"
            label="Direct Deps"
            sort={sort}
            onSort={handleSort}
            width={COLUMN_WIDTHS.directDeps}
          />
          <SortableHeader
            column="dependents"
            label="Dependents"
            sort={sort}
            onSort={handleSort}
            width={COLUMN_WIDTHS.dependents}
          />
          <SortableHeader
            column="types"
            label="Types"
            sort={sort}
            onSort={handleSort}
            width={COLUMN_WIDTHS.types}
          />
          <SortableHeader
            column="status"
            label="Status"
            sort={sort}
            onSort={handleSort}
            width={COLUMN_WIDTHS.status}
          />
        </div>

        {/* Virtualized rows */}
        <div
          role="grid"
          aria-rowcount={sortedRows.length + 1}
          aria-label="Repository list"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => {
            const repo = sortedRows[virtualRow.index];
            return (
              <RepoRow
                key={repo.id}
                repo={repo}
                allOrgs={allOrgs}
                isSelected={selectedRepo === repo.id}
                rowIndex={virtualRow.index + 2}
                onClick={handleRowClick}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              />
            );
          })}
        </div>
      </div>
      <div className="repo-list-view__footer" role="status" aria-live="polite">
        Showing {sortedRows.length} repositories
      </div>
    </div>
  );
}
