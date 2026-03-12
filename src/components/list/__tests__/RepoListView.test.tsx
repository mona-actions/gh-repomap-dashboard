/**
 * Tests for the RepoListView component.
 *
 * Verifies that the virtualized table renders repo rows,
 * column headers with sort indicators, and row selection.
 *
 * Uses Zustand's direct state setting for store mocking.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiDirectedGraph } from 'graphology';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';
import { useFilterStore } from '@/store/filterStore';

// Must mock the virtualizer since happy-dom doesn't support layout
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 20) }, (_, i) => ({
        index: i,
        start: i * 48,
        size: 48,
        end: (i + 1) * 48,
        key: i,
        lane: 0,
      })),
    getTotalSize: () => count * 48,
    scrollToIndex: vi.fn(),
  }),
}));

// Import after mock
const { RepoListView } = await import('../RepoListView');

function buildTestGraph(): MultiDirectedGraph {
  const graph = new MultiDirectedGraph();

  graph.addNode('org-alpha/api-1', {
    org: 'org-alpha',
    label: 'org-alpha/api-1',
    archived: false,
    hidden: false,
  });
  graph.addNode('org-alpha/lib-2', {
    org: 'org-alpha',
    label: 'org-alpha/lib-2',
    archived: true,
    hidden: false,
  });
  graph.addNode('org-beta/service-1', {
    org: 'org-beta',
    label: 'org-beta/service-1',
    archived: false,
    hidden: false,
  });

  // api-1 depends on lib-2 (package)
  graph.addEdge('org-alpha/api-1', 'org-alpha/lib-2', {
    depType: 'package',
    confidence: 'high',
    hidden: false,
  });
  // service-1 depends on api-1 (workflow)
  graph.addEdge('org-beta/service-1', 'org-alpha/api-1', {
    depType: 'workflow',
    confidence: 'high',
    hidden: false,
  });

  return graph;
}

describe('RepoListView', () => {
  beforeEach(() => {
    // Set up data store with test graph
    const graph = buildTestGraph();
    useDataStore.setState({
      graph,
      allOrgs: ['org-alpha', 'org-beta'],
      nodeCount: 3,
      edgeCount: 2,
      loadingStage: 'ready',
      isLoading: false,
      error: null,
    });

    // Reset UI and filter stores
    useUIStore.setState({ selectedRepo: null });
    useFilterStore.setState({
      selectedOrgs: [],
      searchQuery: '',
      depTypes: [],
      showArchived: true,
      confidenceFilter: 'all',
      clusterId: null,
    });
  });

  it('renders a table with grid role', () => {
    render(<RepoListView />);
    expect(
      screen.getByRole('grid', { name: 'Repository list' }),
    ).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<RepoListView />);

    expect(screen.getByText('Repository')).toBeInTheDocument();
    expect(screen.getByText('Org')).toBeInTheDocument();
    expect(screen.getByText('Direct Deps')).toBeInTheDocument();
    expect(screen.getByText('Dependents')).toBeInTheDocument();
    expect(screen.getByText('Types')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders repo rows from graph data', () => {
    render(<RepoListView />);

    expect(screen.getByText('org-alpha/api-1')).toBeInTheDocument();
    expect(screen.getByText('org-alpha/lib-2')).toBeInTheDocument();
    expect(screen.getByText('org-beta/service-1')).toBeInTheDocument();
  });

  it('shows archived badge for archived repos', () => {
    render(<RepoListView />);

    // org-alpha/lib-2 is archived
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('shows total repo count in footer', () => {
    render(<RepoListView />);

    expect(screen.getByText('Showing 3 repositories')).toBeInTheDocument();
  });

  it('clicking a row selects the repo in uiStore', async () => {
    const user = userEvent.setup();
    render(<RepoListView />);

    const row = screen.getByTestId('repo-row-org-alpha/api-1');
    await user.click(row);

    expect(useUIStore.getState().selectedRepo).toBe('org-alpha/api-1');
  });

  it('clicking the selected row deselects it', async () => {
    useUIStore.setState({ selectedRepo: 'org-alpha/api-1' });

    const user = userEvent.setup();
    render(<RepoListView />);

    const row = screen.getByTestId('repo-row-org-alpha/api-1');
    await user.click(row);

    expect(useUIStore.getState().selectedRepo).toBeNull();
  });

  it('headers have sort indicators', async () => {
    const user = userEvent.setup();
    render(<RepoListView />);

    // Initially sorted by name ascending
    const nameHeader = screen.getByText('Repository').closest('[role="columnheader"]');
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');

    // Click Dependents header
    const depsHeader = screen.getByText('Dependents');
    await user.click(depsHeader);

    const depsHeaderDiv = depsHeader.closest('[role="columnheader"]');
    expect(depsHeaderDiv).toHaveAttribute('aria-sort', 'ascending');

    // Name header should now be 'none'
    expect(nameHeader).toHaveAttribute('aria-sort', 'none');
  });

  it('clicking same header toggles sort direction', async () => {
    const user = userEvent.setup();
    render(<RepoListView />);

    const nameHeader = screen.getByText('Repository');
    const headerDiv = nameHeader.closest('[role="columnheader"]');

    // Initial: ascending
    expect(headerDiv).toHaveAttribute('aria-sort', 'ascending');

    // Click again: descending
    await user.click(nameHeader);
    expect(headerDiv).toHaveAttribute('aria-sort', 'descending');

    // Click again: ascending
    await user.click(nameHeader);
    expect(headerDiv).toHaveAttribute('aria-sort', 'ascending');
  });

  it('renders empty state when no repos match filters', () => {
    // Hide all nodes
    const graph = useDataStore.getState().graph!;
    graph.forEachNode((node) => {
      graph.setNodeAttribute(node, 'hidden', true);
    });

    // Force re-render by updating filter store
    useFilterStore.setState({ searchQuery: 'nonexistent-query-xyz' });

    render(<RepoListView />);

    expect(
      screen.getByText('No repositories match the current filters.'),
    ).toBeInTheDocument();
  });
});
