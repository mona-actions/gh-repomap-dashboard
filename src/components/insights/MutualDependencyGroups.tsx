/**
 * MutualDependencyGroups — Strongly connected groups from stats.strong_clusters.
 *
 * Strong groups follow dependency direction: every repo in the group can
 * reach every other repo.
 */
import { useMemo } from 'react';
import { useDataStore } from '@/store/dataStore';
import { ConnectivityGroupExplorer } from './ConnectivityGroupExplorer';
import { enrichClusters } from '@/utils/connectivity';

export function MutualDependencyGroups() {
  const stats = useDataStore((s) => s.stats);

  const enrichedClusters = useMemo(
    () =>
      enrichClusters(
        stats?.strong_clusters ?? [],
        useDataStore.getState().graph,
      ),
    [stats],
  );

  return (
    <ConnectivityGroupExplorer
      groups={enrichedClusters}
      title="Repo Groups (Strong)"
      description="Strong groups follow dependency direction. Repos in the same group are mutually dependent and should usually be planned together."
      emptyMessage="No mutual dependency group data available."
      groupLabel="Repo Group"
      groupHint="Strong"
    />
  );
}
