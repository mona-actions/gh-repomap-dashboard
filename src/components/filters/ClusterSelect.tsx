/**
 * ClusterSelect — Dropdown to select a connected repo group (weak).
 *
 * Shows group size and provides an "All connected repo groups" option.
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
      <h4 className="filter-section__title">Connected Repo Group (Weak)</h4>
      <p
        className="cluster-select__help"
        title="Weak groups ignore dependency direction and may include external or unscanned repos."
      >
        Ignores dependency direction; may include external/unscanned repos.
      </p>
      <select
        className="cluster-select__dropdown"
        value={clusterId ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          setClusterId(val === '' ? null : parseInt(val, 10));
        }}
        aria-label="Select connected repo group"
      >
        <option value="">All connected repo groups</option>
        {clusters.map(
          (
            cluster: { id: number; size: number; repos?: string[] },
            idx: number,
          ) => (
            <option key={cluster.id ?? idx} value={cluster.id ?? idx}>
              Connected Repo Group {cluster.id ?? idx + 1} ({cluster.size} repos)
            </option>
          ),
        )}
      </select>
    </div>
  );
}