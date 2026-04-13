/**
 * GraphLegend — Shows the visual encoding legend for the graph.
 *
 * Displays org colors, ecosystem edge colors, confidence styles,
 * and node state indicators. Collapsible to save screen space.
 */
import { useState, useMemo } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@primer/octicons-react';
import { useDataStore } from '@/store/dataStore';
import { getOrgColor, ECOSYSTEM_COLORS } from '@/utils/colors';

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
  action: 'Action',
  workflow: 'Workflow',
  docker: 'Docker',
  submodule: 'Submodule',
  terraform: 'Terraform',
  script: 'Script',
  'unknown-package': 'Unknown Pkg',
};

export function GraphLegend() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const allOrgs = useDataStore((s) => s.allOrgs);
  const graph = useDataStore((s) => s.graph);

  // Dynamically discover ecosystems from the graph
  const ecosystems = useMemo(() => {
    if (!graph) return [];
    const ecoSet = new Set<string>();
    graph.forEachEdge((_edge, attrs) => {
      const eco = attrs.ecosystem as string;
      if (eco) ecoSet.add(eco);
    });
    return [...ecoSet].sort();
  }, [graph]);

  return (
    <div className="graph-legend" aria-label="Graph legend">
      <button
        type="button"
        className="graph-legend__toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? 'Expand legend' : 'Collapse legend'}
      >
        <span className="graph-legend__title">Legend</span>
        {isCollapsed ? (
          <ChevronDownIcon size={16} />
        ) : (
          <ChevronUpIcon size={16} />
        )}
      </button>

      {!isCollapsed && (
        <div className="graph-legend__content">
          {/* Org colors */}
          <div className="graph-legend__section">
            <h4 className="graph-legend__section-title">Organizations</h4>
            <ul className="graph-legend__list">
              {allOrgs.slice(0, 10).map((org) => (
                <li key={org} className="graph-legend__item">
                  <span
                    className="graph-legend__dot"
                    style={{ backgroundColor: getOrgColor(org, allOrgs) }}
                    aria-hidden="true"
                  />
                  <span className="graph-legend__label">{org}</span>
                </li>
              ))}
              {allOrgs.length > 10 && (
                <li className="graph-legend__item graph-legend__item--more">
                  +{allOrgs.length - 10} more
                </li>
              )}
            </ul>
          </div>

          {/* Ecosystems */}
          <div className="graph-legend__section">
            <h4 className="graph-legend__section-title">Ecosystems</h4>
            <ul className="graph-legend__list">
              {ecosystems.map((eco) => (
                <li key={eco} className="graph-legend__item">
                  <span
                    className="graph-legend__line"
                    style={{
                      backgroundColor: ECOSYSTEM_COLORS[eco] ?? '#8b949e',
                    }}
                    aria-hidden="true"
                  />
                  <span className="graph-legend__label">
                    {ECOSYSTEM_LABELS[eco] ?? eco}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Confidence */}
          <div className="graph-legend__section">
            <h4 className="graph-legend__section-title">Confidence</h4>
            <ul className="graph-legend__list">
              <li className="graph-legend__item">
                <span
                  className="graph-legend__line graph-legend__line--solid"
                  aria-hidden="true"
                />
                <span className="graph-legend__label">High confidence</span>
              </li>
              <li className="graph-legend__item">
                <span
                  className="graph-legend__line graph-legend__line--dashed"
                  aria-hidden="true"
                />
                <span className="graph-legend__label">Low confidence</span>
              </li>
            </ul>
          </div>

          {/* Node states */}
          <div className="graph-legend__section">
            <h4 className="graph-legend__section-title">Node States</h4>
            <ul className="graph-legend__list">
              <li className="graph-legend__item">
                <span
                  className="graph-legend__node graph-legend__node--phantom"
                  aria-hidden="true"
                />
                <span className="graph-legend__label">Phantom (unscanned)</span>
              </li>
              <li className="graph-legend__item">
                <span
                  className="graph-legend__node graph-legend__node--archived"
                  aria-hidden="true"
                />
                <span className="graph-legend__label">Archived (dimmed)</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
