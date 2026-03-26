import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClusterExplorer } from '../ClusterExplorer';
import { useDataStore } from '@/store/dataStore';
import { useFilterStore } from '@/store/filterStore';
import { useUIStore } from '@/store/uiStore';

describe('ClusterExplorer terminology', () => {
  beforeEach(() => {
    useFilterStore.setState({
      selectedOrgs: [],
      searchQuery: '',
      depTypes: [],
      ecosystems: [],
      showArchived: true,
      confidenceFilter: 'all',
      clusterId: null,
    });
    useUIStore.setState({ selectedRepo: null });
  });

  it('renders weak-group title and explanatory help text', () => {
    useDataStore.setState({
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [{ id: 3, repos: ['org/a', 'org/b'], size: 2 }],
        strong_clusters: [],
        circular_deps: [],
        orphan_repos: [],
      },
    });

    render(<ClusterExplorer />);

    expect(
      screen.getByText('Repo Groups (Weak) (1)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Weak groups ignore dependency direction, so they are useful for migration planning and blast-radius sizing.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Repo Group 3 \(Weak\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 repos/)).toBeInTheDocument();
  });

  it('applies group filter and opens repo detail', async () => {
    const user = userEvent.setup();

    useDataStore.setState({
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [{ id: 5, repos: ['org/a'], size: 1 }],
        strong_clusters: [],
        circular_deps: [],
        orphan_repos: [],
      },
    });

    render(<ClusterExplorer />);

    await user.click(screen.getByRole('button', { name: 'View in Graph' }));
    expect(useFilterStore.getState().clusterId).toBe(5);

    await user.click(
      screen.getByRole('button', { name: 'Clear Graph Filter' }),
    );
    expect(useFilterStore.getState().clusterId).toBe(null);

    await user.click(screen.getByRole('button', { name: 'org/a' }));
    expect(useUIStore.getState().selectedRepo).toBe('org/a');
  });

  it('supports focusing on a single weak group', async () => {
    const user = userEvent.setup();

    useDataStore.setState({
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [
          { id: 1, repos: ['org/a'], size: 1 },
          { id: 2, repos: ['org/b'], size: 1 },
        ],
        strong_clusters: [],
        circular_deps: [],
        orphan_repos: [],
      },
    });

    render(<ClusterExplorer />);

    await user.click(screen.getAllByRole('button', { name: 'Focus Group' })[0]);

    expect(
      screen.queryByText(/Repo Group 2 \(Weak\)/),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show all groups' })).toBeInTheDocument();
  });

  it('shows updated empty state copy', () => {
    useDataStore.setState({
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [],
        circular_deps: [],
        orphan_repos: [],
      },
    });

    render(<ClusterExplorer />);

    expect(
      screen.getByText('No connected repo group data available.'),
    ).toBeInTheDocument();
  });
});
