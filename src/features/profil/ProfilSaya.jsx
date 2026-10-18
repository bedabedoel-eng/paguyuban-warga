import { Link } from 'react-router-dom';
import { Pencil, Settings, LogOut, Phone, Mail, House, Briefcase, Heart, Users, CalendarDays, KeyRound, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Button, Card, CardHead, CardBody, Badge, IconButton } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { formatHp } from '../../lib/phone';
import { tanggal } from '../../lib/format';
import { useSettings } from '../../context/SettingsContext';

export default function ProfilSaya() {
  const { warga, kontak, jabatan, peranLabel, user, signOut } = useAuth();
  const { alamat } = useSettings();
  const google = user?.app_metadata?.provider === 'google';
  const facts = [
    [Phone, 'Nomor HP (untuk masuk)', kontak?.nomor_hp && formatHp(kontak.nomor_hp)],
    [Mail, 'Email', kontak?.email],
    [House, 'Rumah', warga.blok && `${alamat(warga)}${warga.kepala_keluarga ? ' · kepala keluarga' : ''}`],
    [Briefcase, 'Pekerjaan', warga.pekerjaan],
    [Users, 'Keluarga', warga.keluarga],
    [Heart, 'Hobi', warga.hobi],
    [CalendarDays, 'Anggota sejak', warga.bergabung_at && tanggal(warga.bergabung_at)],
    [KeyRound, 'Cara masuk', google ? 'Akun Google' : 'Nomor HP + PIN'],
  ];
  return (
    <div className="page narrow">
      <PageHeader title="Profil saya" mobileActions={<><IconButton icon={Pencil} label="Ubah profil" to="/profil/ubah" /><IconButton icon={Settings} label="Pengaturan" to="/pengaturan" /></>}
        actions={<><Button size="sm" variant="secondary" icon={Settings} to="/pengaturan">Pengaturan</Button><Button size="sm" icon={Pencil} to="/profil/ubah">Ubah profil</Button></>} />
      <Card pad>
        <div className="profile-head">
          <Avatar nama={warga.nama} path={warga.foto_path} size={88} ring />
          <div className="t">
            <h2>{warga.nama}</h2>
            <p>{peranLabel}</p>
            <div className="tags">
              <Badge tone="ok" dot>Anggota aktif</Badge>
              {jabatan.map((j) => <Badge key={j.id} tone="gold"><ShieldCheck size={12} />{j.jabatan}</Badge>)}
            </div>
          </div>
          <Button className="only-mobile" block variant="secondary" icon={Pencil} to="/profil/ubah">Ubah profil</Button>
        </div>
      </Card>
      {warga.tentang && <Card><CardBody><h2 style={{ marginBottom: 8 }}>Tentang saya</h2><p className="about">{warga.tentang}</p></CardBody></Card>}
      <Card>
        <CardHead title="Data diri" desc="Nomor HP dan alamat rumah hanya dapat diubah sekretaris atau admin." />
        <div className="rows inset">
          {facts.map(([Icon, k, v]) => (
            <div className="rowi" key={k}>
              <span className="ico sm neutral"><Icon size={16} /></span>
              <span className="rowi-main"><span className="rowi-sub">{k}</span><span className="rowi-title" style={{ fontWeight: v ? 600 : 400, color: v ? undefined : 'var(--ink-4)' }}>{v || 'Belum diisi'}</span></span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="only-mobile">
        <div className="rows inset">
          <Link to="/pengaturan" className="rowi"><Settings size={18} className="muted" /><span className="rowi-main"><span className="rowi-title">Pengaturan akun</span></span></Link>
          <button type="button" className="rowi danger" onClick={signOut}><LogOut size={18} /><span className="rowi-main"><span className="rowi-title">Keluar</span></span></button>
        </div>
      </Card>
    </div>
  );
}
