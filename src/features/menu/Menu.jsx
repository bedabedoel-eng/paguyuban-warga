import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ChevronRight, SearchX } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Card, EmptyState, SearchInput } from '../../components/ui';
import { semuaMenu } from '../../components/layout/navConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotif } from '../../context/NotifContext';
import { useSettings } from '../../context/SettingsContext';
import { useTugas } from '../../context/TugasContext';

/** Halaman "Semua menu": seluruh fitur sesuai kewenangan, dikelompokkan dan bisa dicari. */
export default function Menu() {
  const { hak, warga, peranLabel, signOut } = useAuth();
  const { alamat } = useSettings();
  const { unread } = useNotif();
  const { stat } = useTugas();
  const [q, setQ] = useState('');
  const grup = useMemo(() => {
    const k = q.trim().toLowerCase();
    return semuaMenu(hak, { unread })
      .map((g) => ({ ...g, items: g.items.filter((x) => !k || `${x.label} ${x.desc}`.toLowerCase().includes(k)) }))
      .filter((g) => g.items.length);
  }, [hak, unread, q]);

  return (
    <div className="page">
      <PageHeader title="Semua menu" desc="Seluruh fitur aplikasi sesuai jabatan Anda." />
      <Link to="/profil" className="card me-card only-mobile">
        <Avatar nama={warga?.nama} path={warga?.foto_path} size={52} />
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="strong ellipsis" style={{ display: 'block', fontSize: 'var(--fs-lg)' }}>{warga?.nama}</span>
          <span className="text-sm muted">{peranLabel}{warga?.blok ? ` · ${alamat(warga)}` : ''}</span>
        </span>
        <ChevronRight size={18} className="muted" />
      </Link>
      <div className="toolbar"><SearchInput value={q} onChange={setQ} placeholder="Cari menu, mis. tagihan atau warga" label="Cari menu" /></div>
      {!grup.length && <Card><EmptyState icon={SearchX} title="Menu tidak ditemukan" text="Coba kata kunci lain." /></Card>}
      {grup.map((g) => (
        <section key={g.label} className="stack-sm" aria-label={g.label}>
          <div className="section-head"><h2>{g.label}</h2></div>
          <div className="tiles">
            {g.items.map(({ to, label, desc, icon: Icon, tone, badge }) => {
              const n = badge ? stat?.[badge] || 0 : 0;
              return (
                <Link key={to} to={to} className="card tile">
                  <span className={`ico ${tone}`}>
                    <Icon size={20} />
                    {n > 0 && <span className="count" aria-label={`${n} menunggu`}>{n > 99 ? '99+' : n}</span>}
                  </span>
                  <span><span className="l" style={{ display: 'block' }}>{label}</span><span className="s">{desc}</span></span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
      {!q && (
        <Card>
          <div className="rows inset">
            <button type="button" className="rowi danger" onClick={signOut}><span className="ico sm bad"><LogOut size={16} /></span><span className="rowi-main"><span className="rowi-title">Keluar</span></span></button>
          </div>
        </Card>
      )}
    </div>
  );
}
