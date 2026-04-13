/**
 * DepTypeChart — Horizontal bar chart of dependency type distribution.
 *
 * Built with raw SVG for zero extra dependencies. Color-coded using
 * DEP_TYPE_COLORS. Fully accessible with role="img", <title>, and <desc>.
 */
import { DEP_TYPE_COLORS } from '@/utils/colors';

interface DepTypeChartProps {
  /** Map of dependency type name → count */
  typeCounts: Record<string, number>;
}

const BAR_HEIGHT = 28;
const BAR_GAP = 8;
const LABEL_WIDTH = 100;
const COUNT_WIDTH = 50;
const CHART_PADDING = 16;

export function DepTypeChart({ typeCounts }: DepTypeChartProps) {
  const entries = Object.entries(typeCounts).sort(([, a], [, b]) => b - a);

  if (entries.length === 0) {
    return (
      <div className="dep-type-chart dep-type-chart--empty">
        <p style={{ color: 'var(--fgColor-muted, #636c76)' }}>
          No dependency type data available.
        </p>
      </div>
    );
  }

  const maxCount = Math.max(...entries.map(([, count]) => count));
  const totalHeight =
    entries.length * (BAR_HEIGHT + BAR_GAP) - BAR_GAP + CHART_PADDING * 2;

  const description = entries
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ');

  return (
    <div className="dep-type-chart">
      <svg
        role="img"
        aria-label="Dependency type distribution"
        width="100%"
        height={totalHeight}
        viewBox={`0 0 500 ${totalHeight}`}
        preserveAspectRatio="xMinYMin meet"
      >
        <title>Dependency type distribution</title>
        <desc>{description}</desc>
        {entries.map(([type, count], i) => {
          const y = CHART_PADDING + i * (BAR_HEIGHT + BAR_GAP);
          const barMaxWidth = 500 - LABEL_WIDTH - COUNT_WIDTH - CHART_PADDING;
          const barWidth = maxCount > 0 ? (count / maxCount) * barMaxWidth : 0;
          const color = DEP_TYPE_COLORS[type] ?? '#8b949e';

          return (
            <g key={type} data-testid={`dep-bar-${type}`}>
              {/* Type label */}
              <text
                x={LABEL_WIDTH - 8}
                y={y + BAR_HEIGHT / 2}
                textAnchor="end"
                dominantBaseline="central"
                fill="var(--fgColor-default, #1f2328)"
                fontSize="13"
                fontFamily="inherit"
              >
                {type}
              </text>

              {/* Bar */}
              <rect
                x={LABEL_WIDTH}
                y={y + 2}
                width={barWidth}
                height={BAR_HEIGHT - 4}
                rx={4}
                fill={color}
              />

              {/* Count */}
              <text
                x={LABEL_WIDTH + barWidth + 8}
                y={y + BAR_HEIGHT / 2}
                dominantBaseline="central"
                fill="var(--fgColor-muted, #636c76)"
                fontSize="13"
                fontWeight="600"
                fontFamily="inherit"
              >
                {count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
