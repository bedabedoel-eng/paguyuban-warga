import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '../layout/PageHeader';
import { Button, IconButton } from '../ui';
import { useAsync } from '../../hooks/useAsync';
import DataManager from './DataManager';
import FormModal from './FormModal';

/**
 * Halaman kelola data lengkap yang seluruhnya dibentuk dari satu objek konfigurasi.
 * Menu baru = berkas konfigurasi baru + satu baris rute. Contoh: features/admin/config/rumah.js
 *
 * konfig: {
 *   kelas, judul, desc, back, satuan, kunci,
 *   layanan: { daftar, simpan, hapus },      // dari buatLayanan() atau layanan sendiri
 *   label(row), cari, filter, kolom, defaultSort,
 *   tambah: { label, bisa },                  // tombol Tambah
 *   ubah:   { bisa(row) },                    // tombol Ubah per baris (hilang bila bisa -> false)
 *   hapus:  { bisa(row), dampak, sukses? },   // aturan hapus; tanpa ini tidak ada tombol hapus
 *   aksiMassal: [...],                        // aksi lain untuk baris terpilih (lihat DataManager)
 *   FormKustom: Komponen({ baris, onClose, onSaved }),  // pengganti form bawaan untuk form yang rumit
 *   aksiHeader, aksiHeaderMobile,             // tombol tambahan di kepala halaman
 *   aksiBaris(row), bawah                     // tombol tambahan per baris; konten di bawah tabel
 *   form: { judul(row), fields, awal(urlParams), dari(row), ke(nilai, row), sukses(row), wide },
 *   ekspor, ringkasan, kosong,
 * }
 */
export default function HalamanData({ konfig: k, tertanam = false }) {
  const [url] = useSearchParams();
  const s = useAsync(k.layanan.daftar, [k.layanan]);
  const [form, setForm] = useState(null); // { baris: row | null, nilai }
  const kunci = k.kunci || 'id';
  const adaForm = !!(k.form || k.FormKustom);
  const bisaTambah = adaForm && (k.tambah?.bisa ?? !!k.form);

  const bukaBaru = () => setForm({ baris: null, nilai: k.form?.awal ? k.form.awal(url) : {} });
  const bukaUbah = (r) => setForm({ baris: r, nilai: k.form?.dari ? k.form.dari(r) : { ...r } });
  const simpan = async (nilai) => {
    const payload = k.form.ke ? k.form.ke(nilai, form.baris) : nilai;
    await k.layanan.simpan(form.baris ? { [kunci]: form.baris[kunci], ...payload } : payload);
    s.reload();
  };

  const labelTambah = k.tambah?.label || `Tambah ${k.satuan}`;
  return (
    <div className={tertanam ? 'stack' : (k.kelas || 'page')}>
      {tertanam
        ? (bisaTambah || k.aksiHeader) && <div className="row wrap" style={{ justifyContent: 'flex-end' }}>{bisaTambah && <Button size="sm" icon={Plus} onClick={bukaBaru}>{labelTambah}</Button>}{k.aksiHeader}</div>
        : <PageHeader back={k.back ?? true} title={k.judul} desc={k.desc}
            actions={bisaTambah || k.aksiHeader ? <>{bisaTambah && <Button size="sm" icon={Plus} onClick={bukaBaru}>{labelTambah}</Button>}{k.aksiHeader}</> : undefined}
            mobileActions={bisaTambah || k.aksiHeaderMobile ? <>{bisaTambah && <IconButton icon={Plus} label={labelTambah} onClick={bukaBaru} />}{k.aksiHeaderMobile}</> : undefined} />}
      <DataManager
        rows={s.data} loading={s.loading} error={s.error} onRetry={s.reload} onSelesai={s.reload}
        rowKey={kunci} columns={k.kolom} caption={k.caption || `Daftar ${k.satuan}`} satuan={k.satuan} label={k.label}
        cari={k.cari} filters={k.filter} defaultSort={k.defaultSort} defaultPer={k.defaultPer}
        kosong={k.kosong} ekspor={k.ekspor} ringkasan={k.ringkasan}
        onUbah={adaForm ? bukaUbah : undefined} bisaUbah={k.ubah?.bisa}
        hapus={k.hapus ? { ...k.hapus, jalankan: (r) => k.layanan.hapus(r[kunci]) } : undefined}
        aksiMassal={k.aksiMassal} aksiBaris={k.aksiBaris} />
      {k.bawah}
      {form && k.FormKustom && <k.FormKustom baris={form.baris} onClose={() => setForm(null)} onSaved={() => { setForm(null); s.reload(); }} />}
      {form && k.form && (
        <FormModal key={form.baris ? form.baris[kunci] : 'baru'} open onClose={() => setForm(null)} wide={k.form.wide}
          title={k.form.judul ? k.form.judul(form.baris) : (form.baris ? `Ubah ${k.satuan}` : `Tambah ${k.satuan}`)}
          fields={k.form.fields} awal={form.nilai} onSubmit={simpan}
          sukses={() => (k.form.sukses ? k.form.sukses(form.baris) : `${k.satuan[0].toUpperCase()}${k.satuan.slice(1)} disimpan`)} />
      )}
    </div>
  );
}
