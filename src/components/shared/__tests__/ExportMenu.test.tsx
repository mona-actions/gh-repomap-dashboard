import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@primer/react';
import { MultiDirectedGraph } from 'graphology';
import { ExportMenu } from '../ExportMenu';
import { useDataStore } from '@/store/dataStore';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

function buildGraph(): MultiDirectedGraph {
  const graph = new MultiDirectedGraph();
  graph.addNode('org/repo-a', { org: 'org', label: 'repo-a', archived: false });
  graph.addNode('org/repo-b', { org: 'org', label: 'repo-b', archived: true, hidden: true });
  graph.addNode('org/repo-c', { org: 'org', label: 'repo-c', archived: false });
  graph.addEdge('org/repo-a', 'org/repo-c', { depType: 'package', hidden: false });
  graph.addEdge('org/repo-a', 'org/repo-b', { depType: 'workflow', hidden: true });
  return graph;
}

describe('ExportMenu', () => {
  beforeEach(() => {
    useDataStore.setState({
      graph: buildGraph(),
      metadata: {
        generated_at: '2026-01-01T00:00:00Z',
        tool_version: '1.0.0',
        github_host: '',
        orgs_scanned: ['org'],
        total_repos: 3,
        total_repos_scanned: 3,
        total_repos_skipped: 0,
        total_edges: 2,
        scan_duration_seconds: 1,
        split_info: {
          mode: 'merged' as const,
          file_index: 1,
          total_files: 1,
          this_file_orgs: ['org'],
        },
      },
      stats: null,
      unresolved: null,
      allOrgs: ['org'],
      nodeCount: 3,
      edgeCount: 2,
      isLoading: false,
      loadingStage: 'ready',
      error: null,
    });
  });

  it('renders all three export buttons', () => {
    renderWithTheme(<ExportMenu />);

    expect(screen.getByLabelText('Copy URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Export JSON')).toBeInTheDocument();
    expect(screen.getByLabelText('Export CSV')).toBeInTheDocument();
  });

  it('Copy URL calls clipboard.writeText with current URL', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);

    renderWithTheme(<ExportMenu />);

    await user.click(screen.getByLabelText('Copy URL'));

    expect(writeText).toHaveBeenCalledWith(window.location.href);

    vi.restoreAllMocks();
  });

  it('shows "Copied!" feedback after copy', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    renderWithTheme(<ExportMenu />);

    await user.click(screen.getByLabelText('Copy URL'));

    expect(screen.getByText('Copied!')).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it('Export JSON button is rendered', () => {
    renderWithTheme(<ExportMenu />);
    expect(screen.getByText('Export JSON')).toBeInTheDocument();
  });

  it('Export CSV button is rendered', () => {
    renderWithTheme(<ExportMenu />);
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
  });

  it('has accessible group label', () => {
    renderWithTheme(<ExportMenu />);
    expect(screen.getByRole('group', { name: 'Export options' })).toBeInTheDocument();
  });
});
