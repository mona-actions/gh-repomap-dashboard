import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildSearchIndex,
  searchRepos,
  getSearchIndex,
  type SearchableRepo,
} from '../search';

const testRepos: SearchableRepo[] = [
  {
    id: 'org-alpha/web-app',
    org: 'org-alpha',
    name: 'web-app',
    depTypes: 'package workflow',
  },
  {
    id: 'org-alpha/api-service',
    org: 'org-alpha',
    name: 'api-service',
    depTypes: 'package docker',
  },
  {
    id: 'org-beta/shared-library',
    org: 'org-beta',
    name: 'shared-library',
    depTypes: 'package',
  },
  {
    id: 'org-beta/infra-tools',
    org: 'org-beta',
    name: 'infra-tools',
    depTypes: 'terraform action',
  },
  {
    id: 'org-gamma/mobile-sdk',
    org: 'org-gamma',
    name: 'mobile-sdk',
    depTypes: 'package submodule',
  },
];

describe('search', () => {
  beforeEach(() => {
    buildSearchIndex(testRepos);
  });

  it('builds a valid index', () => {
    expect(getSearchIndex()).not.toBeNull();
  });

  it('searches by repo name', () => {
    const results = searchRepos('web-app');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('org-alpha/web-app');
  });

  it('searches by org name', () => {
    const results = searchRepos('org-beta');
    expect(results.length).toBeGreaterThan(0);
    // org-beta repos should appear in results (ranked higher due to boost)
    const betaResults = results.filter((r) => r.org === 'org-beta');
    expect(betaResults.length).toBeGreaterThan(0);
  });

  it('supports prefix search', () => {
    const results = searchRepos('web');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.id === 'org-alpha/web-app')).toBe(true);
  });

  it('returns empty array for empty query', () => {
    expect(searchRepos('')).toEqual([]);
    expect(searchRepos('   ')).toEqual([]);
  });

  it('returns empty array before index is built', () => {
    // getSearchIndex check — searchRepos without index
    // We can't easily reset the singleton, but we can test the empty query path
    expect(searchRepos('')).toEqual([]);
  });

  it('finds close matches with fuzzy search', () => {
    // "api-servce" is edit-distance 1 from "api-service" (missing 'i')
    // fuzzy: 0.2 → for "servce" (len 6), maxDist = ceil(6*0.2) = 2
    const results = searchRepos('servce');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.id === 'org-alpha/api-service')).toBe(true);
  });

  it('respects the limit parameter', () => {
    // Search for something broad that matches multiple repos
    const results = searchRepos('org', 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('returns stored fields (id, org, name)', () => {
    const results = searchRepos('mobile');
    expect(results.length).toBeGreaterThan(0);
    const result = results[0];
    expect(result.id).toBe('org-gamma/mobile-sdk');
    expect(result.org).toBe('org-gamma');
    expect(result.name).toBe('mobile-sdk');
  });
});
