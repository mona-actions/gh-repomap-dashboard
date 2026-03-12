/**
 * EcosystemBadge — Small colored badge showing an ecosystem name.
 *
 * Used in the list view to show which ecosystems a repo's dependencies
 * belong to (npm, action, workflow, docker, etc.).
 */

const ECOSYSTEM_LABELS: Record<string, string> = {
  npm: 'npm',
  go: 'Go',
  maven: 'Maven',
  pip: 'pip',
  pypi: 'PyPI',
  nuget: 'NuGet',
  rubygems: 'RubyGems',
  cargo: 'Cargo',
  action: 'Action',
  workflow: 'Workflow',
  docker: 'Docker',
  submodule: 'Submodule',
  terraform: 'Terraform',
  script: 'Script',
  'unknown-package': 'Unknown',
};

const ECOSYSTEM_BADGE_COLORS: Record<string, string> = {
  npm: '#cb3837',
  go: '#00add8',
  maven: '#c71a36',
  pip: '#3776ab',
  action: '#2088ff',
  workflow: '#9333ea',
  docker: '#2496ed',
  submodule: '#f97316',
  terraform: '#7b42bc',
  script: '#6b7280',
  'unknown-package': '#8b949e',
};

interface EcosystemBadgeProps {
  ecosystem: string;
}

export function EcosystemBadge({ ecosystem }: EcosystemBadgeProps) {
  const label = ECOSYSTEM_LABELS[ecosystem] ?? ecosystem;
  const color = ECOSYSTEM_BADGE_COLORS[ecosystem] ?? '#8b949e';

  return (
    <span
      className="ecosystem-badge"
      style={{
        display: 'inline-block',
        padding: '1px 6px',
        fontSize: '11px',
        fontWeight: 600,
        color: '#fff',
        backgroundColor: color,
        borderRadius: '12px',
        lineHeight: '1.4',
      }}
    >
      {label}
    </span>
  );
}
