/**
 * MigrationWaveCard — One display sub-wave (one org chunk) of the plan.
 *
 * Collapsed by default via <details>; header summarizes wave label, org,
 * repo count, and an oversized-SCC badge when the cohort can't be split.
 */
import { useState } from 'react';
import type { MigrationUnit } from '@/utils/connectivity';
import type { DisplayWave } from '@/utils/migrationDisplay';

const PREREQ_INITIAL = 5;

interface MigrationWaveCardProps {
  displayWave: DisplayWave;
  onRepoClick: (repo: string) => void;
}

export function MigrationWaveCard({
  displayWave,
  onRepoClick,
}: MigrationWaveCardProps) {
  const {
    level,
    subIndex,
    totalSubWavesAtLevel,
    org,
    units,
    totalRepos,
    oversizedSCC,
  } = displayWave;

  const isSplit = totalSubWavesAtLevel > 1;
  const waveLabel = isSplit
    ? `Wave ${level + 1}.${subIndex}`
    : `Wave ${level + 1}`;

  return (
    <article className="migration-cohorts__card migration-plan__wave">
      <details className="migration-plan__wave-details">
        <summary className="migration-cohorts__card-header migration-plan__wave-summary">
          <h4 className="migration-cohorts__card-title">
            {waveLabel} · {org} · {totalRepos}{' '}
            {totalRepos === 1 ? 'repo' : 'repos'}
          </h4>
          {oversizedSCC && (
            <span
              className="migration-plan__oversized-badge"
              role="status"
            >
              ⚠ Indivisible cohort — {totalRepos} repos must migrate atomically
            </span>
          )}
          {isSplit && (
            <span className="migration-plan__wave-subline">
              Level {level} · part {subIndex} of {totalSubWavesAtLevel}
            </span>
          )}
        </summary>

        <ul className="migration-cohorts__repo-list migration-plan__unit-list">
          {units.map((unit) => (
            <li
              key={unit.kind === 'scc' ? `scc:${unit.sccId}` : `repo:${unit.repo}`}
              className="migration-plan__unit"
            >
              <UnitChip unit={unit} onRepoClick={onRepoClick} />
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

interface UnitChipProps {
  unit: MigrationUnit;
  onRepoClick: (repo: string) => void;
}

function UnitChip({ unit, onRepoClick }: UnitChipProps) {
  if (unit.kind === 'repo') {
    return (
      <span className="migration-plan__chip">
        <button
          className="migration-cohorts__repo-link"
          onClick={() => onRepoClick(unit.repo)}
          title={`View details for ${unit.repo}`}
        >
          {unit.repo}
        </button>
        {' · '}
        <span className="migration-plan__meta">
          {unit.dependentCount}{' '}
          {unit.dependentCount === 1 ? 'dependent' : 'dependents'}
        </span>
        <PrerequisiteDisclosure
          prerequisites={unit.prerequisites}
          onRepoClick={onRepoClick}
        />
      </span>
    );
  }

  return (
    <span className="migration-plan__chip migration-plan__chip--scc">
      <details className="migration-plan__scc-disclosure">
        <summary className="migration-plan__scc-toggle">
          SCC · {unit.repos.length} repos {' · '}
          <span className="migration-plan__meta">
            {unit.dependentCount}{' '}
            {unit.dependentCount === 1 ? 'dependent' : 'dependents'}
          </span>
        </summary>
        <ul className="migration-plan__scc-members">
          {unit.repos.map((repo) => (
            <li key={repo}>
              <button
                className="migration-cohorts__repo-link"
                onClick={() => onRepoClick(repo)}
                title={`View details for ${repo}`}
              >
                {repo}
              </button>
            </li>
          ))}
        </ul>
      </details>
      <PrerequisiteDisclosure
        prerequisites={unit.prerequisites}
        onRepoClick={onRepoClick}
      />
    </span>
  );
}

interface PrerequisiteDisclosureProps {
  prerequisites: string[];
  onRepoClick: (repo: string) => void;
}

function PrerequisiteDisclosure({
  prerequisites,
  onRepoClick,
}: PrerequisiteDisclosureProps) {
  const [showAll, setShowAll] = useState(false);
  if (prerequisites.length === 0) return null;
  const visible = showAll
    ? prerequisites
    : prerequisites.slice(0, PREREQ_INITIAL);
  const hidden = prerequisites.length - visible.length;

  return (
    <details className="migration-cohorts__details migration-plan__prereqs">
      <summary>
        Prerequisites ({prerequisites.length}) — repos in earlier waves this
        unit depends on
      </summary>
      <ul className="migration-cohorts__repo-list">
        {visible.map((repo) => (
          <li key={repo}>
            <button
              className="migration-cohorts__repo-link"
              onClick={() => onRepoClick(repo)}
              title={`View details for ${repo}`}
            >
              {repo}
            </button>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button
          className="migration-cohorts__show-more"
          onClick={() => setShowAll(true)}
        >
          Show {hidden} more…
        </button>
      )}
    </details>
  );
}
