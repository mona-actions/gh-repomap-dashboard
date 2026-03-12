/**
 * Zustand store for filter state with two-way URL synchronization.
 *
 * Filters control which nodes and edges are visible in the graph:
 * - selectedOrgs: show only repos from these orgs (empty = show all)
 * - depTypes: show only these dependency types (empty = show all)
 * - confidenceFilter: 'all' or 'high' only
 * - showArchived: whether to display archived repos
 * - clusterId: isolate a specific cluster
 * - searchQuery: full-text search via MiniSearch
 *
 * URL sync keeps the browser address bar in sync with the filter state
 * so users can share filtered views via links.
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ────────────────────────────────────────────────────────────────────────────
// State shape
// ────────────────────────────────────────────────────────────────────────────

export interface FilterState {
  // Filter values
  selectedOrgs: string[];
  depTypes: string[];
  ecosystems: string[];
  confidenceFilter: 'all' | 'high';
  showArchived: boolean;
  clusterId: number | null;
  searchQuery: string;

  // Actions
  setSelectedOrgs: (orgs: string[]) => void;
  toggleOrg: (org: string) => void;
  setDepTypes: (types: string[]) => void;
  toggleDepType: (type: string) => void;
  setEcosystems: (ecosystems: string[]) => void;
  toggleEcosystem: (ecosystem: string) => void;
  setConfidenceFilter: (filter: 'all' | 'high') => void;
  setShowArchived: (show: boolean) => void;
  setClusterId: (id: number | null) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;

  // URL sync
  syncToUrl: () => void;
  syncFromUrl: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Default filter values
// ────────────────────────────────────────────────────────────────────────────

/** Shape of filter-only state (no actions). */
export interface FilterValues {
  selectedOrgs: string[];
  depTypes: string[];
  ecosystems: string[];
  confidenceFilter: 'all' | 'high';
  showArchived: boolean;
  clusterId: number | null;
  searchQuery: string;
}

const DEFAULT_FILTERS: FilterValues = {
  selectedOrgs: [],
  depTypes: [],
  ecosystems: [],
  confidenceFilter: 'all',
  showArchived: true,
  clusterId: null,
  searchQuery: '',
};

// ────────────────────────────────────────────────────────────────────────────
// URL ↔ State serialization
// ────────────────────────────────────────────────────────────────────────────

/**
 * Serialize filter state to URLSearchParams.
 * Only non-default values are written (keeps URLs clean).
 */
export function stateToParams(
  state: FilterValues,
): URLSearchParams {
  const params = new URLSearchParams();

  if (state.selectedOrgs.length > 0) {
    params.set('orgs', state.selectedOrgs.join(','));
  }
  if (state.depTypes.length > 0) {
    params.set('types', state.depTypes.join(','));
  }
  if (state.ecosystems.length > 0) {
    params.set('ecosystems', state.ecosystems.join(','));
  }
  if (state.confidenceFilter !== 'all') {
    params.set('confidence', state.confidenceFilter);
  }
  if (!state.showArchived) {
    params.set('archived', 'false');
  }
  if (state.clusterId !== null) {
    params.set('cluster', String(state.clusterId));
  }
  if (state.searchQuery) {
    params.set('q', state.searchQuery);
  }

  return params;
}

/**
 * Deserialize URLSearchParams into partial filter state.
 */
export function paramsToState(
  params: URLSearchParams,
): Partial<FilterValues> {
  const state: Partial<FilterValues> = {};

  const orgs = params.get('orgs');
  if (orgs) {
    state.selectedOrgs = orgs.split(',').filter(Boolean);
  }

  const types = params.get('types');
  if (types) {
    state.depTypes = types.split(',').filter(Boolean);
  }

  const ecosystems = params.get('ecosystems');
  if (ecosystems) {
    state.ecosystems = ecosystems.split(',').filter(Boolean);
  }

  const confidence = params.get('confidence');
  if (confidence === 'high') {
    state.confidenceFilter = 'high';
  }

  const archived = params.get('archived');
  if (archived === 'false') {
    state.showArchived = false;
  }

  const cluster = params.get('cluster');
  if (cluster !== null) {
    const parsed = parseInt(cluster, 10);
    if (!Number.isNaN(parsed)) {
      state.clusterId = parsed;
    }
  }

  const q = params.get('q');
  if (q) {
    state.searchQuery = q;
  }

  return state;
}

// ────────────────────────────────────────────────────────────────────────────
// Debounced URL push
// ────────────────────────────────────────────────────────────────────────────

let syncTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSyncToUrl(fn: () => void): void {
  if (syncTimer !== null) {
    clearTimeout(syncTimer);
  }
  syncTimer = setTimeout(fn, 300);
}

// ────────────────────────────────────────────────────────────────────────────
// Store
// ────────────────────────────────────────────────────────────────────────────

export const useFilterStore = create<FilterState>()(
  subscribeWithSelector((set, get) => ({
    ...DEFAULT_FILTERS,

    setSelectedOrgs: (orgs) => set({ selectedOrgs: orgs }),

    toggleOrg: (org) =>
      set((state) => ({
        selectedOrgs: state.selectedOrgs.includes(org)
          ? state.selectedOrgs.filter((o) => o !== org)
          : [...state.selectedOrgs, org],
      })),

    setDepTypes: (types) => set({ depTypes: types }),

    toggleDepType: (type) =>
      set((state) => ({
        depTypes: state.depTypes.includes(type)
          ? state.depTypes.filter((t) => t !== type)
          : [...state.depTypes, type],
      })),

    setEcosystems: (ecosystems) => set({ ecosystems }),

    toggleEcosystem: (ecosystem) =>
      set((state) => ({
        ecosystems: state.ecosystems.includes(ecosystem)
          ? state.ecosystems.filter((e) => e !== ecosystem)
          : [...state.ecosystems, ecosystem],
      })),

    setConfidenceFilter: (filter) => set({ confidenceFilter: filter }),

    setShowArchived: (show) => set({ showArchived: show }),

    setClusterId: (id) => set({ clusterId: id }),

    setSearchQuery: (query) => set({ searchQuery: query }),

    resetFilters: () => set(DEFAULT_FILTERS),

    syncToUrl: () => {
      if (typeof window === 'undefined') return;
      const state = get();
      const params = stateToParams({
        selectedOrgs: state.selectedOrgs,
        depTypes: state.depTypes,
        ecosystems: state.ecosystems,
        confidenceFilter: state.confidenceFilter,
        showArchived: state.showArchived,
        clusterId: state.clusterId,
        searchQuery: state.searchQuery,
      });
      const search = params.toString();
      const url = search
        ? `${window.location.pathname}?${search}`
        : window.location.pathname;
      window.history.replaceState(null, '', url);
    },

    syncFromUrl: () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const parsed = paramsToState(params);
      if (Object.keys(parsed).length > 0) {
        set(parsed);
      }
    },
  })),
);

// ────────────────────────────────────────────────────────────────────────────
// Auto-sync: subscribe to filter changes → debounced URL push
// ────────────────────────────────────────────────────────────────────────────

// Pick only filter-relevant keys for comparison
const filterSelector = (s: FilterState) => ({
  selectedOrgs: s.selectedOrgs,
  depTypes: s.depTypes,
  ecosystems: s.ecosystems,
  confidenceFilter: s.confidenceFilter,
  showArchived: s.showArchived,
  clusterId: s.clusterId,
  searchQuery: s.searchQuery,
});

useFilterStore.subscribe(filterSelector, () => {
  debouncedSyncToUrl(() => {
    useFilterStore.getState().syncToUrl();
  });
});

// Hydrate from URL on module load
useFilterStore.getState().syncFromUrl();

// ────────────────────────────────────────────────────────────────────────────
// Fine-grained selectors
// ────────────────────────────────────────────────────────────────────────────

export const useSelectedOrgs = () => useFilterStore((s) => s.selectedOrgs);
export const useDepTypes = () => useFilterStore((s) => s.depTypes);
export const useConfidenceFilter = () =>
  useFilterStore((s) => s.confidenceFilter);
export const useShowArchived = () => useFilterStore((s) => s.showArchived);
export const useClusterId = () => useFilterStore((s) => s.clusterId);
export const useSearchQuery = () => useFilterStore((s) => s.searchQuery);
