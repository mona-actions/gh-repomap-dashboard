/**
 * Application header with branding, upload trigger, and dark/light mode toggle.
 *
 * Uses Primer components and CSS utility classes for layout.
 * Reads/writes colorMode from uiStore and shows active filter count
 * from filterStore.
 */
import { useCallback } from 'react';
import { IconButton, CounterLabel, Tooltip, Button } from '@primer/react';
import {
  MarkGithubIcon,
  SunIcon,
  MoonIcon,
  ThreeBarsIcon,
  UploadIcon,
} from '@primer/octicons-react';
import { useUIStore } from '@/store/uiStore';
import { useFilterStore } from '@/store/filterStore';
import { useDataStore } from '@/store/dataStore';

export function AppHeader() {
  const colorMode = useUIStore((s) => s.colorMode);
  const setColorMode = useUIStore((s) => s.setColorMode);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const hasData = useDataStore((s) => s.graph !== null);

  const activeFilterCount = useFilterStore((s) => {
    let count = 0;
    if (s.selectedOrgs.length > 0) count++;
    if (s.depTypes.length > 0) count++;
    if (s.confidenceFilter !== 'all') count++;
    if (!s.showArchived) count++;
    if (s.clusterId !== null) count++;
    if (s.searchQuery) count++;
    return count;
  });

  const handleToggleColorMode = useCallback(() => {
    setColorMode(colorMode === 'dark' ? 'light' : 'dark');
  }, [colorMode, setColorMode]);

  const isDark = colorMode === 'dark';

  return (
    <header
      className="app-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderBottom: '1px solid var(--borderColor-default, #d0d7de)',
        height: '56px',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: 'var(--bgColor-default, #fff)',
      }}
    >
      {/* Sidebar toggle (only when data is loaded) */}
      {hasData && (
        <Tooltip text="Toggle sidebar" direction="e">
          <IconButton
            icon={ThreeBarsIcon}
            aria-label="Toggle sidebar"
            variant="invisible"
            onClick={toggleSidebar}
            size="medium"
          />
        </Tooltip>
      )}

      {/* Logo + App Name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginRight: 'auto',
        }}
      >
        <MarkGithubIcon size={24} />
        <span className="app-header__title">gh-repomap-dashboard</span>
      </div>

      {/* Active filter badge */}
      {activeFilterCount > 0 && (
        <span
          aria-label={`${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`}
          title={`${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`}
        >
          <CounterLabel scheme="primary">{activeFilterCount}</CounterLabel>
        </span>
      )}

      {/* Load new file button (when data is loaded) */}
      {hasData && (
        <Button
          as="a"
          href="/"
          size="small"
          leadingVisual={UploadIcon}
          variant="invisible"
        >
          <span className="app-header__load-label">Load new file</span>
        </Button>
      )}

      {/* Dark/Light mode toggle */}
      <Tooltip
        text={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        direction="s"
      >
        <IconButton
          icon={isDark ? SunIcon : MoonIcon}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          variant="invisible"
          onClick={handleToggleColorMode}
          size="medium"
        />
      </Tooltip>
    </header>
  );
}
