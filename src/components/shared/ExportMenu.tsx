/**
 * ExportMenu — Export/sharing functionality for the dashboard.
 *
 * Provides three actions:
 * 1. Copy URL: Copy current URL (with filter state) to clipboard
 * 2. Export filtered graph as JSON: Serialize visible nodes/edges
 * 3. Export repo list as CSV: Visible repos with key columns
 */
import { useState, useCallback } from 'react';
import {
  CopyIcon,
  DownloadIcon,
  ShareIcon,
  CheckIcon,
} from '@primer/octicons-react';
import { useDataStore } from '@/store/dataStore';

/** Trigger a file download in the browser. */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExportMenu() {
  const [copied, setCopied] = useState(false);

  // ── Copy URL ────────────────────────────────────────────────────────
  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  // ── Export JSON ─────────────────────────────────────────────────────
  const handleExportJson = useCallback(() => {
    const graph = useDataStore.getState().graph;
    const metadata = useDataStore.getState().metadata;
    const stats = useDataStore.getState().stats;
    if (!graph) return;

    // Collect visible nodes and edges
    const nodes: Record<string, Record<string, unknown>> = {};
    const edges: Array<{
      source: string;
      target: string;
      attributes: Record<string, unknown>;
    }> = [];

    graph.forEachNode((node, attrs) => {
      if (!attrs.hidden) {
        nodes[node] = { ...attrs };
        delete nodes[node].hidden;
      }
    });

    graph.forEachEdge((_edge, attrs, source, target) => {
      if (
        !attrs.hidden &&
        !graph.getNodeAttribute(source, 'hidden') &&
        !graph.getNodeAttribute(target, 'hidden')
      ) {
        const cleanAttrs = { ...attrs };
        delete cleanAttrs.hidden;
        edges.push({ source, target, attributes: cleanAttrs });
      }
    });

    const exportData = {
      exported_at: new Date().toISOString(),
      metadata,
      stats,
      filtered_graph: {
        node_count: Object.keys(nodes).length,
        edge_count: edges.length,
        nodes,
        edges,
      },
    };

    downloadFile(
      JSON.stringify(exportData, null, 2),
      'repomap-filtered.json',
      'application/json',
    );
  }, []);

  // ── Export CSV ──────────────────────────────────────────────────────
  const handleExportCsv = useCallback(() => {
    const graph = useDataStore.getState().graph;
    if (!graph) return;

    const rows: string[] = [
      'repo,org,direct_deps,dependents,dep_types,archived',
    ];

    graph.forEachNode((node, attrs) => {
      if (attrs.hidden) return;

      const org = (attrs.org as string) ?? '';
      const directDeps = graph.outDegree(node);
      const dependents = graph.inDegree(node);
      const archived = Boolean(attrs.archived);

      // Collect dep types
      const typeSet = new Set<string>();
      graph.forEachOutEdge(node, (_edge, edgeAttrs) => {
        if (edgeAttrs.type) typeSet.add(edgeAttrs.type as string);
      });

      const escapeCsv = (s: string) =>
        s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;

      rows.push(
        [
          escapeCsv(node),
          escapeCsv(org),
          directDeps,
          dependents,
          escapeCsv([...typeSet].sort().join(';')),
          archived,
        ].join(','),
      );
    });

    downloadFile(rows.join('\n'), 'repomap-repos.csv', 'text/csv');
  }, []);

  return (
    <div className="export-menu" role="group" aria-label="Export options">
      <button
        className="export-menu__btn"
        onClick={handleCopyUrl}
        title={copied ? 'Link copied!' : 'Copy URL to clipboard'}
        aria-label={copied ? 'Link copied!' : 'Copy URL'}
      >
        {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
        <span>{copied ? 'Copied!' : 'Copy URL'}</span>
      </button>

      <button
        className="export-menu__btn"
        onClick={handleExportJson}
        title="Export visible graph as JSON"
        aria-label="Export JSON"
      >
        <DownloadIcon size={16} />
        <span>Export JSON</span>
      </button>

      <button
        className="export-menu__btn"
        onClick={handleExportCsv}
        title="Export repo list as CSV"
        aria-label="Export CSV"
      >
        <ShareIcon size={16} />
        <span>Export CSV</span>
      </button>
    </div>
  );
}
