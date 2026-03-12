/**
 * Tests for NodeTooltip component.
 *
 * Verifies tooltip displays correct repo info when visible,
 * is hidden when not visible, and shows correct counts.
 *
 * Since NodeTooltip accesses graph imperatively, we set up a
 * minimal Graphology graph in the data store before each test.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import { NodeTooltip } from '../NodeTooltip';
import { useDataStore } from '@/store/dataStore';

function createTestGraph() {
  const graph = new MultiDirectedGraph();
  graph.addNode('acme-corp/api-server', {
    label: 'acme-corp/api-server',
    org: 'acme-corp',
    directDeps: 12,
    dependents: 45,
    scanStatus: 'done',
    isPhantom: false,
    archived: false,
    x: 0,
    y: 0,
  });
  graph.addNode('acme-corp/phantom-lib', {
    label: 'acme-corp/phantom-lib',
    org: 'acme-corp',
    directDeps: 0,
    dependents: 3,
    scanStatus: 'unknown',
    isPhantom: true,
    archived: false,
    x: 1,
    y: 1,
  });
  graph.addNode('beta-labs/old-service', {
    label: 'beta-labs/old-service',
    org: 'beta-labs',
    directDeps: 5,
    dependents: 0,
    scanStatus: 'partial',
    isPhantom: false,
    archived: true,
    x: 2,
    y: 2,
  });
  return graph;
}

describe('NodeTooltip', () => {
  beforeEach(() => {
    const graph = createTestGraph();
    useDataStore.setState({
      graph,
      allOrgs: ['acme-corp', 'beta-labs'],
    });
  });

  it('renders nothing when node is null', () => {
    const { container } = render(<NodeTooltip node={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when position is missing', () => {
    const { container } = render(
      <NodeTooltip node="acme-corp/api-server" />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows repo name when visible', () => {
    render(
      <NodeTooltip
        node="acme-corp/api-server"
        position={{ x: 100, y: 100 }}
      />,
    );
    expect(screen.getByText('acme-corp/api-server')).toBeInTheDocument();
  });

  it('shows org name', () => {
    render(
      <NodeTooltip
        node="acme-corp/api-server"
        position={{ x: 100, y: 100 }}
      />,
    );
    expect(screen.getByText('acme-corp')).toBeInTheDocument();
  });

  it('displays correct direct deps count', () => {
    render(
      <NodeTooltip
        node="acme-corp/api-server"
        position={{ x: 100, y: 100 }}
      />,
    );
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('displays correct dependents count', () => {
    render(
      <NodeTooltip
        node="acme-corp/api-server"
        position={{ x: 100, y: 100 }}
      />,
    );
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('shows scan status', () => {
    render(
      <NodeTooltip
        node="acme-corp/api-server"
        position={{ x: 100, y: 100 }}
      />,
    );
    expect(screen.getByText('Scan: done')).toBeInTheDocument();
  });

  it('shows phantom badge for phantom nodes', () => {
    render(
      <NodeTooltip
        node="acme-corp/phantom-lib"
        position={{ x: 100, y: 100 }}
      />,
    );
    expect(screen.getByText('Phantom')).toBeInTheDocument();
  });

  it('shows archived badge for archived nodes', () => {
    render(
      <NodeTooltip
        node="beta-labs/old-service"
        position={{ x: 100, y: 100 }}
      />,
    );
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('does not show phantom badge for non-phantom nodes', () => {
    render(
      <NodeTooltip
        node="acme-corp/api-server"
        position={{ x: 100, y: 100 }}
      />,
    );
    expect(screen.queryByText('Phantom')).not.toBeInTheDocument();
  });

  it('has tooltip role', () => {
    render(
      <NodeTooltip
        node="acme-corp/api-server"
        position={{ x: 100, y: 100 }}
      />,
    );
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('renders nothing for non-existent node', () => {
    const { container } = render(
      <NodeTooltip
        node="nonexistent/repo"
        position={{ x: 100, y: 100 }}
      />,
    );
    expect(container.innerHTML).toBe('');
  });
});