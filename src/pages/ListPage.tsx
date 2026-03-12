/**
 * ListPage — Searchable, sortable, virtualized repository table.
 *
 * Composes FilterBar and RepoListView. The filter bar persists
 * across views and updates the filter store, which triggers
 * graph filtering via useFilteredGraph.
 */
import { FilterBar } from '@/components/filters/FilterBar';
import { RepoListView } from '@/components/list/RepoListView';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { useFilteredGraph } from '@/hooks/useFilteredGraph';

export default function ListPage() {
  const filterStats = useFilteredGraph();

  return (
    <div className="list-page">
      <div className="list-page__header">
        <FilterBar resultCount={filterStats.visibleNodes} />
        <ExportMenu />
      </div>
      <RepoListView />
    </div>
  );
}
