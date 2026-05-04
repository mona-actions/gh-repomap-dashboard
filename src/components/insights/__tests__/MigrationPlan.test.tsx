import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiDirectedGraph } from 'graphology';
import { MigrationPlan } from '../MigrationPlan';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';

// jsdom doesn't implement scrollIntoView; required by jumpToWave + banner stat.
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function makeGraph(opts: {
  scanned: string[];
  edges: Array<[string, string]>;
}) {
  const graph = new MultiDirectedGraph();
  for (const repo of opts.scanned) graph.addNode(repo, { isPhantom: false });
  for (const [a, b] of opts.edges) graph.addDirectedEdge(a, b);
  return graph;
}

const EMPTY_STATS = {
  most_depended_on: [],
  dependency_type_counts: {},
  clusters: [],
  strong_clusters: [],
  circular_deps: [],
  orphan_repos: [],
};

function loadAppLib() {
  useDataStore.setState({
    graph: makeGraph({
      scanned: ['org/app', 'org/lib'],
      edges: [['org/app', 'org/lib']],
    }),
    stats: { ...EMPTY_STATS },
  });
}

function loadIsolatedRepos(n: number) {
  const scanned = Array.from(
    { length: n },
    (_, i) => `org/r${String(i).padStart(2, '0')}`,
  );
  useDataStore.setState({
    graph: makeGraph({ scanned, edges: [] }),
    stats: { ...EMPTY_STATS },
  });
}

function loadOversizedScc() {
  const sccRepos = Array.from({ length: 101 }, (_, i) => `org/r${i}`);
  const edges: Array<[string, string]> = sccRepos.map((r, i) => [
    r,
    sccRepos[(i + 1) % sccRepos.length],
  ]);
  edges.push(['org/leaf', sccRepos[0]]);
  useDataStore.setState({
    graph: makeGraph({ scanned: [...sccRepos, 'org/leaf'], edges }),
    stats: {
      ...EMPTY_STATS,
      strong_clusters: [{ id: 1, repos: sccRepos, size: sccRepos.length }],
    },
  });
}

describe('MigrationPlan', () => {
  beforeEach(() => {
    useUIStore.setState({ selectedRepo: null });
    useDataStore.setState({ graph: null, stats: null });
  });

  // ── Existing baseline ─────────────────────────────────────────

  it('renders empty state when no data is loaded', () => {
    render(<MigrationPlan />);
    expect(
      screen.getByRole('heading', { name: 'Migration Grouping' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No migration plan available/)).toBeInTheDocument();
  });

  it('renders waves in order with the foundation in Wave 1', () => {
    loadAppLib();
    render(<MigrationPlan />);

    const headings = screen.getAllByRole('heading', { level: 4 });
    expect(headings[0]).toHaveTextContent(/Wave 1/);
    expect(headings[1]).toHaveTextContent(/Wave 2/);
    expect(headings[0].closest('article')).toHaveTextContent('org/lib');
    expect(headings[1].closest('article')).toHaveTextContent('org/app');
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
        ...EMPTY_STATS,
        strong_clusters: [{ id: 1, repos: ['org/a', 'org/b'], size: 2 }],
      },
    });

    render(<MigrationPlan />);

    const sccToggle = screen.getByText(/SCC · 2 repos/);
    await user.click(sccToggle);
    expect(screen.getByRole('button', { name: 'org/a' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'org/b' })).toBeInTheDocument();
  });

  it('clicking a repo invokes setSelectedRepo', async () => {
    const user = userEvent.setup();
    loadAppLib();
    render(<MigrationPlan />);
    const [firstLibButton] = screen.getAllByRole('button', { name: 'org/lib' });
    await user.click(firstLibButton);
    expect(useUIStore.getState().selectedRepo).toBe('org/lib');
  });

  it('renders prerequisites disclosure for units with downstream deps', () => {
    loadAppLib();
    render(<MigrationPlan />);
    expect(screen.getByText(/Prerequisites \(1\)/)).toBeInTheDocument();
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
        ...EMPTY_STATS,
        strong_clusters: [{ id: 1, repos: ['org/a', 'org/b'], size: 2 }],
      },
    });

    render(<MigrationPlan />);
    expect(
      screen.getByText(/All scanned repos form one mutual-dependency cohort/),
    ).toBeInTheDocument();
  });

  it('wave cards are collapsed by default and toggle open on summary click', async () => {
    const user = userEvent.setup();
    loadAppLib();
    const { container } = render(<MigrationPlan />);
    const detailsList = container.querySelectorAll(
      'details.migration-plan__wave-details',
    );
    expect(detailsList.length).toBeGreaterThan(0);
    detailsList.forEach((d) =>
      expect((d as HTMLDetailsElement).open).toBe(false),
    );
    expect(screen.getByText(/Wave 1 · org ·/)).toBeInTheDocument();

    const firstSummary = detailsList[0].querySelector('summary')!;
    await user.click(firstSummary);
    expect((detailsList[0] as HTMLDetailsElement).open).toBe(true);
  });

  it('renders oversized badge for SCC > cap', () => {
    loadOversizedScc();
    render(<MigrationPlan />);
    expect(
      screen.getByText(
        /Indivisible cohort — 101 repos must migrate atomically/,
      ),
    ).toBeInTheDocument();
  });

  // ── Direction toggle ──────────────────────────────────────────

  it('renders a radiogroup with both direction options', () => {
    loadAppLib();
    render(<MigrationPlan />);
    const group = screen.getByRole('radiogroup', { name: 'Migration order' });
    expect(group).toBeInTheDocument();
    const sinks = screen.getByRole('radio', { name: 'Foundations first' });
    const sources = screen.getByRole('radio', { name: 'Consumers first' });
    expect(sinks).toBeChecked();
    expect(sources).not.toBeChecked();
  });

  it('flipping to sources-first reorders waves (Wave 1 holds consumers)', async () => {
    const user = userEvent.setup();
    loadAppLib();
    render(<MigrationPlan />);
    await user.click(screen.getByRole('radio', { name: 'Consumers first' }));

    const headings = screen.getAllByRole('heading', { level: 4 });
    // sources-first: org/app (consumer) is now in Wave 1.
    expect(headings[0].closest('article')).toHaveTextContent('org/app');
    expect(headings[1].closest('article')).toHaveTextContent('org/lib');
  });

  it('keyboard arrow navigation moves between direction radios', async () => {
    const user = userEvent.setup();
    loadAppLib();
    render(<MigrationPlan />);
    const sinks = screen.getByRole('radio', { name: 'Foundations first' });
    sinks.focus();
    await user.keyboard('{ArrowRight}');
    expect(
      screen.getByRole('radio', { name: 'Consumers first' }),
    ).toBeChecked();
  });

  // ── Controlled <details> ──────────────────────────────────────

  it('clicking a wave card toggles its open state', async () => {
    const user = userEvent.setup();
    loadAppLib();
    const { container } = render(<MigrationPlan />);
    const detailsList = container.querySelectorAll(
      'details.migration-plan__wave-details',
    );
    const first = detailsList[0] as HTMLDetailsElement;
    const summary = first.querySelector('summary')!;

    await user.click(summary);
    expect(first.open).toBe(true);
    await user.click(summary);
    expect(first.open).toBe(false);
  });

  it('flipping direction resets open wave-card state', async () => {
    const user = userEvent.setup();
    loadAppLib();
    const { container } = render(<MigrationPlan />);
    const summaries = container.querySelectorAll(
      'details.migration-plan__wave-details > summary',
    );
    const wave2Summary = summaries[1] as HTMLElement;
    await user.click(wave2Summary);

    const allDetails = () =>
      container.querySelectorAll(
        'details.migration-plan__wave-details',
      ) as NodeListOf<HTMLDetailsElement>;
    expect(allDetails()[1].open).toBe(true);

    await user.click(screen.getByRole('radio', { name: 'Consumers first' }));
    // After flip, every wave card should be closed (open Set was reset).
    allDetails().forEach((d) => expect(d.open).toBe(false));
  });

  // ── Cap input ─────────────────────────────────────────────────

  it('cap input clamps below-min to 10 on blur', async () => {
    const user = userEvent.setup();
    loadAppLib();
    render(<MigrationPlan />);
    const input = screen.getByLabelText(/Repos per wave/) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '9');
    await user.tab();
    expect(input.value).toBe('10');
  });

  it('cap input accepts boundary values 10 and 500', async () => {
    const user = userEvent.setup();
    loadAppLib();
    render(<MigrationPlan />);
    const input = screen.getByLabelText(/Repos per wave/) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '10');
    await user.tab();
    expect(input.value).toBe('10');

    await user.clear(input);
    await user.type(input, '500');
    await user.tab();
    expect(input.value).toBe('500');
  });

  it('cap input clamps above-max to 500 on blur', async () => {
    const user = userEvent.setup();
    loadAppLib();
    render(<MigrationPlan />);
    const input = screen.getByLabelText(/Repos per wave/) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '501');
    await user.tab();
    expect(input.value).toBe('500');
  });

  it('cap input reverts non-numeric and empty input on blur', async () => {
    const user = userEvent.setup();
    loadAppLib();
    render(<MigrationPlan />);
    const input = screen.getByLabelText(/Repos per wave/) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'abc');
    await user.tab();
    expect(input.value).toBe('100');

    await user.clear(input);
    await user.tab();
    expect(input.value).toBe('100');
  });

  it('cap input snaps decimals to integer on blur', async () => {
    const user = userEvent.setup();
    loadAppLib();
    render(<MigrationPlan />);
    const input = screen.getByLabelText(/Repos per wave/) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '10.5');
    await user.tab();
    // Math.round(10.5) === 11
    expect(input.value).toBe('11');
  });

  it('cap input reverts negative numbers on blur', async () => {
    const user = userEvent.setup();
    loadAppLib();
    render(<MigrationPlan />);
    const input = screen.getByLabelText(/Repos per wave/) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '-5');
    await user.tab();
    expect(input.value).toBe('100');
  });

  it('lowering cap re-derives sub-waves (wave count grows)', async () => {
    const user = userEvent.setup();
    loadIsolatedRepos(15);
    render(<MigrationPlan />);
    // 15 isolated repos at level 0; default cap=100 → 1 sub-wave.
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(1);

    const input = screen.getByLabelText(/Repos per wave/) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '10');
    await user.tab();
    // cap=10 → splits into 2 sub-waves.
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(2);
  });

  // ── Banner ────────────────────────────────────────────────────

  it('renders all four banner stats with correct counts', () => {
    loadAppLib();
    render(<MigrationPlan />);
    const banner = screen.getByRole('region', { name: 'Plan summary' });
    expect(within(banner).getByText('2 waves')).toBeInTheDocument();
    expect(within(banner).getByText('2 repos')).toBeInTheDocument();
    expect(within(banner).getByText('0 SCCs')).toBeInTheDocument();
    expect(within(banner).getByText('0 oversized cohorts')).toBeInTheDocument();
  });

  it('oversized stat tile is muted (non-interactive) when count is zero', () => {
    loadAppLib();
    render(<MigrationPlan />);
    const banner = screen.getByRole('region', { name: 'Plan summary' });
    const tile = within(banner).getByText('0 oversized cohorts');
    expect(tile.tagName).toBe('DIV');
    expect(tile).toHaveClass('migration-plan__stat--muted');
  });

  it('oversized stat tile is interactive and opens rollup when count > 0', async () => {
    const user = userEvent.setup();
    loadOversizedScc();
    const { container } = render(<MigrationPlan />);
    const banner = screen.getByRole('region', { name: 'Plan summary' });
    const tile = within(banner).getByRole('button', {
      name: /1 oversized cohorts — jump to details/,
    });
    expect(tile).toHaveClass('migration-plan__stat--warn');

    await user.click(tile);
    const rollup = container.querySelector(
      'details.migration-plan__rollup',
    ) as HTMLDetailsElement;
    expect(rollup.open).toBe(true);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  // ── Rollup expand ─────────────────────────────────────────────

  it('renders rollup details with cohort list when oversized count > 0', () => {
    loadOversizedScc();
    const { container } = render(<MigrationPlan />);
    const rollup = container.querySelector('details.migration-plan__rollup');
    expect(rollup).toBeInTheDocument();
    expect(rollup).toHaveTextContent(/exceed the 100-repo target/);
    expect(
      within(rollup as HTMLElement).getByText(/101 repos/),
    ).toBeInTheDocument();
  });

  it('does not render rollup when no oversized cohort exists', () => {
    loadAppLib();
    const { container } = render(<MigrationPlan />);
    expect(
      container.querySelector('details.migration-plan__rollup'),
    ).not.toBeInTheDocument();
  });

  it('"Jump to wave" opens matching wave card and calls scrollIntoView', async () => {
    const user = userEvent.setup();
    loadOversizedScc();
    const { container } = render(<MigrationPlan />);
    const jumpBtn = screen.getByRole('button', { name: 'Jump to wave' });
    await user.click(jumpBtn);

    const wave = container.querySelector('#wave-0\\.1') as HTMLDetailsElement;
    expect(wave).toBeTruthy();
    expect(wave.open).toBe(true);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  // ── Markdown download ─────────────────────────────────────────

  it('clicking download triggers Blob URL creation and revocation', async () => {
    const user = userEvent.setup();
    const createSpy = vi.fn(() => 'blob:mock');
    const revokeSpy = vi.fn();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createSpy,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeSpy,
    });

    loadAppLib();
    render(<MigrationPlan />);

    await user.click(
      screen.getByRole('button', { name: /Download as Markdown/ }),
    );
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock');
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('download button is disabled when no plan is available', () => {
    render(<MigrationPlan />);
    const btn = screen.getByRole('button', { name: /Download as Markdown/ });
    expect(btn).toBeDisabled();
  });

  it('download commits pending cap input before serializing (no stale-pair)', async () => {
    const user = userEvent.setup();
    let capturedBlob: Blob | null = null;
    const createSpy = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock';
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createSpy,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    loadIsolatedRepos(15);
    render(<MigrationPlan />);

    // Type new cap then click download WITHOUT explicitly blurring first.
    // Pre-fix: download captured stale capPerWave=100 → 1 sub-wave in MD.
    // Post-fix: download re-parses capInput → 2 sub-waves in MD.
    const input = screen.getByLabelText(/Repos per wave/) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '10');
    await user.click(
      screen.getByRole('button', { name: /Download as Markdown/ }),
    );

    expect(capturedBlob).not.toBeNull();
    const text = await (capturedBlob as unknown as Blob).text();
    // cap=10 split should produce a "split across" header on Wave 1.
    expect(text).toMatch(/Wave 1.*split across 2 sub-waves/);
    clickSpy.mockRestore();
  });

  // ── Direction-conditional copy ────────────────────────────────

  it('intro copy reflects sinks-first by default', () => {
    loadAppLib();
    render(<MigrationPlan />);
    expect(
      screen.getByText(/Foundational repos move first/),
    ).toBeInTheDocument();
  });

  it('intro copy flips for sources-first', async () => {
    const user = userEvent.setup();
    loadAppLib();
    render(<MigrationPlan />);
    await user.click(screen.getByRole('radio', { name: 'Consumers first' }));
    expect(screen.getByText(/Consumer apps move first/)).toBeInTheDocument();
  });

  it('Wave 1 sub-label flips between Foundations and Top-level consumers', async () => {
    const user = userEvent.setup();
    loadAppLib();
    render(<MigrationPlan />);
    expect(screen.getByText('Foundations')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Consumers first' }));
    expect(screen.getByText('Top-level consumers')).toBeInTheDocument();
    expect(screen.queryByText('Foundations')).not.toBeInTheDocument();
  });

  // ── displayPrerequisites plumbing ─────────────────────────────

  it('prerequisites disclosure flips contents with direction', async () => {
    const user = userEvent.setup();
    loadAppLib();
    render(<MigrationPlan />);

    // sinks-first: Wave 2 holds org/app, prereqs = [org/lib].
    const headings = screen.getAllByRole('heading', { level: 4 });
    const wave2 = headings[1].closest('article')!;
    expect(within(wave2).getByText(/Prerequisites \(1\)/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Consumers first' }));

    // sources-first: Wave 2 now holds org/lib, prereqs = [org/app].
    const headings2 = screen.getAllByRole('heading', { level: 4 });
    const newWave2 = headings2[1].closest('article')!;
    expect(newWave2).toHaveTextContent('org/lib');
    expect(
      within(newWave2).getByText(/Prerequisites \(1\)/),
    ).toBeInTheDocument();
  });
});
