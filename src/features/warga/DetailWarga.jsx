import { useParams } from 'react-router-dom';
import { Heart, Users, CalendarDays, Briefcase, Phone, MessageCircle, Mail, House } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Badge, Button, Card, CardBody, ErrorState, SkeletonRows } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { detailWarga, kontakWarga } from '../../services/warga';
import { tanggal } from '../../lib/format';
import { formatHp, waLink } from '../../lib/phone';

export default function DetailWarga() {
  const { id } = useParams();
  const s = useAsync(async () => {
    const [w, k] = await Promise.all([detailWarga(id), kontakWarga(id)]);
    return { w, k };
  }, [id]);
  if (s.loading && !s.data) return <div className="page narrow"><PageHeader back title="Profil warga" /><Card pad><SkeletonRows n={4} /></Card></div>;
  if (s.error && !s.data) return <div className="page narrow"><PageHeader back title="Profil warga" /><ErrorState error={s.error} onRetry={s.reload} /></div>;
  const { w, k } = s.data;
  const facts = [
    [House, 'Alamat', `Blok ${w.blok} No. ${w.no_rumah}`],
    [Briefcase, 'Pekerjaan', w.pekerjaan],
    [Users, 'Keluarga', w.keluarga],
    [Heart, 'Hobi', w.hobi],
    [CalendarDays, 'Bergabung', w.bergabung_at && tanggal(w.bergabung_at)],
    [Phone, 'Nomor HP', k?.nomor_hp && formatHp(k.nomor_hp)],
    [Mail, 'Email', k?.email],
  ].filter((x) => x[2]);
  return (
    <div className="page narrow">
      <PageHeader back title="Profil warga" />
      <Card pad className="stack">
        <div className="profile-head">
          <Avatar nama={w.nama} path={w.foto_path} size={88} />
          <div className="t">
            <h2>{w.nama}</h2>
            <p>Blok {w.blok} No. {w.no_rumah}{w.pekerjaan ? ` · ${w.pekerjaan}` : ''}</p>
            <div className="tags">
              {w.kepala_keluarga && <Badge tone="brand">Kepala keluarga</Badge>}
              {w.role !== 'warga' && <Badge tone="gold">{w.role === 'admin' ? 'Admin' : 'Pengurus'}</Badge>}
            </div>
          </div>
        </div>
        {k?.nomor_hp ? (
          <div className="row wrap">
            <Button icon={MessageCircle} href={waLink(k.nomor_hp)} target="_blank" rel="noopener noreferrer">Kirim WhatsApp</Button>
            <Button variant="secondary" icon={Phone} href={`tel:+${k.nomor_hp}`}>Telepon</Button>
          </div>
        ) : <p className="text-sm muted">Warga ini memilih tidak menampilkan nomor HP.</p>}
      </Card>
      {w.tentang && <Card><CardBody><h2 style={{ marginBottom: 8 }}>Tentang</h2><p className="about">{w.tentang}</p></CardBody></Card>}
      <Card pad>
        <div className="facts">
          {facts.map(([Icon, label, v]) => (
            <div className="fact" key={label}><span className="ico sm neutral"><Icon size={16} /></span><div><div className="k">{label}</div><div className="v">{v}</div></div></div>
          ))}
        </div>
      </Card>
    </div>
  );
}
