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
  type MigrationUnit,
  type MigrationWave,
} from './connectivity';

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
