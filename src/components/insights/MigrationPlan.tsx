/**
 * MigrationPlan — Recommended bottom-up migration order.
 *
 * Wave 1 = foundations (no outgoing dependencies). Repos in the same wave
 * can migrate in parallel; later waves should wait until earlier waves
 * complete. SCCs are kept as indivisible cohorts.
 */
import { useCallback, useMemo } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';
import { deriveMigrationOrder, isAllOneSCC } from '@/utils/connectivity';
import {
  splitWavesForDisplay,
  WAVE_REPO_CAP,
} from '@/utils/migrationDisplay';
import { MigrationWaveCard } from './MigrationWaveCard';

export function MigrationPlan() {
  const stats = useDataStore((s) => s.stats);
  const setSelectedRepo = useUIStore((s) => s.setSelectedRepo);

  // graph is read imperatively (per dataStore guidance) and is set atomically
  // with stats in loadData(), so [stats] is a sufficient memo dep.
  const waves = useMemo(() => {
    if (!stats) return [];
    return deriveMigrationOrder(stats, useDataStore.getState().graph);
  }, [stats]);

  // degenerate-state check operates on logical waves; display chunking does not affect SCC identity
  const displayWaves = useMemo(() => splitWavesForDisplay(waves), [waves]);

  const oversizedCount = displayWaves.filter((d) => d.oversizedSCC).length;

  const handleRepoClick = useCallback(
    (repo: string) => {
      setSelectedRepo(repo);
    },
    [setSelectedRepo],
  );

  return (
    <section
      className="migration-cohorts migration-plan"
      aria-labelledby="migration-plan-title"
    >
      <h3 id="migration-plan-title" className="migration-cohorts__title">
        Migration Grouping
      </h3>
      <p className="migration-cohorts__description">
        Recommended bottom-up order based on dependency direction. Foundational
        repos move first; consumers move last.{' '}
        <strong>Repos in the same wave can move in parallel.</strong>{' '}
        Strongly-connected cohorts (SCCs) stay together as one indivisible
        unit.
      </p>

      {waves.length === 0 ? (
        <p className="migration-cohorts__empty">
          No migration plan available. Load a repo map with at least one
          scanned repo to see recommendations.
        </p>
      ) : isAllOneSCC(waves) ? (
        <p className="migration-cohorts__empty">
          All scanned repos form one mutual-dependency cohort — no incremental
          order is possible without breaking cycles. Treat them as a single
          migration unit.
        </p>
      ) : (
        <>
          {oversizedCount > 0 && (
            <p className="migration-plan__rollup-warning" role="status">
              ⚠ {oversizedCount} cohort{oversizedCount === 1 ? '' : 's'} exceed
              the {WAVE_REPO_CAP}-repo target and cannot be split — see flagged
              waves below.
            </p>
          )}
          <div className="migration-cohorts__list">
            {displayWaves.map((dw) => (
              <MigrationWaveCard
                key={`${dw.level}.${dw.subIndex}`}
                displayWave={dw}
                onRepoClick={handleRepoClick}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
