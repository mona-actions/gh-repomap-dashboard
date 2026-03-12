import { describe, it, expect } from 'vitest';
import { getOrgColor, getOrgColorMap, DEP_TYPE_COLORS } from '../colors';

describe('colors', () => {
  describe('getOrgColor', () => {
    const orgs = ['alpha', 'bravo', 'charlie', 'delta', 'echo'];

    it('returns the same color for the same org (deterministic)', () => {
      const color1 = getOrgColor('bravo', orgs);
      const color2 = getOrgColor('bravo', orgs);
      expect(color1).toBe(color2);
    });

    it('returns different colors for different orgs (within palette)', () => {
      const colors = orgs.map((org) => getOrgColor(org, orgs));
      const unique = new Set(colors);
      expect(unique.size).toBe(orgs.length);
    });

    it('assigns colors based on sorted order, not input order', () => {
      const shuffled = ['echo', 'alpha', 'delta', 'bravo', 'charlie'];
      // Same org gets the same color regardless of input order
      expect(getOrgColor('alpha', orgs)).toBe(getOrgColor('alpha', shuffled));
      expect(getOrgColor('echo', orgs)).toBe(getOrgColor('echo', shuffled));
    });

    it('produces valid colors for >20 orgs (hash fallback)', () => {
      const manyOrgs = Array.from({ length: 25 }, (_, i) => `org-${i}`);
      // The 21st org (sorted) should get a hash-based HSL color
      const lastOrg = [...manyOrgs].sort()[20];
      const color = getOrgColor(lastOrg, manyOrgs);
      expect(color).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
    });

    it('returns a hex color for orgs within palette range', () => {
      const color = getOrgColor('alpha', orgs);
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('getOrgColorMap', () => {
    it('returns a Map with correct size', () => {
      const orgs = ['alpha', 'bravo', 'charlie'];
      const map = getOrgColorMap(orgs);
      expect(map.size).toBe(3);
    });

    it('contains an entry for every org', () => {
      const orgs = ['alpha', 'bravo', 'charlie'];
      const map = getOrgColorMap(orgs);
      for (const org of orgs) {
        expect(map.has(org)).toBe(true);
        expect(typeof map.get(org)).toBe('string');
      }
    });

    it('produces same colors as individual getOrgColor calls', () => {
      const orgs = ['alpha', 'bravo', 'charlie'];
      const map = getOrgColorMap(orgs);
      for (const org of orgs) {
        expect(map.get(org)).toBe(getOrgColor(org, orgs));
      }
    });
  });

  describe('DEP_TYPE_COLORS', () => {
    const expectedTypes = [
      'package',
      'workflow',
      'action',
      'submodule',
      'docker',
      'terraform',
      'script',
    ];

    it('has all 7 dependency types', () => {
      expect(Object.keys(DEP_TYPE_COLORS).sort()).toEqual(
        expectedTypes.sort(),
      );
    });

    it('has valid hex color strings for all types', () => {
      for (const color of Object.values(DEP_TYPE_COLORS)) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      }
    });
  });
});
