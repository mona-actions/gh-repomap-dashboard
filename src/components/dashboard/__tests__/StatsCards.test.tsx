/**
 * Tests for the StatsCards dashboard component.
 *
 * Verifies correct rendering of stat values from fixture data
 * and graceful handling of null/missing data.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsCards } from '../StatsCards';
import type { OutputData } from '@/schemas/repomap';

const mockMetadata: OutputData['metadata'] = {
  generated_at: '2026-03-12T00:26:56.046Z',
  tool_version: '0.1.0',
  github_host: '',
  orgs_scanned: ['org-alpha', 'org-beta', 'org-gamma'],
  total_repos: 50,
  total_repos_scanned: 45,
  total_repos_skipped: 5,
  total_edges: 178,
  scan_duration_seconds: 5,
  split_info: {
    mode: 'merged',
    file_index: 1,
    total_files: 1,
    this_file_orgs: ['org-alpha', 'org-beta', 'org-gamma'],
  },
};

const mockStats: OutputData['stats'] = {
  most_depended_on: [
    { repo: 'org-alpha/shared-4', direct_dependents: 6 },
    { repo: 'org-beta/api-4', direct_dependents: 5 },
  ],
  dependency_type_counts: {
    action: 25,
    workflow: 28,
    package: 23,
  },
  clusters: [],
  strong_clusters: [],
  circular_deps: [['org-alpha/sdk-1', 'org-alpha/api-0']],
  orphan_repos: ['org-gamma/orphan-1', 'org-gamma/orphan-2'],
};

describe('StatsCards', () => {
  it('renders all 6 stat cards', () => {
    render(
      <StatsCards
        metadata={mockMetadata}
        stats={mockStats}
        nodeCount={50}
        edgeCount={178}
      />,
    );

    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(6);
  });

  it('displays correct Total Repos count', () => {
    render(
      <StatsCards
        metadata={mockMetadata}
        stats={mockStats}
        nodeCount={50}
        edgeCount={178}
      />,
    );

    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('Total Repos')).toBeInTheDocument();
  });

  it('displays correct Total Edges count', () => {
    render(
      <StatsCards
        metadata={mockMetadata}
        stats={mockStats}
        nodeCount={50}
        edgeCount={178}
      />,
    );

    expect(screen.getByText('178')).toBeInTheDocument();
    expect(screen.getByText('Total Edges')).toBeInTheDocument();
  });

  it('displays correct Orgs Scanned count', () => {
    render(
      <StatsCards
        metadata={mockMetadata}
        stats={mockStats}
        nodeCount={50}
        edgeCount={178}
      />,
    );

    expect(screen.getByText('Orgs Scanned')).toBeInTheDocument();
    // 3 orgs scanned
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('displays correct Scan Coverage percentage', () => {
    render(
      <StatsCards
        metadata={mockMetadata}
        stats={mockStats}
        nodeCount={50}
        edgeCount={178}
      />,
    );

    // 45/50 = 90%
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('Scan Coverage')).toBeInTheDocument();
  });

  it('displays correct Orphan Repos count', () => {
    render(
      <StatsCards
        metadata={mockMetadata}
        stats={mockStats}
        nodeCount={50}
        edgeCount={178}
      />,
    );

    expect(screen.getByText('Orphan Repos')).toBeInTheDocument();
    // 2 orphan repos
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays correct Circular Deps count', () => {
    render(
      <StatsCards
        metadata={mockMetadata}
        stats={mockStats}
        nodeCount={50}
        edgeCount={178}
      />,
    );

    expect(screen.getByText('Circular Deps')).toBeInTheDocument();
    // 1 circular dep cycle
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('handles null metadata gracefully', () => {
    render(
      <StatsCards
        metadata={null}
        stats={mockStats}
        nodeCount={0}
        edgeCount={0}
      />,
    );

    // Should show 0 for orgs scanned and 0% coverage
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(6);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('handles null stats gracefully', () => {
    render(
      <StatsCards
        metadata={mockMetadata}
        stats={null}
        nodeCount={50}
        edgeCount={178}
      />,
    );

    // Should show 0 for orphan repos and circular deps
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(6);
  });

  it('has proper aria region label', () => {
    render(
      <StatsCards
        metadata={mockMetadata}
        stats={mockStats}
        nodeCount={50}
        edgeCount={178}
      />,
    );

    expect(
      screen.getByRole('region', { name: 'Summary statistics' }),
    ).toBeInTheDocument();
  });
});
