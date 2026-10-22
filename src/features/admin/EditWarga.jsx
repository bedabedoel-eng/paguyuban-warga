import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Trash2 } from 'lucide-react';
import { Badge, Button, Modal, PinInput, PhoneInput, Select, Input, Checkbox, Callout, FotoInput, PernikahanFields, NomorRumahFields, galatAnak, kolomPernikahan, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { ubahWargaAdmin, ubahKontakAdmin, ubahHpWarga, resetSandiWarga, hapusWarga } from '../../services/warga';
import { daftarPengurus } from '../../services/pengurus';
import { bukaKunciLogin, statusLoginHp, statusPenegakanLogin } from '../../services/auth';
import { teksTunggu } from '../../lib/loginBatas';
import { normalizeHp } from '../../lib/phone';
import { STATUS_WARGA, STATUS_HUNIAN, pernahMenikah } from '../../lib/constants';
import { FOTO_AWAL, fotoBerubah, terapkanFoto } from '../../lib/foto';
import { labelJabatan } from '../../lib/akses';
import { POLA_NOMOR_RUMAH, gangDiBlok } from '../../lib/alamat';

/** Form lengkap ubah data anggota. Dipakai sebagai FormKustom di config/warga.jsx (halaman Warga). */
export default function EditWarga({ baris: w, onClose, onSaved }) {
  const { hak, user } = useAuth();
  const { blok, gang, namaGang } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const admin = hak.admin;
  const [f, setF] = useState({ nama: w.nama, blok: w.blok || '', gang_id: w.gang_id || '', no_rumah: w.no_rumah || '', status: w.status, role: w.role === 'admin' ? 'admin' : 'warga', kepala_keluarga: w.kepala_keluarga, pekerjaan: w.pekerjaan || '', hp: w.kontak?.nomor_hp ? w.kontak.nomor_hp.replace(/^62/, '') : '', status_pernikahan: w.kontak?.status_pernikahan || '', jumlah_anak: w.kontak?.jumlah_anak ?? '', status_hunian: w.kontak?.status_hunian || '' });
  const [foto, setFoto] = useState(FOTO_AWAL);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const jab = useAsync(async () => (await daftarPengurus()).filter((p) => p.warga_id === w.id), [w.id]);
  // Status penghitung login gagal (SQL 14). Galat (mis. SQL belum dijalankan) diabaikan: bagian ini tidak tampil.
  const kunci = useAsync(async () => (admin ? await statusLoginHp(w.kontak?.nomor_hp) : null), [w.id], { enabled: admin });
  const penegakan = useAsync(async () => statusPenegakanLogin(), [w.id], { enabled: admin });
  const sisaTunggu = kunci.data?.terkunci_sampai ? Math.max(0, Math.ceil((new Date(kunci.data.terkunci_sampai) - Date.now()) / 1000)) : 0;
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const diriSendiri = w.id === user.id;
  const terkunci = w.role === 'admin' && !admin;
  const opsiBlok = blok.map((b) => ({ value: b.kode, label: b.nama }));
  const opsiGang = gangDiBlok(gang, f.blok).filter((g) => hak.kelola_anggota || hak.wilayah.includes(g.id)).map((g) => ({ value: g.id, label: g.nama }));
  const gantiBlok = (e) => { const b = e.target.value; setF((s) => ({ ...s, blok: b, gang_id: gangDiBlok(gang, b).some((g) => g.id === s.gang_id) ? s.gang_id : '' })); };

  async function simpan() {
    const hp = f.hp ? normalizeHp(f.hp) : null;
    if (admin && f.hp && !hp) return toast.error('Nomor HP tidak valid');
    if (f.nama.trim().length < 2) return toast.error('Nama minimal 2 huruf');
    if (f.no_rumah.trim() && !POLA_NOMOR_RUMAH.test(f.no_rumah.trim())) return toast.error('Nomor rumah: angka/huruf, boleh dengan / . - (mis. 3/5)');
    if (!hak.kelola_anggota && !f.gang_id) return toast.error('Pilih jalan');
    const ga = galatAnak(f.status_pernikahan, f.jumlah_anak);
    if (ga) return toast.error(ga);
    setLoading(true);
    try {
      const data = { nama: f.nama.trim(), pekerjaan: f.pekerjaan.trim() || null, blok: f.blok || null, gang_id: f.gang_id || null, no_rumah: f.no_rumah.trim().toUpperCase() || null, kepala_keluarga: !!f.kepala_keluarga };
      if (!diriSendiri) data.status = f.status;
      if (admin && fotoBerubah(foto)) data.foto_path = await terapkanFoto(foto, { folder: `avatar/${user.id}`, lama: w.foto_path, opsi: { maxSize: 960, quality: 0.82, aspect: 3 / 4 }, onSalinGagal: (e) => toast.error(`Foto disimpan sebagai tautan luar. ${e.message}`) });
      if (admin && !diriSendiri && w.role !== 'pengurus') data.role = f.role;
      await ubahWargaAdmin(w.id, data);
      const kontakBaru = { ...kolomPernikahan(f.status_pernikahan, f.jumlah_anak), status_hunian: f.status_hunian || null };
      await ubahKontakAdmin(w.id, kontakBaru);
      // Nomor HP dipakai untuk masuk: ganti lewat fungsi server agar akun login ikut pindah ke nomor baru
      if (admin && hp && hp !== w.kontak?.nomor_hp) await ubahHpWarga(w.id, hp);
      toast.success('Data anggota disimpan'); onSaved();
    } catch (e) { toast.error(e); } finally { setLoading(false); }
  }
  async function reset() {
    if (!/^\d{6}$/.test(pin)) return toast.error('PIN sementara harus 6 angka');
    try {
      await resetSandiWarga(w.id, pin);
      // PIN baru dari admin juga mengakhiri penundaan login akun ini (abaikan bila SQL 14 belum dipasang)
      try { await bukaKunciLogin(w.id); kunci.reload?.(); } catch { /* abaikan */ }
      toast.success('PIN diatur ulang. Sampaikan PIN sementara langsung ke warga.'); setPin('');
    } catch (e) { toast.error(e); }
  }
  async function bukaKunci() {
    try { await bukaKunciLogin(w.id); toast.success('Kunci login dibuka. Warga dapat mencoba masuk lagi.'); kunci.reload?.(); } catch (e) { toast.error(e); }
  }
  async function hapus() {
    if (!(await confirm({ title: `Hapus akun ${w.nama}?`, text: 'Akun, profil, dan riwayat pembayaran warga ini dihapus permanen. Tindakan ini tidak bisa dibatalkan.', okLabel: 'Hapus permanen', danger: true }))) return;
    try { await hapusWarga(w.id); toast.success('Akun dihapus'); onSaved(); } catch (e) { toast.error(e); }
  }

  return (
    <Modal open onClose={onClose} title="Ubah data anggota" desc={w.nama} wide
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button loading={loading} disabled={terkunci} onClick={simpan}>Simpan perubahan</Button></>}>
      <div className="stack">
        {terkunci && <Callout tone="warn">Data akun admin hanya dapat diubah oleh admin.</Callout>}
        <div className="form-section">
          <div className="form-grid">
            <Input fieldClass="span-2" label="Nama lengkap" value={f.nama} onChange={set('nama')} maxLength={80} disabled={terkunci} />
            <Select label="Blok" value={f.blok} onChange={gantiBlok} placeholder="Pilih" options={opsiBlok} disabled={terkunci || !hak.kelola_anggota} />
            <NomorRumahFields value={f.no_rumah} onChange={(v) => setF((s) => ({ ...s, no_rumah: v }))} disabled={terkunci} />
            {(opsiGang.length > 0 || f.gang_id) && (
              <Select fieldClass="span-2" label="Jalan" value={f.gang_id} onChange={set('gang_id')}
                placeholder={hak.kelola_anggota ? 'Belum dipilih' : undefined}
                options={opsiGang.some((o) => o.value === f.gang_id) || !f.gang_id ? opsiGang : [{ value: f.gang_id, label: namaGang(f.gang_id) || 'Gang lain' }, ...opsiGang]}
                disabled={terkunci} hint="Menentukan humas yang mendampingi warga ini." />
            )}
            <Input label="Pekerjaan" optional value={f.pekerjaan} onChange={set('pekerjaan')} maxLength={60} disabled={terkunci} />
            <Select label="Status keanggotaan" value={f.status} onChange={set('status')} options={['menunggu', 'aktif', 'ditolak', 'nonaktif'].map((x) => ({ value: x, label: STATUS_WARGA[x].label }))} disabled={terkunci || diriSendiri} />
            <PernikahanFields status={f.status_pernikahan} anak={f.jumlah_anak} disabled={terkunci}
              onStatus={(v) => setF((s) => ({ ...s, status_pernikahan: v, jumlah_anak: pernahMenikah(v) ? s.jumlah_anak : '' }))}
              onAnak={(v) => setF((s) => ({ ...s, jumlah_anak: v }))} />
            <Select label="Rumah yang ditempati" optional value={f.status_hunian} onChange={set('status_hunian')} placeholder="Belum diisi" disabled={terkunci}
              options={Object.entries(STATUS_HUNIAN).map(([value, v]) => ({ value, label: v.label }))} />
            <div className="span-2"><Checkbox checked={f.kepala_keluarga} onChange={(v) => setF((s) => ({ ...s, kepala_keluarga: v }))} disabled={terkunci}>Kepala keluarga</Checkbox></div>
          </div>
        </div>
        {admin && !terkunci && (
          <div className="form-section">
            <div className="form-section-head"><h3>Pas foto</h3><p>Unggah dari perangkat atau tempel tautan gambar.</p></div>
            <FotoInput value={foto} onChange={setFoto} adaFoto={!!w.foto_path} />
          </div>
        )}
        <div className="form-section">
          <div className="form-section-head"><h3>Akun & jabatan</h3><p>{admin ? 'Nomor HP dipakai untuk masuk.' : 'Nomor HP, PIN, dan peran sistem hanya diubah admin.'}</p></div>
          <div className="form-grid">
            <PhoneInput label="Nomor HP (login)" value={f.hp} onChange={set('hp')} disabled={!admin} />
            {admin && !diriSendiri && w.role !== 'pengurus' && <Select label="Peran sistem" value={f.role} onChange={set('role')} options={[{ value: 'warga', label: 'Warga' }, { value: 'admin', label: 'Admin (akses penuh)' }]} />}
          </div>
          <div className="row wrap">
            {jab.data?.length ? jab.data.map((j) => <Badge key={j.id} tone="brand">{labelJabatan(j, namaGang)}</Badge>) : <span className="text-sm muted">Tidak memegang jabatan pengurus.</span>}
            {hak.kelola_pengurus && <Link to="/pengurus/kelola" className="link">Atur jabatan</Link>}
          </div>
        </div>
        {admin && (
          <div className="form-section">
            <div className="form-section-head"><h3>Atur ulang PIN</h3><p>Warga wajib membuat PIN baru saat masuk berikutnya.</p></div>
            {kunci.data && (
              <Callout tone={sisaTunggu > 0 ? 'warn' : 'info'}>
                {sisaTunggu > 0
                  ? <>Login akun ini <b>ditunda {teksTunggu(sisaTunggu)} lagi</b> karena PIN salah {kunci.data.gagal_beruntun} kali berturut-turut.</>
                  : <>Ada {kunci.data.gagal_beruntun} percobaan PIN salah baru-baru ini; login tidak sedang ditunda.</>}
                <div style={{ marginTop: 8 }}><Button size="sm" variant="secondary" onClick={bukaKunci}>Buka kunci login</Button></div>
              </Callout>
            )}
            {penegakan.data && penegakan.data.batas_aktif !== false && !penegakan.data.hook_aktif && (
              <p className="text-xs muted">Batas percobaan login baru berlaku lewat halaman masuk aplikasi. Untuk penegakan penuh di server, aktifkan hook “Password verification” di Supabase (petunjuk di SQL 14).</p>
            )}
            <div className="row row-top wrap">
              <div className="grow" style={{ minWidth: 180 }}><PinInput placeholder="PIN sementara (6 angka)" value={pin} onChange={(e) => setPin(e.target.value)} /></div>
              <Button variant="secondary" icon={KeyRound} onClick={reset}>Atur ulang PIN</Button>
            </div>
            {!diriSendiri && <div><Button variant="danger-soft" icon={Trash2} onClick={hapus}>Hapus akun warga</Button></div>}
          </div>
        )}
      </div>
    </Modal>
  );
}
