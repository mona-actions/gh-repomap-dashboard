/**
 * Barrel export for all Zustand stores and their selectors.
 *
 * Import from '@/store' for clean, centralized access:
 *
 * ```ts
 * import { useDataStore, useMetadata, useFilterStore, useUIStore } from '@/store';
 * ```
 */

// Data store
export {
  useDataStore,
  useMetadata,
  useStats,
  useUnresolved,
  useIsLoading,
  useLoadingStage,
  useDataError,
  useAllOrgs,
  useNodeCount,
  useEdgeCount,
} from './dataStore';
export type { DataState } from './dataStore';

// Filter store
export {
  useFilterStore,
  useSelectedOrgs,
  useDepTypes,
  useConfidenceFilter,
  useShowArchived,
  useClusterId,
  useSearchQuery,
} from './filterStore';
export type { FilterState } from './filterStore';

// UI store
export {
  useUIStore,
  useSidebarOpen,
  useSelectedRepo,
  useActiveView,
  useColorMode,
} from './uiStore';
export type { UIState } from './uiStore';
