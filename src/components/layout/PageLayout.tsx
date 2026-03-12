/**
 * Main page layout wrapper.
 *
 * Renders the SkipLink, AppHeader, and a flex layout with the
 * sidebar and main content area. The RepoDetailPanel is always
 * present and controlled by uiStore.selectedRepo. The main
 * content area has id="main-content" for the skip link target.
 */
import type { ReactNode } from 'react';
import { SkipLink } from '@/components/shared/SkipLink';
import { AppHeader } from './AppHeader';
import { Sidebar } from './Sidebar';
import { RepoDetailPanel } from '@/components/detail/RepoDetailPanel';
import { useDataStore } from '@/store/dataStore';

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  const hasData = useDataStore((s) => s.graph !== null);

  return (
    <div className="page-layout">
      <SkipLink />
      <AppHeader />
      <div className="page-layout__body">
        {/* Sidebar only shown when data is loaded */}
        {hasData && <Sidebar />}

        <main
          id="main-content"
          tabIndex={-1}
          className="page-layout__content"
        >
          {children}
        </main>
      </div>

      {/* Detail panel — always present, controlled by uiStore.selectedRepo */}
      {hasData && <RepoDetailPanel />}
    </div>
  );
}
