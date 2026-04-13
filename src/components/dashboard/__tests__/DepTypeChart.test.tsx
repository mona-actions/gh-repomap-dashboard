/**
 * Tests for the DepTypeChart dashboard component.
 *
 * Verifies SVG bar rendering, accessibility attributes,
 * and graceful handling of empty data.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DepTypeChart } from '../DepTypeChart';

const mockTypeCounts: Record<string, number> = {
  action: 25,
  workflow: 28,
  package: 23,
  submodule: 15,
  docker: 10,
};

describe('DepTypeChart', () => {
  it('renders an SVG element with correct role', () => {
    render(<DepTypeChart typeCounts={mockTypeCounts} />);

    const svg = screen.getByRole('img', {
      name: 'Dependency type distribution',
    });
    expect(svg).toBeInTheDocument();
  });

  it('renders a <title> element for accessibility', () => {
    const { container } = render(<DepTypeChart typeCounts={mockTypeCounts} />);

    const title = container.querySelector('svg title');
    expect(title).toBeInTheDocument();
    expect(title?.textContent).toBe('Dependency type distribution');
  });

  it('renders a <desc> element with type counts', () => {
    const { container } = render(<DepTypeChart typeCounts={mockTypeCounts} />);

    const desc = container.querySelector('svg desc');
    expect(desc).toBeInTheDocument();
    // Entries are sorted by count descending, so workflow (28) first
    expect(desc?.textContent).toContain('workflow: 28');
    expect(desc?.textContent).toContain('action: 25');
    expect(desc?.textContent).toContain('package: 23');
  });

  it('renders a bar group for each dependency type', () => {
    render(<DepTypeChart typeCounts={mockTypeCounts} />);

    // We use data-testid for the bar groups
    for (const type of Object.keys(mockTypeCounts)) {
      expect(screen.getByTestId(`dep-bar-${type}`)).toBeInTheDocument();
    }
  });

  it('renders bars in descending count order', () => {
    const { container } = render(<DepTypeChart typeCounts={mockTypeCounts} />);

    const groups = container.querySelectorAll('g[data-testid^="dep-bar-"]');
    const types = Array.from(groups).map(
      (g) => g.getAttribute('data-testid')?.replace('dep-bar-', '') ?? '',
    );

    // Should be sorted by count descending
    expect(types).toEqual([
      'workflow',
      'action',
      'package',
      'submodule',
      'docker',
    ]);
  });

  it('renders count text for each type', () => {
    render(<DepTypeChart typeCounts={mockTypeCounts} />);

    // Each count should be visible as text
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    render(<DepTypeChart typeCounts={{}} />);

    expect(
      screen.getByText('No dependency type data available.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: 'Dependency type distribution' }),
    ).not.toBeInTheDocument();
  });

  it('handles single type', () => {
    render(<DepTypeChart typeCounts={{ action: 42 }} />);

    const svg = screen.getByRole('img', {
      name: 'Dependency type distribution',
    });
    expect(svg).toBeInTheDocument();
    expect(screen.getByTestId('dep-bar-action')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
