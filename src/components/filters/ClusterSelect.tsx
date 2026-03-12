/**
 * ClusterSelect — Dropdown to select a connected component cluster.
 *
 * Shows cluster size and provides an "All clusters" option.
 * Updates filterStore.clusterId.
 */
import { useFilterStore } from '@/store/filterStore';
import { useDataStore } from '@/store/dataStore';

export function ClusterSelect() {
  const clusterId = useFilterStore((s) => s.clusterId);
  const setClusterId = useFilterStore((s) => s.setClusterId);
  const stats = useDataStore((s) => s.stats);

  const clusters = stats?.clusters ?? [];

  if (clusters.length === 0) return null;

  return (
    <div className="cluster-select">
      <h4 className="filter-section__title">Cluster</h4>
      <select
        className="cluster-select__dropdown"
        value={clusterId ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          setClusterId(val === '' ? null : parseInt(val, 10));
        }}
        aria-label="Select cluster"
      >
        <option value="">All clusters</option>
        {clusters.map(
          (
            cluster: { id: number; size: number; repos?: string[] },
            idx: number,
          ) => (
            <option key={cluster.id ?? idx} value={cluster.id ?? idx}>
              Cluster {cluster.id ?? idx + 1} ({cluster.size} repos)
            </option>
          ),
        )}
      </select>
    </div>
  );
}