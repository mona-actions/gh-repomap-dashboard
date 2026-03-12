import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@primer/react';
import { MemoryRouter } from 'react-router-dom';
import { AppHeader } from '../AppHeader';
import { useUIStore } from '@/store/uiStore';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </ThemeProvider>,
  );
}

describe('AppHeader', () => {
  beforeEach(() => {
    // Reset the UI store to defaults before each test
    useUIStore.setState({
      sidebarOpen: true,
      selectedRepo: null,
      activeView: 'dashboard',
      colorMode: 'light',
    });
  });

  it('renders the application name', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByText('gh-repomap-dashboard')).toBeInTheDocument();
  });

  it('renders the GitHub icon', () => {
    renderWithProviders(<AppHeader />);
    // The MarkGithubIcon renders an SVG
    const header = screen.getByRole('banner');
    expect(header.querySelector('svg')).toBeInTheDocument();
  });

  it('renders dark mode toggle button', () => {
    renderWithProviders(<AppHeader />);
    expect(
      screen.getByLabelText('Switch to dark mode'),
    ).toBeInTheDocument();
  });

  it('toggles color mode when dark mode button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppHeader />);

    // Initial state: light mode → button says "Switch to dark mode"
    const toggleBtn = screen.getByLabelText('Switch to dark mode');
    await user.click(toggleBtn);

    // After click: dark mode → button says "Switch to light mode"
    expect(useUIStore.getState().colorMode).toBe('dark');
    expect(
      screen.getByLabelText('Switch to light mode'),
    ).toBeInTheDocument();
  });

  it('toggles back from dark to light', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ colorMode: 'dark' });
    renderWithProviders(<AppHeader />);

    const toggleBtn = screen.getByLabelText('Switch to light mode');
    await user.click(toggleBtn);

    expect(useUIStore.getState().colorMode).toBe('light');
  });

  it('does not show sidebar toggle when no data is loaded', () => {
    renderWithProviders(<AppHeader />);
    expect(
      screen.queryByLabelText('Toggle sidebar'),
    ).not.toBeInTheDocument();
  });
});
