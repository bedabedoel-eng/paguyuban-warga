import { Ban, CircleCheck, Network } from 'lucide-react';
import { Avatar, Badge } from '../../../components/ui';
import { daftarPengurus, simpanPengurus, hapusPengurus, ubahPengurus } from '../../../services/pengurus';
import { PERAN_PENGURUS, labelJabatan } from '../../../lib/akses';
import FormJabatan, { PERAN_BLOK, URUT } from '../FormJabatan';
import MatriksHak from '../MatriksHak';

/**
 * Konfigurasi menu "Atur pengurus". Hak mengubah mengikuti RLS tabel `pengurus` (ketua utama).
 * Jabatan sebaiknya dinonaktifkan, bukan dicabut, supaya riwayat tetap tercatat; "Cabut" tetap tersedia.
 */
export function konfigPengurus({ hak, user, namaGang, alamatPendek }) {
  const kelola = !!hak.kelola_pengurus;
  const labelJ = (p) => labelJabatan(p, namaGang);
  const wilayah = (p) => (p.peran === 'humas' ? (namaGang(p.wilayah_gang) || '—') : PERAN_BLOK.includes(p.peran) ? (p.wilayah_blok ? `Blok ${p.wilayah_blok}` : 'Semua blok') : '—');
  const termasukSaya = (rows) => rows.some((p) => p.warga_id === user.id);
  const urut = (rows) => [...rows].sort((a, b) => (b.aktif - a.aktif) || (URUT[a.peran] ?? 99) - (URUT[b.peran] ?? 99));

  return {
    kelas: 'page',
    back: '/pengurus',
    judul: 'Atur pengurus',
    desc: 'Tetapkan jabatan dan hak aksesnya. Hak akses mengikuti peran dan wilayah blok, bukan nama jabatan.',
    satuan: 'jabatan',
    caption: 'Daftar jabatan pengurus',
    layanan: { daftar: async () => urut(await daftarPengurus({ semua: true })), simpan: simpanPengurus, hapus: hapusPengurus },
    label: (p) => `jabatan ${labelJ(p)} (${p.warga?.nama || 'tanpa nama'})`,

    cari: { placeholder: 'Cari nama atau jabatan', ambil: (p) => `${p.warga?.nama || ''} ${labelJ(p)} ${wilayah(p)}` },
    filter: [
      { key: 'peran', label: 'Filter hak akses', placeholder: 'Semua hak akses', options: Object.entries(PERAN_PENGURUS).map(([value, v]) => ({ value, label: v.label })), test: (p, v) => p.peran === v },
      { key: 'status', label: 'Filter status', placeholder: 'Semua status', options: [{ value: 'aktif', label: 'Aktif' }, { value: 'nonaktif', label: 'Nonaktif' }], test: (p, v) => (v === 'aktif') === !!p.aktif },
    ],
    kolom: [
      { key: 'nama', label: 'Pengurus', mobileLabel: '', sort: (p) => p.warga?.nama, render: (p) => <div className="row"><Avatar nama={p.warga?.nama} path={p.warga?.foto_path} size={34} /><div style={{ textAlign: 'left' }}><div className="cell-main">{p.warga?.nama}</div><div className="cell-sub">{alamatPendek(p.warga)}</div></div></div> },
      { key: 'jabatan', label: 'Jabatan', sort: labelJ, render: (p) => <span>{labelJ(p)}</span> },
      { key: 'peran', label: 'Hak akses', sort: (p) => PERAN_PENGURUS[p.peran]?.label || p.peran, render: (p) => <Badge tone={p.peran === 'seksi' ? '' : 'brand'}>{PERAN_PENGURUS[p.peran]?.label || p.peran}</Badge> },
      { key: 'wil', label: 'Wilayah', sort: (p) => p.wilayah_blok || p.wilayah_gang || '', render: (p) => <span className="text-sm">{wilayah(p)}</span> },
      { key: 'periode', label: 'Periode', render: (p) => <span className="num nowrap">{p.periode_mulai || '—'}–{p.periode_selesai || '—'}</span> },
      { key: 'status', label: 'Status', sort: (p) => (p.aktif ? 0 : 1), render: (p) => <Badge tone={p.aktif ? 'ok' : ''} dot>{p.aktif ? 'Aktif' : 'Nonaktif'}</Badge> },
    ],

    tambah: { label: 'Tetapkan pengurus', bisa: kelola },
    ubah: { bisa: () => kelola },
    FormKustom: FormJabatan,
    hapus: kelola ? {
      kata: 'Cabut',
      judul: (rows) => (rows.length === 1 ? `Cabut jabatan ${labelJ(rows[0])}?` : `Cabut ${rows.length} jabatan?`),
      dampak: (rows) => `${rows.length === 1 ? (rows[0].warga?.nama || 'Pengurus ini') : 'Para pengurus ini'} kehilangan hak akses jabatan${rows.length === 1 ? ' ini' : ''}.${termasukSaya(rows) ? ' Termasuk jabatan Anda sendiri.' : ''} Untuk menyimpan riwayat, pilih Nonaktifkan saja.`,
      sukses: (n) => (n === 1 ? 'Jabatan dicabut' : `${n} jabatan dicabut`),
    } : undefined,
    aksiMassal: kelola ? [
      { kata: 'Nonaktifkan', tombol: 'Nonaktifkan', ikon: Ban, ikonBaris: true, bisa: (p) => p.aktif,
        dampak: (rows) => `Jabatan nonaktif tidak memberi hak akses, tetapi tetap tercatat sebagai riwayat.${termasukSaya(rows) ? ' Termasuk jabatan Anda sendiri.' : ''}`,
        jalankan: (p) => ubahPengurus(p.id, { aktif: false }), sukses: (n) => `${n} jabatan dinonaktifkan` },
      { kata: 'Aktifkan', tombol: 'Aktifkan kembali', ikon: CircleCheck, bisa: (p) => !p.aktif,
        jalankan: (p) => ubahPengurus(p.id, { aktif: true }), sukses: (n) => `${n} jabatan diaktifkan kembali` },
    ] : undefined,

    ekspor: { nama: 'pengurus', kolom: [
      { key: 'nama', label: 'nama', nilai: (p) => p.warga?.nama || '' },
      { key: 'jabatan', label: 'jabatan', nilai: labelJ },
      { key: 'peran', label: 'hak_akses', nilai: (p) => PERAN_PENGURUS[p.peran]?.label || p.peran },
      { key: 'wilayah', label: 'wilayah', nilai: (p) => (wilayah(p) === '—' ? '' : wilayah(p)) },
      { key: 'periode_mulai', label: 'periode_mulai' },
      { key: 'periode_selesai', label: 'periode_selesai' },
      { key: 'status', label: 'status', nilai: (p) => (p.aktif ? 'aktif' : 'nonaktif') },
    ] },
    ringkasan: (rows) => `${rows.length} jabatan · ${rows.filter((p) => p.aktif).length} aktif`,
    kosong: { icon: Network, title: 'Belum ada pengurus', text: 'Tetapkan Ketua, Sekretaris, Bendahara, dan Humas tiap gang.' },
    bawah: <MatriksHak />,
  };
}
