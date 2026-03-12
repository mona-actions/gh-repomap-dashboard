/**
 * EcosystemToggles — Toggle chips for filtering by ecosystem.
 *
 * Every edge has an `ecosystem` attribute:
 * - Package deps: the actual ecosystem (npm, go, maven, pip, etc.)
 * - Non-package deps: the dep type itself (action, workflow, docker, etc.)
 * - Unknown packages: "unknown-package"
 *
 * Dynamically discovers available ecosystems from the graph.
 */
import { useMemo } from 'react';
import { useFilterStore } from '@/store/filterStore';
import { useDataStore } from '@/store/dataStore';

const ECOSYSTEM_COLORS: Record<string, string> = {
  // Package ecosystems
  npm: '#cb3837',
  go: '#00add8',
  maven: '#c71a36',
  pip: '#3776ab',
  pypi: '#3776ab',
  nuget: '#004880',
  rubygems: '#cc342d',
  cargo: '#dea584',
  composer: '#885630',
  swift: '#f05138',
  cocoapods: '#ee3322',
  gradle: '#02303a',
  hex: '#6e4a7e',
  // Dep types used as ecosystems for non-package deps
  action: '#2088ff',
  workflow: '#9333ea',
  docker: '#2496ed',
  submodule: '#f97316',
  terraform: '#7b42bc',
  script: '#6b7280',
  'unknown-package': '#8b949e',
};

const ECOSYSTEM_LABELS: Record<string, string> = {
  npm: 'npm',
  go: 'Go',
  maven: 'Maven',
  pip: 'pip',
  pypi: 'PyPI',
  nuget: 'NuGet',
  rubygems: 'RubyGems',
  cargo: 'Cargo',
  composer: 'Composer',
  swift: 'Swift',
  cocoapods: 'CocoaPods',
  gradle: 'Gradle',
  hex: 'Hex',
  action: 'Action',
  workflow: 'Workflow',
  docker: 'Docker',
  submodule: 'Submodule',
  terraform: 'Terraform',
  script: 'Script',
  'unknown-package': 'Unknown Pkg',
};

function getEcosystemColor(ecosystem: string): string {
  return ECOSYSTEM_COLORS[ecosystem.toLowerCase()] ?? '#8b949e';
}

function getEcosystemLabel(ecosystem: string): string {
  return ECOSYSTEM_LABELS[ecosystem] ?? ecosystem;
}

export function EcosystemToggles() {
  const ecosystems = useFilterStore((s) => s.ecosystems);
  const toggleEcosystem = useFilterStore((s) => s.toggleEcosystem);
  const graph = useDataStore((s) => s.graph);

  // Discover ecosystems and their edge counts from the graph
  const availableEcosystems = useMemo(() => {
    if (!graph) return [];
    const countMap = new Map<string, number>();
    graph.forEachEdge((_edge, attrs) => {
      const eco = attrs.ecosystem as string;
      if (eco) countMap.set(eco, (countMap.get(eco) ?? 0) + 1);
    });
    // Sort by count descending so the most common ecosystems appear first
    return [...countMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([eco, count]) => ({ eco, count }));
  }, [graph]);

  if (availableEcosystems.length === 0) return null;

  return (
    <div
      className="dep-type-toggles"
      role="group"
      aria-label="Filter by ecosystem"
    >
      <h4 className="filter-section__title">Ecosystem</h4>
      <div className="dep-type-toggles__chips">
        {availableEcosystems.map(({ eco, count }) => {
          const isActive = ecosystems.length === 0 || ecosystems.includes(eco);
          const color = getEcosystemColor(eco);

          return (
            <button
              key={eco}
              type="button"
              className={`dep-type-toggles__chip ${isActive ? 'dep-type-toggles__chip--active' : ''}`}
              onClick={() => toggleEcosystem(eco)}
              aria-pressed={ecosystems.includes(eco)}
              title={`${getEcosystemLabel(eco)}: ${count} edges`}
              style={
                ecosystems.includes(eco)
                  ? { backgroundColor: color, borderColor: color, color: '#fff' }
                  : { borderColor: color, color }
              }
            >
              {getEcosystemLabel(eco)} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
}
