/**
 * Tests for the data store (dataStore.ts).
 *
 * Validates initial state, loading stage transitions, error handling,
 * ProcessResult deserialization, and org extraction from graph attributes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useDataStore } from '../dataStore';
import { processFile } from '../../utils/dataProcessor';
import { generate } from '../../test/fixtures/generate';

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/** Generate a small ProcessResult from synthetic data. */
function makeProcessResult() {
  const data = generate({
    repoCount: 10,
    orgCount: 3,
    avgDepsPerRepo: 2,
    circularDepChance: 0,
    phantomNodeChance: 0,
    archivedChance: 0,
  });
  return processFile(JSON.stringify(data));
}

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('dataStore', () => {
  beforeEach(() => {
    // Reset to initial state before each test
    useDataStore.getState().reset();
  });

  it('has correct initial state', () => {
    const state = useDataStore.getState();
    expect(state.graph).toBeNull();
    expect(state.metadata).toBeNull();
    expect(state.stats).toBeNull();
    expect(state.unresolved).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.loadingStage).toBe('idle');
    expect(state.error).toBeNull();
    expect(state.allOrgs).toEqual([]);
    expect(state.nodeCount).toBe(0);
    expect(state.edgeCount).toBe(0);
  });

  describe('setLoadingStage', () => {
    it('sets isLoading=true for active stages', () => {
      const { setLoadingStage } = useDataStore.getState();

      for (const stage of [
        'reading',
        'parsing',
        'validating',
        'building',
      ] as const) {
        setLoadingStage(stage);
        const state = useDataStore.getState();
        expect(state.loadingStage).toBe(stage);
        expect(state.isLoading).toBe(true);
      }
    });

    it('sets isLoading=false for terminal stages', () => {
      const { setLoadingStage } = useDataStore.getState();

      for (const stage of ['idle', 'ready', 'error'] as const) {
        setLoadingStage('building'); // first set to loading
        setLoadingStage(stage);
        const state = useDataStore.getState();
        expect(state.loadingStage).toBe(stage);
        expect(state.isLoading).toBe(false);
      }
    });

    it('transitions through stages correctly', () => {
      const { setLoadingStage } = useDataStore.getState();
      const stages = [
        'reading',
        'parsing',
        'validating',
        'building',
        'ready',
      ] as const;

      for (const stage of stages) {
        setLoadingStage(stage);
        expect(useDataStore.getState().loadingStage).toBe(stage);
      }
    });
  });

  describe('setError', () => {
    it('sets error message and transitions to error stage', () => {
      useDataStore.getState().setLoadingStage('building');
      useDataStore.getState().setError('Something went wrong');

      const state = useDataStore.getState();
      expect(state.error).toBe('Something went wrong');
      expect(state.loadingStage).toBe('error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('loadFromProcessResult', () => {
    it('deserializes graph and sets all fields', () => {
      const result = makeProcessResult();
      useDataStore.getState().loadFromProcessResult(result);

      const state = useDataStore.getState();
      expect(state.graph).not.toBeNull();
      expect(state.metadata).toEqual(result.metadata);
      expect(state.stats).toEqual(result.stats);
      expect(state.unresolved).toEqual(result.unresolved);
      expect(state.nodeCount).toBe(result.nodeCount);
      expect(state.edgeCount).toBe(result.edgeCount);
      expect(state.loadingStage).toBe('ready');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('extracts allOrgs from graph node attributes', () => {
      const result = makeProcessResult();
      useDataStore.getState().loadFromProcessResult(result);

      const { allOrgs, graph } = useDataStore.getState();

      // allOrgs should be sorted alphabetically
      const sorted = [...allOrgs].sort();
      expect(allOrgs).toEqual(sorted);

      // Every org in allOrgs should exist in at least one node
      const graphOrgs = new Set<string>();
      graph!.forEachNode((_n, attrs) => {
        if (attrs.org) graphOrgs.add(attrs.org as string);
      });

      expect(allOrgs.length).toBe(graphOrgs.size);
      for (const org of allOrgs) {
        expect(graphOrgs.has(org)).toBe(true);
      }
    });

    it('sets nodeCount and edgeCount from ProcessResult', () => {
      const result = makeProcessResult();
      useDataStore.getState().loadFromProcessResult(result);

      const state = useDataStore.getState();
      expect(state.nodeCount).toBe(result.nodeCount);
      expect(state.edgeCount).toBe(result.edgeCount);

      // Graph instance should also match
      expect(state.graph!.order).toBe(result.nodeCount);
      expect(state.graph!.size).toBe(result.edgeCount);
    });

    it('clears any previous error', () => {
      useDataStore.getState().setError('old error');
      expect(useDataStore.getState().error).toBe('old error');

      const result = makeProcessResult();
      useDataStore.getState().loadFromProcessResult(result);
      expect(useDataStore.getState().error).toBeNull();
    });
  });

  describe('reset', () => {
    it('clears all state back to initial', () => {
      // Load some data first
      const result = makeProcessResult();
      useDataStore.getState().loadFromProcessResult(result);

      // Verify it's loaded
      expect(useDataStore.getState().graph).not.toBeNull();

      // Reset
      useDataStore.getState().reset();

      const state = useDataStore.getState();
      expect(state.graph).toBeNull();
      expect(state.metadata).toBeNull();
      expect(state.stats).toBeNull();
      expect(state.unresolved).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.loadingStage).toBe('idle');
      expect(state.error).toBeNull();
      expect(state.allOrgs).toEqual([]);
      expect(state.nodeCount).toBe(0);
      expect(state.edgeCount).toBe(0);
    });
  });

  describe('subscribeWithSelector', () => {
    it('allows subscribing to a specific slice', () => {
      const stages: string[] = [];

      const unsub = useDataStore.subscribe(
        (s) => s.loadingStage,
        (stage) => {
          stages.push(stage);
        },
      );

      useDataStore.getState().setLoadingStage('reading');
      useDataStore.getState().setLoadingStage('parsing');
      useDataStore.getState().setLoadingStage('ready');

      expect(stages).toEqual(['reading', 'parsing', 'ready']);

      unsub();
    });
  });
});
