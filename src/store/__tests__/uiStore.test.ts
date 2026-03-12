/**
 * Tests for the UI store (uiStore.ts).
 *
 * Validates initial state, sidebar toggle, view selection,
 * selected repo, and color mode.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset to defaults
    useUIStore.setState({
      sidebarOpen: true,
      selectedRepo: null,
      activeView: 'dashboard',
      colorMode: 'auto',
    });
  });

  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = useUIStore.getState();
      expect(state.sidebarOpen).toBe(true);
      expect(state.selectedRepo).toBeNull();
      expect(state.activeView).toBe('dashboard');
      expect(state.colorMode).toBe('auto');
    });
  });

  describe('sidebar', () => {
    it('setSidebarOpen opens/closes the sidebar', () => {
      useUIStore.getState().setSidebarOpen(false);
      expect(useUIStore.getState().sidebarOpen).toBe(false);

      useUIStore.getState().setSidebarOpen(true);
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it('toggleSidebar flips the sidebar state', () => {
      expect(useUIStore.getState().sidebarOpen).toBe(true);

      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);

      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('selectedRepo', () => {
    it('sets a selected repo', () => {
      useUIStore.getState().setSelectedRepo('org-a/web-app');
      expect(useUIStore.getState().selectedRepo).toBe('org-a/web-app');
    });

    it('clears selected repo with null', () => {
      useUIStore.getState().setSelectedRepo('org-a/web-app');
      useUIStore.getState().setSelectedRepo(null);
      expect(useUIStore.getState().selectedRepo).toBeNull();
    });
  });

  describe('activeView', () => {
    it('switches to list view', () => {
      useUIStore.getState().setActiveView('list');
      expect(useUIStore.getState().activeView).toBe('list');
    });

    it('switches to graph view', () => {
      useUIStore.getState().setActiveView('graph');
      expect(useUIStore.getState().activeView).toBe('graph');
    });

    it('switches back to dashboard', () => {
      useUIStore.getState().setActiveView('graph');
      useUIStore.getState().setActiveView('dashboard');
      expect(useUIStore.getState().activeView).toBe('dashboard');
    });
  });

  describe('colorMode', () => {
    it('sets to light mode', () => {
      useUIStore.getState().setColorMode('light');
      expect(useUIStore.getState().colorMode).toBe('light');
    });

    it('sets to dark mode', () => {
      useUIStore.getState().setColorMode('dark');
      expect(useUIStore.getState().colorMode).toBe('dark');
    });

    it('sets back to auto', () => {
      useUIStore.getState().setColorMode('dark');
      useUIStore.getState().setColorMode('auto');
      expect(useUIStore.getState().colorMode).toBe('auto');
    });
  });

  describe('subscribeWithSelector', () => {
    it('allows subscribing to a specific slice', () => {
      const views: string[] = [];

      const unsub = useUIStore.subscribe(
        (s) => s.activeView,
        (view) => {
          views.push(view);
        },
      );

      useUIStore.getState().setActiveView('list');
      useUIStore.getState().setActiveView('graph');

      expect(views).toEqual(['list', 'graph']);

      unsub();
    });
  });
});
