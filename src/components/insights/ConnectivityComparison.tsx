import { useMemo } from 'react';
import { useDataStore } from '@/store/dataStore';
import { enrichClusters } from '@/utils/connectivity';

export function ConnectivityComparison() {
  const stats = useDataStore((s) => s.stats);

  const summary = useMemo(() => {
    const graph = useDataStore.getState().graph;
    const weakRaw = stats?.clusters ?? [];
    const strongRaw = stats?.strong_clusters ?? [];
    const weak = enrichClusters(weakRaw, graph);
    const strong = enrichClusters(strongRaw, graph);

    const largestWeak = weak.reduce(
      (max, g) => (g.scannedCount > max.scannedCount ? g : max),
      weak[0],
    );
    const largestStrong = strong.reduce(
      (max, g) => (g.scannedCount > max.scannedCount ? g : max),
      strong[0],
    );
    const strongMultiRepo = strong.filter((g) => g.size > 1).length;

    return {
      weakCount: weak.length,
      largestWeakScanned: largestWeak?.scannedCount ?? 0,
      largestWeakTotal: largestWeak?.size ?? 0,
      strongCount: strong.length,
      largestStrongScanned: largestStrong?.scannedCount ?? 0,
      largestStrongTotal: largestStrong?.size ?? 0,
      strongMultiRepo,
    };
  }, [stats]);

  return (
    <section
      className="connectivity-summary"
      aria-labelledby="connectivity-summary-title"
    >
      <h3
        id="connectivity-summary-title"
        className="connectivity-summary__title"
      >
        Connectivity Group Comparison
      </h3>
      <p className="connectivity-summary__description">
        Weak groups show repos that are connected in any direction. Strong
        groups show repos with mutual dependency paths in directed flow.
      </p>

      <div className="connectivity-summary__example">
        <p>
          <strong>Example:</strong> if <em>A depends on B</em> and{' '}
          <em>B depends on C</em> and <em>C depends on B</em> — weak grouping
          places A, B, and C together (any connection counts), while strong
          grouping yields only {'{'}
          <em>B, C</em>
          {'}'} as a group (they depend on each other), and A stays separate
          (nothing depends back on A).
        </p>
      </div>

      <div className="connectivity-summary__cards">
        <article
          className="connectivity-summary__card"
          aria-label="Repo Groups (Weak) summary"
        >
          <h4>Repo Groups (Weak)</h4>
          <p>Groups: {summary.weakCount}</p>
          <p>
            Largest group: {summary.largestWeakScanned} scanned
            {summary.largestWeakTotal > summary.largestWeakScanned
              ? ` (${summary.largestWeakTotal} total)`
              : ''}
          </p>
        </article>

        <article
          className="connectivity-summary__card"
          aria-label="Repo Groups (Strong) summary"
        >
          <h4>Repo Groups (Strong)</h4>
          <p>Groups: {summary.strongCount}</p>
          <p>
            Largest group: {summary.largestStrongScanned} scanned
            {summary.largestStrongTotal > summary.largestStrongScanned
              ? ` (${summary.largestStrongTotal} total)`
              : ''}
          </p>
          <p>Groups with 2+ repos: {summary.strongMultiRepo}</p>
        </article>
      </div>
    </section>
  );
}
