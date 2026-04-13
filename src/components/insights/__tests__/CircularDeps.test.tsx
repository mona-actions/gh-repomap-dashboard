import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@primer/react';
import { CircularDeps } from '../CircularDeps';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('CircularDeps', () => {
  beforeEach(() => {
    useUIStore.setState({ selectedRepo: null });
  });

  it('renders cycle arrows correctly', () => {
    useDataStore.setState({
      graph: null,
      metadata: null,
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [],
        circular_deps: [['org/a', 'org/b']],
        orphan_repos: [],
      },
      unresolved: null,
      allOrgs: ['org'],
      nodeCount: 0,
      edgeCount: 0,
      isLoading: false,
      loadingStage: 'ready',
      error: null,
    });

    renderWithTheme(<CircularDeps />);

    // Should show cycle label
    expect(screen.getByText('Cycle 1:')).toBeInTheDocument();

    // Should show both repos in the cycle (org/a appears twice: in chain + closing)
    const links = screen.getAllByTitle('View details for org/a');
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTitle('View details for org/b')).toBeInTheDocument();
  });

  it('shows arrows between repos', () => {
    useDataStore.setState({
      graph: null,
      metadata: null,
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [],
        circular_deps: [['org/a', 'org/b', 'org/c']],
        orphan_repos: [],
      },
      unresolved: null,
      allOrgs: ['org'],
      nodeCount: 0,
      edgeCount: 0,
      isLoading: false,
      loadingStage: 'ready',
      error: null,
    });

    renderWithTheme(<CircularDeps />);

    // Check that arrows are rendered (they are in aria-hidden spans)
    const arrows = screen.getAllByText('→');
    expect(arrows.length).toBeGreaterThanOrEqual(3); // a→b, b→c, c→a
  });

  it('handles empty cycles', () => {
    useDataStore.setState({
      graph: null,
      metadata: null,
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [],
        circular_deps: [],
        orphan_repos: [],
      },
      unresolved: null,
      allOrgs: ['org'],
      nodeCount: 0,
      edgeCount: 0,
      isLoading: false,
      loadingStage: 'ready',
      error: null,
    });

    renderWithTheme(<CircularDeps />);

    expect(
      screen.getByText(/No circular dependencies detected/),
    ).toBeInTheDocument();
  });

  it('shows warning description', () => {
    useDataStore.setState({
      graph: null,
      metadata: null,
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [],
        circular_deps: [['org/a', 'org/b']],
        orphan_repos: [],
      },
      unresolved: null,
      allOrgs: ['org'],
      nodeCount: 0,
      edgeCount: 0,
      isLoading: false,
      loadingStage: 'ready',
      error: null,
    });

    renderWithTheme(<CircularDeps />);

    expect(screen.getByText(/Repo Groups \(Strong\)/)).toBeInTheDocument();
  });

  it('click repo opens detail', async () => {
    const user = userEvent.setup();
    useDataStore.setState({
      graph: null,
      metadata: null,
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [],
        circular_deps: [['org/x', 'org/y']],
        orphan_repos: [],
      },
      unresolved: null,
      allOrgs: ['org'],
      nodeCount: 0,
      edgeCount: 0,
      isLoading: false,
      loadingStage: 'ready',
      error: null,
    });

    renderWithTheme(<CircularDeps />);

    await user.click(screen.getByTitle('View details for org/x'));
    expect(useUIStore.getState().selectedRepo).toBe('org/x');
  });

  it('renders multiple cycles', () => {
    useDataStore.setState({
      graph: null,
      metadata: null,
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [],
        circular_deps: [
          ['org/a', 'org/b'],
          ['org/c', 'org/d', 'org/e'],
        ],
        orphan_repos: [],
      },
      unresolved: null,
      allOrgs: ['org'],
      nodeCount: 0,
      edgeCount: 0,
      isLoading: false,
      loadingStage: 'ready',
      error: null,
    });

    renderWithTheme(<CircularDeps />);

    expect(screen.getByText('Cycle 1:')).toBeInTheDocument();
    expect(screen.getByText('Cycle 2:')).toBeInTheDocument();
    expect(screen.getByText(/Circular Dependencies \(2\)/)).toBeInTheDocument();
  });
});
