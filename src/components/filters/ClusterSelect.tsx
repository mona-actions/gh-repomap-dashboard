/**
 * ClusterSelect — Dropdown to select a connected repo group (weak).
 *
 * Shows group size and provides an "All connected repo groups" option.
 * Updates filterStore.clusterId.
 */
import { useMemo } from 'react';
import { useFilterStore } from '@/store/filterStore';
import { useDataStore } from '@/store/dataStore';
import { enrichClusters } from '@/utils/connectivity';

export function ClusterSelect() {
  const clusterId = useFilterStore((s) => s.clusterId);
  const setClusterId = useFilterStore((s) => s.setClusterId);
  const stats = useDataStore((s) => s.stats);

  const clusters = stats?.clusters ?? [];

  const enriched = useMemo(
    () => enrichClusters(clusters, useDataStore.getState().graph),
    [clusters],
  );

  if (clusters.length === 0) return null;

  return (
    <div className="cluster-select">
      <h4 className="filter-section__title">Repo Group (Weak)</h4>
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
        {enriched.map((c, idx) => (
          <option key={c.id ?? idx} value={c.id ?? idx}>
            Repo Group {c.id ?? idx + 1} ({c.scannedCount} scanned
            {c.externalCount > 0 ? `, ${c.size} total` : ''})
          </option>
        ))}
      </select>
    </div>
  );
}
