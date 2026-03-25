/**
 * ClusterExplorer — Connected Repo Groups (Weak) from stats.clusters.
 *
 * Weak groups ignore dependency direction and support graph filtering.
 */
import { useCallback } from 'react';
import { ConnectivityGroupExplorer } from './ConnectivityGroupExplorer';
import { useDataStore } from '@/store/dataStore';
import { useFilterStore } from '@/store/filterStore';

export function ClusterExplorer() {
  const stats = useDataStore((s) => s.stats);
  const setClusterId = useFilterStore((s) => s.setClusterId);
  const activeClusterId = useFilterStore((s) => s.clusterId);

  const handleFilterCluster = useCallback(
    (id: number) => {
      setClusterId(activeClusterId === id ? null : id);
    },
    [setClusterId, activeClusterId],
  );

  return (
    <ConnectivityGroupExplorer
      groups={stats?.clusters ?? []}
      title="Connected Repo Groups (Weak)"
      description="Weak groups ignore dependency direction, so they are useful for migration planning and blast-radius sizing."
      emptyMessage="No connected repo group data available."
      groupLabel="Connected Repo Group"
      groupHint="Weak"
      graphFilter={{
        activeGroupId: activeClusterId,
        onToggleGroup: handleFilterCluster,
      }}
    />
  );
}
