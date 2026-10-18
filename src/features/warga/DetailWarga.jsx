import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Users, Calendar, Briefcase, Phone, MessageCircle, Mail, House } from 'lucide-react';
import { Avatar, Badge, Button, Card, Loader, ErrorState } from '../../components/ui';
import HouseScene from '../../components/illustrations/HouseScene';
import PageHeader from '../../components/layout/PageHeader';
import { useAsync } from '../../hooks/useAsync';
import { detailWarga, kontakWarga } from '../../services/warga';
import { tanggal } from '../../lib/format';
import { formatHp, waLink } from '../../lib/phone';
import { PERAN } from '../../lib/constants';

export default function DetailWarga() {
  const { id } = useParams();
  const nav = useNavigate();
  const s = useAsync(async () => {
    const [w, k] = await Promise.all([detailWarga(id), kontakWarga(id)]);
    return { w, k };
  }, [id]);
  if (s.loading && !s.data) return <><PageHeader title="Detail Profil" /><Loader /></>;
  if (s.error && !s.data) return <><PageHeader title="Detail Profil" /><div className="page"><ErrorState error={s.error} onRetry={s.reload} /></div></>;
  const { w, k } = s.data;
  const item = (Icon, judul, isi) => isi ? (
    <div className="it"><Icon size={19} /><div><div className="k">{judul}</div><div className="v">{isi}</div></div></div>
  ) : null;
  return (
    <>
      <div className="mobile-only">
        <div className="profile-hero">
          <HouseScene variant="day" wave={false} className="scene" />
          <div className="top"><button className="icon-btn" onClick={() => nav(-1)} aria-label="Kembali"><ArrowLeft size={22} /></button></div>
        </div>
      </div>
      <div className="page-head"><button className="back" onClick={() => nav(-1)} aria-label="Kembali"><ArrowLeft size={18} /></button><h1>Detail Profil Warga</h1></div>
      <div className="page profile-wrap" style={{ paddingTop: 0 }}>
        <Card className="profile-card">
          <Avatar nama={w.nama} path={w.foto_path} size={104} />
          <h2>{w.nama}</h2>
          <p className="small text-2">{w.blok}-{w.no_rumah}{w.pekerjaan ? ` • ${w.pekerjaan}` : ''}</p>
          <div className="row mt-2"><Badge tone="green">● Anggota Aktif</Badge>{w.role !== 'warga' && <Badge tone="gold">{PERAN[w.role]}</Badge>}</div>
          <div className="info-list mt-4">
            {w.tentang && <div><h3 className="mb-2">Tentang Saya</h3><p className="small text-2" style={{ lineHeight: 1.6 }}>{w.tentang}</p></div>}
            {item(House, 'Alamat', `Blok ${w.blok} No. ${w.no_rumah}`)}
            {item(Heart, 'Hobi', w.hobi)}
            {item(Users, 'Keluarga', w.keluarga)}
            {item(Briefcase, 'Pekerjaan', w.pekerjaan)}
            {item(Calendar, 'Bergabung', w.bergabung_at && tanggal(w.bergabung_at))}
            {item(Phone, 'Nomor HP', k?.nomor_hp && formatHp(k.nomor_hp))}
            {item(Mail, 'Email', k?.email)}
          </div>
          {k?.nomor_hp && (
            <div className="row mt-4" style={{ width: '100%' }}>
              <Button block icon={MessageCircle} onClick={() => window.open(waLink(k.nomor_hp), '_blank', 'noopener')}>Hubungi</Button>
              <Button block variant="outline" icon={Phone} onClick={() => { window.location.href = `tel:+${k.nomor_hp}`; }}>Telepon</Button>
            </div>
          )}
          {!k?.nomor_hp && <p className="tiny muted mt-4">Warga ini tidak menampilkan nomor HP.</p>}
        </Card>
      </div>
    </>
  );
}
