import { useMemo, useState } from 'react';
import { Vote, Plus, Trash2, Lock, CheckCircle2, Users, Clock } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, Callout, Card, CardBody, Checkbox, Chips, EmptyState, ErrorState, Input, Modal, SasaranField, SkeletonRows, Textarea, IconButton, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { daftarPolling, buatPolling, beriSuara, tutupPolling, hapusPolling } from '../../services/polling';
import { opsiSasaran, kolomSasaran } from '../../lib/akses';
import { labelSasaran } from '../../lib/alamat';
import { toLocalInput } from '../../lib/format';

const waktu = (v) => new Date(v).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
const persen = (n, total) => (total ? Math.round((n / total) * 100) : 0);

function Hasil({ p }) {
  const total = p.pemilih || 0;
  const satuan = p.per_rumah ? 'rumah' : 'warga';
  const maks = Math.max(0, ...p.opsi.map((o) => o.jumlah || 0));
  return (
    <div className="stack-sm" aria-label="Hasil polling">
      {p.opsi.map((o) => (
        <div key={o.id}>
          <div className="row between text-sm"><span className={o.jumlah === maks && maks > 0 && p.selesai ? 'strong' : ''}>{o.teks}</span><span className="num">{o.jumlah} · {persen(o.jumlah, total)}%</span></div>
          <div className="meter" role="img" aria-label={`${o.teks}: ${persen(o.jumlah, total)} persen`}><i style={{ width: `${persen(o.jumlah, total)}%` }} /></div>
        </div>
      ))}
      <div className="text-xs muted">{total} dari {p.hak_suara} {satuan} sudah memilih ({persen(total, p.hak_suara)}%)</div>
    </div>
  );
}

function KartuPolling({ p, gang, onChanged }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [pilih, setPilih] = useState([]);
  const [busy, setBusy] = useState(false);
  const bisaPilih = !p.selesai && !p.sudah_memilih;
  const toggle = (id) => setPilih((cur) => (p.pilih_banyak ? (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]) : [id]));

  async function kirim() {
    if (!pilih.length) return toast.error('Pilih salah satu jawaban');
    setBusy(true);
    try { await beriSuara(p.id, pilih); toast.success('Suara Anda tercatat'); onChanged(); } catch (e) { toast.error(e); } finally { setBusy(false); }
  }
  async function tutup() {
    if (!(await confirm({ title: 'Tutup polling sekarang?', text: 'Setelah ditutup tidak ada yang bisa memberi suara lagi, dan hasil terlihat oleh semua peserta.', okLabel: 'Tutup polling' }))) return;
    try { await tutupPolling(p.id); toast.success('Polling ditutup'); onChanged(); } catch (e) { toast.error(e); }
  }
  async function hapus() {
    if (!(await confirm({ title: 'Hapus polling?', text: 'Polling beserta seluruh suaranya dihapus permanen.', okLabel: 'Hapus', danger: true }))) return;
    try { await hapusPolling(p.id); toast.success('Polling dihapus'); onChanged(); } catch (e) { toast.error(e); }
  }
  const sasaran = labelSasaran({ blok: p.blok, gang_id: p.gang_id }, gang) || 'Semua warga';

  return (
    <Card>
      <CardBody className="stack">
        <div className="row between wrap">
          <div className="row wrap" style={{ gap: 8 }}>
            {p.selesai ? <Badge tone="neutral"><Lock size={12} aria-hidden="true" /> Selesai</Badge> : <Badge tone="ok" dot>Berlangsung</Badge>}
            {p.sudah_memilih && <Badge tone="info"><CheckCircle2 size={12} aria-hidden="true" /> Anda sudah memilih</Badge>}
            <span className="text-xs muted"><Users size={12} aria-hidden="true" /> {sasaran}</span>
          </div>
          {p.bisa_kelola && (
            <span className="row" style={{ gap: 4 }}>
              {!p.selesai && <Button size="xs" variant="secondary" onClick={tutup}>Tutup sekarang</Button>}
              <IconButton small danger icon={Trash2} size={15} label="Hapus polling" onClick={hapus} />
            </span>
          )}
        </div>
        <div>
          <h2 style={{ margin: 0 }}>{p.judul}</h2>
          {p.deskripsi && <p className="ink-2" style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{p.deskripsi}</p>}
          <p className="text-xs muted" style={{ margin: '6px 0 0' }}>
            <Clock size={12} aria-hidden="true" /> {p.selesai ? `Ditutup ${waktu(p.ditutup_at || p.tutup_at)}` : `Tutup ${waktu(p.tutup_at)}`}{p.pembuat ? ` · oleh ${p.pembuat}` : ''}
          </p>
        </div>

        {bisaPilih && (
          <fieldset className="stack-sm" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="text-sm muted">{p.pilih_banyak ? 'Boleh pilih lebih dari satu' : 'Pilih satu jawaban'}{p.per_rumah ? ' · satu rumah satu suara' : ''}</legend>
            {p.opsi.map((o) => (
              <label key={o.id} className="pay-pick">
                <input type={p.pilih_banyak ? 'checkbox' : 'radio'} name={`polling-${p.id}`} checked={pilih.includes(o.id)} onChange={() => toggle(o.id)} />
                <span className="grow">{o.teks}</span>
              </label>
            ))}
            <div className="row between wrap">
              <span className="text-xs muted">Suara tidak dapat diubah setelah dikirim dan tidak terlihat oleh orang lain.</span>
              <Button size="sm" icon={Vote} loading={busy} onClick={kirim}>Kirim suara</Button>
            </div>
          </fieldset>
        )}
        {p.hasil_terlihat && <Hasil p={p} />}
        {!p.hasil_terlihat && !bisaPilih && <p className="text-sm muted">Hasil tampil setelah polling ditutup.</p>}
      </CardBody>
    </Card>
  );
}

function FormPolling({ onClose, onSaved }) {
  const { hak } = useAuth();
  const { blok, gang } = useSettings();
  const toast = useToast();
  const sasaran = opsiSasaran(hak, blok, gang);
  const [f, setF] = useState({
    judul: '', deskripsi: '', opsi: ['', ''], pilihBanyak: false, perRumah: true, sasaran: sasaran[0]?.value ?? '',
    tutup: toLocalInput(new Date(Date.now() + 3 * 86400e3)),
  });
  const [loading, setLoading] = useState(false);
  const setOpsi = (i, v) => setF((s) => ({ ...s, opsi: s.opsi.map((o, k) => (k === i ? v : o)) }));

  async function simpan() {
    const opsi = f.opsi.map((o) => o.trim()).filter(Boolean);
    if (f.judul.trim().length < 3) return toast.error('Judul minimal 3 huruf');
    if (opsi.length < 2) return toast.error('Isi minimal 2 pilihan');
    if (new Set(opsi.map((o) => o.toLowerCase())).size !== opsi.length) return toast.error('Pilihan tidak boleh sama');
    const tutup = new Date(f.tutup);
    if (isNaN(tutup) || tutup.getTime() < Date.now() + 10 * 60e3) return toast.error('Batas waktu minimal 10 menit dari sekarang');
    setLoading(true);
    try {
      const { blok: b, gang_id: g } = kolomSasaran(f.sasaran);
      await buatPolling({ judul: f.judul.trim(), deskripsi: f.deskripsi.trim(), opsi, tutup: tutup.toISOString(), blok: b, gang: g, pilihBanyak: f.pilihBanyak, perRumah: f.perRumah });
      toast.success('Polling dibuat, warga sasaran diberi tahu'); onSaved();
    } catch (e) { toast.error(e); } finally { setLoading(false); }
  }

  return (
    <Modal open onClose={onClose} title="Buat polling" desc="Tanyakan pendapat warga. Suara bersifat rahasia."
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button loading={loading} onClick={simpan}>Terbitkan polling</Button></>}>
      <div className="stack">
        <Input label="Pertanyaan" value={f.judul} onChange={(e) => setF((s) => ({ ...s, judul: e.target.value }))} maxLength={160} placeholder="Contoh: Setujukah iuran keamanan naik Rp 10.000?" />
        <Textarea label="Keterangan" optional value={f.deskripsi} onChange={(e) => setF((s) => ({ ...s, deskripsi: e.target.value }))} maxLength={1000} style={{ minHeight: 70 }} />
        <div className="stack-sm">
          <span className="strong text-sm">Pilihan jawaban</span>
          {f.opsi.map((o, i) => (
            <div className="row" key={i} style={{ gap: 6 }}>
              <Input className="grow" aria-label={`Pilihan ${i + 1}`} value={o} onChange={(e) => setOpsi(i, e.target.value)} maxLength={120} placeholder={`Pilihan ${i + 1}`} />
              {f.opsi.length > 2 && <IconButton small icon={Trash2} size={15} label={`Hapus pilihan ${i + 1}`} onClick={() => setF((s) => ({ ...s, opsi: s.opsi.filter((_, k) => k !== i) }))} />}
            </div>
          ))}
          {f.opsi.length < 10 && <div><Button size="xs" variant="secondary" icon={Plus} onClick={() => setF((s) => ({ ...s, opsi: [...s.opsi, ''] }))}>Tambah pilihan</Button></div>}
        </div>
        <Input label="Ditutup pada" type="datetime-local" value={f.tutup} onChange={(e) => setF((s) => ({ ...s, tutup: e.target.value }))} />
        <SasaranField value={f.sasaran} onChange={(v) => setF((s) => ({ ...s, sasaran: v }))} hak={hak} blok={blok} gang={gang} label="Peserta" />
        <Checkbox checked={f.perRumah} onChange={(v) => setF((s) => ({ ...s, perRumah: v }))} hint="Satu suara untuk satu rumah, siapa pun anggotanya yang memilih lebih dulu.">Satu rumah satu suara</Checkbox>
        <Checkbox checked={f.pilihBanyak} onChange={(v) => setF((s) => ({ ...s, pilihBanyak: v }))} hint="Pemilih boleh mencentang lebih dari satu jawaban.">Boleh memilih lebih dari satu</Checkbox>
      </div>
    </Modal>
  );
}

export default function Polling() {
  const { hak } = useAuth();
  const { gang } = useSettings();
  const [tab, setTab] = useState('berlangsung');
  const [form, setForm] = useState(false);
  const s = useAsync(() => daftarPolling(100), []);
  const semua = s.data || [];
  const rows = useMemo(() => semua.filter((p) => (tab === 'semua' ? true : tab === 'selesai' ? p.selesai : !p.selesai)), [semua, tab]);
  const menunggu = semua.filter((p) => !p.selesai && !p.sudah_memilih).length;

  return (
    <div className="page narrow">
      <PageHeader title="Polling warga" desc="Suara warga untuk keputusan lingkungan. Suara bersifat rahasia."
        actions={hak.kelola_info && <Button size="sm" icon={Plus} onClick={() => setForm(true)}>Buat polling</Button>} />
      {s.data === null && <Callout tone="warn">Polling belum aktif. Jalankan <code>supabase/10-polling-dan-rekap-alamat.sql</code> di SQL Editor Supabase.</Callout>}
      {menunggu > 0 && <Callout tone="info">Ada <b>{menunggu}</b> polling yang menunggu suara Anda.</Callout>}
      <div className="toolbar">
        <Chips value={tab} onChange={setTab} tabs={[
          { value: 'berlangsung', label: 'Berlangsung', n: semua.filter((p) => !p.selesai).length },
          { value: 'selesai', label: 'Selesai', n: semua.filter((p) => p.selesai).length },
          { value: 'semua', label: 'Semua', n: semua.length }]} />
      </div>
      {s.loading && !s.data ? <Card pad><SkeletonRows n={3} avatar={false} /></Card> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !rows.length ? (
        <Card><EmptyState icon={Vote} title={tab === 'selesai' ? 'Belum ada polling yang selesai' : 'Belum ada polling'} text={hak.kelola_info ? 'Buat polling untuk meminta pendapat warga.' : 'Polling dari pengurus akan tampil di sini.'} /></Card>
      ) : (
        <div className="stack">{rows.map((p) => <KartuPolling key={p.id} p={p} gang={gang} onChanged={s.reload} />)}</div>
      )}
      {form && <FormPolling onClose={() => setForm(false)} onSaved={() => { setForm(false); s.reload(); }} />}
    </div>
  );
}
