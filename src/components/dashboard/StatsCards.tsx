/**
 * StatsCards — Grid of summary statistics for the dashboard.
 *
 * Displays 6 cards: Total Repos, Total Edges, Orgs Scanned,
 * Scan Coverage (%), Orphan Repos, and Circular Dependencies.
 *
 * Each card is an `<article>` for accessibility and uses Primer CSS
 * variables for theming.
 */
import {
  RepoIcon,
  GitBranchIcon,
  OrganizationIcon,
  ShieldCheckIcon,
  AlertIcon,
  SyncIcon,
} from '@primer/octicons-react';
import type { OutputData } from '@/schemas/repomap';

interface StatsCardsProps {
  metadata: OutputData['metadata'] | null;
  stats: OutputData['stats'] | null;
  nodeCount: number;
  edgeCount: number;
}

interface CardData {
  label: string;
  value: string | number;
  icon: React.ElementType;
}

function formatPercent(scanned: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((scanned / total) * 100)}%`;
}

export function StatsCards({
  metadata,
  stats,
  nodeCount,
  edgeCount,
}: StatsCardsProps) {
  const cards: CardData[] = [
    {
      label: 'Total Repos',
      value: nodeCount,
      icon: RepoIcon,
    },
    {
      label: 'Total Edges',
      value: edgeCount,
      icon: GitBranchIcon,
    },
    {
      label: 'Orgs Scanned',
      value: metadata?.orgs_scanned?.length ?? 0,
      icon: OrganizationIcon,
    },
    {
      label: 'Scan Coverage',
      value: formatPercent(
        metadata?.total_repos_scanned ?? 0,
        metadata?.total_repos ?? 0,
      ),
      icon: ShieldCheckIcon,
    },
    {
      label: 'Orphan Repos',
      value: stats?.orphan_repos?.length ?? 0,
      icon: AlertIcon,
    },
    {
      label: 'Circular Deps',
      value: stats?.circular_deps?.length ?? 0,
      icon: SyncIcon,
    },
  ];

  return (
    <div className="stats-cards" role="region" aria-label="Summary statistics">
      {cards.map((card) => (
        <article key={card.label} className="stats-card">
          <div className="stats-card__icon">
            <card.icon size={20} />
          </div>
          <div className="stats-card__value">{card.value}</div>
          <div className="stats-card__label">{card.label}</div>
        </article>
      ))}
    </div>
  );
}
