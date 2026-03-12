import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@primer/react';
import { MultiDirectedGraph } from 'graphology';
import { DirectDepsTab } from '../DirectDepsTab';
import { useUIStore } from '@/store/uiStore';
import { useDataStore } from '@/store/dataStore';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

function buildGraph(): MultiDirectedGraph {
  const graph = new MultiDirectedGraph();

  graph.addNode('org/source', { org: 'org', label: 'source' });
  graph.addNode('org/dep-a', { org: 'org', label: 'dep-a' });
  graph.addNode('org/dep-b', { org: 'org', label: 'dep-b' });

  graph.addEdge('org/source', 'org/dep-a', {
    depType: 'package',
    confidence: 'high',
    sourceFile: 'package.json',
    version: '2.0.0',
  });

  graph.addEdge('org/source', 'org/dep-b', {
    depType: 'workflow',
    confidence: 'low',
    sourceFile: '.github/workflows/ci.yml',
    uses: 'org/dep-b/.github/workflows/build.yml@main',
  });

  return graph;
}

describe('DirectDepsTab', () => {
  beforeEach(() => {
    useDataStore.setState({
      graph: buildGraph(),
      metadata: null,
      stats: null,
      unresolved: {},
      allOrgs: ['org'],
      nodeCount: 3,
      edgeCount: 2,
      isLoading: false,
      loadingStage: 'ready',
      error: null,
    });
    useUIStore.setState({ selectedRepo: null });
  });

  it('renders dependency list with correct repos', () => {
    renderWithTheme(<DirectDepsTab repoName="org/source" />);

    expect(screen.getByText('org/dep-a')).toBeInTheDocument();
    expect(screen.getByText('org/dep-b')).toBeInTheDocument();
  });

  it('shows type badges', () => {
    renderWithTheme(<DirectDepsTab repoName="org/source" />);

    expect(screen.getByText('Package')).toBeInTheDocument();
    expect(screen.getByText('Workflow')).toBeInTheDocument();
  });

  it('shows confidence indicators', () => {
    renderWithTheme(<DirectDepsTab repoName="org/source" />);

    expect(screen.getByText(/High confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/Low confidence/i)).toBeInTheDocument();
  });

  it('shows source files', () => {
    renderWithTheme(<DirectDepsTab repoName="org/source" />);

    expect(screen.getByText('package.json')).toBeInTheDocument();
    expect(screen.getByText('.github/workflows/ci.yml')).toBeInTheDocument();
  });

  it('click dep sets selectedRepo', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DirectDepsTab repoName="org/source" />);

    await user.click(screen.getByText('org/dep-a'));
    expect(useUIStore.getState().selectedRepo).toBe('org/dep-a');
  });

  it('shows empty state when no deps', () => {
    renderWithTheme(<DirectDepsTab repoName="org/dep-a" />);

    expect(screen.getByText('No direct dependencies')).toBeInTheDocument();
  });

  it('renders table with accessible label', () => {
    renderWithTheme(<DirectDepsTab repoName="org/source" />);

    expect(screen.getByLabelText('Direct dependencies')).toBeInTheDocument();
  });
});
