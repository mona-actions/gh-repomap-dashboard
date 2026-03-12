/**
 * NodeTooltip — Tooltip shown on node hover.
 *
 * Displays repo info positioned near the cursor,
 * with automatic edge-avoidance to stay within viewport.
 */
import { useDataStore } from '@/store/dataStore';
import { getOrgColor } from '@/utils/colors';

export interface NodeTooltipProps {
  /** The node key being hovered, or null when not visible */
  node: string | null;
  /** Viewport position for the tooltip */
  position?: { x: number; y: number };
}

export function NodeTooltip({ node, position }: NodeTooltipProps) {
  const graph = useDataStore.getState().graph;
  const allOrgs = useDataStore((s) => s.allOrgs);

  if (!node || !position || !graph || !graph.hasNode(node)) return null;

  const attrs = graph.getNodeAttributes(node);
  const org = attrs.org as string;
  const directDeps = (attrs.directDeps as number) ?? 0;
  const dependents = (attrs.dependents as number) ?? 0;
  const scanStatusRaw = attrs.scanStatus as Record<string, string> | string | undefined;
  const scanStatusLabel =
    typeof scanStatusRaw === 'string'
      ? scanStatusRaw
      : scanStatusRaw
        ? `sbom: ${scanStatusRaw.sbom ?? '?'}, filescan: ${scanStatusRaw.filescan ?? '?'}`
        : 'unknown';
  const isPhantom = (attrs.isPhantom as boolean) ?? false;
  const isArchived = (attrs.archived as boolean) ?? false;
  const orgColor = getOrgColor(org, allOrgs);

  // Position tooltip avoiding screen edges
  const OFFSET = 12;
  const tooltipStyle: React.CSSProperties = {
    left: Math.min(position.x + OFFSET, window.innerWidth - 280),
    top: Math.min(position.y + OFFSET, window.innerHeight - 200),
  };

  return (
    <div
      className="node-tooltip"
      style={tooltipStyle}
      role="tooltip"
      aria-live="polite"
    >
      <div className="node-tooltip__header">
        <span className="node-tooltip__name" title={node}>
          {(attrs.label as string) || node}
        </span>
      </div>

      <div className="node-tooltip__org">
        <span
          className="node-tooltip__org-dot"
          style={{ backgroundColor: orgColor }}
          aria-hidden="true"
        />
        {org}
      </div>

      <div className="node-tooltip__stats">
        <div className="node-tooltip__stat">
          <span className="node-tooltip__stat-label">Direct deps</span>
          <span className="node-tooltip__stat-value">{directDeps}</span>
        </div>
        <div className="node-tooltip__stat">
          <span className="node-tooltip__stat-label">Dependents</span>
          <span className="node-tooltip__stat-value">{dependents}</span>
        </div>
      </div>

      <div className="node-tooltip__meta">
        <span className="node-tooltip__status">
          Scan: {scanStatusLabel}
        </span>
        {isPhantom && (
          <span className="node-tooltip__badge node-tooltip__badge--phantom">
            Phantom
          </span>
        )}
        {isArchived && (
          <span className="node-tooltip__badge node-tooltip__badge--archived">
            Archived
          </span>
        )}
      </div>
    </div>
  );
}