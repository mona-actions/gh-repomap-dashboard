import { describe, it, expect } from 'vitest';
import { generate } from '../generate';
import { OutputSchema } from '../../../schemas/repomap';

describe('generate', () => {
  it('generates correct number of repos for small fixture', () => {
    const data = generate({
      repoCount: 50,
      orgCount: 3,
      avgDepsPerRepo: 4,
      circularDepChance: 0.1,
      phantomNodeChance: 0,
      archivedChance: 0,
    });

    expect(Object.keys(data.graph)).toHaveLength(50);
    expect(data.metadata.total_repos).toBe(50);
    expect(data.metadata.orgs_scanned).toHaveLength(3);
  });

  it('creates phantom target repos when phantomNodeChance > 0', () => {
    const data = generate({
      repoCount: 50,
      orgCount: 2,
      avgDepsPerRepo: 6,
      circularDepChance: 0,
      phantomNodeChance: 1.0, // all deps point to phantoms
      archivedChance: 0,
    });

    // At least some deps should target external-org/phantom-*
    const allTargets = Object.values(data.graph).flatMap((node) =>
      node.direct.map((d) => d.repo),
    );
    const phantomTargets = allTargets.filter((t) =>
      t.startsWith('external-org/phantom-'),
    );
    expect(phantomTargets.length).toBeGreaterThan(0);

    // Phantom deps should have target_scanned: false
    const phantomDeps = Object.values(data.graph).flatMap((node) =>
      node.direct.filter((d) => d.repo.startsWith('external-org/phantom-')),
    );
    expect(phantomDeps.every((d) => d.target_scanned === false)).toBe(true);
  });

  it('includes circular deps in stats when circularDepChance > 0', () => {
    const data = generate({
      repoCount: 100,
      orgCount: 3,
      avgDepsPerRepo: 4,
      circularDepChance: 0.5, // high chance
      phantomNodeChance: 0,
      archivedChance: 0,
    });

    // With 100 repos and 0.5 chance, we should get some circular deps
    expect(data.stats.circular_deps.length).toBeGreaterThan(0);
    // Each circular dep should be a pair of repo names
    for (const cycle of data.stats.circular_deps) {
      expect(cycle).toHaveLength(2);
      expect(cycle[0]).not.toBe(cycle[1]);
    }
  });

  it('marks repos as archived according to archivedChance', () => {
    const data = generate({
      repoCount: 200,
      orgCount: 2,
      avgDepsPerRepo: 2,
      circularDepChance: 0,
      phantomNodeChance: 0,
      archivedChance: 1.0, // all archived
    });

    const archivedCount = Object.values(data.graph).filter(
      (n) => n.annotations.archived,
    ).length;
    // All repos should be archived
    expect(archivedCount).toBe(200);
  });

  it('generates correct stats.most_depended_on', () => {
    const data = generate({
      repoCount: 30,
      orgCount: 2,
      avgDepsPerRepo: 5,
      circularDepChance: 0,
      phantomNodeChance: 0,
      archivedChance: 0,
    });

    // most_depended_on should be sorted by direct_dependents descending
    const counts = data.stats.most_depended_on.map((m) => m.direct_dependents);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
    }
  });

  it('computes total_edges matching actual direct dependencies', () => {
    const data = generate({
      repoCount: 40,
      orgCount: 2,
      avgDepsPerRepo: 3,
      circularDepChance: 0,
      phantomNodeChance: 0,
      archivedChance: 0,
    });

    let expectedEdges = 0;
    for (const node of Object.values(data.graph)) {
      expectedEdges += node.direct.length;
    }
    expect(data.metadata.total_edges).toBe(expectedEdges);
  });

  it('validates against the Zod OutputSchema', () => {
    const data = generate({
      repoCount: 20,
      orgCount: 2,
      avgDepsPerRepo: 3,
      circularDepChance: 0.1,
      phantomNodeChance: 0.1,
      archivedChance: 0.05,
    });

    const result = OutputSchema.safeParse(data);
    if (!result.success) {
      // Show detailed errors for debugging
      const errors = result.error.issues.map(
        (i) => `${i.path.join('.')}: ${i.message}`,
      );
      throw new Error(`Schema validation failed:\n${errors.join('\n')}`);
    }
    expect(result.success).toBe(true);
  });

  it('generates dependency detail matching the type field', () => {
    const data = generate({
      repoCount: 50,
      orgCount: 2,
      avgDepsPerRepo: 8,
      circularDepChance: 0,
      phantomNodeChance: 0,
      archivedChance: 0,
    });

    for (const node of Object.values(data.graph)) {
      for (const dep of node.direct) {
        // The detail.type should match the top-level type
        expect(dep.detail.type).toBe(dep.type);
      }
    }
  });
});
