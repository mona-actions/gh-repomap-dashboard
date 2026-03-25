import { useMemo } from 'react';
import { useDataStore } from '@/store/dataStore';

export function ConnectivityComparison() {
  const stats = useDataStore((s) => s.stats);

  const summary = useMemo(() => {
    const weak = stats?.clusters ?? [];
    const strong = stats?.strong_clusters ?? [];

    const largestWeak = weak.reduce((max, group) => Math.max(max, group.size), 0);
    const largestStrong = strong.reduce(
      (max, group) => Math.max(max, group.size),
      0,
    );
    const strongMultiRepo = strong.filter((group) => group.size > 1).length;

    return {
      weakCount: weak.length,
      largestWeak,
      strongCount: strong.length,
      largestStrong,
      strongMultiRepo,
    };
  }, [stats]);

  return (
    <section className="connectivity-summary" aria-labelledby="connectivity-summary-title">
      <h3 id="connectivity-summary-title" className="connectivity-summary__title">
        Connectivity Group Comparison
      </h3>
      <p className="connectivity-summary__description">
        Weak groups show repos that are connected in any direction. Strong groups show repos with mutual dependency paths in directed flow.
      </p>

      <div className="connectivity-summary__cards">
        <article className="connectivity-summary__card" aria-label="Connected Repo Groups summary">
          <h4>Connected Repo Groups (Weak)</h4>
          <p>Groups: {summary.weakCount}</p>
          <p>Largest group: {summary.largestWeak} repos</p>
        </article>

        <article className="connectivity-summary__card" aria-label="Mutual Dependency Groups summary">
          <h4>Mutual Dependency Groups (Strong)</h4>
          <p>Groups: {summary.strongCount}</p>
          <p>Largest group: {summary.largestStrong} repos</p>
          <p>Groups with 2+ repos: {summary.strongMultiRepo}</p>
        </article>
      </div>
    </section>
  );
}
