import { describe, it, expect } from 'vitest';
import {
  splitWavesForDisplay,
  extractOrg,
  assignUnitOrg,
  summarizePlan,
  toDisplayUnit,
  WAVE_REPO_CAP,
  type DisplayWave,
} from '../migrationDisplay';
import type { MigrationUnit, MigrationWave } from '../connectivity';

// ─── Fixture builders ────────────────────────────────────────────────────────

function repoUnit(
  repo: string,
  level: number,
  dependentCount = 0,
): MigrationUnit {
  return {
    kind: 'repo',
    repo,
    repos: [repo],
    level,
    dependentCount,
    prerequisites: [],
    graphDependencies: [],
    graphDependents: [],
    externalInboundCount: dependentCount,
    externalOutboundCount: 0,
  };
}

function sccUnit(
  repos: string[],
  level: number,
  dependentCount = 0,
  sccId = 1,
): MigrationUnit {
  return {
    kind: 'scc',
    sccId,
    repos: [...repos].sort(),
    level,
    dependentCount,
    prerequisites: [],
    graphDependencies: [],
    graphDependents: [],
    externalInboundCount: dependentCount,
    externalOutboundCount: 0,
  };
}

function wave(level: number, units: MigrationUnit[]): MigrationWave {
  return { level, units };
}

function manyRepos(org: string, count: number, level: number): MigrationUnit[] {
  return Array.from({ length: count }, (_, i) =>
    repoUnit(`${org}/repo-${String(i).padStart(4, '0')}`, level),
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('extractOrg', () => {
  it('returns prefix before first slash', () => {
    expect(extractOrg('acme/widgets')).toBe('acme');
  });
  it('returns "(no org)" when no slash', () => {
    expect(extractOrg('loose-repo')).toBe('(no org)');
  });
  it('returns "(no org)" when leading slash', () => {
    expect(extractOrg('/weird')).toBe('(no org)');
  });
});

describe('assignUnitOrg', () => {
  it('single-repo unit uses extractOrg', () => {
    expect(assignUnitOrg(repoUnit('acme/x', 0))).toBe('acme');
  });
  it('strict majority 99/1 → majority', () => {
    const repos = [
      ...Array.from({ length: 99 }, (_, i) => `acme/r${i}`),
      'other/x',
    ];
    expect(assignUnitOrg(sccUnit(repos, 0))).toBe('acme');
  });
  it('strict majority 51/49 → majority', () => {
    const repos = [
      ...Array.from({ length: 51 }, (_, i) => `acme/r${i}`),
      ...Array.from({ length: 49 }, (_, i) => `other/r${i}`),
    ];
    expect(assignUnitOrg(sccUnit(repos, 0))).toBe('acme');
  });
  it('exact 50/50 → "Mixed"', () => {
    const repos = [
      ...Array.from({ length: 50 }, (_, i) => `acme/r${i}`),
      ...Array.from({ length: 50 }, (_, i) => `other/r${i}`),
    ];
    expect(assignUnitOrg(sccUnit(repos, 0))).toBe('Mixed');
  });
});

describe('splitWavesForDisplay', () => {
  // 1
  it('wave with ≤ cap repos, single org → one DisplayWave un-dotted', () => {
    const w = wave(0, [
      repoUnit('acme/a', 0, 2),
      repoUnit('acme/b', 0, 1),
    ]);
    const out = splitWavesForDisplay([w]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      level: 0,
      subIndex: 1,
      totalSubWavesAtLevel: 1,
      org: 'acme',
      totalRepos: 2,
      oversizedSCC: false,
    });
  });

  // 2
  it('250 repos in one org, cap=100 → 3 DisplayWaves (100/100/50)', () => {
    const w = wave(0, manyRepos('acme', 250, 0));
    const out = splitWavesForDisplay([w]);
    expect(out).toHaveLength(3);
    expect(out.map((d) => d.totalRepos)).toEqual([100, 100, 50]);
    expect(out.map((d) => d.subIndex)).toEqual([1, 2, 3]);
    expect(out.every((d) => d.totalSubWavesAtLevel === 3)).toBe(true);
    expect(out.every((d) => d.org === 'acme')).toBe(true);
  });

  // 3
  it('mixed orgs grouped + ordered by total dependents desc', () => {
    const w = wave(0, [
      repoUnit('low/a', 0, 1),
      repoUnit('high/a', 0, 10),
      repoUnit('mid/a', 0, 5),
    ]);
    const out = splitWavesForDisplay([w]);
    expect(out.map((d) => d.org)).toEqual(['high', 'mid', 'low']);
  });

  // 3b — alphabetical tie-break on org name when dependents tie
  it('alphabetical tie-break when org dependents tie', () => {
    const w = wave(0, [
      repoUnit('zebra/a', 0, 5),
      repoUnit('alpha/a', 0, 5),
    ]);
    const out = splitWavesForDisplay([w]);
    expect(out.map((d) => d.org)).toEqual(['alpha', 'zebra']);
  });

  // 4 — covered in assignUnitOrg block; here verify org bucket placement
  it('SCC strict-majority placement: 51/49 lands in majority org bucket', () => {
    const repos = [
      ...Array.from({ length: 51 }, (_, i) => `acme/r${i}`),
      ...Array.from({ length: 49 }, (_, i) => `other/r${i}`),
    ];
    const w = wave(0, [sccUnit(repos, 0, 5)]);
    const out = splitWavesForDisplay([w]);
    expect(out).toHaveLength(1);
    expect(out[0].org).toBe('acme');
    expect(out[0].oversizedSCC).toBe(false);
  });

  // 5
  it('empty input → []', () => {
    expect(splitWavesForDisplay([])).toEqual([]);
  });

  // 6
  it('all-one-SCC preserved: single DisplayWave', () => {
    const scc = sccUnit(['acme/a', 'acme/b'], 0, 0);
    const out = splitWavesForDisplay([wave(0, [scc])]);
    expect(out).toHaveLength(1);
    expect(out[0].units).toEqual([scc]);
    expect(out[0].oversizedSCC).toBe(false);
  });

  // 7
  it('repos without "/" land in "(no org)" bucket', () => {
    const w = wave(0, [repoUnit('loose', 0, 1), repoUnit('acme/a', 0, 0)]);
    const out = splitWavesForDisplay([w]);
    const orgs = out.map((d) => d.org);
    expect(orgs).toContain('(no org)');
    expect(orgs).toContain('acme');
  });

  // 8
  it('subIndex 1-based and totalSubWavesAtLevel correct across sub-waves', () => {
    const w = wave(2, manyRepos('acme', 150, 2));
    const out = splitWavesForDisplay([w]);
    expect(out).toHaveLength(2);
    expect(out[0].subIndex).toBe(1);
    expect(out[1].subIndex).toBe(2);
    expect(out.every((d) => d.totalSubWavesAtLevel === 2)).toBe(true);
    expect(out.every((d) => d.level === 2)).toBe(true);
  });

  // 9
  it('totalSubWavesAtLevel === 1 when wave fits in a single chunk', () => {
    const w = wave(0, [repoUnit('acme/a', 0)]);
    const [d] = splitWavesForDisplay([w]);
    expect(d.totalSubWavesAtLevel).toBe(1);
  });

  // 10 — Mixed unit kinds in one org bucket: greedy-pack rule
  it('mixed unit kinds: 80-repo SCC + 30 leaves greedy-packs to 100 + 10', () => {
    const sccRepos = Array.from({ length: 80 }, (_, i) => `acme/scc-${i}`);
    const scc = sccUnit(sccRepos, 0, 100);
    const leaves = Array.from({ length: 30 }, (_, i) =>
      repoUnit(`acme/leaf-${i}`, 0, 1),
    );
    const out = splitWavesForDisplay([wave(0, [scc, ...leaves])]);
    // Greedy: chunk 1 fills with SCC (80) + 20 leaves = 100; chunk 2 = 10.
    expect(out).toHaveLength(2);
    expect(out[0].totalRepos).toBe(100);
    expect(out[0].units[0]).toEqual(scc);
    expect(out[0].oversizedSCC).toBe(false);
    expect(out[1].totalRepos).toBe(10);
  });

  // 11
  it('indivisible SCC > cap → oversizedSCC true, totalRepos > cap', () => {
    const repos = Array.from({ length: 150 }, (_, i) => `acme/r${i}`);
    const scc = sccUnit(repos, 0, 50);
    const out = splitWavesForDisplay([wave(0, [scc])]);
    expect(out).toHaveLength(1);
    expect(out[0].oversizedSCC).toBe(true);
    expect(out[0].totalRepos).toBe(150);
  });

  // 12
  it('custom capPerWave=10 chunks small fixtures correctly', () => {
    const w = wave(0, manyRepos('acme', 25, 0));
    const out = splitWavesForDisplay([w], { capPerWave: 10 });
    expect(out.map((d) => d.totalRepos)).toEqual([10, 10, 5]);
  });

  // 13
  it('determinism: same input twice → deep-equal output', () => {
    const w = wave(0, [
      repoUnit('b/x', 0, 3),
      repoUnit('a/y', 0, 3),
      repoUnit('c/z', 0, 1),
    ]);
    const a = splitWavesForDisplay([w]);
    const b = splitWavesForDisplay([w]);
    expect(a).toEqual(b);
  });

  // 14
  it('SCC alone at its level preserves level on DisplayWave', () => {
    const scc = sccUnit(['acme/a', 'acme/b'], 3, 0);
    const out = splitWavesForDisplay([wave(3, [scc])]);
    expect(out).toHaveLength(1);
    expect(out[0].level).toBe(3);
  });

  // 15
  it('"Mixed" and "(no org)" sort after all named orgs regardless of dependents', () => {
    // Mixed has MORE dependents than acme (5 vs 1) — without the synthetic
    // demotion, Mixed would sort first. With the rule, named orgs always win.
    const mixedScc = sccUnit(['a/x', 'b/y'], 0, 5);
    const acmeRepo = repoUnit('acme/r', 0, 1);
    const looseRepo = repoUnit('loose', 0, 10);
    const out = splitWavesForDisplay([
      wave(0, [mixedScc, acmeRepo, looseRepo]),
    ]);
    expect(out.map((d) => d.org)).toEqual(['acme', '(no org)', 'Mixed']);
  });

  it('exports WAVE_REPO_CAP = 100', () => {
    expect(WAVE_REPO_CAP).toBe(100);
  });

  it('result type is DisplayWave[]', () => {
    const out: DisplayWave[] = splitWavesForDisplay([]);
    expect(out).toEqual([]);
  });
});

describe('toDisplayUnit', () => {
  it('sinks-first returns graphDependencies as displayPrerequisites', () => {
    const unit: MigrationUnit = {
      ...repoUnit('acme/x', 0),
      graphDependencies: ['acme/dep1', 'acme/dep2'],
      graphDependents: ['acme/up1'],
    };
    const projected = toDisplayUnit(unit, 'sinks-first');
    expect(projected.displayPrerequisites).toEqual(['acme/dep1', 'acme/dep2']);
  });

  it('sources-first returns graphDependents as displayPrerequisites', () => {
    const unit: MigrationUnit = {
      ...repoUnit('acme/x', 0),
      graphDependencies: ['acme/dep1'],
      graphDependents: ['acme/up1', 'acme/up2'],
    };
    const projected = toDisplayUnit(unit, 'sources-first');
    expect(projected.displayPrerequisites).toEqual(['acme/up1', 'acme/up2']);
  });

  it('does not mutate the original unit', () => {
    const unit: MigrationUnit = {
      ...repoUnit('acme/x', 0),
      graphDependencies: ['acme/dep'],
    };
    const before = JSON.stringify(unit);
    toDisplayUnit(unit, 'sources-first');
    expect(JSON.stringify(unit)).toBe(before);
    expect('displayPrerequisites' in unit).toBe(false);
  });

  it('handles units with empty dep arrays', () => {
    const unit = repoUnit('acme/leaf', 0);
    expect(toDisplayUnit(unit, 'sinks-first').displayPrerequisites).toEqual([]);
    expect(toDisplayUnit(unit, 'sources-first').displayPrerequisites).toEqual(
      [],
    );
  });
});

describe('summarizePlan', () => {
  it('empty input → all zeroes and empty oversized list', () => {
    const summary = summarizePlan([]);
    expect(summary).toEqual({
      totalWaves: 0,
      totalRepos: 0,
      totalSCCs: 0,
      oversizedSCCs: [],
    });
    expect(Array.isArray(summary.oversizedSCCs)).toBe(true);
  });

  it('counts waves, repos, and multi-repo SCCs across multiple waves', () => {
    const w1 = wave(0, [
      repoUnit('acme/a', 0),
      sccUnit(['acme/b', 'acme/c'], 0, 0, 1),
    ]);
    const w2 = wave(1, [
      repoUnit('acme/d', 1),
      sccUnit(['acme/e', 'acme/f', 'acme/g'], 1, 0, 2),
    ]);
    const display = splitWavesForDisplay([w1, w2]);
    const summary = summarizePlan(display);
    expect(summary.totalWaves).toBe(display.length);
    expect(summary.totalRepos).toBe(7);
    expect(summary.totalSCCs).toBe(2);
    expect(summary.oversizedSCCs).toEqual([]);
  });

  it('populates oversizedSCCs with wave linkage for cohorts above cap', () => {
    const repos = Array.from({ length: 150 }, (_, i) => `acme/r${i}`);
    const scc = sccUnit(repos, 0, 5, 7);
    const display = splitWavesForDisplay([wave(0, [scc])]);
    const summary = summarizePlan(display);
    expect(summary.oversizedSCCs).toHaveLength(1);
    const [first] = summary.oversizedSCCs;
    expect(first.sccSize).toBe(150);
    expect(first.repos).toEqual(scc.repos);
    expect(first.waveId).toBe('0.1');
    // Single sub-wave at this level → "Wave N" label, not "Sub-wave".
    expect(first.waveLabel).toBe('Wave 1');
  });

  it('uses Sub-wave labels when the level was split', () => {
    const repos = Array.from({ length: 150 }, (_, i) => `acme/r${i}`);
    const oversized = sccUnit(repos, 0, 0, 9);
    const filler = manyRepos('beta', 50, 0);
    const display = splitWavesForDisplay([wave(0, [oversized, ...filler])]);
    const summary = summarizePlan(display);
    expect(summary.oversizedSCCs).toHaveLength(1);
    expect(summary.oversizedSCCs[0].waveLabel).toMatch(/^Sub-wave 1\.\d+$/);
  });
});
