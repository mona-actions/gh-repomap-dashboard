/**
 * CriticalReposPreview — Top 5 most-depended-on repos.
 *
 * Shows a compact bar list of the repos with the highest blast radius
 * (most direct dependents). Includes a "View all →" link.
 */
import { Link } from 'react-router-dom';
import type { OutputData } from '@/schemas/repomap';

interface CriticalReposPreviewProps {
  stats: OutputData['stats'] | null;
}

const MAX_DISPLAY = 5;

export function CriticalReposPreview({ stats }: CriticalReposPreviewProps) {
  const repos = stats?.most_depended_on?.slice(0, MAX_DISPLAY) ?? [];

  if (repos.length === 0) {
    return (
      <div className="critical-repos-preview critical-repos-preview--empty">
        <p style={{ color: 'var(--fgColor-muted, #636c76)' }}>
          No dependency data available.
        </p>
      </div>
    );
  }

  const maxDeps = Math.max(...repos.map((r) => r.direct_dependents));

  return (
    <div className="critical-repos-preview">
      <ul className="critical-repos-preview__list">
        {repos.map((repo) => {
          const barWidth =
            maxDeps > 0
              ? Math.max((repo.direct_dependents / maxDeps) * 100, 4)
              : 0;

          return (
            <li key={repo.repo} className="critical-repo-item">
              <div className="critical-repo-item__header">
                <span className="critical-repo-item__name" title={repo.repo}>
                  {repo.repo}
                </span>
                <span className="critical-repo-item__count">
                  {repo.direct_dependents} dependents
                </span>
              </div>
              <div className="critical-repo-item__bar-bg">
                <div
                  className="critical-repo-item__bar-fill"
                  style={{ width: `${barWidth}%` }}
                  role="presentation"
                />
              </div>
            </li>
          );
        })}
      </ul>
      <Link to="/list" className="critical-repos-preview__link">
        View all →
      </Link>
    </div>
  );
}
