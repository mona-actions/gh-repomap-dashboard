import { describe, it, expect } from 'vitest';
import { toMarkdown } from '../migrationExport';
import { splitWavesForDisplay, summarizePlan } from '../migrationDisplay';
import type { MigrationUnit, MigrationWave } from '../connectivity';

// Mirrors the trust-boundary rule documented in migrationExport.ts:
// GitHub repo slugs are constrained to [A-Za-z0-9._-] for both segments,
// which is why no Markdown escaping is applied.
const GITHUB_REPO_SLUG_PATTERN = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

// Frozen date for deterministic assertions.
const FIXED_DATE = new Date('2026-05-04T12:00:00Z');

function repoUnit(
  repo: string,
  level: number,
  dependentCount = 0,
  graphDependencies: string[] = [],
  graphDependents: string[] = [],
): MigrationUnit {
  return {
    kind: 'repo',
    repo,
    repos: [repo],
    level,
    dependentCount,
    prerequisites: graphDependencies,
    graphDependencies,
    graphDependents,
    externalInboundCount: dependentCount,
    externalOutboundCount: 0,
  };
}

function sccUnit(
  repos: string[],
  level: number,
  dependentCount = 0,
  sccId = 1,
  graphDependencies: string[] = [],
  graphDependents: string[] = [],
): MigrationUnit {
  return {
    kind: 'scc',
    sccId,
    repos: [...repos].sort(),
    level,
    dependentCount,
    prerequisites: graphDependencies,
    graphDependencies,
    graphDependents,
    externalInboundCount: dependentCount,
    externalOutboundCount: 0,
  };
}

function wave(level: number, units: MigrationUnit[]): MigrationWave {
  return { level, units };
}

describe('toMarkdown', () => {
  it('empty plan → header-only output', () => {
    const out = toMarkdown([], summarizePlan([]), {
      direction: 'sinks-first',
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('# Migration Plan — Foundations first');
    expect(out).toContain('Generated 2026-05-04');
    expect(out).toContain('0 waves');
    expect(out).not.toContain('## Wave');
  });

  it('single-wave plan → no sub-wave headers', () => {
    const w = wave(0, [repoUnit('acme/a', 0, 3)]);
    const display = splitWavesForDisplay([w]);
    const out = toMarkdown(display, summarizePlan(display), {
      direction: 'sinks-first',
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('## Wave 1');
    expect(out).not.toContain('Sub-wave');
    expect(out).toContain('### acme · 1 repo');
    expect(out).toContain('- acme/a (depended on by 3 repos)');
  });

  it('multi-sub-wave plan emits Sub-wave headers with correct numbering', () => {
    const units = Array.from({ length: 250 }, (_, i) =>
      repoUnit(`acme/r${String(i).padStart(4, '0')}`, 0),
    );
    const display = splitWavesForDisplay([wave(0, units)]);
    const out = toMarkdown(display, summarizePlan(display), {
      direction: 'sinks-first',
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('## Wave 1 · 250 repos · split across 3 sub-waves');
    expect(out).toContain('### Sub-wave 1.1 · acme · 100 repos');
    expect(out).toContain('### Sub-wave 1.2 · acme · 100 repos');
    expect(out).toContain('### Sub-wave 1.3 · acme · 50 repos');
  });

  it('oversized SCC → callout line present under SCC entry', () => {
    const repos = Array.from({ length: 150 }, (_, i) => `acme/r${i}`);
    const scc = sccUnit(repos, 0, 0, 7);
    const display = splitWavesForDisplay([wave(0, [scc])]);
    const out = toMarkdown(display, summarizePlan(display), {
      direction: 'sinks-first',
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('> ⚠ Indivisible cohort — must migrate atomically');
  });

  it('direction reflected in title and intro line', () => {
    const display = splitWavesForDisplay([wave(0, [repoUnit('acme/a', 0)])]);
    const sinks = toMarkdown(display, summarizePlan(display), {
      direction: 'sinks-first',
      generatedAt: FIXED_DATE,
    });
    expect(sinks).toContain('# Migration Plan — Foundations first');
    expect(sinks).toContain('Each wave should complete before the next begins');

    const sources = toMarkdown(display, summarizePlan(display), {
      direction: 'sources-first',
      generatedAt: FIXED_DATE,
    });
    expect(sources).toContain('# Migration Plan — Consumers first');
    expect(sources).toContain('Consumer apps move first');
  });

  it('prereq cap at boundary: exactly 10 → no truncation suffix', () => {
    const deps = Array.from({ length: 10 }, (_, i) => `acme/dep${i}`);
    const unit = repoUnit('acme/x', 0, 0, deps);
    const display = splitWavesForDisplay([wave(0, [unit])]);
    const out = toMarkdown(display, summarizePlan(display), {
      direction: 'sinks-first',
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('Prerequisites: acme/dep0, acme/dep1');
    expect(out).not.toContain('…and');
  });

  it('prereq cap at boundary: exactly 11 → "…and 1 more"', () => {
    const deps = Array.from({ length: 11 }, (_, i) => `acme/dep${i}`);
    const unit = repoUnit('acme/x', 0, 0, deps);
    const display = splitWavesForDisplay([wave(0, [unit])]);
    const out = toMarkdown(display, summarizePlan(display), {
      direction: 'sinks-first',
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('…and 1 more');
  });

  it('prereq cap at boundary: 100 → "…and 90 more"', () => {
    const deps = Array.from({ length: 100 }, (_, i) => `acme/dep${i}`);
    const unit = repoUnit('acme/x', 0, 0, deps);
    const display = splitWavesForDisplay([wave(0, [unit])]);
    const out = toMarkdown(display, summarizePlan(display), {
      direction: 'sinks-first',
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('…and 90 more');
  });

  it('singleton units do NOT emit "(SCC of 1: …)" lines', () => {
    const display = splitWavesForDisplay([wave(0, [repoUnit('acme/a', 0)])]);
    const out = toMarkdown(display, summarizePlan(display), {
      direction: 'sinks-first',
      generatedAt: FIXED_DATE,
    });
    expect(out).not.toContain('SCC of 1');
  });

  it('determinism: same input twice → same output', () => {
    const w = wave(0, [repoUnit('acme/a', 0, 5, ['acme/dep'])]);
    const display = splitWavesForDisplay([w]);
    const opts = {
      direction: 'sinks-first' as const,
      generatedAt: FIXED_DATE,
    };
    const a = toMarkdown(display, summarizePlan(display), opts);
    const b = toMarkdown(display, summarizePlan(display), opts);
    expect(a).toBe(b);
  });

  it('GitHub repo slug pattern excludes Markdown special chars (trust boundary)', () => {
    // Repo names are constrained to [A-Za-z0-9._-] for both segments;
    // none of those need Markdown escaping, so toMarkdown applies none.
    expect(GITHUB_REPO_SLUG_PATTERN.test('acme/widget-2_v1.0')).toBe(true);
    expect(GITHUB_REPO_SLUG_PATTERN.test('acme/repo*')).toBe(false);
    expect(GITHUB_REPO_SLUG_PATTERN.test('acme/repo[1]')).toBe(false);
    expect(GITHUB_REPO_SLUG_PATTERN.test('acme/`r`')).toBe(false);

    // Allowed-only input flows through unchanged.
    const display = splitWavesForDisplay([
      wave(0, [repoUnit('acme/widget-2_v1.0', 0, 1)]),
    ]);
    const out = toMarkdown(display, summarizePlan(display), {
      direction: 'sinks-first',
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('acme/widget-2_v1.0');
    expect(out).not.toContain('\\');
  });

  it('multi-repo SCC line lists all members', () => {
    const scc = sccUnit(['acme/a', 'acme/b', 'acme/c'], 0, 0, 1);
    const display = splitWavesForDisplay([wave(0, [scc])]);
    const out = toMarkdown(display, summarizePlan(display), {
      direction: 'sinks-first',
      generatedAt: FIXED_DATE,
    });
    expect(out).toContain('- acme/a (SCC of 3: acme/a, acme/b, acme/c)');
  });
});
