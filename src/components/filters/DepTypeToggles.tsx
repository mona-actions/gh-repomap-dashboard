/**
 * DepTypeToggles — Toggle chips for each dependency type.
 *
 * Color-coded to match edge colors. Active chips show filled,
 * inactive show outline. Updates filterStore.depTypes.
 */
import { useFilterStore } from '@/store/filterStore';
import { DEP_TYPE_COLORS } from '@/utils/colors';

const DEP_TYPES = [
  { key: 'package', label: 'Package' },
  { key: 'workflow', label: 'Workflow' },
  { key: 'action', label: 'Action' },
  { key: 'docker', label: 'Docker' },
  { key: 'submodule', label: 'Submodule' },
  { key: 'terraform', label: 'Terraform' },
  { key: 'script', label: 'Script' },
] as const;

export function DepTypeToggles() {
  const depTypes = useFilterStore((s) => s.depTypes);
  const toggleDepType = useFilterStore((s) => s.toggleDepType);

  return (
    <div
      className="dep-type-toggles"
      role="group"
      aria-label="Filter by dependency type"
    >
      <h4 className="filter-section__title">Dependency Types</h4>
      <div className="dep-type-toggles__chips">
        {DEP_TYPES.map(({ key, label }) => {
          const isActive = depTypes.length === 0 || depTypes.includes(key);
          const color = DEP_TYPE_COLORS[key];

          return (
            <button
              key={key}
              type="button"
              className={`dep-type-toggles__chip ${isActive ? 'dep-type-toggles__chip--active' : ''}`}
              onClick={() => toggleDepType(key)}
              aria-pressed={depTypes.includes(key)}
              style={
                depTypes.includes(key)
                  ? {
                      backgroundColor: color,
                      borderColor: color,
                      color: '#fff',
                    }
                  : { borderColor: color, color }
              }
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
