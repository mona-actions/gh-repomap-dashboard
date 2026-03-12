/**
 * Tests for the filter store (filterStore.ts).
 *
 * Validates all filter actions, toggle semantics, resetFilters,
 * and two-way URL synchronization (state → params, params → state, round-trip).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useFilterStore, stateToParams, paramsToState } from '../filterStore';

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('filterStore', () => {
  beforeEach(() => {
    useFilterStore.getState().resetFilters();
  });

  describe('initial state', () => {
    it('has empty filters (show all)', () => {
      const state = useFilterStore.getState();
      expect(state.selectedOrgs).toEqual([]);
      expect(state.depTypes).toEqual([]);
      expect(state.confidenceFilter).toBe('all');
      expect(state.showArchived).toBe(true);
      expect(state.clusterId).toBeNull();
      expect(state.searchQuery).toBe('');
    });
  });

  describe('setSelectedOrgs', () => {
    it('sets the selected orgs', () => {
      useFilterStore.getState().setSelectedOrgs(['org-a', 'org-b']);
      expect(useFilterStore.getState().selectedOrgs).toEqual([
        'org-a',
        'org-b',
      ]);
    });

    it('replaces previous selection', () => {
      useFilterStore.getState().setSelectedOrgs(['org-a']);
      useFilterStore.getState().setSelectedOrgs(['org-b', 'org-c']);
      expect(useFilterStore.getState().selectedOrgs).toEqual([
        'org-b',
        'org-c',
      ]);
    });
  });

  describe('toggleOrg', () => {
    it('adds an org when not present', () => {
      useFilterStore.getState().toggleOrg('org-a');
      expect(useFilterStore.getState().selectedOrgs).toEqual(['org-a']);
    });

    it('removes an org when already present', () => {
      useFilterStore.getState().setSelectedOrgs(['org-a', 'org-b']);
      useFilterStore.getState().toggleOrg('org-a');
      expect(useFilterStore.getState().selectedOrgs).toEqual(['org-b']);
    });

    it('toggles to empty when last org is removed', () => {
      useFilterStore.getState().setSelectedOrgs(['org-a']);
      useFilterStore.getState().toggleOrg('org-a');
      expect(useFilterStore.getState().selectedOrgs).toEqual([]);
    });
  });

  describe('setDepTypes', () => {
    it('sets dependency types', () => {
      useFilterStore.getState().setDepTypes(['package', 'workflow']);
      expect(useFilterStore.getState().depTypes).toEqual([
        'package',
        'workflow',
      ]);
    });
  });

  describe('toggleDepType', () => {
    it('adds a type when not present', () => {
      useFilterStore.getState().toggleDepType('docker');
      expect(useFilterStore.getState().depTypes).toEqual(['docker']);
    });

    it('removes a type when already present', () => {
      useFilterStore.getState().setDepTypes(['package', 'docker']);
      useFilterStore.getState().toggleDepType('package');
      expect(useFilterStore.getState().depTypes).toEqual(['docker']);
    });
  });

  describe('setConfidenceFilter', () => {
    it('sets confidence to high', () => {
      useFilterStore.getState().setConfidenceFilter('high');
      expect(useFilterStore.getState().confidenceFilter).toBe('high');
    });

    it('sets confidence back to all', () => {
      useFilterStore.getState().setConfidenceFilter('high');
      useFilterStore.getState().setConfidenceFilter('all');
      expect(useFilterStore.getState().confidenceFilter).toBe('all');
    });
  });

  describe('setShowArchived', () => {
    it('toggles archived visibility', () => {
      useFilterStore.getState().setShowArchived(false);
      expect(useFilterStore.getState().showArchived).toBe(false);

      useFilterStore.getState().setShowArchived(true);
      expect(useFilterStore.getState().showArchived).toBe(true);
    });
  });

  describe('setClusterId', () => {
    it('sets a cluster ID', () => {
      useFilterStore.getState().setClusterId(5);
      expect(useFilterStore.getState().clusterId).toBe(5);
    });

    it('clears cluster ID with null', () => {
      useFilterStore.getState().setClusterId(5);
      useFilterStore.getState().setClusterId(null);
      expect(useFilterStore.getState().clusterId).toBeNull();
    });
  });

  describe('setSearchQuery', () => {
    it('sets a search query', () => {
      useFilterStore.getState().setSearchQuery('react');
      expect(useFilterStore.getState().searchQuery).toBe('react');
    });
  });

  describe('resetFilters', () => {
    it('clears all filters back to defaults', () => {
      // Set a bunch of filters
      useFilterStore.getState().setSelectedOrgs(['org-a']);
      useFilterStore.getState().setDepTypes(['package']);
      useFilterStore.getState().setConfidenceFilter('high');
      useFilterStore.getState().setShowArchived(false);
      useFilterStore.getState().setClusterId(3);
      useFilterStore.getState().setSearchQuery('test');

      // Reset
      useFilterStore.getState().resetFilters();

      const state = useFilterStore.getState();
      expect(state.selectedOrgs).toEqual([]);
      expect(state.depTypes).toEqual([]);
      expect(state.confidenceFilter).toBe('all');
      expect(state.showArchived).toBe(true);
      expect(state.clusterId).toBeNull();
      expect(state.searchQuery).toBe('');
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// URL Sync Tests
// ────────────────────────────────────────────────────────────────────────────

describe('URL sync helpers', () => {
  describe('stateToParams', () => {
    it('produces empty params for default state', () => {
      const params = stateToParams({
        selectedOrgs: [],
        depTypes: [],
        ecosystems: [],
        confidenceFilter: 'all',
        showArchived: true,
        clusterId: null,
        searchQuery: '',
      });
      expect(params.toString()).toBe('');
    });

    it('serializes selectedOrgs', () => {
      const params = stateToParams({
        selectedOrgs: ['org-a', 'org-b'],
        depTypes: [],
        ecosystems: [],
        confidenceFilter: 'all',
        showArchived: true,
        clusterId: null,
        searchQuery: '',
      });
      expect(params.get('orgs')).toBe('org-a,org-b');
    });

    it('serializes depTypes', () => {
      const params = stateToParams({
        selectedOrgs: [],
        depTypes: ['package', 'workflow'],
        ecosystems: [],
        confidenceFilter: 'all',
        showArchived: true,
        clusterId: null,
        searchQuery: '',
      });
      expect(params.get('types')).toBe('package,workflow');
    });

    it('serializes confidence filter', () => {
      const params = stateToParams({
        selectedOrgs: [],
        depTypes: [],
        ecosystems: [],
        confidenceFilter: 'high',
        showArchived: true,
        clusterId: null,
        searchQuery: '',
      });
      expect(params.get('confidence')).toBe('high');
    });

    it('serializes showArchived=false', () => {
      const params = stateToParams({
        selectedOrgs: [],
        depTypes: [],
        ecosystems: [],
        confidenceFilter: 'all',
        showArchived: false,
        clusterId: null,
        searchQuery: '',
      });
      expect(params.get('archived')).toBe('false');
    });

    it('does not include archived param when showArchived=true (default)', () => {
      const params = stateToParams({
        selectedOrgs: [],
        depTypes: [],
        ecosystems: [],
        confidenceFilter: 'all',
        showArchived: true,
        clusterId: null,
        searchQuery: '',
      });
      expect(params.has('archived')).toBe(false);
    });

    it('serializes clusterId', () => {
      const params = stateToParams({
        selectedOrgs: [],
        depTypes: [],
        ecosystems: [],
        confidenceFilter: 'all',
        showArchived: true,
        clusterId: 7,
        searchQuery: '',
      });
      expect(params.get('cluster')).toBe('7');
    });

    it('serializes searchQuery', () => {
      const params = stateToParams({
        selectedOrgs: [],
        depTypes: [],
        ecosystems: [],
        confidenceFilter: 'all',
        showArchived: true,
        clusterId: null,
        searchQuery: 'react',
      });
      expect(params.get('q')).toBe('react');
    });

    it('serializes all filters together', () => {
      const params = stateToParams({
        selectedOrgs: ['alpha', 'beta'],
        depTypes: ['package'],
        ecosystems: [],
        confidenceFilter: 'high',
        showArchived: false,
        clusterId: 2,
        searchQuery: 'core',
      });

      expect(params.get('orgs')).toBe('alpha,beta');
      expect(params.get('types')).toBe('package');
      expect(params.get('confidence')).toBe('high');
      expect(params.get('archived')).toBe('false');
      expect(params.get('cluster')).toBe('2');
      expect(params.get('q')).toBe('core');
    });
  });

  describe('paramsToState', () => {
    it('returns empty object for empty params', () => {
      const state = paramsToState(new URLSearchParams(''));
      expect(Object.keys(state)).toHaveLength(0);
    });

    it('parses orgs', () => {
      const state = paramsToState(new URLSearchParams('orgs=org-a,org-b'));
      expect(state.selectedOrgs).toEqual(['org-a', 'org-b']);
    });

    it('parses types', () => {
      const state = paramsToState(
        new URLSearchParams('types=package,workflow'),
      );
      expect(state.depTypes).toEqual(['package', 'workflow']);
    });

    it('parses confidence', () => {
      const state = paramsToState(new URLSearchParams('confidence=high'));
      expect(state.confidenceFilter).toBe('high');
    });

    it('parses archived=false', () => {
      const state = paramsToState(new URLSearchParams('archived=false'));
      expect(state.showArchived).toBe(false);
    });

    it('parses cluster', () => {
      const state = paramsToState(new URLSearchParams('cluster=3'));
      expect(state.clusterId).toBe(3);
    });

    it('parses search query', () => {
      const state = paramsToState(new URLSearchParams('q=react'));
      expect(state.searchQuery).toBe('react');
    });

    it('ignores invalid cluster value', () => {
      const state = paramsToState(new URLSearchParams('cluster=abc'));
      expect(state.clusterId).toBeUndefined();
    });

    it('filters empty org strings from comma-separated values', () => {
      const state = paramsToState(new URLSearchParams('orgs=org-a,,org-b,'));
      expect(state.selectedOrgs).toEqual(['org-a', 'org-b']);
    });
  });

  describe('round-trip fidelity', () => {
    it('serializes and deserializes full state correctly', () => {
      const original = {
        selectedOrgs: ['alpha', 'beta'],
        depTypes: ['package', 'docker'],
        ecosystems: [],
        confidenceFilter: 'high' as const,
        showArchived: false,
        clusterId: 5,
        searchQuery: 'shared-lib',
      };

      const params = stateToParams(original);
      const restored = paramsToState(params);

      expect(restored.selectedOrgs).toEqual(original.selectedOrgs);
      expect(restored.depTypes).toEqual(original.depTypes);
      expect(restored.confidenceFilter).toBe(original.confidenceFilter);
      expect(restored.showArchived).toBe(original.showArchived);
      expect(restored.clusterId).toBe(original.clusterId);
      expect(restored.searchQuery).toBe(original.searchQuery);
    });

    it('round-trips default state to empty params', () => {
      const defaults = {
        selectedOrgs: [] as string[],
        depTypes: [] as string[],
        ecosystems: [] as string[],
        confidenceFilter: 'all' as const,
        showArchived: true,
        clusterId: null,
        searchQuery: '',
      };

      const params = stateToParams(defaults);
      expect(params.toString()).toBe('');

      const restored = paramsToState(params);
      expect(Object.keys(restored)).toHaveLength(0);
    });
  });
});

describe('filterStore URL sync (integration)', () => {
  let originalReplaceState: typeof window.history.replaceState;

  beforeEach(() => {
    useFilterStore.getState().resetFilters();
    originalReplaceState = window.history.replaceState;
    // Clear URL params
    window.history.replaceState(null, '', window.location.pathname);
  });

  afterEach(() => {
    window.history.replaceState = originalReplaceState;
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('syncToUrl writes filter state to URL', () => {
    const spy = vi.spyOn(window.history, 'replaceState');

    useFilterStore.getState().setSelectedOrgs(['org-x']);
    useFilterStore.getState().syncToUrl();

    expect(spy).toHaveBeenCalled();
    const calledUrl = spy.mock.calls[spy.mock.calls.length - 1][2] as string;
    expect(calledUrl).toContain('orgs=org-x');
  });

  it('syncFromUrl reads URL params into store', () => {
    // Set URL first
    window.history.replaceState(
      null,
      '',
      '?orgs=alpha,beta&confidence=high&cluster=2',
    );

    useFilterStore.getState().syncFromUrl();

    const state = useFilterStore.getState();
    expect(state.selectedOrgs).toEqual(['alpha', 'beta']);
    expect(state.confidenceFilter).toBe('high');
    expect(state.clusterId).toBe(2);
  });
});
