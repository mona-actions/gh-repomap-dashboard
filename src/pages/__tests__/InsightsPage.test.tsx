import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InsightsPage from '../InsightsPage';
import { useDataStore } from '@/store/dataStore';

function seedStats() {
  useDataStore.setState({
    stats: {
      most_depended_on: [],
      dependency_type_counts: {},
      clusters: [
        { id: 1, repos: ['org/a', 'org/b', 'org/c'], size: 3 },
        { id: 2, repos: ['org/d'], size: 1 },
      ],
      strong_clusters: [
        { id: 1, repos: ['org/a', 'org/b'], size: 2 },
        { id: 2, repos: ['org/c'], size: 1 },
      ],
      circular_deps: [],
      orphan_repos: [],
    },
  });
}

describe('InsightsPage connectivity tabs', () => {
  it('shows both weak and strong tabs', () => {
    seedStats();
    render(<InsightsPage />);

    expect(
      screen.getByRole('tab', { name: 'Repo Groups (Weak)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Repo Groups (Strong)' }),
    ).toBeInTheDocument();
  });

  it('renders comparison summary when switching between weak and strong tabs', async () => {
    const user = userEvent.setup();
    seedStats();
    render(<InsightsPage />);

    await user.click(screen.getByRole('tab', { name: 'Repo Groups (Weak)' }));

    expect(
      screen.getByText('Connectivity Group Comparison'),
    ).toBeInTheDocument();
    const weakSummary = screen.getByLabelText('Repo Groups (Weak) summary');
    expect(within(weakSummary).getByText('Groups: 2')).toBeInTheDocument();
    expect(
      within(weakSummary).getByText('Largest group: 3 scanned'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Repo Groups (Strong)' }));

    expect(
      screen.getByRole('heading', {
        name: /Repo Groups \(Strong\) \(2\)/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Migration Cohort Guidance (SCC-based)',
      }),
    ).toBeInTheDocument();
    const strongSummary = screen.getByLabelText('Repo Groups (Strong) summary');
    expect(
      within(strongSummary).getByText('Largest group: 2 scanned'),
    ).toBeInTheDocument();
  });
});
