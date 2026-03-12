import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@primer/react';
import { SkipLink } from '../SkipLink';
import { ViewToggle } from '../ViewToggle';
import { EmptyState } from '../EmptyState';
import { ConfidenceIndicator } from '../ConfidenceIndicator';
import { DependencyTypeBadge, type DependencyType } from '../DependencyTypeBadge';

/* ---------- helpers ---------- */

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

/* ================================================================
 * SkipLink
 * ================================================================ */

describe('SkipLink', () => {
  it('renders a link with href="#main-content"', () => {
    renderWithTheme(<SkipLink />);

    const link = screen.getByText('Skip to main content');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('has the skip-link class for off-screen styling', () => {
    renderWithTheme(<SkipLink />);

    const link = screen.getByText('Skip to main content');
    expect(link).toHaveClass('skip-link');
  });
});

/* ================================================================
 * ViewToggle
 * ================================================================ */

describe('ViewToggle', () => {
  it('renders List and Graph buttons', () => {
    renderWithTheme(<ViewToggle view="list" onViewChange={() => {}} />);

    expect(screen.getByText('List')).toBeInTheDocument();
    expect(screen.getByText('Graph')).toBeInTheDocument();
  });

  it('calls onViewChange with "graph" when Graph is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderWithTheme(<ViewToggle view="list" onViewChange={onChange} />);

    await user.click(screen.getByText('Graph'));

    expect(onChange).toHaveBeenCalledWith('graph');
  });

  it('calls onViewChange with "list" when List is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderWithTheme(<ViewToggle view="graph" onViewChange={onChange} />);

    await user.click(screen.getByText('List'));

    expect(onChange).toHaveBeenCalledWith('list');
  });

  it('has an accessible aria-label', () => {
    renderWithTheme(<ViewToggle view="list" onViewChange={() => {}} />);

    expect(screen.getByLabelText('View mode')).toBeInTheDocument();
  });
});

/* ================================================================
 * EmptyState
 * ================================================================ */

describe('EmptyState', () => {
  it('renders title and description', () => {
    renderWithTheme(
      <EmptyState title="No data loaded" description="Upload a JSON file to get started." />,
    );

    expect(screen.getByText('No data loaded')).toBeInTheDocument();
    expect(screen.getByText('Upload a JSON file to get started.')).toBeInTheDocument();
  });

  it('renders an optional action element', () => {
    renderWithTheme(
      <EmptyState
        title="No results"
        description="Try different filters."
        action={<button>Clear filters</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });

  it('renders without action when not provided', () => {
    renderWithTheme(
      <EmptyState title="Empty" description="Nothing here." />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

/* ================================================================
 * ConfidenceIndicator
 * ================================================================ */

describe('ConfidenceIndicator', () => {
  it('renders "High confidence" for high', () => {
    renderWithTheme(<ConfidenceIndicator confidence="high" />);

    expect(screen.getByText(/high confidence/i)).toBeInTheDocument();
  });

  it('renders "Low confidence" for low', () => {
    renderWithTheme(<ConfidenceIndicator confidence="low" />);

    expect(screen.getByText(/low confidence/i)).toBeInTheDocument();
  });
});

/* ================================================================
 * DependencyTypeBadge
 * ================================================================ */

describe('DependencyTypeBadge', () => {
  const types: DependencyType[] = [
    'package',
    'workflow',
    'action',
    'submodule',
    'docker',
    'terraform',
    'script',
  ];

  const expectedLabels: Record<DependencyType, string> = {
    package: 'Package',
    workflow: 'Workflow',
    action: 'Action',
    submodule: 'Submodule',
    docker: 'Docker',
    terraform: 'Terraform',
    script: 'Script',
  };

  it.each(types)('renders the correct label for type="%s"', (type) => {
    renderWithTheme(<DependencyTypeBadge type={type} />);

    expect(screen.getByText(expectedLabels[type])).toBeInTheDocument();
  });
});
