import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Send, Receipt } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, ImagePicker, ErrorState, EmptyState, Textarea, SkeletonRows, Callout } from '../../components/ui';
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
  const [pilih, setPilih] = useState(null);
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
    if (!terpilih.length) return toast.error('Pilih minimal satu bulan yang dibayar');
    if (!foto) return toast.error('Unggah foto bukti transfer');
    setLoading(true);
    let path;
    try {
      path = await uploadFile('bukti', `ipl/${user.id}`, foto, { maxSize: 1400, quality: 0.8 });
      await kirimPembayaran(terpilih.map((t) => t.id), path, catatan);
      toast.success('Bukti terkirim. Bendahara akan memeriksanya.');
      nav('/ipl', { replace: true });
    } catch (e) {
      if (path) removeFile('bukti', path).catch(() => {});
      toast.error(e);
    } finally { setLoading(false); }
  }
  const salin = async (t) => { try { await navigator.clipboard.writeText(t.replace(/\s/g, '')); toast.success('Nomor rekening disalin'); } catch { toast.error('Gagal menyalin'); } };

  return (
    <div className="page form">
      <PageHeader back="/ipl" title="Bayar IPL" desc="Transfer ke rekening paguyuban, lalu unggah buktinya." />
      {s.loading && !s.data ? <Card pad><SkeletonRows n={3} avatar={false} /></Card> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !belum.length ? (
        <Card><EmptyState icon={Receipt} title="Tidak ada tagihan yang perlu dibayar" text="Semua tagihan sudah lunas atau sedang diperiksa bendahara." action={<Button to="/ipl" variant="secondary" size="sm">Kembali ke tagihan</Button>} /></Card>
      ) : (
        <Card pad>
          <div className="steps">
            <div className="step"><span className="n">1</span><div className="body">
              <h3>Pilih bulan yang dibayar</h3>
              <div className="stack-sm">
                {belum.map((t) => (
                  <label key={t.id} className="pay-pick">
                    <input type="checkbox" checked={terpilih.some((x) => x.id === t.id)} onChange={() => toggle(t.id)} />
                    <span className="grow">{periode(t.periode)}</span><span className="money">{rupiah(t.nominal)}</span>
                  </label>
                ))}
              </div>
              <div className="row between" style={{ marginTop: 12 }}><span className="muted">Total transfer</span><span className="money" style={{ fontSize: 'var(--fs-xl)' }}>{rupiah(total)}</span></div>
            </div></div>
            <div className="step"><span className="n">2</span><div className="body">
              <h3>Transfer ke rekening paguyuban</h3>
              {pengaturan.bank_norek ? (
                <div className="bank">
                  <span className="logo">{pengaturan.bank_nama || 'Bank'}</span>
                  <div className="grow" style={{ minWidth: 0 }}><div className="no">{pengaturan.bank_norek}</div><div className="text-sm muted">a.n. {pengaturan.bank_atas_nama}</div></div>
                  <Button variant="secondary" size="sm" icon={Copy} onClick={() => salin(pengaturan.bank_norek)}>Salin</Button>
                </div>
              ) : <Callout tone="warn">Rekening belum diatur. Hubungi bendahara untuk pembayaran tunai.</Callout>}
            </div></div>
            <div className="step"><span className="n">3</span><div className="body stack">
              <h3 style={{ margin: '4px 0 0' }}>Unggah bukti transfer</h3>
              <ImagePicker file={foto} onChange={setFoto} label="Pilih foto atau PDF bukti" accept="image/jpeg,image/png,image/webp,application/pdf" hint="JPG, PNG, atau PDF · dikompres otomatis" />
              <Textarea label="Catatan untuk bendahara" optional value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={300} style={{ minHeight: 70 }} />
              <Button block size="lg" icon={Send} loading={loading} onClick={kirim}>Kirim bukti {rupiah(total)}</Button>
            </div></div>
          </div>
        </Card>
      )}
    </div>
  );
}
