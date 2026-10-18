import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import { NotifProvider } from '../../context/NotifContext';

export default function AppShell() {
  return (
    <NotifProvider>
      <div className="shell">
        <Sidebar />
        <div className="main">
          <Topbar />
          <main id="konten">
            <Outlet />
          </main>
        </div>
        <BottomNav />
      </div>
    </NotifProvider>
  );
}
