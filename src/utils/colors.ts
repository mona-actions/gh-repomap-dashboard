/**
 * Deterministic, colorblind-safe organization color assignment.
 *
 * Colors are assigned by sorted alphabetical index for the first 20 orgs
 * (using a curated Tableau 20-style palette) and by seeded hash for overflow.
 * This ensures the same org always gets the same color across sessions,
 * regardless of render order.
 *
 * @see FRONTEND_INTEGRATION.md — "Color Coding" section
 */

/** Curated 20-color palette (Tableau 20-style) for the first 20 orgs. */
const PALETTE = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
  '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac',
  '#5778a4', '#e49444', '#d1615d', '#85b6b2', '#6a9f58',
  '#e7ca60', '#a87aa0', '#fc9db8', '#8d6a5a', '#b2a89f',
];

/**
 * Generates a deterministic HSL color from a string via hashing.
 * Used for orgs beyond the first 20 in the curated palette.
 */
function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash);
  const hue = hash % 360;
  const saturation = 55 + (hash % 20); // 55-75%
  const lightness = 45 + (hash % 15); // 45-60%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Returns a deterministic color for an org, given the full list of orgs.
 *
 * Orgs are sorted alphabetically; the first 20 get a curated palette color,
 * the rest get a seeded hash-based HSL color.
 */
export function getOrgColor(orgName: string, allOrgs: string[]): string {
  const sorted = [...allOrgs].sort();
  const index = sorted.indexOf(orgName);

  if (index >= 0 && index < PALETTE.length) {
    return PALETTE[index];
  }

  // For >20 orgs, generate via seeded hash
  return hashColor(orgName);
}

/**
 * Returns a Map of org name → color for all orgs.
 * Useful for batch-assigning colors once at data-load time.
 */
export function getOrgColorMap(orgs: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const org of orgs) {
    map.set(org, getOrgColor(org, orgs));
  }
  return map;
}

/** Canonical colors for each dependency type, matching the visualization spec. */
export const DEP_TYPE_COLORS: Record<string, string> = {
  package: '#4e79a7',
  workflow: '#f28e2b',
  action: '#e15759',
  submodule: '#76b7b2',
  docker: '#59a14f',
  terraform: '#edc948',
  script: '#bab0ac',
};

/** Colors for ecosystem filter chips and graph edges. */
export const ECOSYSTEM_COLORS: Record<string, string> = {
  // Package ecosystems
  npm: '#cb3837',
  go: '#00add8',
  maven: '#c71a36',
  pip: '#3776ab',
  pypi: '#3776ab',
  nuget: '#004880',
  rubygems: '#cc342d',
  cargo: '#dea584',
  composer: '#885630',
  swift: '#f05138',
  gradle: '#02303a',
  hex: '#6e4a7e',
  // Dep types used as ecosystems
  action: '#2088ff',
  workflow: '#9333ea',
  docker: '#2496ed',
  submodule: '#f97316',
  terraform: '#7b42bc',
  script: '#6b7280',
  'unknown-package': '#8b949e',
};
