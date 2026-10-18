import { Link } from 'react-router-dom';
import { Phone, Mail, Briefcase, Heart, Pencil, Settings, LogOut, House, LayoutDashboard } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Button, Card, Badge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { formatHp } from '../../lib/phone';
import { PERAN } from '../../lib/constants';

export default function ProfilSaya() {
  const { warga, kontak, jabatan, hak, signOut } = useAuth();
  const row = (Icon, k, v) => (
    <div className="list-item" style={{ alignItems: 'flex-start' }}>
      <Icon size={19} className="green" style={{ marginTop: 2 }} />
      <div className="grow"><div className="small muted">{k}</div><div className="bold" style={{ fontSize: 13 }}>{v || '-'}</div></div>
    </div>
  );
  return (
    <>
      <PageHeader title="Profil Saya" back={false} actions={<Link to="/pengaturan" className="icon-btn" aria-label="Pengaturan"><Settings size={21} /></Link>} />
      <div className="page" style={{ maxWidth: 760 }}>
        <div className="page-inner">
          <Card className="center" pad>
            <div className="stack" style={{ alignItems: 'center', gap: 4 }}>
              <Avatar nama={warga.nama} path={warga.foto_path} size={100} ring />
              <h2 className="green mt-2" style={{ fontSize: 18 }}>{warga.nama}</h2>
              <p className="small text-2">{warga.blok}-{warga.no_rumah}{jabatan ? ` • ${jabatan}` : ''}</p>
              <div className="row"><Badge tone="green">{PERAN[warga.role]}</Badge></div>
              <Button size="sm" variant="outline" icon={Pencil} to="/profil/ubah" className="mt-2">Ubah Profil</Button>
            </div>
          </Card>
          <Card pad>
            <div className="list">
              {row(Phone, 'Nomor HP', kontak?.nomor_hp && formatHp(kontak.nomor_hp))}
              {row(Mail, 'Email', kontak?.email)}
              {row(House, 'Alamat', warga.blok && `Blok ${warga.blok} No. ${warga.no_rumah}`)}
              {row(Briefcase, 'Pekerjaan', warga.pekerjaan)}
              {row(Heart, 'Hobi', warga.hobi)}
            </div>
          </Card>
          <Card pad className="menu-list">
            <div className="list">
              {hak.pengurus && <Link to="/admin" className="list-item"><LayoutDashboard size={20} className="lead" /><span className="lbl">Panel Admin</span></Link>}
              <Link to="/menu" className="list-item"><House size={20} className="lead" /><span className="lbl">Semua Menu</span></Link>
              <Link to="/pengaturan" className="list-item"><Settings size={20} className="lead" /><span className="lbl">Pengaturan</span></Link>
              <button className="list-item danger" onClick={signOut}><LogOut size={20} className="lead" /><span className="lbl">Keluar</span></button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
