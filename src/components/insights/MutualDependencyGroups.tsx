/**
 * MutualDependencyGroups — Strongly connected groups from stats.strong_clusters.
 *
 * Strong groups follow dependency direction: every repo in the group can
 * reach every other repo.
 */
import { useDataStore } from '@/store/dataStore';
import { ConnectivityGroupExplorer } from './ConnectivityGroupExplorer';

export function MutualDependencyGroups() {
  const stats = useDataStore((s) => s.stats);

  return (
    <ConnectivityGroupExplorer
      groups={stats?.strong_clusters ?? []}
      title="Mutual Dependency Groups (Strong)"
      description="Strong groups follow dependency direction. Repos in the same group are mutually dependent and should usually be planned together."
      emptyMessage="No mutual dependency group data available."
      groupLabel="Mutual Dependency Group"
      groupHint="Strong"
    />
  );
}
