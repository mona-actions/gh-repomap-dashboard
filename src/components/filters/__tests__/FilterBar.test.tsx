/**
 * Tests for the FilterBar, SearchInput, and ActiveFilters components.
 *
 * Verifies search debounce, active filter display, and clear behavior.
 * Uses Zustand's direct state setting for store mocking.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SearchInput } from '../SearchInput';
import { ActiveFilters } from '../ActiveFilters';
import { useFilterStore } from '@/store/filterStore';
import { useDataStore } from '@/store/dataStore';

// Wrap component in MemoryRouter since some filters may link
function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('SearchInput', () => {
  beforeEach(() => {
    useFilterStore.setState({
      selectedOrgs: [],
      searchQuery: '',
      depTypes: [],
      showArchived: true,
      confidenceFilter: 'all',
      clusterId: null,
    });
  });

  it('renders with search label for a11y', () => {
    renderWithRouter(<SearchInput />);

    expect(
      screen.getByLabelText('Search repositories'),
    ).toBeInTheDocument();
  });

  it('updates local value immediately on typing', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SearchInput />);

    const input = screen.getByLabelText('Search repositories');
    await user.type(input, 'react');

    expect(input).toHaveValue('react');
  });

  it('debounces store update', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SearchInput />);

    const input = screen.getByLabelText('Search repositories');
    await user.type(input, 'api');

    // Wait for debounce to fire (300ms + buffer)
    await new Promise((r) => setTimeout(r, 400));

    expect(useFilterStore.getState().searchQuery).toBe('api');
  });

  it('shows clear button when input has value', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SearchInput />);

    // Initially no clear button
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();

    const input = screen.getByLabelText('Search repositories');
    await user.type(input, 'test');

    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('clear button resets input and store', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SearchInput />);

    const input = screen.getByLabelText('Search repositories');
    await user.type(input, 'search');

    // Wait for debounce
    await new Promise((r) => setTimeout(r, 400));
    expect(useFilterStore.getState().searchQuery).toBe('search');

    const clearBtn = screen.getByLabelText('Clear search');
    await user.click(clearBtn);

    expect(input).toHaveValue('');
    expect(useFilterStore.getState().searchQuery).toBe('');
  });

  it('shows result count when provided', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SearchInput resultCount={42} />);

    const input = screen.getByLabelText('Search repositories');
    await user.type(input, 'test');

    expect(screen.getByText('42 results')).toBeInTheDocument();
  });
});

describe('ActiveFilters', () => {
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
      allOrgs: ['org-alpha', 'org-beta', 'org-gamma'],
    });
  });

  it('renders nothing when no filters are active', () => {
    const { container } = renderWithRouter(<ActiveFilters />);
    expect(container.innerHTML).toBe('');
  });

  it('shows org filter chips', () => {
    useFilterStore.setState({
      selectedOrgs: ['org-alpha', 'org-beta'],
    });

    renderWithRouter(<ActiveFilters />);

    expect(screen.getByText('Org: org-alpha')).toBeInTheDocument();
    expect(screen.getByText('Org: org-beta')).toBeInTheDocument();
  });

  it('shows search filter chip', () => {
    useFilterStore.setState({
      searchQuery: 'api-service',
    });

    renderWithRouter(<ActiveFilters />);

    expect(
      screen.getByText('Search: "api-service"'),
    ).toBeInTheDocument();
  });

  it('shows dep type filter chips', () => {
    useFilterStore.setState({
      depTypes: ['package', 'docker'],
    });

    renderWithRouter(<ActiveFilters />);

    expect(screen.getByText('Type: package')).toBeInTheDocument();
    expect(screen.getByText('Type: docker')).toBeInTheDocument();
  });

  it('shows hide archived chip when showArchived is false', () => {
    useFilterStore.setState({
      showArchived: false,
    });

    renderWithRouter(<ActiveFilters />);

    expect(screen.getByText('Hide archived')).toBeInTheDocument();
  });

  it('removing an org chip updates the store', async () => {
    useFilterStore.setState({
      selectedOrgs: ['org-alpha', 'org-beta'],
    });

    const user = userEvent.setup();
    renderWithRouter(<ActiveFilters />);

    const removeBtn = screen.getByLabelText('Remove filter: Org: org-alpha');
    await user.click(removeBtn);

    expect(useFilterStore.getState().selectedOrgs).toEqual(['org-beta']);
  });

  it('removing search chip clears the search query', async () => {
    useFilterStore.setState({
      searchQuery: 'my-search',
    });

    const user = userEvent.setup();
    renderWithRouter(<ActiveFilters />);

    const removeBtn = screen.getByLabelText(
      'Remove filter: Search: "my-search"',
    );
    await user.click(removeBtn);

    expect(useFilterStore.getState().searchQuery).toBe('');
  });

  it('"Clear all filters" button resets all filters', async () => {
    useFilterStore.setState({
      selectedOrgs: ['org-alpha'],
      searchQuery: 'test',
      depTypes: ['package'],
      showArchived: false,
    });

    const user = userEvent.setup();
    renderWithRouter(<ActiveFilters />);

    const clearAllBtn = screen.getByText('Clear all filters');
    await user.click(clearAllBtn);

    const state = useFilterStore.getState();
    expect(state.selectedOrgs).toEqual([]);
    expect(state.searchQuery).toBe('');
    expect(state.depTypes).toEqual([]);
    expect(state.showArchived).toBe(true);
  });
});
