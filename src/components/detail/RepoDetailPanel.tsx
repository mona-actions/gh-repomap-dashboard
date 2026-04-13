/**
 * RepoDetailPanel — Slide-over panel showing detailed repo information.
 *
 * Opens from the right side of the screen when a repo is selected
 * via `uiStore.selectedRepo`. Includes:
 * - Header with repo name, close button, and GitHub link
 * - Annotation badges (fork, template, archived)
 * - Tabbed interface: Direct | Transitive | Dependents | Unresolved
 *
 * a11y: focus trap, Escape to close, aria-label, focus restoration.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Label } from '@primer/react';
import {
  XIcon,
  LinkExternalIcon,
  RepoForkedIcon,
  RepoTemplateIcon,
  ArchiveIcon,
} from '@primer/octicons-react';
import { DirectDepsTab } from './DirectDepsTab';
import { TransitiveDepsTab } from './TransitiveDepsTab';
import { DependentsTab } from './DependentsTab';
import { UnresolvedTab } from './UnresolvedTab';
import { useUIStore } from '@/store/uiStore';
import { useDataStore } from '@/store/dataStore';

type TabId = 'direct' | 'transitive' | 'dependents' | 'unresolved';

interface TabConfig {
  id: TabId;
  label: string;
  count: number;
}

export function RepoDetailPanel() {
  const selectedRepo = useUIStore((s) => s.selectedRepo);
  const setSelectedRepo = useUIStore((s) => s.setSelectedRepo);
  const [activeTab, setActiveTab] = useState<TabId>('direct');
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Capture the element that triggered the panel open
  useEffect(() => {
    if (selectedRepo) {
      triggerRef.current = document.activeElement;
      // Focus the close button when the panel opens
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });
    }
  }, [selectedRepo]);

  // Close handler with focus restoration
  const handleClose = useCallback(() => {
    setSelectedRepo(null);
    // Restore focus to the element that opened the panel
    requestAnimationFrame(() => {
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    });
  }, [setSelectedRepo]);

  // Escape key handler
  useEffect(() => {
    if (!selectedRepo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedRepo, handleClose]);

  // Focus trap: cycle Tab within the panel
  useEffect(() => {
    if (!selectedRepo) return;

    const panel = panelRef.current;
    if (!panel) return;

    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTabTrap);
    return () => document.removeEventListener('keydown', handleTabTrap);
  }, [selectedRepo]);

  // Get node attributes for annotations
  const nodeAttrs = useMemo(() => {
    if (!selectedRepo) return null;
    const graph = useDataStore.getState().graph;
    if (!graph || !graph.hasNode(selectedRepo)) return null;
    return graph.getNodeAttributes(selectedRepo);
  }, [selectedRepo]);

  // Compute tab counts
  const tabCounts = useMemo(() => {
    if (!selectedRepo)
      return { direct: 0, transitive: 0, dependents: 0, unresolved: 0 };

    const graph = useDataStore.getState().graph;
    const unresolved = useDataStore.getState().unresolved;

    if (!graph || !graph.hasNode(selectedRepo)) {
      return { direct: 0, transitive: 0, dependents: 0, unresolved: 0 };
    }

    // Count unique outgoing targets for direct deps
    const outTargets = new Set<string>();
    graph.forEachOutEdge(selectedRepo, (_edge, _attrs, _source, target) => {
      outTargets.add(target);
    });

    // Count unique incoming sources for dependents
    const inSources = new Set<string>();
    graph.forEachInEdge(selectedRepo, (_edge, _attrs, source) => {
      inSources.add(source);
    });

    const attrs = graph.getNodeAttributes(selectedRepo);
    const transitive = (attrs.transitive as { repo: string }[]) ?? [];

    return {
      direct: graph.outDegree(selectedRepo),
      transitive: transitive.length,
      dependents: inSources.size,
      unresolved: (unresolved?.[selectedRepo] ?? []).length,
    };
  }, [selectedRepo]);

  // Reset to first tab when repo changes
  useEffect(() => {
    setActiveTab('direct');
  }, [selectedRepo]);

  if (!selectedRepo) return null;

  const tabs: TabConfig[] = [
    { id: 'direct', label: 'Direct', count: tabCounts.direct },
    { id: 'transitive', label: 'Transitive', count: tabCounts.transitive },
    { id: 'dependents', label: 'Dependents', count: tabCounts.dependents },
    { id: 'unresolved', label: 'Unresolved', count: tabCounts.unresolved },
  ];

  const forkOf = nodeAttrs?.fork_of as string | null;
  const templateFrom = nodeAttrs?.template_from as string | null;
  const archived = Boolean(nodeAttrs?.archived);
  const githubUrl = `https://github.com/${selectedRepo}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="detail-panel__backdrop"
        onClick={handleClose}
        role="presentation"
      />

      <aside
        ref={panelRef}
        className="detail-panel"
        role="dialog"
        aria-label={`Repository details for ${selectedRepo}`}
        aria-modal="true"
      >
        {/* Header */}
        <header className="detail-panel__header">
          <div className="detail-panel__title-row">
            <h2 className="detail-panel__title">{selectedRepo}</h2>
            <button
              ref={closeButtonRef}
              className="detail-panel__close"
              onClick={handleClose}
              aria-label="Close detail panel"
              title="Close"
            >
              <XIcon size={16} />
            </button>
          </div>

          <div className="detail-panel__meta">
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-panel__github-link"
            >
              View on GitHub <LinkExternalIcon size={12} />
            </a>
          </div>

          {/* Annotations */}
          {(forkOf || templateFrom || archived) && (
            <div className="detail-panel__annotations">
              {forkOf && (
                <Label variant="secondary" size="small">
                  <RepoForkedIcon size={12} /> Fork of {forkOf}
                </Label>
              )}
              {templateFrom && (
                <Label variant="accent" size="small">
                  <RepoTemplateIcon size={12} /> Template: {templateFrom}
                </Label>
              )}
              {archived && (
                <Label variant="attention" size="small">
                  <ArchiveIcon size={12} /> Archived
                </Label>
              )}
            </div>
          )}
        </header>

        {/* Tab bar */}
        <div
          className="detail-panel__tabs"
          role="tablist"
          aria-label="Detail tabs"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              className={`detail-panel__tab ${
                activeTab === tab.id ? 'detail-panel__tab--active' : ''
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div className="detail-panel__content">
          <div
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
          >
            {activeTab === 'direct' && (
              <DirectDepsTab repoName={selectedRepo} />
            )}
            {activeTab === 'transitive' && (
              <TransitiveDepsTab repoName={selectedRepo} />
            )}
            {activeTab === 'dependents' && (
              <DependentsTab repoName={selectedRepo} />
            )}
            {activeTab === 'unresolved' && (
              <UnresolvedTab repoName={selectedRepo} />
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
