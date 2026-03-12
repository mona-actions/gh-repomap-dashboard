/**
 * RepoRow — Single row in the repo list.
 *
 * Uses div-based flex layout (not <tr>/<td>) so virtualized
 * absolute positioning works without breaking column alignment.
 */
import { type DependencyType } from '@/components/shared/DependencyTypeBadge';
import { EcosystemBadge } from '@/components/shared/EcosystemBadge';
import { getOrgColor } from '@/utils/colors';
import { COLUMN_WIDTHS } from './RepoListView';

export interface RepoRowData {
  /** Full repo identifier: org/name */
  id: string;
  /** Organization name */
  org: string;
  /** Repository name without org prefix */
  name: string;
  /** Number of direct outbound dependencies */
  directDeps: number;
  /** Number of repos that depend on this one */
  dependents: number;
  /** Set of dependency types used */
  depTypes: DependencyType[];
  /** Set of ecosystems used (npm, action, workflow, etc.) */
  ecosystems: string[];
  /** Whether the repo is archived */
  archived: boolean;
}

interface RepoRowProps {
  repo: RepoRowData;
  allOrgs: string[];
  isSelected: boolean;
  rowIndex: number;
  onClick: (repoId: string) => void;
  style?: React.CSSProperties;
}

export function RepoRow({
  repo,
  allOrgs,
  isSelected,
  rowIndex,
  onClick,
  style,
}: RepoRowProps) {
  const orgColor = getOrgColor(repo.org, allOrgs);

  const handleClick = () => {
    onClick(repo.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(repo.id);
    }
  };

  return (
    <div
      className={`repo-row ${isSelected ? 'repo-row--selected' : ''}`}
      role="row"
      aria-rowindex={rowIndex}
      aria-selected={isSelected}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-testid={`repo-row-${repo.id}`}
      style={style}
    >
      <div className="repo-row__cell repo-row__name" style={{ width: COLUMN_WIDTHS.name }}>
        <code>{repo.id}</code>
      </div>
      <div className="repo-row__cell repo-row__org" style={{ width: COLUMN_WIDTHS.org }}>
        <span
          className="repo-row__org-dot"
          style={{ backgroundColor: orgColor }}
          aria-hidden="true"
        />
        {repo.org}
      </div>
      <div className="repo-row__cell repo-row__deps" style={{ width: COLUMN_WIDTHS.directDeps }}>
        {repo.directDeps}
      </div>
      <div className="repo-row__cell repo-row__dependents" style={{ width: COLUMN_WIDTHS.dependents }}>
        {repo.dependents}
      </div>
      <div className="repo-row__cell repo-row__types" style={{ width: COLUMN_WIDTHS.types }}>
        {repo.ecosystems.map((eco) => (
          <EcosystemBadge key={eco} ecosystem={eco} />
        ))}
      </div>
      <div className="repo-row__cell repo-row__status" style={{ width: COLUMN_WIDTHS.status }}>
        {repo.archived && (
          <span className="repo-row__archived-badge">Archived</span>
        )}
      </div>
    </div>
  );
}
