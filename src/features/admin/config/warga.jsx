import { UserCheck, UserX, Users } from 'lucide-react';
import { Avatar, Badge } from '../../../components/ui';
import { semuaWarga, ubahStatusWarga } from '../../../services/warga';
import { formatHp } from '../../../lib/phone';
import { STATUS_WARGA, STATUS_PERNIKAHAN, STATUS_HUNIAN, labelPernikahan } from '../../../lib/constants';
import { tanggal } from '../../../lib/format';
import { kelolaWilayah, namaWilayah } from '../../../lib/akses';
import { pecahNomor } from '../../../lib/alamat';
import { eksporWarga } from '../../../lib/eksporWarga';
import EditWarga from '../EditWarga';
import TambahWarga from '../TambahWarga';

/** Tanpa baris = tambah warga baru (admin), dengan baris = ubah data. */
function FormWarga(props) { return props.baris ? <EditWarga {...props} /> : <TambahWarga {...props} />; }

/**
 * Konfigurasi menu "Data anggota".
 * Hak akses mengikuti RLS tabel `warga` (pengelola wilayah / admin). Anggota tidak dihapus dari tabel ini:
 * "Nonaktifkan" menyimpan datanya dan riwayat IPL/kas yang melekat. Hapus permanen tetap ada di form ubah (khusus admin).
 */
export function konfigWarga({ hak, user, blok, gang, namaGang }) {
  const bolehKelola = (w) => kelolaWilayah(hak, w.gang_id) || hak.admin;
  // Aksi status: tidak untuk akun sendiri, dan akun admin hanya oleh admin (database tetap penjaga utama).
  const bolehUbahStatus = (w) => bolehKelola(w) && w.id !== user.id && !(w.role === 'admin' && !hak.admin);
  const gangBoleh = gang.filter((g) => hak.kelola_anggota || hak.wilayah.includes(g.id));

  return {
    kelas: 'page',
    judul: 'Data anggota',
    desc: hak.kelola_anggota ? 'Seluruh anggota paguyuban. Ubah data rumah, status, dan kepala keluarga.' : `Anggota di ${namaWilayah(hak, gang)}.`,
    satuan: 'anggota',
    caption: 'Daftar anggota',
    layanan: {
      // Pengelola penuh melihat semua; humas hanya jalan yang dipegangnya.
      daftar: async () => {
        const rows = await semuaWarga();
        return hak.kelola_anggota ? rows : rows.filter((w) => hak.wilayah.includes(w.gang_id));
      },
    },
    label: (w) => w.nama,

    cari: { placeholder: 'Cari nama, rumah, atau nomor HP', ambil: (w) => `${w.nama} ${w.pekerjaan || ''} ${w.blok || ''} ${w.no_rumah || ''} ${w.kontak?.nomor_hp || ''}` },
    filter: [
      ...(hak.kelola_anggota ? [{ key: 'blok', label: 'Filter blok', placeholder: 'Semua blok', options: blok.map((b) => ({ value: b.kode, label: b.nama })), test: (w, v) => w.blok === v }] : []),
      { key: 'gang', label: 'Filter jalan', placeholder: hak.kelola_anggota ? 'Semua jalan' : 'Semua jalan saya',
        options: gangBoleh.map((g) => ({ value: g.id, label: g.blok ? `${g.nama} (Blok ${g.blok})` : g.nama })), test: (w, v) => w.gang_id === v },
      { key: 'status', label: 'Filter status', placeholder: 'Semua status',
        options: [...Object.entries(STATUS_WARGA).map(([k, v]) => ({ value: k, label: v.label })), { value: 'belum_pin', label: 'Belum ganti PIN' }],
        test: (w, v) => (v === 'belum_pin' ? !!w.wajib_ganti_pin : w.status === v) },
      { key: 'nikah', label: 'Filter status pernikahan', placeholder: 'Semua status pernikahan',
        options: [...Object.entries(STATUS_PERNIKAHAN).map(([k, v]) => ({ value: k, label: v.label })), { value: 'kosong', label: 'Belum diisi' }],
        test: (w, v) => (v === 'kosong' ? !w.kontak?.status_pernikahan : w.kontak?.status_pernikahan === v) },
      { key: 'hunian', label: 'Filter rumah ditempati', placeholder: 'Semua status rumah',
        options: [...Object.entries(STATUS_HUNIAN).map(([k, v]) => ({ value: k, label: v.label })), { value: 'kosong', label: 'Belum diisi' }],
        test: (w, v) => (v === 'kosong' ? !w.kontak?.status_hunian : w.kontak?.status_hunian === v) },
    ],
    kolom: [
      { key: 'nama', label: 'Nama', mobileLabel: '', sort: (w) => w.nama, render: (w) => (
        <div className="row"><Avatar nama={w.nama} path={w.foto_path} size={36} /><div className="grow" style={{ textAlign: 'left' }}><div className="cell-main">{w.nama}</div><div className="cell-sub">{w.pekerjaan || (w.kepala_keluarga ? 'Kepala keluarga' : 'Anggota keluarga')}</div></div></div>
      ) },
      { key: 'blok', label: 'Blok', sort: (w) => w.blok || '~', render: (w) => <span>{w.blok || '—'}</span> },
      { key: 'sub', label: 'Sub-blok', sort: (w) => pecahNomor(w.no_rumah).sub || '~', render: (w) => <span>{pecahNomor(w.no_rumah).sub || <span className="muted">-</span>}</span> },
      { key: 'nomor', label: 'No.', sort: (w) => pecahNomor(w.no_rumah).nomor || '~', render: (w) => <span>{pecahNomor(w.no_rumah).nomor || '—'}</span> },
      { key: 'jalan', label: 'Jalan', sort: (w) => namaGang(w.gang_id) || '~', render: (w) => <span>{namaGang(w.gang_id) || <span className="muted">-</span>}</span> },
      { key: 'nikah', label: 'Pernikahan', sort: (w) => w.kontak?.status_pernikahan || '', render: (w) => <span className="text-sm">{labelPernikahan(w.kontak) || '—'}</span> },
      { key: 'hunian', label: 'Rumah', sort: (w) => w.kontak?.status_hunian || '', render: (w) => <span className="text-sm">{STATUS_HUNIAN[w.kontak?.status_hunian]?.label || '—'}</span> },
      { key: 'hp', label: 'Nomor HP', render: (w) => <span className="num nowrap">{w.kontak?.nomor_hp ? formatHp(w.kontak.nomor_hp) : '—'}</span> },
      { key: 'bergabung', label: 'Bergabung', sort: (w) => w.bergabung_at, render: (w) => <span className="nowrap text-sm">{w.bergabung_at ? tanggal(w.bergabung_at, { pendek: true }) : '—'}</span> },
      { key: 'status', label: 'Status', sort: (w) => STATUS_WARGA[w.status]?.label, render: (w) => (
        <span className="row wrap" style={{ gap: 6, justifyContent: 'inherit' }}>
          <Badge tone={STATUS_WARGA[w.status].tone} dot>{STATUS_WARGA[w.status].label}</Badge>
          {w.role === 'admin' && <Badge tone="violet">Admin</Badge>}
          {w.wajib_ganti_pin && <Badge tone="warn">Belum ganti PIN</Badge>}
        </span>
      ) },
    ],

    ubah: { bisa: bolehKelola },
    FormKustom: FormWarga,
    tambah: { label: 'Tambah warga', bisa: !!hak.admin },
    aksiMassal: [
      { kata: 'Nonaktifkan', tombol: 'Nonaktifkan', ikon: UserX, ikonBaris: true, bisa: (w) => w.status === 'aktif' && bolehUbahStatus(w),
        dampak: 'Anggota tidak lagi tampil di direktori dan tidak dapat mengakses data paguyuban. Data dan riwayat pembayarannya tetap tersimpan, dan bisa diaktifkan kembali kapan saja.',
        jalankan: (w) => ubahStatusWarga(w.id, 'nonaktif'), sukses: (n) => `${n} anggota dinonaktifkan` },
      { kata: 'Aktifkan', tombol: 'Aktifkan kembali', ikon: UserCheck, bisa: (w) => w.status === 'nonaktif' && bolehUbahStatus(w),
        jalankan: (w) => ubahStatusWarga(w.id, 'aktif'), sukses: (n) => `${n} anggota diaktifkan kembali` },
    ],

    ekspor: { fungsi: (rows) => eksporWarga(rows, gang, 'data-anggota') },
    ringkasan: (rows) => {
      const menikah = rows.filter((w) => w.kontak?.status_pernikahan === 'menikah').length;
      const anak = rows.reduce((a, w) => a + (w.kontak?.jumlah_anak || 0), 0);
      const kontrak = rows.filter((w) => w.kontak?.status_hunian === 'kontrak').length;
      return `${rows.length} anggota · ${kontrak} kontrak · ${menikah} menikah · ${anak} anak tercatat (data sensus)`;
    },
    kosong: { icon: Users, title: 'Belum ada anggota', text: 'Anggota muncul setelah mendaftar dan disetujui, atau ditambahkan admin.' },
  };
}
