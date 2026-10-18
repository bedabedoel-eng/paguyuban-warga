import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, Card } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { formatHp } from '../../lib/phone';
import { PERAN } from '../../lib/constants';
import { tanggal } from '../../lib/format';

export default function InformasiAkun() {
  const { warga, kontak, user, jabatan } = useAuth();
  const google = user?.app_metadata?.provider === 'google';
  return (
    <>
      <PageHeader title="Informasi Akun" />
      <div className="page" style={{ maxWidth: 640 }}>
        <Card pad>
          <div className="kv"><span>Nama</span><span>{warga.nama}</span></div>
          <div className="kv"><span>Nomor HP (login)</span><span>{kontak?.nomor_hp ? formatHp(kontak.nomor_hp) : '-'}</span></div>
          <div className="kv"><span>Rumah</span><span>Blok {warga.blok} No. {warga.no_rumah}</span></div>
          <div className="kv"><span>Peran</span><span><Badge tone="green">{PERAN[warga.role]}</Badge></span></div>
          {jabatan && <div className="kv"><span>Jabatan</span><span>{jabatan}</span></div>}
          <div className="kv"><span>Metode masuk</span><span>{google ? 'Google' : 'Nomor HP + kata sandi'}</span></div>
          <div className="kv"><span>Bergabung</span><span>{warga.bergabung_at ? tanggal(warga.bergabung_at) : '-'}</span></div>
          <p className="small muted mt-3">Untuk mengubah nomor HP, blok, atau nomor rumah, hubungi admin.</p>
          <Button className="mt-3" variant="outline" to="/profil/ubah">Ubah Profil</Button>
        </Card>
      </div>
    </>
  );
}
