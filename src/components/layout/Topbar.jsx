import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, User, Settings, LogOut, LayoutDashboard, Megaphone, CalendarDays } from 'lucide-react';
import { Avatar, SearchInput } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useNotif } from '../../context/NotifContext';
import { useDebounce } from '../../hooks/useDebounce';
import { cariGlobal } from '../../services/dashboard';
import { tanggal } from '../../lib/format';

function useClickAway(ref, fn) {
  useEffect(() => {
    const on = (e) => ref.current && !ref.current.contains(e.target) && fn();
    document.addEventListener('mousedown', on);
    return () => document.removeEventListener('mousedown', on);
  }, [ref, fn]);
}

export default function Topbar() {
  const { warga, hak, peranLabel, signOut } = useAuth();
  const { unread } = useNotif();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const dq = useDebounce(q.trim(), 300);
  const [hasil, setHasil] = useState(null);
  const [menu, setMenu] = useState(false);
  const searchRef = useRef();
  const menuRef = useRef();
  const inputRef = useRef();
  useClickAway(searchRef, () => setHasil(null));
  useClickAway(menuRef, () => setMenu(false));

  useEffect(() => {
    let alive = true;
    if (dq.length < 2) { setHasil(null); return undefined; }
    cariGlobal(dq).then((r) => alive && setHasil(r)).catch(() => {});
    return () => { alive = false; };
  }, [dq]);

  useEffect(() => {
    const on = (e) => {
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName)) { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === 'Escape') { setHasil(null); setMenu(false); }
    };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, []);

  const go = (to) => { setHasil(null); setQ(''); nav(to); };
  const total = hasil ? hasil.warga.length + hasil.pengumuman.length + hasil.kegiatan.length : 0;

  return (
    <header className="topbar">
      <div className="search" ref={searchRef}>
        <SearchInput value={q} onChange={setQ} placeholder="Cari warga, pengumuman, kegiatan" label="Pencarian" ref={inputRef} />
        {hasil && (
          <div className="menu-pop search-pop" role="listbox">
            {total === 0 && <div className="muted text-sm" style={{ padding: 12 }}>Tidak ada hasil untuk “{dq}”.</div>}
            {hasil.warga.length > 0 && <div className="grp">Warga</div>}
            {hasil.warga.map((w) => <button key={w.id} onClick={() => go(`/warga/${w.id}`)}><User size={16} />{w.nama}<span className="sub">{w.blok}-{w.no_rumah}</span></button>)}
            {hasil.pengumuman.length > 0 && <div className="grp">Pengumuman</div>}
            {hasil.pengumuman.map((p) => <button key={p.id} onClick={() => go(`/pengumuman/${p.id}`)}><Megaphone size={16} /><span className="ellipsis">{p.judul}</span><span className="sub">{tanggal(p.created_at, { pendek: true })}</span></button>)}
            {hasil.kegiatan.length > 0 && <div className="grp">Kegiatan</div>}
            {hasil.kegiatan.map((k) => <button key={k.id} onClick={() => go(`/kegiatan/${k.id}`)}><CalendarDays size={16} /><span className="ellipsis">{k.judul}</span><span className="sub">{tanggal(k.mulai, { pendek: true })}</span></button>)}
          </div>
        )}
      </div>
      <div className="tools">
        <Link to="/notifikasi" className="icon-btn" aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'} title="Notifikasi">
          <Bell size={20} />
          {unread > 0 && <span className="count">{unread > 99 ? '99+' : unread}</span>}
        </Link>
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button className="who-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu">
            <Avatar nama={warga?.nama} path={warga?.foto_path} size={36} />
            <span className="t only-desktop">
              <span className="nm">{warga?.nama}</span>
              <span className="rl">{peranLabel}</span>
            </span>
            <ChevronDown size={16} className="muted" />
          </button>
          {menu && (
            <div className="menu-pop" role="menu" onClick={() => setMenu(false)}>
              <div className="menu-head">
                <div className="strong">{warga?.nama}</div>
                <div className="text-xs muted">{peranLabel}{warga?.blok ? ` · Blok ${warga.blok} No. ${warga.no_rumah}` : ''}</div>
              </div>
              <Link to="/profil" role="menuitem"><User size={16} />Profil saya</Link>
              {hak.pengurus && <Link to="/admin" role="menuitem"><LayoutDashboard size={16} />Ringkasan pengurus</Link>}
              <Link to="/pengaturan" role="menuitem"><Settings size={16} />Pengaturan akun</Link>
              <hr />
              <button role="menuitem" onClick={signOut} className="danger"><LogOut size={16} />Keluar</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
