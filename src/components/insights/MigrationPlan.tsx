/**
 * MigrationPlan — Recommended migration order with direction toggle, cap
 * control, summary banner, oversized rollup, and Markdown export.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';
import {
  deriveMigrationOrder,
  isAllOneSCC,
  type MigrationDirection,
} from '@/utils/connectivity';
import {
  splitWavesForDisplay,
  summarizePlan,
  WAVE_REPO_CAP,
} from '@/utils/migrationDisplay';
import { toMarkdown } from '@/utils/migrationExport';
import { MigrationWaveCard } from './MigrationWaveCard';

const CAP_MIN = 10;
const CAP_MAX = 500;

// Pure: parse + clamp + round; returns `fallback` for invalid/empty input.
function parseCap(input: string, fallback: number): number {
  const trimmed = input.trim();
  const parsed = Number(trimmed);
  if (trimmed === '' || !Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(CAP_MAX, Math.max(CAP_MIN, Math.round(parsed)));
}

export function MigrationPlan() {
  const stats = useDataStore((s) => s.stats);
  const setSelectedRepo = useUIStore((s) => s.setSelectedRepo);

  const [direction, setDirection] = useState<MigrationDirection>('sinks-first');
  const [capPerWave, setCapPerWave] = useState<number>(WAVE_REPO_CAP);
  const [capInput, setCapInput] = useState<string>(String(WAVE_REPO_CAP));
  const [openWaveIds, setOpenWaveIds] = useState<Set<string>>(new Set());
  const rollupRef = useRef<HTMLDetailsElement | null>(null);

  // Direction flip is destructive to wave identity — clear open set so we
  // never carry over an "open" state onto a wave card holding different repos.
  useEffect(() => {
    setOpenWaveIds(new Set());
  }, [direction]);

  // Single useMemo to keep displayWaves and summary in lockstep — avoids a
  // stale-pair window when both `direction` and `capPerWave` change.
  const { displayWaves, summary, waves } = useMemo(() => {
    if (!stats) {
      return {
        displayWaves: [],
        summary: { totalWaves: 0, totalRepos: 0, totalSCCs: 0, oversizedSCCs: [] },
        waves: [],
      };
    }
    const graph = useDataStore.getState().graph;
    const computed = deriveMigrationOrder(stats, graph, { direction });
    const display = splitWavesForDisplay(computed, { capPerWave });
    return {
      displayWaves: display,
      summary: summarizePlan(display),
      waves: computed,
    };
  }, [stats, direction, capPerWave]);

  const handleRepoClick = useCallback(
    (repo: string) => {
      setSelectedRepo(repo);
    },
    [setSelectedRepo],
  );

  const handleToggleWave = useCallback(
    (waveId: string, open: boolean) => {
      setOpenWaveIds((prev) => {
        const has = prev.has(waveId);
        if (open === has) return prev;
        const next = new Set(prev);
        if (open) next.add(waveId);
        else next.delete(waveId);
        return next;
      });
    },
    [],
  );

  const jumpToWave = useCallback((waveId: string) => {
    setOpenWaveIds((prev) => {
      if (prev.has(waveId)) return prev;
      const next = new Set(prev);
      next.add(waveId);
      return next;
    });
    const el = document.getElementById(`wave-${waveId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleDownload = useCallback(() => {
    // Commit any pending cap input before exporting so the Markdown reflects
    // what the user typed, not the last blurred value.
    const effectiveCap = parseCap(capInput, capPerWave);
    if (effectiveCap !== capPerWave) {
      setCapPerWave(effectiveCap);
      setCapInput(String(effectiveCap));
    }
    const exportWaves =
      effectiveCap === capPerWave
        ? displayWaves
        : splitWavesForDisplay(waves, { capPerWave: effectiveCap });
    const exportSummary =
      effectiveCap === capPerWave ? summary : summarizePlan(exportWaves);
    const md = toMarkdown(exportWaves, exportSummary, { direction });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const dirSlug =
      direction === 'sinks-first' ? 'foundations-first' : 'consumers-first';
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration-plan-${dirSlug}-${date}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [displayWaves, summary, direction, waves, capInput, capPerWave]);

  const handleCapBlur = useCallback(() => {
    const next = parseCap(capInput, capPerWave);
    setCapPerWave(next);
    setCapInput(String(next));
  }, [capInput, capPerWave]);

  const handleScrollToRollup = useCallback(() => {
    const el = rollupRef.current;
    if (!el) return;
    el.open = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const intro =
    direction === 'sinks-first'
      ? 'Foundational repos move first; consumers move last.'
      : 'Consumer apps move first; foundations move last.';

  const oversizedCount = summary.oversizedSCCs.length;
  const hasPlan = displayWaves.length > 0;

  return (
    <section
      className="migration-cohorts migration-plan"
      aria-labelledby="migration-plan-title"
    >
      <h3 id="migration-plan-title" className="migration-cohorts__title">
        Migration Grouping
      </h3>
      <p className="migration-cohorts__description">
        Recommended order based on dependency direction. {intro}{' '}
        <strong>Repos in the same wave can move in parallel.</strong>{' '}
        Strongly-connected cohorts (SCCs) stay together as one indivisible
        unit.
      </p>

      <div className="migration-plan__toolbar">
        <fieldset
          className="migration-plan__direction-toggle"
          role="radiogroup"
          aria-label="Migration order"
        >
          <label>
            <input
              type="radio"
              name="migration-direction"
              value="sinks-first"
              checked={direction === 'sinks-first'}
              onChange={() => setDirection('sinks-first')}
            />
            Foundations first
          </label>
          <label>
            <input
              type="radio"
              name="migration-direction"
              value="sources-first"
              checked={direction === 'sources-first'}
              onChange={() => setDirection('sources-first')}
            />
            Consumers first
          </label>
        </fieldset>

        <label className="migration-plan__cap-label">
          Repos per wave
          <input
            className="migration-plan__cap-input"
            type="number"
            min={CAP_MIN}
            max={CAP_MAX}
            step={10}
            value={capInput}
            onChange={(e) => setCapInput(e.target.value)}
            onBlur={handleCapBlur}
          />
        </label>

        <button
          type="button"
          className="migration-plan__download-button"
          onClick={handleDownload}
          disabled={!hasPlan}
        >
          Download as Markdown
        </button>
      </div>

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
          <div
            className="migration-plan__banner"
            role="region"
            aria-label="Plan summary"
          >
            <div className="migration-plan__stat">
              {summary.totalWaves.toLocaleString()}{' '}
              {summary.totalWaves === 1 ? 'wave' : 'waves'}
            </div>
            <div className="migration-plan__stat">
              {summary.totalRepos.toLocaleString()}{' '}
              {summary.totalRepos === 1 ? 'repo' : 'repos'}
            </div>
            <div className="migration-plan__stat">
              {summary.totalSCCs.toLocaleString()}{' '}
              {summary.totalSCCs === 1 ? 'SCC' : 'SCCs'}
            </div>
            {oversizedCount > 0 ? (
              <button
                type="button"
                className="migration-plan__stat migration-plan__stat--warn"
                onClick={handleScrollToRollup}
                aria-label={`${oversizedCount} oversized cohorts — jump to details`}
              >
                {oversizedCount.toLocaleString()} oversized{' '}
                {oversizedCount === 1 ? 'cohort' : 'cohorts'}
              </button>
            ) : (
              <div className="migration-plan__stat migration-plan__stat--muted">
                0 oversized cohorts
              </div>
            )}
          </div>

          {oversizedCount > 0 && (
            <details className="migration-plan__rollup" ref={rollupRef}>
              <summary>
                ⚠ {oversizedCount} cohort
                {oversizedCount === 1 ? '' : 's'} exceed the {capPerWave}-repo
                target
              </summary>
              <ul>
                {summary.oversizedSCCs.map(
                  ({ waveId, waveLabel, sccSize }) => (
                    <li key={waveId}>
                      Cohort in {waveLabel} — {sccSize} repos{' '}
                      <button
                        type="button"
                        onClick={() => jumpToWave(waveId)}
                      >
                        Jump to wave
                      </button>
                    </li>
                  ),
                )}
              </ul>
            </details>
          )}

          <div className="migration-cohorts__list">
            {displayWaves.map((dw) => {
              const waveId = `${dw.level}.${dw.subIndex}`;
              return (
                <MigrationWaveCard
                  key={waveId}
                  waveId={waveId}
                  displayWave={dw}
                  direction={direction}
                  open={openWaveIds.has(waveId)}
                  onToggle={handleToggleWave}
                  onRepoClick={handleRepoClick}
                />
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
