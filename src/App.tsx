/**
 * Root application component.
 *
 * Sets up:
 * - Primer ThemeProvider with color mode from uiStore
 * - React Router with lazy-loaded page routes
 * - PageLayout (header + sidebar + main content)
 * - Error boundary at the app level
 * - Route guards: data pages redirect to upload when no data is loaded
 */
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, BaseStyles, Spinner } from '@primer/react';
import { PageLayout } from './components/layout/PageLayout';
import { UploadPage } from './components/upload/UploadPage';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { useUIStore } from './store/uiStore';
import { useDataStore } from './store/dataStore';

// Lazy-loaded page components (code-split per route)
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ListPage = lazy(() => import('./pages/ListPage'));
const GraphPage = lazy(() => import('./pages/GraphPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));

/** Centered spinner used as Suspense fallback for lazy routes. */
function PageSpinner() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 56px)',
      }}
    >
      <Spinner size="large" />
    </div>
  );
}

function App() {
  const colorMode = useUIStore((s) => s.colorMode);
  const hasData = useDataStore((s) => s.graph !== null);

  // Map internal colorMode values to Primer ThemeProvider values.
  // Primer v38 uses 'day'/'night' instead of 'light'/'dark'.
  const primerColorMode = colorMode === 'light' ? 'day' : colorMode === 'dark' ? 'night' : 'auto';

  return (
    <ThemeProvider colorMode={primerColorMode}>
      <BaseStyles>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <PageLayout>
            <Suspense fallback={<PageSpinner />}>
              <Routes>
                <Route
                  path="/"
                  element={
                    hasData ? <Navigate to="/dashboard" replace /> : <UploadPage />
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    hasData ? (
                      <ErrorBoundary level="view">
                        <DashboardPage />
                      </ErrorBoundary>
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route
                  path="/list"
                  element={
                    hasData ? (
                      <ErrorBoundary level="view">
                        <ListPage />
                      </ErrorBoundary>
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route
                  path="/graph"
                  element={
                    hasData ? (
                      <ErrorBoundary level="view">
                        <GraphPage />
                      </ErrorBoundary>
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route
                  path="/insights"
                  element={
                    hasData ? (
                      <ErrorBoundary level="view">
                        <InsightsPage />
                      </ErrorBoundary>
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                {/* Catch-all: redirect unknown routes to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </PageLayout>
        </BrowserRouter>
      </BaseStyles>
    </ThemeProvider>
  );
}

export default App;
