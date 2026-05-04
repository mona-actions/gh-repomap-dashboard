import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiDirectedGraph } from 'graphology';
import { MigrationPlan } from '../MigrationPlan';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';

function makeGraph(opts: {
  scanned: string[];
  edges: Array<[string, string]>;
}) {
  const graph = new MultiDirectedGraph();
  for (const repo of opts.scanned) graph.addNode(repo, { isPhantom: false });
  for (const [a, b] of opts.edges) graph.addDirectedEdge(a, b);
  return graph;
}

describe('MigrationPlan', () => {
  beforeEach(() => {
    useUIStore.setState({ selectedRepo: null });
    useDataStore.setState({ graph: null, stats: null });
  });

  it('renders empty state when no data is loaded', () => {
    render(<MigrationPlan />);
    expect(
      screen.getByRole('heading', { name: 'Migration Grouping' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No migration plan available/),
    ).toBeInTheDocument();
  });

  it('renders waves in order with the foundation in Wave 1', () => {
    useDataStore.setState({
      graph: makeGraph({
        scanned: ['org/app', 'org/lib'],
        edges: [['org/app', 'org/lib']],
      }),
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [],
        circular_deps: [],
        orphan_repos: [],
      },
    });

    render(<MigrationPlan />);

    const headings = screen.getAllByRole('heading', { level: 4 });
    expect(headings[0]).toHaveTextContent(/Wave 1/);
    expect(headings[1]).toHaveTextContent(/Wave 2/);
    // Foundation (org/lib) appears in Wave 1.
    const wave1 = headings[0].closest('article');
    expect(wave1).toHaveTextContent('org/lib');
    const wave2 = headings[1].closest('article');
    expect(wave2).toHaveTextContent('org/app');
  });

  it('renders an SCC badge for cohort units and expands members on click', async () => {
    const user = userEvent.setup();
    useDataStore.setState({
      graph: makeGraph({
        scanned: ['org/a', 'org/b', 'org/leaf'],
        edges: [
          ['org/a', 'org/b'],
          ['org/b', 'org/a'],
          ['org/a', 'org/leaf'],
        ],
      }),
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [{ id: 1, repos: ['org/a', 'org/b'], size: 2 }],
        circular_deps: [],
        orphan_repos: [],
      },
    });

    render(<MigrationPlan />);

    const sccToggle = screen.getByText(/SCC · 2 repos/);
    expect(sccToggle).toBeInTheDocument();
    await user.click(sccToggle);
    // After expanding, SCC member repos render as clickable buttons.
    expect(screen.getByRole('button', { name: 'org/a' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'org/b' })).toBeInTheDocument();
  });

  it('clicking a repo invokes setSelectedRepo', async () => {
    const user = userEvent.setup();
    useDataStore.setState({
      graph: makeGraph({
        scanned: ['org/app', 'org/lib'],
        edges: [['org/app', 'org/lib']],
      }),
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [],
        circular_deps: [],
        orphan_repos: [],
      },
    });

    render(<MigrationPlan />);

    // org/lib appears in Wave 1 chip + as a prerequisite under Wave 2;
    // either click should select the repo.
    const [firstLibButton] = screen.getAllByRole('button', { name: 'org/lib' });
    await user.click(firstLibButton);
    expect(useUIStore.getState().selectedRepo).toBe('org/lib');
  });

  it('renders prerequisites disclosure for units with downstream deps', () => {
    useDataStore.setState({
      graph: makeGraph({
        scanned: ['org/app', 'org/lib'],
        edges: [['org/app', 'org/lib']],
      }),
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [],
        circular_deps: [],
        orphan_repos: [],
      },
    });

    render(<MigrationPlan />);

    expect(
      screen.getByText(/Prerequisites \(1\)/),
    ).toBeInTheDocument();
  });

  it('shows degenerate-state copy when the entire graph is one SCC', () => {
    useDataStore.setState({
      graph: makeGraph({
        scanned: ['org/a', 'org/b'],
        edges: [
          ['org/a', 'org/b'],
          ['org/b', 'org/a'],
        ],
      }),
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [{ id: 1, repos: ['org/a', 'org/b'], size: 2 }],
        circular_deps: [],
        orphan_repos: [],
      },
    });

    render(<MigrationPlan />);

    expect(
      screen.getByText(/All scanned repos form one mutual-dependency cohort/),
    ).toBeInTheDocument();
  });

  it('wave cards are collapsed by default and toggle open on summary click', async () => {
    const user = userEvent.setup();
    useDataStore.setState({
      graph: makeGraph({
        scanned: ['org/app', 'org/lib'],
        edges: [['org/app', 'org/lib']],
      }),
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [],
        circular_deps: [],
        orphan_repos: [],
      },
    });

    const { container } = render(<MigrationPlan />);
    const detailsList = container.querySelectorAll('details.migration-plan__wave-details');
    expect(detailsList.length).toBeGreaterThan(0);
    detailsList.forEach((d) => expect((d as HTMLDetailsElement).open).toBe(false));

    // Header counts / org label still visible while collapsed.
    expect(screen.getByText(/Wave 1 · org ·/)).toBeInTheDocument();

    const firstSummary = detailsList[0].querySelector('summary')!;
    await user.click(firstSummary);
    expect((detailsList[0] as HTMLDetailsElement).open).toBe(true);
  });

  it('renders plan-level rollup warning and oversized badge for SCC > cap', () => {
    // 101-repo SCC + an extra leaf so isAllOneSCC is false.
    const sccRepos = Array.from({ length: 101 }, (_, i) => `org/r${i}`);
    const edges: Array<[string, string]> = sccRepos.map((r, i) => [
      r,
      sccRepos[(i + 1) % sccRepos.length],
    ]);
    edges.push(['org/leaf', sccRepos[0]]);
    useDataStore.setState({
      graph: makeGraph({ scanned: [...sccRepos, 'org/leaf'], edges }),
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [
          { id: 1, repos: sccRepos, size: sccRepos.length },
        ],
        circular_deps: [],
        orphan_repos: [],
      },
    });

    render(<MigrationPlan />);

    expect(
      screen.getByText(
        /1 cohort exceeds? the 100-repo target and cannot be split/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Indivisible cohort — 101 repos must migrate atomically/),
    ).toBeInTheDocument();
  });

  it('omits rollup warning when no oversized cohort exists', () => {
    useDataStore.setState({
      graph: makeGraph({
        scanned: ['org/app', 'org/lib'],
        edges: [['org/app', 'org/lib']],
      }),
      stats: {
        most_depended_on: [],
        dependency_type_counts: {},
        clusters: [],
        strong_clusters: [],
        circular_deps: [],
        orphan_repos: [],
      },
    });

    render(<MigrationPlan />);
    expect(
      screen.queryByText(/cannot be split — see flagged waves below/),
    ).not.toBeInTheDocument();
  });
});
