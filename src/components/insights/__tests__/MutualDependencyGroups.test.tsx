import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MutualDependencyGroups } from '../MutualDependencyGroups';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';

describe('MutualDependencyGroups', () => {
  beforeEach(() => {
    useUIStore.setState({ selectedRepo: null });
  });

  it('renders strong-group title and explanatory copy', () => {
    useDataStore.setState({
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [{ id: 2, repos: ['org/a', 'org/b'], size: 2 }],
        circular_deps: [],
        orphan_repos: [],
      },
    });

    render(<MutualDependencyGroups />);

    expect(screen.getByText('Repo Groups (Strong) (1)')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Strong groups follow dependency direction. Repos in the same group are mutually dependent/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Repo Group 2 \(Strong\)/)).toBeInTheDocument();
  });

  it('supports focus and drill-down interaction', async () => {
    const user = userEvent.setup();
    useDataStore.setState({
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [
          { id: 1, repos: ['org/a'], size: 1 },
          { id: 2, repos: ['org/b'], size: 1 },
        ],
        circular_deps: [],
        orphan_repos: [],
      },
    });

    render(<MutualDependencyGroups />);

    await user.click(screen.getAllByRole('button', { name: 'Focus Group' })[1]);
    expect(
      screen.queryByText(/Repo Group 1 \(Strong\)/),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'org/b' }));
    expect(useUIStore.getState().selectedRepo).toBe('org/b');
  });
});
