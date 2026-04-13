/**
 * Tests for GraphLegend component.
 *
 * Verifies org colors, ecosystem legend, confidence styles,
 * node state indicators, and collapsible behavior.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiDirectedGraph } from 'graphology';
import { GraphLegend } from '../GraphLegend';
import { useDataStore } from '@/store/dataStore';

function buildTestGraph(): MultiDirectedGraph {
  const graph = new MultiDirectedGraph();
  graph.addNode('acme/a', { org: 'acme-corp', x: 0, y: 0 });
  graph.addNode('acme/b', { org: 'acme-corp', x: 1, y: 1 });
  graph.addNode('beta/c', { org: 'beta-labs', x: 2, y: 2 });
  graph.addEdge('acme/a', 'acme/b', { depType: 'action', ecosystem: 'action' });
  graph.addEdge('acme/a', 'beta/c', {
    depType: 'workflow',
    ecosystem: 'workflow',
  });
  graph.addEdge('acme/b', 'beta/c', { depType: 'package', ecosystem: 'npm' });
  return graph;
}

describe('GraphLegend', () => {
  beforeEach(() => {
    useDataStore.setState({
      graph: buildTestGraph(),
      allOrgs: ['acme-corp', 'beta-labs', 'gamma-inc'],
    });
  });

  it('renders the legend title', () => {
    render(<GraphLegend />);
    expect(screen.getByText('Legend')).toBeInTheDocument();
  });

  it('renders org color dots', () => {
    render(<GraphLegend />);
    expect(screen.getByText('acme-corp')).toBeInTheDocument();
    expect(screen.getByText('beta-labs')).toBeInTheDocument();
    expect(screen.getByText('gamma-inc')).toBeInTheDocument();
  });

  it('renders ecosystem legend items from graph data', () => {
    render(<GraphLegend />);
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Workflow')).toBeInTheDocument();
    expect(screen.getByText('npm')).toBeInTheDocument();
  });

  it('renders confidence indicators', () => {
    render(<GraphLegend />);
    expect(screen.getByText('High confidence')).toBeInTheDocument();
    expect(screen.getByText('Low confidence')).toBeInTheDocument();
  });

  it('renders node state indicators', () => {
    render(<GraphLegend />);
    expect(screen.getByText('Phantom (unscanned)')).toBeInTheDocument();
    expect(screen.getByText('Archived (dimmed)')).toBeInTheDocument();
  });

  it('collapses and expands when toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<GraphLegend />);

    // Initially expanded — org names visible
    expect(screen.getByText('acme-corp')).toBeInTheDocument();

    // Collapse
    await user.click(screen.getByText('Legend'));
    expect(screen.queryByText('acme-corp')).not.toBeInTheDocument();

    // Expand again
    await user.click(screen.getByText('Legend'));
    expect(screen.getByText('acme-corp')).toBeInTheDocument();
  });

  it('toggle button has correct aria-expanded', async () => {
    const user = userEvent.setup();
    render(<GraphLegend />);

    const toggleBtn = screen.getByRole('button', {
      name: 'Collapse legend',
    });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    await user.click(toggleBtn);
    const expandBtn = screen.getByRole('button', { name: 'Expand legend' });
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows "+N more" for orgs exceeding 10', () => {
    useDataStore.setState({
      allOrgs: Array.from({ length: 15 }, (_, i) => `org-${i}`),
    });

    render(<GraphLegend />);
    expect(screen.getByText('+5 more')).toBeInTheDocument();
  });
});
