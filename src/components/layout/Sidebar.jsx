import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight, Leaf, UserCog } from 'lucide-react';
import Logo from '../illustrations/Logo';
import HouseScene from '../illustrations/HouseScene';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useNotif } from '../../context/NotifContext';
import { sidebarItems } from './navConfig';
import { PERAN } from '../../lib/constants';

const match = (path, bases = []) => bases.some((b) => path === b || path.startsWith(b + '/'));

export default function Sidebar() {
  const { pengaturan } = useSettings();
  const { hak, warga } = useAuth();
  const { unread } = useNotif();
  const { pathname } = useLocation();
  const items = sidebarItems(hak);
  const [open, setOpen] = useState(() => items.find((i) => i.children && match(pathname, i.base))?.label || null);
  useEffect(() => {
    const cur = items.find((i) => i.children && match(pathname, i.base));
    if (cur) setOpen(cur.label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <aside className="sidebar" aria-label="Navigasi utama">
      <div className="sb-brand">
        <Logo size={58} />
        <div className="name">{pengaturan.nama_paguyuban}</div>
        <div className="tag">{pengaturan.tagline}</div>
      </div>
      <nav className="sb-nav">
        {items.map((it, i) => {
          if (it.sep) return <div key={`s${i}`} className="sb-sep" />;
          const Icon = it.icon;
          if (it.children) {
            const active = match(pathname, it.base);
            const isOpen = open === it.label;
            return (
              <div key={it.label}>
                <button
                  className={`sb-item ${active ? 'active' : ''} ${isOpen ? 'open' : ''}`}
                  onClick={() => setOpen(isOpen ? null : it.label)}
                  aria-expanded={isOpen}
                  title={it.label}
                >
                  <Icon size={20} /><span className="lbl">{it.label}</span><ChevronRight size={16} className="chev" />
                </button>
                {isOpen && (
                  <div className="sb-sub">
                    {it.children.map((c) => <NavLink key={c.to} to={c.to} end={c.end} className={({ isActive }) => (isActive ? 'active' : '')}>{c.label}</NavLink>)}
                  </div>
                )}
              </div>
            );
          }
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              title={it.label}
              className={({ isActive }) => `sb-item ${isActive || match(pathname, it.also) ? 'active' : ''}`}
            >
              <Icon size={20} /><span className="lbl">{it.label}</span>
              {it.badge === 'notif' && unread > 0 && <span className="count-dot">{unread > 99 ? '99+' : unread}</span>}
            </NavLink>
          );
        })}
        <div className="sb-sep" />
        <div className="sb-role">
          <UserCog size={20} /><span>Role Saya</span>
          <span className="badge">{PERAN[warga?.role] || 'Warga'}</span>
        </div>
      </nav>
      <div className="sb-foot">
        <HouseScene variant="dark" className="scene" />
        <div className="motto"><Leaf size={18} color="#9fd8a8" /><span>Lingkungan Asri<br />Warga Sejahtera</span></div>
      </div>
    </aside>
  );
}
