/**
 * Tests for FilterPanel and its sub-components.
 *
 * Verifies all filter sections render, dep type toggles update store,
 * confidence toggle works, archive toggle works,
 * and filter summary shows correct counts.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FilterPanel } from '../FilterPanel';
import { DepTypeToggles } from '../DepTypeToggles';
import { ConfidenceToggle } from '../ConfidenceToggle';
import { ArchiveToggle } from '../ArchiveToggle';
import { useFilterStore } from '@/store/filterStore';
import { useDataStore } from '@/store/dataStore';

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('FilterPanel', () => {
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
      allOrgs: ['org-alpha', 'org-beta'],
      stats: null,
    });
  });

  it('renders the filters title', () => {
    renderWithRouter(
      <FilterPanel
        visibleNodes={100}
        totalNodes={200}
        visibleEdges={50}
        totalEdges={100}
      />,
    );
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('renders all filter sections', () => {
    renderWithRouter(
      <FilterPanel
        visibleNodes={100}
        totalNodes={200}
        visibleEdges={50}
        totalEdges={100}
      />,
    );
    // Search
    expect(
      screen.getByLabelText('Search repositories'),
    ).toBeInTheDocument();
    // Dep types
    expect(screen.getByText('Dependency Types')).toBeInTheDocument();
    // Confidence
    expect(screen.getByText('Confidence')).toBeInTheDocument();
    // Archived
    expect(screen.getByText('Archived Repos')).toBeInTheDocument();
  });

  it('shows filter summary with correct counts', () => {
    renderWithRouter(
      <FilterPanel
        visibleNodes={3241}
        totalNodes={10000}
        visibleEdges={5000}
        totalEdges={15000}
      />,
    );
    expect(
      screen.getByText(/Showing 3,241 of 10,000 repos, 5,000 edges/),
    ).toBeInTheDocument();
  });

  it('shows reset button when filters are active', () => {
    renderWithRouter(
      <FilterPanel
        visibleNodes={50}
        totalNodes={100}
        visibleEdges={20}
        totalEdges={50}
      />,
    );
    expect(screen.getByText('Reset all')).toBeInTheDocument();
  });

  it('does not show reset when all visible', () => {
    renderWithRouter(
      <FilterPanel
        visibleNodes={100}
        totalNodes={100}
        visibleEdges={50}
        totalEdges={50}
      />,
    );
    expect(screen.queryByText('Reset all')).not.toBeInTheDocument();
  });
});

describe('DepTypeToggles', () => {
  beforeEach(() => {
    useFilterStore.setState({
      depTypes: [],
    });
  });

  it('renders all dependency type chips', () => {
    render(<DepTypeToggles />);
    expect(screen.getByText('Package')).toBeInTheDocument();
    expect(screen.getByText('Workflow')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Docker')).toBeInTheDocument();
    expect(screen.getByText('Submodule')).toBeInTheDocument();
    expect(screen.getByText('Terraform')).toBeInTheDocument();
    expect(screen.getByText('Script')).toBeInTheDocument();
  });

  it('toggles a dep type when clicked', async () => {
    const user = userEvent.setup();
    render(<DepTypeToggles />);

    await user.click(screen.getByText('Package'));
    expect(useFilterStore.getState().depTypes).toContain('package');

    await user.click(screen.getByText('Package'));
    expect(useFilterStore.getState().depTypes).not.toContain('package');
  });

  it('supports selecting multiple types', async () => {
    const user = userEvent.setup();
    render(<DepTypeToggles />);

    await user.click(screen.getByText('Package'));
    await user.click(screen.getByText('Docker'));
    expect(useFilterStore.getState().depTypes).toContain('package');
    expect(useFilterStore.getState().depTypes).toContain('docker');
  });

  it('has correct aria-pressed state', async () => {
    const user = userEvent.setup();
    render(<DepTypeToggles />);

    const packageBtn = screen.getByText('Package');
    expect(packageBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(packageBtn);
    expect(packageBtn).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('ConfidenceToggle', () => {
  beforeEach(() => {
    useFilterStore.setState({
      confidenceFilter: 'all',
    });
  });

  it('renders All and High only buttons', () => {
    render(<ConfidenceToggle />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('High only')).toBeInTheDocument();
  });

  it('defaults to All being active', () => {
    render(<ConfidenceToggle />);
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(
      screen.getByRole('radio', { name: 'High only' }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('switches to high only when clicked', async () => {
    const user = userEvent.setup();
    render(<ConfidenceToggle />);

    await user.click(screen.getByText('High only'));
    expect(useFilterStore.getState().confidenceFilter).toBe('high');
  });

  it('switches back to all when clicked', async () => {
    const user = userEvent.setup();
    useFilterStore.setState({ confidenceFilter: 'high' });
    render(<ConfidenceToggle />);

    await user.click(screen.getByText('All'));
    expect(useFilterStore.getState().confidenceFilter).toBe('all');
  });
});

describe('ArchiveToggle', () => {
  beforeEach(() => {
    useFilterStore.setState({
      showArchived: true,
    });
  });

  it('renders the checkbox with label', () => {
    render(<ArchiveToggle />);
    expect(screen.getByText('Show archived')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('unchecking hides archived repos', async () => {
    const user = userEvent.setup();
    render(<ArchiveToggle />);

    await user.click(screen.getByRole('checkbox'));
    expect(useFilterStore.getState().showArchived).toBe(false);
  });

  it('checking shows archived repos', async () => {
    useFilterStore.setState({ showArchived: false });
    const user = userEvent.setup();
    render(<ArchiveToggle />);

    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await user.click(screen.getByRole('checkbox'));
    expect(useFilterStore.getState().showArchived).toBe(true);
  });
});