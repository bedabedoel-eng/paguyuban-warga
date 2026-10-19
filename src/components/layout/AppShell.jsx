import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import { NotifProvider } from '../../context/NotifContext';
import { TugasProvider } from '../../context/TugasContext';
import ErrorBoundary from '../ui/ErrorBoundary';
import StatusAplikasi from './StatusAplikasi';

export default function AppShell() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <NotifProvider>
      <TugasProvider>
        <a href="#konten" className="skip-link">Lewati ke konten</a>
        <StatusAplikasi />
        <div className="shell">
          <Sidebar />
          <div className="main">
            <Topbar />
            <main id="konten" tabIndex={-1}>
              <ErrorBoundary level="page" resetKey={pathname}>
                <Outlet />
              </ErrorBoundary>
            </main>
          </div>
          <BottomNav />
        </div>
      </TugasProvider>
    </NotifProvider>
  );
}
