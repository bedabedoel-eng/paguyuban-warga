import { Signpost, Users } from 'lucide-react';
import { createElement } from 'react';
import { Button } from '../../../components/ui';
import { buatLayanan } from '../../../services/_crud';
import { daftarGang } from '../../../services/pengaturan';
import { sebaranWarga } from '../../../services/warga';
import { angka } from '../../../lib/format';

const dasar = buatLayanan({ tabel: 'gang', buang: ['warga'] });

/** Layanan jalan: daftar ditambah jumlah warga aktif; setiap perubahan juga menyegarkan daftar blok & jalan di seluruh aplikasi. */
export function layananJalan(segarkan) {
  return {
    daftar: async () => {
      const [g, sebar] = await Promise.all([daftarGang(), sebaranWarga()]);
      return g.map((x) => ({ ...x, warga: sebar.gang[x.id] || 0 }));
    },
    simpan: async (b) => { const r = await dasar.simpan(b); await segarkan?.(); return r; },
    hapus: async (id) => { const r = await dasar.hapus(id); await segarkan?.(); return r; },
  };
}

const LINTAS = 'lintas';

/**
 * Konfigurasi menu "Blok & jalan": satu baris = satu jalan. Blok sendiri diatur di Pengaturan paguyuban.
 * Hak akses mengikuti RLS tabel `gang` (pengelola anggota / admin).
 */
export function konfigWilayah({ blok, gang, layanan, aksiHeader }) {
  const namaBlok = (kode) => (kode ? (blok.find((b) => b.kode === kode)?.nama || `Blok ${kode}`) : 'Lintas blok');
  return {
    kelas: 'page',
    judul: 'Blok & jalan',
    desc: 'Setiap blok dapat berisi beberapa nama jalan. Jalan menentukan humas yang mendampingi warga dan sasaran informasi. Contoh alamat: Blok C 3/5 · Jl. Zamrud.',
    satuan: 'jalan',
    caption: 'Daftar jalan',
    layanan,
    label: (g) => g.nama,
    defaultSort: { key: 'blok', dir: 'asc' },

    cari: { placeholder: 'Cari nama jalan atau nomor', ambil: (g) => `${g.nama} ${g.nomor || ''} ${namaBlok(g.blok)}` },
    filter: [
      { key: 'blok', label: 'Filter blok', placeholder: 'Semua blok',
        options: [...blok.map((b) => ({ value: b.kode, label: b.nama })), { value: LINTAS, label: 'Lintas blok' }],
        test: (g, v) => (v === LINTAS ? !g.blok : g.blok === v) },
      { key: 'warga', label: 'Filter warga', placeholder: 'Semua jalan',
        options: [{ value: 'ada', label: 'Ada warga' }, { value: 'kosong', label: 'Belum ada warga' }],
        test: (g, v) => (v === 'ada' ? g.warga > 0 : g.warga === 0) },
    ],
    kolom: [
      { key: 'nama', label: 'Jalan', mobileLabel: '', sort: (g) => g.nama, render: (g) => createElement('span', { className: 'row', style: { gap: 8 } }, createElement(Signpost, { size: 16, 'aria-hidden': true }), createElement('span', { className: 'cell-main' }, g.nama)) },
      { key: 'blok', label: 'Blok', sort: (g) => (g.blok ? namaBlok(g.blok) : '~'), render: (g) => createElement('span', null, namaBlok(g.blok)) },
      { key: 'nomor', label: 'Nomor / sub-blok', sort: (g) => g.nomor || '~', render: (g) => (g.nomor ? createElement('span', { className: 'num' }, g.nomor) : createElement('span', { className: 'muted' }, '-')) },
      { key: 'warga', label: 'Warga aktif', className: 'right', sort: (g) => g.warga, render: (g) => createElement('span', { className: 'num' }, angka(g.warga)) },
    ],

    tambah: { label: 'Tambah jalan', bisa: true },
    ubah: { bisa: () => true },
    hapus: {
      dampak: (rows) => {
        const n = rows.reduce((a, g) => a + (g.warga || 0), 0);
        return n ? `${n} warga di jalan ini akan menjadi "belum memilih jalan", dan humas jalan ini kehilangan wilayahnya.` : 'Jalan ini belum memiliki warga.';
      },
    },
    aksiBaris: (g) => createElement(Button, { size: 'xs', variant: 'ghost', icon: Users, to: `/warga?tab=anggota&gang=${g.id}` }, 'Warga'),

    form: {
      judul: (g) => (g ? `Ubah ${g.nama}` : 'Tambah jalan'),
      awal: (url) => ({ nama: '', blok: url.get('blok') && url.get('blok') !== LINTAS ? url.get('blok') : '', nomor: '' }),
      dari: (g) => ({ nama: g.nama, blok: g.blok || '', nomor: g.nomor || '' }),
      ke: (v, g) => ({
        nama: v.nama.trim(), blok: v.blok || null, urutan: g?.urutan ?? gang.length + 1,
        ...(v.nomor?.trim() || (g && 'nomor' in g) ? { nomor: v.nomor?.trim() || null } : {}),
      }),
      sukses: (g) => (g ? 'Jalan diperbarui' : 'Jalan ditambahkan'),
      fields: [
        { key: 'nama', label: 'Nama jalan', span: 2, wajib: true, maxLength: 60, placeholder: 'Contoh: Jl. Zamrud', validasi: (v) => (v.trim().length >= 2 ? null : 'Nama terlalu pendek') },
        { key: 'blok', label: 'Blok', type: 'select', span: 2, placeholder: 'Lintas blok', options: blok.map((b) => ({ value: b.kode, label: b.nama })), hint: 'Pilih Lintas blok bila jalan ini melewati beberapa blok.' },
        { key: 'nomor', label: 'Nomor (opsional)', span: 2, opsional: true, maxLength: 80, placeholder: 'mis. 3, 4 atau 1-20',
          hint: 'Sub-blok atau rentang nomor rumah di jalan ini. Dipakai untuk mengisi jalan otomatis saat impor warga dan pendaftaran.' },
      ],
    },

    ekspor: {
      nama: 'blok-jalan',
      kolom: [
        { key: 'blok', label: 'blok', nilai: (g) => g.blok || '' },
        { key: 'nomor', label: 'nomor', nilai: (g) => g.nomor || '' },
        { key: 'jalan', label: 'jalan', nilai: (g) => g.nama },
        { key: 'warga', label: 'warga_aktif' },
      ],
    },
    ringkasan: (rows) => `${rows.length} jalan · ${angka(rows.reduce((a, g) => a + (g.warga || 0), 0))} warga aktif`,
    kosong: { icon: Signpost, title: 'Belum ada jalan', text: 'Tambahkan jalan atau impor dari CSV. Bila blok tidak dibagi per jalan, biarkan kosong.' },
    aksiHeader,
  };
}
