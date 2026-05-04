/**
 * Display-layer transformation for migration waves.
 *
 * Splits logical Kahn-levelization waves into org-grouped, capped sub-waves
 * so very large waves remain navigable. Pure: no graph access, no algorithmic
 * change to migration order.
 */
import {
  sortUnits,
  totalDependents,
  type MigrationDirection,
  type MigrationUnit,
  type MigrationWave,
} from './connectivity';

/** Migration direction — re-exported from connectivity for display callers. */
export type { MigrationDirection } from './connectivity';

export const WAVE_REPO_CAP = 100;

export interface DisplayWave {
  level: number;
  subIndex: number;
  totalSubWavesAtLevel: number;
  org: string;
  units: MigrationUnit[];
  totalRepos: number;
  totalDependents: number;
  oversizedSCC: boolean;
}

export interface SplitWavesOptions {
  capPerWave?: number;
}

const NO_ORG = '(no org)';
const MIXED = 'Mixed';

/** Returns the org segment (chars before first `/`), or `"(no org)"`. */
export function extractOrg(repo: string): string {
  const idx = repo.indexOf('/');
  if (idx <= 0) return NO_ORG;
  return repo.slice(0, idx);
}

/**
 * Strict-majority org assignment for a unit.
 * Single-repo units → extractOrg. Multi-repo SCCs → org with > 50% of repos,
 * else "Mixed". No alphabetical tie-break here (intentional: 50/50 is signal).
 */
export function assignUnitOrg(unit: MigrationUnit): string {
  if (unit.repos.length === 1) return extractOrg(unit.repos[0]);

  const counts = new Map<string, number>();
  for (const repo of unit.repos) {
    const org = extractOrg(repo);
    counts.set(org, (counts.get(org) ?? 0) + 1);
  }

  const total = unit.repos.length;
  for (const [org, count] of counts) {
    if (count * 2 > total) return org;
  }
  return MIXED;
}

/**
 * Split logical waves into display sub-waves grouped by org and capped at
 * `capPerWave` repos. Indivisible SCCs that exceed the cap get their own
 * sub-wave with `oversizedSCC: true`.
 */
export function splitWavesForDisplay(
  waves: MigrationWave[],
  options: SplitWavesOptions = {},
): DisplayWave[] {
  const cap = options.capPerWave ?? WAVE_REPO_CAP;
  const result: DisplayWave[] = [];

  for (const wave of waves) {
    const byOrg = new Map<string, MigrationUnit[]>();
    for (const unit of wave.units) {
      const org = assignUnitOrg(unit);
      let bucket = byOrg.get(org);
      if (!bucket) {
        bucket = [];
        byOrg.set(org, bucket);
      }
      bucket.push(unit);
    }

    // Sort orgs by total dependents desc, ties alphabetical, with synthetic
    // buckets ("(no org)" and "Mixed") demoted below all named orgs since
    // they aren't actionable migration targets.
    const isSynthetic = (org: string) => org === MIXED || org === NO_ORG;
    const orgEntries = [...byOrg.entries()]
      .map(([org, units]) => ({ org, units: sortUnits(units) }))
      .sort((a, b) => {
        const aSynth = isSynthetic(a.org);
        const bSynth = isSynthetic(b.org);
        if (aSynth !== bSynth) return aSynth ? 1 : -1;
        const dt = totalDependents(b.units) - totalDependents(a.units);
        if (dt !== 0) return dt;
        return a.org.localeCompare(b.org);
      });

    const levelChunks: Array<{
      org: string;
      units: MigrationUnit[];
      oversizedSCC: boolean;
    }> = [];

    for (const { org, units } of orgEntries) {
      let current: MigrationUnit[] = [];
      let currentRepos = 0;

      const flush = () => {
        if (current.length > 0) {
          levelChunks.push({ org, units: current, oversizedSCC: false });
          current = [];
          currentRepos = 0;
        }
      };

      for (const unit of units) {
        const size = unit.repos.length;
        // Indivisible unit alone exceeds cap → its own oversized chunk.
        if (size > cap) {
          flush();
          levelChunks.push({ org, units: [unit], oversizedSCC: true });
          continue;
        }
        if (currentRepos + size > cap && current.length > 0) {
          flush();
        }
        current.push(unit);
        currentRepos += size;
      }
      flush();
    }

    const totalSubWavesAtLevel = levelChunks.length;
    levelChunks.forEach((chunk, i) => {
      const repos = chunk.units.reduce((acc, u) => acc + u.repos.length, 0);
      result.push({
        level: wave.level,
        subIndex: i + 1,
        totalSubWavesAtLevel,
        org: chunk.org,
        units: chunk.units,
        totalRepos: repos,
        totalDependents: totalDependents(chunk.units),
        oversizedSCC: chunk.oversizedSCC,
      });
    });
  }

  return result;
}

/** A `MigrationUnit` projected for display in a given direction. */
export type DisplayUnit = MigrationUnit & {
  /**
   * Direction-aware view of `prerequisites`:
   * sinks-first → graphDependencies; sources-first → graphDependents.
   */
  displayPrerequisites: string[];
};

/**
 * Project a unit for display. Pure: returns a shallow copy without mutating
 * the input. The data layer carries direction-invariant fields; this seam is
 * where the display direction picks the right one.
 */
export function toDisplayUnit(
  unit: MigrationUnit,
  direction: MigrationDirection,
): DisplayUnit {
  const displayPrerequisites =
    direction === 'sinks-first'
      ? unit.graphDependencies
      : unit.graphDependents;
  return { ...unit, displayPrerequisites };
}

export interface OversizedSCCSummary {
  /** DisplayWave id derived as `${level}.${subIndex}` for "Jump to wave" linkage. */
  waveId: string;
  /** Human-readable label, e.g. "Wave 3" (single sub-wave) or "Sub-wave 3.2". */
  waveLabel: string;
  sccSize: number;
  /** SCC member repos. */
  repos: string[];
}

export interface PlanSummary {
  /** Count of DisplayWaves (sub-waves count individually). */
  totalWaves: number;
  /** Sum of repos across all waves. */
  totalRepos: number;
  /** Count of multi-repo SCC units (size > 1) across all waves. */
  totalSCCs: number;
  /** Every oversized SCC (cohort that exceeded the cap). Empty when none. */
  oversizedSCCs: OversizedSCCSummary[];
}

/**
 * Pure summary stats over a `splitWavesForDisplay` result. Used by the banner
 * and the rollup-expand UI; co-located with the display module so the seam
 * between algorithm and display stays tidy.
 */
export function summarizePlan(displayWaves: DisplayWave[]): PlanSummary {
  let totalRepos = 0;
  let totalSCCs = 0;
  const oversizedSCCs: OversizedSCCSummary[] = [];

  for (const wave of displayWaves) {
    totalRepos += wave.totalRepos;
    for (const unit of wave.units) {
      if (unit.kind === 'scc' && unit.repos.length > 1) totalSCCs += 1;
    }
    if (wave.oversizedSCC) {
      // Oversized chunk per construction holds exactly one SCC unit.
      const scc = wave.units.find((u) => u.kind === 'scc');
      if (scc) {
        oversizedSCCs.push({
          waveId: `${wave.level}.${wave.subIndex}`,
          waveLabel:
            wave.totalSubWavesAtLevel > 1
              ? `Sub-wave ${wave.level + 1}.${wave.subIndex}`
              : `Wave ${wave.level + 1}`,
          sccSize: scc.repos.length,
          repos: scc.repos,
        });
      }
    }
  }

  return {
    totalWaves: displayWaves.length,
    totalRepos,
    totalSCCs,
    oversizedSCCs,
  };
}
