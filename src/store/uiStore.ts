/**
 * Zustand store for transient UI state.
 *
 * Manages sidebar visibility, selected repo for detail panels,
 * active view tab, and color mode preference.
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ────────────────────────────────────────────────────────────────────────────
// State shape
// ────────────────────────────────────────────────────────────────────────────

export interface UIState {
  sidebarOpen: boolean;
  selectedRepo: string | null;
  activeView: 'dashboard' | 'list' | 'graph';
  colorMode: 'light' | 'dark' | 'auto';

  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSelectedRepo: (repo: string | null) => void;
  setActiveView: (view: UIState['activeView']) => void;
  setColorMode: (mode: UIState['colorMode']) => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Store
// ────────────────────────────────────────────────────────────────────────────

export const useUIStore = create<UIState>()(
  subscribeWithSelector((set) => ({
    sidebarOpen: true,
    selectedRepo: null,
    activeView: 'dashboard',
    colorMode: 'auto',

    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    toggleSidebar: () =>
      set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    setSelectedRepo: (repo) => set({ selectedRepo: repo }),

    setActiveView: (view) => set({ activeView: view }),

    setColorMode: (mode) => set({ colorMode: mode }),
  })),
);

// ────────────────────────────────────────────────────────────────────────────
// Fine-grained selectors
// ────────────────────────────────────────────────────────────────────────────

export const useSidebarOpen = () => useUIStore((s) => s.sidebarOpen);
export const useSelectedRepo = () => useUIStore((s) => s.selectedRepo);
export const useActiveView = () => useUIStore((s) => s.activeView);
export const useColorMode = () => useUIStore((s) => s.colorMode);
