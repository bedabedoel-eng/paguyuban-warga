import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, MessageSquareText, Search, ChevronDown, User, Settings, LogOut, LayoutDashboard } from 'lucide-react';
import { Avatar } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useNotif } from '../../context/NotifContext';
import { useSettings } from '../../context/SettingsContext';
import { useDebounce } from '../../hooks/useDebounce';
import { cariGlobal } from '../../services/dashboard';
import { tanggal } from '../../lib/format';
import { PERAN } from '../../lib/constants';

function useClickAway(ref, fn) {
  useEffect(() => {
    const on = (e) => ref.current && !ref.current.contains(e.target) && fn();
    document.addEventListener('mousedown', on);
    return () => document.removeEventListener('mousedown', on);
  }, [ref, fn]);
}

export default function Topbar() {
  const { warga, jabatan, hak, signOut } = useAuth();
  const { pengaturan } = useSettings();
  const { unread } = useNotif();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const dq = useDebounce(q.trim(), 300);
  const [hasil, setHasil] = useState(null);
  const [menu, setMenu] = useState(false);
  const searchRef = useRef();
  const menuRef = useRef();
  useClickAway(searchRef, () => setHasil(null));
  useClickAway(menuRef, () => setMenu(false));

  useEffect(() => {
    let alive = true;
    if (dq.length < 2) { setHasil(null); return undefined; }
    cariGlobal(dq).then((r) => alive && setHasil(r)).catch(() => {});
    return () => { alive = false; };
  }, [dq]);

  const go = (to) => { setHasil(null); setQ(''); nav(to); };
  const peran = jabatan ? `${jabatan}${pengaturan.rt ? ` RT ${pengaturan.rt}` : ''}` : PERAN[warga?.role] || 'Warga';
  const total = hasil ? hasil.warga.length + hasil.pengumuman.length + hasil.kegiatan.length : 0;

  return (
    <header className="topbar">
      <div className="search" ref={searchRef}>
        <Search size={18} />
        <input
          className="input"
          type="search"
          placeholder="Cari warga, pengumuman, kegiatan..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Pencarian"
        />
        {hasil && (
          <div className="dropdown search-results">
            {total === 0 && <div className="muted small" style={{ padding: 10 }}>Tidak ada hasil untuk “{dq}”.</div>}
            {hasil.warga.length > 0 && <div className="grp">Warga</div>}
            {hasil.warga.map((w) => <button key={w.id} onClick={() => go(`/warga/${w.id}`)}><User size={16} />{w.nama}<span className="muted small">{w.blok}-{w.no_rumah}</span></button>)}
            {hasil.pengumuman.length > 0 && <div className="grp">Pengumuman</div>}
            {hasil.pengumuman.map((p) => <button key={p.id} onClick={() => go(`/pengumuman/${p.id}`)}>{p.judul}<span className="muted small">{tanggal(p.created_at, { pendek: true })}</span></button>)}
            {hasil.kegiatan.length > 0 && <div className="grp">Kegiatan</div>}
            {hasil.kegiatan.map((k) => <button key={k.id} onClick={() => go(`/kegiatan/${k.id}`)}>{k.judul}<span className="muted small">{tanggal(k.mulai, { pendek: true })}</span></button>)}
          </div>
        )}
      </div>
      <div className="tools">
        <Link to="/notifikasi" className="icon-btn" aria-label={`Notifikasi, ${unread} belum dibaca`}>
          <Bell size={21} />
          {unread > 0 && <span className="count-dot">{unread > 99 ? '99+' : unread}</span>}
        </Link>
        <Link to={hak.pengurus ? '/admin/laporan' : '/aspirasi'} className="icon-btn" aria-label="Aspirasi & laporan">
          <MessageSquareText size={21} />
        </Link>
        <span className="vsep" />
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button className="user-chip" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu">
            <Avatar nama={warga?.nama} path={warga?.foto_path} size={40} />
            <span className="who">
              <span className="nm" style={{ display: 'block' }}>{warga?.nama}</span>
              <span className="rl">{peran}</span>
            </span>
            <ChevronDown size={16} className="muted" />
          </button>
          {menu && (
            <div className="dropdown" role="menu" onClick={() => setMenu(false)}>
              <Link to="/profil" role="menuitem"><User size={16} />Profil Saya</Link>
              {hak.pengurus && <Link to="/admin" role="menuitem"><LayoutDashboard size={16} />Panel Admin</Link>}
              <Link to="/pengaturan" role="menuitem"><Settings size={16} />Pengaturan</Link>
              <button role="menuitem" onClick={signOut} className="red"><LogOut size={16} />Keluar</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
