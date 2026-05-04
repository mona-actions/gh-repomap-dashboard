/**
 * Pure Markdown serialization of a migration plan. No React imports.
 *
 * Trust boundary: GitHub repo names are constrained to `[A-Za-z0-9._-]` for
 * both the org and repo segment (separated by `/`). None of those characters
 * have Markdown-special meaning, so we apply NO escaping. If the input ever
 * widens beyond GitHub repos, revisit this assumption.
 */
import {
  toDisplayUnit,
  type DisplayWave,
  type MigrationDirection,
  type PlanSummary,
} from './migrationDisplay';
import type { MigrationUnit } from './connectivity';

export interface ExportOptions {
  direction: MigrationDirection;
  /** Defaults to `new Date()` at call time; injectable for deterministic tests. */
  generatedAt?: Date;
  /** Max prerequisites to list before truncating with `…and N more`. */
  prerequisitesCap?: number;
}

const DEFAULT_PREREQUISITES_CAP = 10;

export function toMarkdown(
  displayWaves: DisplayWave[],
  summary: PlanSummary,
  options: ExportOptions,
): string {
  const direction = options.direction;
  const generatedAt = options.generatedAt ?? new Date();
  const prereqCap = options.prerequisitesCap ?? DEFAULT_PREREQUISITES_CAP;

  const title =
    direction === 'sinks-first'
      ? '# Migration Plan — Foundations first'
      : '# Migration Plan — Consumers first';

  const dateStr = formatDate(generatedAt);
  const headerLine = [
    `Generated ${dateStr}`,
    `${summary.totalWaves} ${plural(summary.totalWaves, 'wave', 'waves')}`,
    `${formatCount(summary.totalRepos)} ${plural(summary.totalRepos, 'repo', 'repos')}`,
    `${summary.totalSCCs} ${plural(summary.totalSCCs, 'SCC', 'SCCs')}`,
    `${summary.oversizedSCCs.length} oversized ${plural(summary.oversizedSCCs.length, 'cohort', 'cohorts')}`,
  ].join(' · ');

  const intro =
    direction === 'sinks-first'
      ? '> Repos within a wave can migrate in parallel. Each wave should complete before the next begins.'
      : '> Consumer apps move first; foundations move last. Repos within a wave can migrate in parallel.';

  const lines: string[] = [title, '', headerLine, '', intro];

  if (displayWaves.length === 0) {
    return lines.join('\n') + '\n';
  }

  // Group DisplayWaves by logical level so we can emit "Wave N" headers and
  // "Sub-wave N.M" subheaders only when a level was actually split.
  const waveGroups = groupByLevel(displayWaves);

  for (const group of waveGroups) {
    lines.push('');
    const userWaveNum = group.level + 1;
    const totalSub = group.waves[0].totalSubWavesAtLevel;
    const repoSum = group.waves.reduce((acc, w) => acc + w.totalRepos, 0);

    if (totalSub === 1) {
      const wave = group.waves[0];
      lines.push(
        `## Wave ${userWaveNum} · ${formatCount(wave.totalRepos)} ${plural(wave.totalRepos, 'repo', 'repos')}`,
      );
      lines.push('');
      appendOrgSection(lines, wave, direction, prereqCap, /* sub */ false, 0);
    } else {
      lines.push(
        `## Wave ${userWaveNum} · ${formatCount(repoSum)} ${plural(repoSum, 'repo', 'repos')} · split across ${totalSub} sub-waves`,
      );
      group.waves.forEach((wave) => {
        lines.push('');
        appendOrgSection(
          lines,
          wave,
          direction,
          prereqCap,
          /* sub */ true,
          userWaveNum,
        );
      });
    }
  }

  return lines.join('\n') + '\n';
}

function appendOrgSection(
  lines: string[],
  wave: DisplayWave,
  direction: MigrationDirection,
  prereqCap: number,
  asSubWave: boolean,
  userWaveNum: number,
): void {
  if (asSubWave) {
    lines.push(
      `### Sub-wave ${userWaveNum}.${wave.subIndex} · ${wave.org} · ${formatCount(wave.totalRepos)} ${plural(wave.totalRepos, 'repo', 'repos')}`,
    );
  } else {
    lines.push(
      `### ${wave.org} · ${formatCount(wave.totalRepos)} ${plural(wave.totalRepos, 'repo', 'repos')}`,
    );
  }

  for (const unit of wave.units) {
    appendUnitLines(lines, unit, direction, prereqCap, wave.oversizedSCC);
  }
}

function appendUnitLines(
  lines: string[],
  unit: MigrationUnit,
  direction: MigrationDirection,
  prereqCap: number,
  oversized: boolean,
): void {
  const displayUnit = toDisplayUnit(unit, direction);

  if (unit.kind === 'repo') {
    lines.push(
      `- ${unit.repo} (depended on by ${unit.externalInboundCount} ${plural(unit.externalInboundCount, 'repo', 'repos')})`,
    );
  } else {
    const members = unit.repos.join(', ');
    lines.push(
      `- ${unit.repos[0]} (SCC of ${unit.repos.length}: ${members})`,
    );
    if (oversized) {
      lines.push('  > ⚠ Indivisible cohort — must migrate atomically');
    }
  }

  const prereqs = displayUnit.displayPrerequisites;
  if (prereqs.length > 0) {
    const shown = prereqs.slice(0, prereqCap);
    const hidden = prereqs.length - shown.length;
    const suffix = hidden > 0 ? `, …and ${hidden} more` : '';
    lines.push(`  - Prerequisites: ${shown.join(', ')}${suffix}`);
  }
}

interface WaveGroup {
  level: number;
  waves: DisplayWave[];
}

function groupByLevel(displayWaves: DisplayWave[]): WaveGroup[] {
  const groups: WaveGroup[] = [];
  let current: WaveGroup | null = null;
  for (const wave of displayWaves) {
    if (!current || current.level !== wave.level) {
      current = { level: wave.level, waves: [] };
      groups.push(current);
    }
    current.waves.push(wave);
  }
  return groups;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatCount(n: number): string {
  // Thousands separator for readability; deterministic regardless of locale.
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? singular : pluralForm;
}
