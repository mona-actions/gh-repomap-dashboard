/**
 * UnresolvedTab — External packages consumed by a repo that couldn't be mapped.
 *
 * Reads from `unresolved[selectedRepo]` in the data store and displays
 * package name, ecosystem, version, and reason.
 */
import { useMemo } from 'react';
import { Label } from '@primer/react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useDataStore } from '@/store/dataStore';

interface UnresolvedTabProps {
  repoName: string;
}

export function UnresolvedTab({ repoName }: UnresolvedTabProps) {
  const unresolved = useDataStore((s) => s.unresolved);

  const packages = useMemo(() => {
    if (!unresolved) return [];
    return unresolved[repoName] ?? [];
  }, [unresolved, repoName]);

  if (packages.length === 0) {
    return (
      <EmptyState
        title="No unresolved packages"
        description="All external packages for this repository were successfully resolved."
      />
    );
  }

  return (
    <div className="unresolved-tab">
      <table className="unresolved-tab__table" aria-label="Unresolved packages">
        <thead>
          <tr>
            <th scope="col">Package</th>
            <th scope="col">Ecosystem</th>
            <th scope="col">Version</th>
            <th scope="col">Reason</th>
          </tr>
        </thead>
        <tbody>
          {packages.map((pkg, i) => (
            <tr key={`${pkg.package_name}-${i}`}>
              <td>
                <code>{pkg.package_name}</code>
              </td>
              <td>
                <Label size="small">{pkg.ecosystem}</Label>
              </td>
              <td>
                <code>{pkg.version}</code>
              </td>
              <td className="unresolved-tab__reason">{pkg.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
