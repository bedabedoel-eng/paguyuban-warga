import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, ImagePicker, Loader, ErrorState, EmptyState, Textarea } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { tagihanRumah, kirimPembayaran } from '../../services/ipl';
import { uploadFile, removeFile } from '../../lib/storage';
import { rupiah, periode } from '../../lib/format';

export default function BayarIpl() {
  const { warga, user } = useAuth();
  const { pengaturan } = useSettings();
  const toast = useToast();
  const nav = useNavigate();
  const s = useAsync(() => tagihanRumah(warga.rumah_id), [warga.rumah_id]);
  const belum = (s.data || []).filter((t) => t.status === 'belum_bayar').sort((a, b) => a.periode.localeCompare(b.periode));
  const [pilih, setPilih] = useState(null); // null = semua
  const [foto, setFoto] = useState(null);
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);
  const terpilih = belum.filter((t) => (pilih ? pilih.includes(t.id) : true));
  const total = terpilih.reduce((a, t) => a + t.nominal, 0);
  const toggle = (id) => {
    const cur = pilih || belum.map((t) => t.id);
    setPilih(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };

  async function kirim() {
    if (!terpilih.length) return toast.error('Pilih minimal satu tagihan');
    if (!foto) return toast.error('Unggah bukti transfer terlebih dahulu');
    setLoading(true);
    let path;
    try {
      path = await uploadFile('bukti', `ipl/${user.id}`, foto, { maxSize: 1400, quality: 0.8 });
      await kirimPembayaran(terpilih.map((t) => t.id), path, catatan);
      toast.success('Bukti pembayaran terkirim. Menunggu verifikasi bendahara.');
      nav('/ipl', { replace: true });
    } catch (e) {
      if (path) removeFile('bukti', path).catch(() => {});
      toast.error(e);
    } finally { setLoading(false); }
  }

  const salin = async (t) => { try { await navigator.clipboard.writeText(t.replace(/\s/g, '')); toast.success('Nomor rekening disalin'); } catch { toast.error('Gagal menyalin'); } };

  return (
    <>
      <PageHeader title="Pembayaran IPL" />
      <div className="page form">
        <div className="page-inner">
          {s.loading && !s.data ? <Loader /> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !belum.length ? (
            <Card><EmptyState title="Tidak ada tagihan" text="Semua tagihan sudah dibayar atau sedang diverifikasi." action={<Button to="/ipl" variant="outline" size="sm">Kembali</Button>} /></Card>
          ) : (
            <>
              <Card pad>
                <div className="row between">
                  <div><div className="small muted">Total Tagihan</div><div className="bold" style={{ fontSize: 20 }}>{rupiah(total)}</div></div>
                  <div style={{ textAlign: 'right' }}><div className="small muted">Periode</div><div className="bold">{terpilih.length === 1 ? periode(terpilih[0].periode) : `${terpilih.length} bulan`}</div></div>
                </div>
                {belum.length > 1 && (
                  <div className="stack sm mt-3">
                    {belum.map((t) => (
                      <label key={t.id} className="pay-pick">
                        <input type="checkbox" checked={terpilih.some((x) => x.id === t.id)} onChange={() => toggle(t.id)} />
                        <span className="grow">{periode(t.periode)}</span><b>{rupiah(t.nominal)}</b>
                      </label>
                    ))}
                  </div>
                )}
              </Card>
              <Card pad>
                <h2 className="mb-3">Rekening Tujuan</h2>
                {pengaturan.bank_norek ? (
                  <div className="bank-box">
                    <span className="bank-logo">{pengaturan.bank_nama}</span>
                    <div className="grow"><div className="bold" style={{ fontSize: 16, letterSpacing: '.03em' }}>{pengaturan.bank_norek}</div><div className="small muted">a.n. {pengaturan.bank_atas_nama}</div></div>
                    <Button variant="light" size="xs" icon={Copy} onClick={() => salin(pengaturan.bank_norek)}>Salin</Button>
                  </div>
                ) : <p className="small muted">Rekening belum diatur. Hubungi bendahara untuk pembayaran tunai.</p>}
              </Card>
              <Card pad className="stack">
                <h2>Upload Bukti Transfer</h2>
                <ImagePicker file={foto} onChange={setFoto} accept="image/jpeg,image/png,image/webp,application/pdf" hint="JPG, PNG, PDF (Max 5MB)" />
                <Textarea label="Catatan (opsional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={300} style={{ minHeight: 70 }} />
                <Button block size="lg" loading={loading} onClick={kirim}>Kirim Pembayaran</Button>
                <p className="tiny muted center">Foto dikompres otomatis di perangkat Anda sebelum diunggah.</p>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
