import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@primer/react';
import { MemoryRouter } from 'react-router-dom';
import { MultiDirectedGraph } from 'graphology';
import { RepoDetailPanel } from '../RepoDetailPanel';
import { useUIStore } from '@/store/uiStore';
import { useDataStore } from '@/store/dataStore';

/* ── Test helpers ──────────────────────────────────────────────── */

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </ThemeProvider>,
  );
}

function buildTestGraph(): MultiDirectedGraph {
  const graph = new MultiDirectedGraph();

  graph.addNode('org-a/api', {
    org: 'org-a',
    label: 'api',
    archived: false,
    fork_of: null,
    template_from: null,
    dependents: 2,
    transitive: [],
  });

  graph.addNode('org-a/lib', {
    org: 'org-a',
    label: 'lib',
    archived: true,
    fork_of: 'org-b/lib-upstream',
    template_from: null,
    dependents: 0,
    transitive: [],
  });

  graph.addNode('org-b/web', {
    org: 'org-b',
    label: 'web',
    archived: false,
    fork_of: null,
    template_from: 'org-a/template',
    dependents: 1,
    transitive: [],
  });

  // org-a/api → org-a/lib (package dep)
  graph.addEdge('org-a/api', 'org-a/lib', {
    depType: 'package',
    confidence: 'high',
    sourceFile: 'package.json',
    version: '1.0.0',
  });

  // org-a/api → org-b/web (workflow dep)
  graph.addEdge('org-a/api', 'org-b/web', {
    depType: 'workflow',
    confidence: 'low',
    sourceFile: '.github/workflows/ci.yml',
    uses: 'org-b/web/.github/workflows/ci.yml@main',
  });

  // org-b/web → org-a/lib (action dep)
  graph.addEdge('org-b/web', 'org-a/lib', {
    depType: 'action',
    confidence: 'high',
    sourceFile: '.github/workflows/deploy.yml',
    uses: 'org-a/lib@v2',
  });

  return graph;
}

function setupStores(selectedRepo: string | null = null) {
  const graph = buildTestGraph();
  useDataStore.setState({
    graph,
    metadata: null,
    stats: null,
    unresolved: {
      'org-a/api': [
        {
          package_name: 'lodash',
          ecosystem: 'npm',
          version: '^4.0.0',
          reason: 'external package',
        },
      ],
    },
    allOrgs: ['org-a', 'org-b'],
    nodeCount: 3,
    edgeCount: 3,
    isLoading: false,
    loadingStage: 'ready',
    error: null,
  });

  useUIStore.setState({
    selectedRepo,
    sidebarOpen: true,
    activeView: 'dashboard',
    colorMode: 'light',
  });
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe('RepoDetailPanel', () => {
  beforeEach(() => {
    setupStores(null);
  });

  it('does not render when no repo is selected', () => {
    renderWithProviders(<RepoDetailPanel />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders when selectedRepo is set', () => {
    setupStores('org-a/api');
    renderWithProviders(<RepoDetailPanel />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows correct repo name in header', () => {
    setupStores('org-a/api');
    renderWithProviders(<RepoDetailPanel />);
    expect(screen.getByText('org-a/api')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    setupStores('org-a/api');
    renderWithProviders(<RepoDetailPanel />);
    expect(
      screen.getByLabelText('Repository details for org-a/api'),
    ).toBeInTheDocument();
  });

  it('shows GitHub link', () => {
    setupStores('org-a/api');
    renderWithProviders(<RepoDetailPanel />);
    const link = screen.getByText(/View on GitHub/);
    expect(link).toHaveAttribute('href', 'https://github.com/org-a/api');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('close button clears selectedRepo', async () => {
    const user = userEvent.setup();
    setupStores('org-a/api');
    renderWithProviders(<RepoDetailPanel />);

    await user.click(screen.getByLabelText('Close detail panel'));
    expect(useUIStore.getState().selectedRepo).toBeNull();
  });

  it('Escape key closes the panel', async () => {
    const user = userEvent.setup();
    setupStores('org-a/api');
    renderWithProviders(<RepoDetailPanel />);

    await user.keyboard('{Escape}');
    expect(useUIStore.getState().selectedRepo).toBeNull();
  });

  it('shows all four tabs', () => {
    setupStores('org-a/api');
    renderWithProviders(<RepoDetailPanel />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(tabs[0]).toHaveTextContent(/Direct/);
    expect(tabs[1]).toHaveTextContent(/Transitive/);
    expect(tabs[2]).toHaveTextContent(/Dependents/);
    expect(tabs[3]).toHaveTextContent(/Unresolved/);
  });

  it('shows correct tab counts', () => {
    setupStores('org-a/api');
    renderWithProviders(<RepoDetailPanel />);

    const tabs = screen.getAllByRole('tab');
    // org-a/api has 2 outgoing edges (direct deps)
    expect(tabs[0]).toHaveTextContent('Direct (2)');
    // No transitive deps
    expect(tabs[1]).toHaveTextContent('Transitive (0)');
    // org-a/api has 0 inbound edges
    expect(tabs[2]).toHaveTextContent('Dependents (0)');
    // 1 unresolved package
    expect(tabs[3]).toHaveTextContent('Unresolved (1)');
  });

  it('tab switching works', async () => {
    const user = userEvent.setup();
    setupStores('org-a/api');
    renderWithProviders(<RepoDetailPanel />);

    // Start on Direct tab
    expect(screen.getByLabelText('Direct dependencies')).toBeInTheDocument();

    // Switch to Dependents tab
    await user.click(screen.getByRole('tab', { name: /Dependents/ }));
    expect(screen.getByText('No dependents')).toBeInTheDocument();

    // Switch to Unresolved tab
    await user.click(screen.getByRole('tab', { name: /Unresolved/ }));
    expect(screen.getByText('lodash')).toBeInTheDocument();
  });

  it('shows archived badge for archived repo', () => {
    setupStores('org-a/lib');
    renderWithProviders(<RepoDetailPanel />);
    expect(screen.getByText(/Archived/)).toBeInTheDocument();
  });

  it('shows fork annotation', () => {
    setupStores('org-a/lib');
    renderWithProviders(<RepoDetailPanel />);
    expect(screen.getByText(/Fork of/)).toBeInTheDocument();
  });

  it('shows template annotation', () => {
    setupStores('org-b/web');
    renderWithProviders(<RepoDetailPanel />);
    expect(screen.getByText(/Template/)).toBeInTheDocument();
  });

  it('shows correct dependents count for org-a/lib', () => {
    setupStores('org-a/lib');
    renderWithProviders(<RepoDetailPanel />);

    const tabs = screen.getAllByRole('tab');
    // org-a/lib has 2 inbound edges from 2 unique repos
    expect(tabs[2]).toHaveTextContent('Dependents (2)');
  });
});
