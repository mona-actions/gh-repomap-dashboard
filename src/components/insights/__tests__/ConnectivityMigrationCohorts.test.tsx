import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiDirectedGraph } from 'graphology';
import { ConnectivityMigrationCohorts } from '../ConnectivityMigrationCohorts';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';

function makeGraph() {
  const graph = new MultiDirectedGraph();
  const repos = ['org/a', 'org/b', 'org/dep', 'org/in'];
  for (const repo of repos) {
    graph.addNode(repo);
  }

  graph.addDirectedEdge('org/a', 'org/dep');
  graph.addDirectedEdge('org/in', 'org/b');

  return graph;
}

describe('ConnectivityMigrationCohorts', () => {
  beforeEach(() => {
    useUIStore.setState({ selectedRepo: null });
    useDataStore.setState({ graph: null, stats: null });
  });

  it('renders SCC cohort recommendations with explicit recommendation language', () => {
    useDataStore.setState({
      graph: makeGraph(),
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [{ id: 2, repos: ['org/a', 'org/b'], size: 2 }],
        circular_deps: [],
        orphan_repos: [],
      },
    });

    render(<ConnectivityMigrationCohorts />);

    expect(
      screen.getByRole('heading', {
        name: 'Migration Cohort Guidance (SCC-based)',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Recommendations only: SCC core sets/),
    ).toBeInTheDocument();
    expect(screen.getByText('Core Set 2 — 2 repos')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Must-move-together recommendation based on mutual reachability/,
      ),
    ).toBeInTheDocument();
  });

  it('reveals optional one-hop context and supports repo drill-down', async () => {
    const user = userEvent.setup();
    useDataStore.setState({
      graph: makeGraph(),
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [{ id: 1, repos: ['org/a', 'org/b'], size: 2 }],
        circular_deps: [],
        orphan_repos: [],
      },
    });

    render(<ConnectivityMigrationCohorts />);

    await user.click(screen.getByText('Optional one-hop cohort context'));
    await user.click(screen.getByRole('button', { name: 'org/dep' }));

    expect(useUIStore.getState().selectedRepo).toBe('org/dep');
    expect(screen.getByText('Direct dependents (inbound)')).toBeInTheDocument();
    expect(
      screen.getByText('Direct dependencies (outbound)'),
    ).toBeInTheDocument();
  });

  it('shows empty guidance when no SCC core sets exist', () => {
    useDataStore.setState({
      graph: makeGraph(),
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [{ id: 3, repos: ['org/a'], size: 1 }],
        circular_deps: [],
        orphan_repos: [],
      },
    });

    render(<ConnectivityMigrationCohorts />);

    expect(
      screen.getByText(/No SCC core sets with 2\+ repos found/),
    ).toBeInTheDocument();
  });
});
