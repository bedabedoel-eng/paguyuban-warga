import { useState } from 'react';
import { Link2 } from 'lucide-react';
import { Button, Callout, Checkbox, Input, Modal, NomorRumahFields, PernikahanFields, PhoneInput, Select, galatAnak, kolomPernikahan } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { importWarga } from '../../services/warga';
import { normalizeHp } from '../../lib/phone';
import { normalisasiLinkFoto } from '../../lib/image';
import { pernahMenikah } from '../../lib/constants';
import { POLA_NOMOR_RUMAH, gangDiBlok } from '../../lib/alamat';

const PIN_AWAL = '123456';
const KOSONG = { nama: '', hp: '', blok: '', no_rumah: '', gang_id: '', pekerjaan: '', kepala_keluarga: false, status_pernikahan: '', jumlah_anak: '', foto: '' };

/**
 * Tambah satu warga secara manual (khusus admin). Memakai fungsi database yang sama dengan Import CSV,
 * sehingga akun langsung aktif dengan PIN awal dan wajib diganti saat pertama masuk.
 */
export default function TambahWarga({ onClose, onSaved }) {
  const { blok, gang } = useSettings();
  const toast = useToast();
  const [f, setF] = useState(KOSONG);
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const opsiGang = gangDiBlok(gang, f.blok).map((g) => ({ value: g.id, label: g.nama }));
  const gantiBlok = (e) => { const b = e.target.value; setF((s) => ({ ...s, blok: b, gang_id: gangDiBlok(gang, b).some((g) => g.id === s.gang_id) ? s.gang_id : '' })); };

  async function simpan() {
    const nama = f.nama.trim();
    const hp = normalizeHp(f.hp);
    const no = f.no_rumah.trim().toUpperCase();
    if (nama.length < 2) return toast.error('Nama minimal 2 huruf');
    if (!hp) return toast.error('Nomor HP tidak valid');
    if (!f.blok) return toast.error('Pilih blok');
    if (!no) return toast.error('Isi nomor rumah');
    if (!POLA_NOMOR_RUMAH.test(no)) return toast.error('Nomor rumah tidak valid (maks. 10 karakter termasuk sub-blok)');
    const ga = galatAnak(f.status_pernikahan, f.jumlah_anak);
    if (ga) return toast.error(ga);
    let foto = '';
    try { foto = normalisasiLinkFoto(f.foto); } catch (e) { return toast.error(e.message); }
    const jalan = gang.find((g) => g.id === f.gang_id);
    const n = kolomPernikahan(f.status_pernikahan, f.jumlah_anak);
    setLoading(true);
    try {
      const res = await importWarga([{
        nama, hp, blok: f.blok, no_rumah: no, gang: jalan?.nama || null, pekerjaan: f.pekerjaan.trim(),
        kepala_keluarga: f.kepala_keluarga ? 'ya' : '', status_pernikahan: n.status_pernikahan, jumlah_anak: n.jumlah_anak ?? null, foto: foto || null,
      }], PIN_AWAL);
      if (!res.dibuat) throw new Error(res.dilewati?.[0]?.alasan || 'Warga tidak dapat dibuat');
      toast.success(`${nama} ditambahkan. PIN awal ${PIN_AWAL}`);
      onSaved();
    } catch (e) { toast.error(e); } finally { setLoading(false); }
  }

  return (
    <Modal open onClose={onClose} title="Tambah warga" desc="Akun langsung aktif dan bisa masuk dengan nomor HP." wide
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button loading={loading} onClick={simpan}>Tambah warga</Button></>}>
      <div className="stack">
        <div className="form-section">
          <div className="form-grid">
            <Input fieldClass="span-2" label="Nama lengkap" value={f.nama} onChange={set('nama')} maxLength={80} autoFocus />
            <PhoneInput fieldClass="span-2" label="Nomor HP (untuk masuk)" value={f.hp} onChange={set('hp')} />
            <Select label="Blok" value={f.blok} onChange={gantiBlok} placeholder="Pilih" options={blok.map((b) => ({ value: b.kode, label: b.nama }))} />
            <NomorRumahFields value={f.no_rumah} onChange={(v) => setF((s) => ({ ...s, no_rumah: v }))} />
            {opsiGang.length > 0 && (
              <Select fieldClass="span-2" label="Jalan" optional value={f.gang_id} onChange={set('gang_id')} placeholder="Belum dipilih" options={opsiGang} />
            )}
            <Input label="Pekerjaan" optional value={f.pekerjaan} onChange={set('pekerjaan')} maxLength={60} />
            <PernikahanFields status={f.status_pernikahan} anak={f.jumlah_anak}
              onStatus={(v) => setF((s) => ({ ...s, status_pernikahan: v, jumlah_anak: pernahMenikah(v) ? s.jumlah_anak : '' }))}
              onAnak={(v) => setF((s) => ({ ...s, jumlah_anak: v }))} />
            <div className="span-2">
              <Checkbox checked={f.kepala_keluarga} onChange={(v) => setF((s) => ({ ...s, kepala_keluarga: v }))}>Kepala keluarga</Checkbox>
              <p className="text-xs muted">Bila tidak dicentang dan rumah ini belum punya kepala keluarga, warga pertama di rumah itu otomatis menjadi kepala keluarga.</p>
            </div>
            <Input fieldClass="span-2" label="Tautan pas foto" optional type="url" inputMode="url" icon={Link2} value={f.foto} onChange={set('foto')} placeholder="https://…" maxLength={480}
              hint="Foto dari perangkat bisa diunggah lewat tombol Ubah setelah warga ditambahkan." />
          </div>
        </div>
        <Callout tone="info">PIN awal <b className="num">{PIN_AWAL}</b>. Warga diminta membuat PIN baru saat pertama masuk. Rumah yang ditempati (milik sendiri/kontrak) dapat diisi lewat tombol Ubah.</Callout>
      </div>
    </Modal>
  );
}
