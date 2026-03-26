/**
 * ClusterExplorer — Repo Groups (Weak) from stats.clusters.
 *
 * Weak groups ignore dependency direction and support graph filtering.
 */
import { useCallback, useMemo } from 'react';
import { ConnectivityGroupExplorer } from './ConnectivityGroupExplorer';
import { useDataStore } from '@/store/dataStore';
import { useFilterStore } from '@/store/filterStore';
import { enrichClusters } from '@/utils/connectivity';

export function ClusterExplorer() {
  const stats = useDataStore((s) => s.stats);
  const setClusterId = useFilterStore((s) => s.setClusterId);
  const activeClusterId = useFilterStore((s) => s.clusterId);

  const enrichedClusters = useMemo(
    () => enrichClusters(stats?.clusters ?? [], useDataStore.getState().graph),
    [stats],
  );

  const handleFilterCluster = useCallback(
    (id: number) => {
      setClusterId(activeClusterId === id ? null : id);
    },
    [setClusterId, activeClusterId],
  );

  return (
    <ConnectivityGroupExplorer
      groups={enrichedClusters}
      title="Repo Groups (Weak)"
      description="Weak groups ignore dependency direction, so they are useful for migration planning and blast-radius sizing."
      emptyMessage="No connected repo group data available."
      groupLabel="Repo Group"
      groupHint="Weak"
      graphFilter={{
        activeGroupId: activeClusterId,
        onToggleGroup: handleFilterCluster,
      }}
    />
  );
}
