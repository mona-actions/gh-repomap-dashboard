/**
 * UnresolvedPackages — Table of ALL unresolved packages across all repos.
 *
 * Searchable and filterable by ecosystem. Shows package name,
 * ecosystem, version, consuming repo, and reason.
 */
import { useState, useMemo, useCallback } from 'react';
import { Label } from '@primer/react';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';

interface FlattenedPackage {
  packageName: string;
  ecosystem: string;
  version: string;
  repo: string;
  reason: string;
}

export function UnresolvedPackages() {
  const unresolved = useDataStore((s) => s.unresolved);
  const setSelectedRepo = useUIStore((s) => s.setSelectedRepo);
  const [searchTerm, setSearchTerm] = useState('');
  const [ecosystemFilter, setEcosystemFilter] = useState<string>('all');

  // Flatten all unresolved packages across repos
  const allPackages = useMemo(() => {
    if (!unresolved) return [];
    const result: FlattenedPackage[] = [];
    for (const [repo, packages] of Object.entries(unresolved)) {
      for (const pkg of packages) {
        result.push({
          packageName: pkg.package_name,
          ecosystem: pkg.ecosystem,
          version: pkg.version,
          repo,
          reason: pkg.reason,
        });
      }
    }
    return result.sort((a, b) => a.packageName.localeCompare(b.packageName));
  }, [unresolved]);

  // Get unique ecosystems for filter dropdown
  const ecosystems = useMemo(() => {
    const set = new Set(allPackages.map((p) => p.ecosystem));
    return ['all', ...Array.from(set).sort()];
  }, [allPackages]);

  // Apply search and ecosystem filter
  const filtered = useMemo(() => {
    return allPackages.filter((pkg) => {
      const matchesSearch =
        !searchTerm ||
        pkg.packageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.repo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEcosystem =
        ecosystemFilter === 'all' || pkg.ecosystem === ecosystemFilter;
      return matchesSearch && matchesEcosystem;
    });
  }, [allPackages, searchTerm, ecosystemFilter]);

  const handleRepoClick = useCallback(
    (repo: string) => {
      setSelectedRepo(repo);
    },
    [setSelectedRepo],
  );

  if (allPackages.length === 0) {
    return (
      <div className="unresolved-packages">
        <p className="unresolved-packages__empty">
          No unresolved packages across any repositories.
        </p>
      </div>
    );
  }

  return (
    <div className="unresolved-packages">
      <div className="unresolved-packages__header">
        <h3 className="unresolved-packages__title">
          Unresolved Packages ({allPackages.length})
        </h3>
      </div>

      <div className="unresolved-packages__filters">
        <input
          type="search"
          placeholder="Search packages or repos…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="unresolved-packages__search"
          aria-label="Search unresolved packages"
        />
        <select
          value={ecosystemFilter}
          onChange={(e) => setEcosystemFilter(e.target.value)}
          className="unresolved-packages__ecosystem-filter"
          aria-label="Filter by ecosystem"
        >
          {ecosystems.map((eco) => (
            <option key={eco} value={eco}>
              {eco === 'all' ? 'All ecosystems' : eco}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="unresolved-packages__no-results">
          No packages match the current filters.
        </p>
      ) : (
        <table
          className="unresolved-packages__table"
          aria-label="Unresolved packages"
        >
          <thead>
            <tr>
              <th scope="col">Package</th>
              <th scope="col">Ecosystem</th>
              <th scope="col">Version</th>
              <th scope="col">Consuming Repo</th>
              <th scope="col">Reason</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((pkg, i) => (
              <tr key={`${pkg.repo}-${pkg.packageName}-${i}`}>
                <td>
                  <code>{pkg.packageName}</code>
                </td>
                <td>
                  <Label size="small">{pkg.ecosystem}</Label>
                </td>
                <td>
                  <code>{pkg.version}</code>
                </td>
                <td>
                  <button
                    className="unresolved-packages__repo-link"
                    onClick={() => handleRepoClick(pkg.repo)}
                    title={`View details for ${pkg.repo}`}
                  >
                    {pkg.repo}
                  </button>
                </td>
                <td>{pkg.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div
        className="unresolved-packages__footer"
        role="status"
        aria-live="polite"
      >
        Showing {filtered.length} of {allPackages.length} packages
      </div>
    </div>
  );
}
