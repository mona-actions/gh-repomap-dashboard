/**
 * DashboardPage — Overview of the scanned dependency graph.
 *
 * Assembles StatsCards, ScanMetadataBar, DepTypeChart,
 * CriticalReposPreview, and QuickActions in a responsive grid layout.
 */
import { useDataStore } from '@/store/dataStore';
import { FilterBar } from '@/components/filters/FilterBar';
import {
  StatsCards,
  ScanMetadataBar,
  DepTypeChart,
  CriticalReposPreview,
  QuickActions,
} from '@/components/dashboard';

export default function DashboardPage() {
  const metadata = useDataStore((s) => s.metadata);
  const stats = useDataStore((s) => s.stats);
  const nodeCount = useDataStore((s) => s.nodeCount);
  const edgeCount = useDataStore((s) => s.edgeCount);

  return (
    <div className="dashboard-page">
      <FilterBar />

      <div className="dashboard-page__content">
        {/* Scan context bar */}
        <ScanMetadataBar metadata={metadata} />

        {/* Stats overview */}
        <section aria-labelledby="dashboard-stats-heading">
          <h2 id="dashboard-stats-heading" className="dashboard-section__title">
            Overview
          </h2>
          <StatsCards
            metadata={metadata}
            stats={stats}
            nodeCount={nodeCount}
            edgeCount={edgeCount}
          />
        </section>

        {/* Two-column layout for chart + critical repos */}
        <div className="dashboard-page__grid">
          <section aria-labelledby="dashboard-dep-types-heading">
            <h2
              id="dashboard-dep-types-heading"
              className="dashboard-section__title"
            >
              Dependency Types
            </h2>
            <DepTypeChart typeCounts={stats?.dependency_type_counts ?? {}} />
          </section>

          <section aria-labelledby="dashboard-critical-heading">
            <h2
              id="dashboard-critical-heading"
              className="dashboard-section__title"
            >
              Critical Repos
            </h2>
            <CriticalReposPreview stats={stats} />
          </section>
        </div>

        {/* Quick actions */}
        <section aria-labelledby="dashboard-actions-heading">
          <h2
            id="dashboard-actions-heading"
            className="dashboard-section__title"
          >
            Quick Actions
          </h2>
          <QuickActions />
        </section>
      </div>
    </div>
  );
}
