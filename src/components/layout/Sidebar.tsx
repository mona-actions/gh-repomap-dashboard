/**
 * Collapsible sidebar for navigation.
 *
 * Shows navigation links (Dashboard, List View, Graph View) using Primer's NavList.
 * Collapses via uiStore.sidebarOpen. On narrow screens, overlays as a drawer.
 */
import { NavList } from '@primer/react';
import {
  GraphIcon,
  ListUnorderedIcon,
  ProjectIcon,
  LightBulbIcon,
} from '@primer/octicons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: ProjectIcon },
  { label: 'List View', path: '/list', icon: ListUnorderedIcon },
  { label: 'Graph View', path: '/graph', icon: GraphIcon },
  { label: 'Insights', path: '/insights', icon: LightBulbIcon },
];

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      {/* Backdrop overlay on mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          role="presentation"
        />
      )}

      <nav
        aria-label="Main navigation"
        className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--closed'}`}
      >
        <div style={{ padding: '16px', width: '240px' }}>
          <h2 className="sidebar__heading">Navigation</h2>
          <NavList aria-label="Pages">
            {NAV_ITEMS.map((item) => (
              <NavList.Item
                key={item.path}
                aria-current={
                  location.pathname === item.path ? 'page' : undefined
                }
                onClick={() => {
                  navigate(item.path);
                  // Close sidebar on mobile after navigation
                  if (window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
              >
                <NavList.LeadingVisual>
                  <item.icon />
                </NavList.LeadingVisual>
                {item.label}
              </NavList.Item>
            ))}
          </NavList>
        </div>
      </nav>
    </>
  );
}
