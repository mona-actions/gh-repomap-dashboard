/**
 * InsightsPage — Assembles all insight views in a tabbed layout.
 *
 * Sections: Critical Repos, Circular Deps, Orphan Repos,
 * Cluster Explorer, Unresolved Packages.
 */
import { useState } from 'react';
import { CriticalRepos } from '@/components/insights/CriticalRepos';
import { CircularDeps } from '@/components/insights/CircularDeps';
import { OrphanRepos } from '@/components/insights/OrphanRepos';
import { ClusterExplorer } from '@/components/insights/ClusterExplorer';
import { MutualDependencyGroups } from '@/components/insights/MutualDependencyGroups';
import { ConnectivityComparison } from '@/components/insights/ConnectivityComparison';
import { ConnectivityMigrationCohorts } from '@/components/insights/ConnectivityMigrationCohorts';
import { UnresolvedPackages } from '@/components/insights/UnresolvedPackages';

type InsightTab =
  | 'critical'
  | 'circular'
  | 'orphans'
  | 'clusters'
  | 'strongClusters'
  | 'unresolved';

interface TabConfig {
  id: InsightTab;
  label: string;
}

const TABS: TabConfig[] = [
  { id: 'critical', label: 'Critical Repos' },
  { id: 'circular', label: 'Circular Deps' },
  { id: 'orphans', label: 'Orphan Repos' },
  { id: 'clusters', label: 'Repo Groups (Weak)' },
  { id: 'strongClusters', label: 'Repo Groups (Strong)' },
  { id: 'unresolved', label: 'Unresolved Packages' },
];

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<InsightTab>('critical');

  return (
    <div className="insights-page">
      <header className="insights-page__header">
        <h1 className="insights-page__title">Insights</h1>
        <p className="insights-page__subtitle">
          Detailed analytics and health indicators for your dependency graph.
        </p>
      </header>

      {/* Tab bar */}
      <div
        className="insights-page__tabs"
        role="tablist"
        aria-label="Insight sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`insight-panel-${tab.id}`}
            id={`insight-tab-${tab.id}`}
            className={`insights-page__tab ${
              activeTab === tab.id ? 'insights-page__tab--active' : ''
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="insights-page__content">
        <div
          role="tabpanel"
          id={`insight-panel-${activeTab}`}
          aria-labelledby={`insight-tab-${activeTab}`}
        >
          {activeTab === 'critical' && <CriticalRepos />}
          {activeTab === 'circular' && <CircularDeps />}
          {activeTab === 'orphans' && <OrphanRepos />}
          {activeTab === 'clusters' && (
            <>
              <ConnectivityComparison />
              <ClusterExplorer />
            </>
          )}
          {activeTab === 'strongClusters' && (
            <>
              <ConnectivityComparison />
              <ConnectivityMigrationCohorts />
              <MutualDependencyGroups />
            </>
          )}
          {activeTab === 'unresolved' && <UnresolvedPackages />}
        </div>
      </div>
    </div>
  );
}
