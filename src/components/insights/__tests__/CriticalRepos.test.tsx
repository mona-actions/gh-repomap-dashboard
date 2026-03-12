import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@primer/react';
import { CriticalRepos } from '../CriticalRepos';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const MOCK_STATS = {
  most_depended_on: [
    { repo: 'org/core-lib', direct_dependents: 15 },
    { repo: 'org/auth-service', direct_dependents: 10 },
    { repo: 'org/utils', direct_dependents: 5 },
  ],
  dependency_type_counts: {},
  clusters: [],
  circular_deps: [],
  orphan_repos: [],
};

describe('CriticalRepos', () => {
  beforeEach(() => {
    useDataStore.setState({
      graph: null,
      metadata: null,
      stats: MOCK_STATS,
      unresolved: null,
      allOrgs: ['org'],
      nodeCount: 3,
      edgeCount: 0,
      isLoading: false,
      loadingStage: 'ready',
      error: null,
    });
    useUIStore.setState({ selectedRepo: null });
  });

  it('renders ranked list of repos', () => {
    renderWithTheme(<CriticalRepos />);

    expect(screen.getByText('org/core-lib')).toBeInTheDocument();
    expect(screen.getByText('org/auth-service')).toBeInTheDocument();
    expect(screen.getByText('org/utils')).toBeInTheDocument();
  });

  it('shows repos in correct order by dependents', () => {
    renderWithTheme(<CriticalRepos />);

    const rows = screen.getAllByRole('row');
    // header + 3 data rows
    expect(rows).toHaveLength(4);

    // First data row should be core-lib (15 dependents)
    expect(rows[1]).toHaveTextContent('org/core-lib');
    expect(rows[1]).toHaveTextContent('15');
  });

  it('shows dependent counts', () => {
    renderWithTheme(<CriticalRepos />);

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('click opens detail panel', async () => {
    const user = userEvent.setup();
    renderWithTheme(<CriticalRepos />);

    await user.click(screen.getByText('org/core-lib'));
    expect(useUIStore.getState().selectedRepo).toBe('org/core-lib');
  });

  it('sort by alphabetical works', async () => {
    const user = userEvent.setup();
    renderWithTheme(<CriticalRepos />);

    await user.selectOptions(screen.getByLabelText(/Sort by/), 'alphabetical');

    const rows = screen.getAllByRole('row');
    // Alphabetical: auth-service, core-lib, utils
    expect(rows[1]).toHaveTextContent('org/auth-service');
    expect(rows[2]).toHaveTextContent('org/core-lib');
    expect(rows[3]).toHaveTextContent('org/utils');
  });

  it('shows empty state when no data', () => {
    useDataStore.setState({ stats: null });
    renderWithTheme(<CriticalRepos />);

    expect(screen.getByText(/No dependency data available/)).toBeInTheDocument();
  });

  it('renders bar indicators', () => {
    renderWithTheme(<CriticalRepos />);

    const bars = screen.getAllByRole('meter');
    expect(bars.length).toBe(3);
    // First bar should be full width (15/15 = 100%)
    expect(bars[0]).toHaveAttribute('aria-valuenow', '15');
  });
});
