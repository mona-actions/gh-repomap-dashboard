/**
 * QuickActions — Navigation shortcuts for the dashboard.
 *
 * Links to key views: Dependency Graph, Repo List, and filtered views
 * for critical repos and circular dependencies.
 */
import { Link } from 'react-router-dom';
import {
  GraphIcon,
  ListUnorderedIcon,
  AlertIcon,
  SyncIcon,
} from '@primer/octicons-react';

interface QuickAction {
  label: string;
  description: string;
  to: string;
  icon: React.ElementType;
}

const ACTIONS: QuickAction[] = [
  {
    label: 'View Dependency Graph',
    description: 'Interactive graph visualization',
    to: '/graph',
    icon: GraphIcon,
  },
  {
    label: 'View Repo List',
    description: 'Searchable, sortable table',
    to: '/list',
    icon: ListUnorderedIcon,
  },
  {
    label: 'Critical Repos',
    description: 'Most depended-on repositories',
    to: '/list?q=critical',
    icon: AlertIcon,
  },
  {
    label: 'Circular Dependencies',
    description: 'Dependency cycles to resolve',
    to: '/list?q=circular',
    icon: SyncIcon,
  },
];

export function QuickActions() {
  return (
    <nav className="quick-actions" aria-label="Quick actions">
      {ACTIONS.map((action) => (
        <Link key={action.label} to={action.to} className="quick-action">
          <div className="quick-action__icon">
            <action.icon size={20} />
          </div>
          <div className="quick-action__text">
            <div className="quick-action__label">{action.label}</div>
            <div className="quick-action__desc">{action.description}</div>
          </div>
        </Link>
      ))}
    </nav>
  );
}
