import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClusterSelect } from '../ClusterSelect';
import { useFilterStore } from '@/store/filterStore';
import { useDataStore } from '@/store/dataStore';

describe('ClusterSelect terminology', () => {
  beforeEach(() => {
    useFilterStore.setState({
      selectedOrgs: [],
      searchQuery: '',
      depTypes: [],
      showArchived: true,
      confidenceFilter: 'all',
      clusterId: null,
    });

    useDataStore.setState({
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [
          { id: 1, repos: ['org/a', 'org/b'], size: 2 },
          { id: 2, repos: ['org/c'], size: 1 },
        ],
        strong_clusters: [],
        circular_deps: [],
        orphan_repos: [],
      },
    });
  });

  it('renders weak-group labels and helper copy', () => {
    render(<ClusterSelect />);

    expect(
      screen.getByText('Connected Repo Group (Weak)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Ignores dependency direction; may include external/unscanned repos.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Select connected repo group'),
    ).toBeInTheDocument();
  });

  it('renders options with connected repo group naming', () => {
    render(<ClusterSelect />);

    expect(screen.getByRole('option', { name: 'All connected repo groups' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', {
        name: 'Connected Repo Group 1 (2 repos)',
      }),
    ).toBeInTheDocument();
  });

  it('updates and clears selected group filter', async () => {
    const user = userEvent.setup();
    render(<ClusterSelect />);

    const select = screen.getByLabelText('Select connected repo group');
    await user.selectOptions(select, '2');
    expect(useFilterStore.getState().clusterId).toBe(2);

    await user.selectOptions(select, '');
    expect(useFilterStore.getState().clusterId).toBeNull();
  });
});
