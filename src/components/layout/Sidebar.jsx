import { Link, NavLink, useLocation } from 'react-router-dom';
import Logo from '../illustrations/Logo';
import { Avatar } from '../ui';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useTugas } from '../../context/TugasContext';
import { navGroups } from './navConfig';

export default function Sidebar() {
  const { pengaturan } = useSettings();
  const { hak, warga, peranLabel } = useAuth();
  const { stat } = useTugas();
  const { pathname } = useLocation();
  const groups = navGroups(hak);
  // Hanya menu yang paling spesifik yang ditandai aktif (mis. /keuangan/persetujuan tidak ikut menyalakan /keuangan)
  const cocok = (it) => (it.end ? pathname === it.to : pathname === it.to || pathname.startsWith(it.to === '/' ? '/__' : it.to + '/'))
    || (it.also || []).some((b) => pathname.startsWith(b + '/'));
  const aktif = groups.flatMap((g) => g.items).filter(cocok).sort((a, b) => b.to.length - a.to.length)[0]?.to;
  const lingkungan = [pengaturan.rt && `RT ${pengaturan.rt}`, pengaturan.rw && `RW ${pengaturan.rw}`].filter(Boolean).join(' / ');

  return (
    <aside className="sidebar" aria-label="Navigasi utama">
      <Link to="/" className="sb-brand" aria-label="Beranda">
        <Logo size={40} tile />
        <span className="t">
          <span className="name">{pengaturan.nama_paguyuban}</span>
          {lingkungan && <span className="sub" style={{ display: 'block' }}>{pengaturan.nama_lingkungan ? `${pengaturan.nama_lingkungan} · ` : ''}{lingkungan}</span>}
        </span>
      </Link>
      <nav className="sb-scroll">
        {groups.map((g) => (
          <div className="sb-group" key={g.label || 'utama'}>
            {g.label && <div className="sb-group-label">{g.label}</div>}
            {g.items.map((it) => {
              const Icon = it.icon;
              const n = it.badge ? stat?.[it.badge] || 0 : 0;
              return (
                <NavLink key={it.to} to={it.to} end={it.end} title={it.label}
                  aria-current={aktif === it.to ? 'page' : undefined}
                  className={() => `sb-link ${aktif === it.to ? 'active' : ''}`}>
                  <Icon size={18} aria-hidden="true" />
                  <span className="lbl">{it.label}</span>
                  {n > 0 && <span className="count soft" aria-label={`${n} menunggu`}>{n > 99 ? '99+' : n}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sb-foot">
        <Link to="/profil" className="sb-me" title="Profil saya">
          <Avatar nama={warga?.nama} path={warga?.foto_path} size={36} ring={hak.pengurus} />
          <span className="who">
            <span className="nm" style={{ display: 'block' }}>{warga?.nama}</span>
            <span className="rl" style={{ display: 'block' }}>{peranLabel}{warga?.blok ? ` · ${warga.blok}-${warga.no_rumah}` : ''}</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
