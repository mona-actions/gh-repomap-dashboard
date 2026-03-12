/**
 * MiniSearch-based full-text search for repositories.
 *
 * Provides prefix, fuzzy, and boosted field search across repo names,
 * orgs, and dependency types. Uses a module-level singleton index
 * that's rebuilt when data changes.
 *
 * @see https://lucaong.github.io/minisearch/
 */
import MiniSearch from 'minisearch';

export interface SearchableRepo {
  /** Full repo identifier in "org/repo" format. */
  id: string;
  /** Organization name. */
  org: string;
  /** Repository name without org prefix. */
  name: string;
  /** Space-separated dependency types for searchability. */
  depTypes: string;
}

let searchIndex: MiniSearch<SearchableRepo> | null = null;

/**
 * Builds (or rebuilds) the search index from the given repos.
 * Call this whenever the loaded data changes.
 */
export function buildSearchIndex(repos: SearchableRepo[]): void {
  searchIndex = new MiniSearch<SearchableRepo>({
    fields: ['id', 'org', 'name', 'depTypes'],
    storeFields: ['id', 'org', 'name'],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: { name: 2, org: 1.5 },
    },
  });
  searchIndex.addAll(repos);
}

/**
 * Searches the index for repos matching the query.
 *
 * Supports prefix matching and fuzzy search (edit distance ≈ 0.2× term length).
 * Results are ranked by relevance with `name` and `org` fields boosted.
 *
 * @param query - Search string (empty returns [])
 * @param limit - Maximum number of results (default 20)
 */
export function searchRepos(
  query: string,
  limit: number = 20,
): SearchableRepo[] {
  if (!searchIndex || !query.trim()) return [];
  const results = searchIndex.search(query) as unknown as SearchableRepo[];
  return results.slice(0, limit);
}

/**
 * Returns the current search index instance (for advanced use).
 * Returns null if no index has been built yet.
 */
export function getSearchIndex(): MiniSearch<SearchableRepo> | null {
  return searchIndex;
}
