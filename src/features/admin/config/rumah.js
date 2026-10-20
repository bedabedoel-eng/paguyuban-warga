import { Building2 } from 'lucide-react';
import { createElement } from 'react';
import { Badge } from '../../../components/ui';
import * as rumahService from '../../../services/rumah';
import { semuaWarga } from '../../../services/warga';
import { STATUS_HUNIAN } from '../../../lib/constants';
import { rupiah } from '../../../lib/format';
import { POLA_NOMOR_RUMAH } from '../../../lib/alamat';

/**
 * Hunian rumah, diturunkan dari data warga yang tinggal di dalamnya (tanpa data baru):
 * rumah berstatus Kosong → Kosong; selain itu isian kepala keluarga, atau anggota lain bila kosong; belum diisi → 'belum'.
 */
function hunianRumah(r, penghuni) {
  if (r.status === 'kosong') return 'kosong';
  const isi = (penghuni.find((w) => w.kepala_keluarga && w.kontak?.status_hunian) || penghuni.find((w) => w.kontak?.status_hunian))?.kontak.status_hunian;
  return isi || 'belum';
}
const LABEL_HUNIAN = { ...Object.fromEntries(Object.entries(STATUS_HUNIAN).map(([k, v]) => [k, v.label])), kosong: 'Kosong', belum: 'Belum diisi' };
const NADA_HUNIAN = { milik_sendiri: 'ok', kontrak: 'info', kosong: '', belum: 'warn' };

async function daftarRumahHunian() {
  const [rumah, warga] = await Promise.all([rumahService.daftarRumah(), semuaWarga({ status: 'aktif' }).catch(() => [])]);
  const per = {};
  for (const w of warga) if (w.rumah_id) (per[w.rumah_id] ||= []).push(w);
  return rumah.map((r) => ({ ...r, penghuni: (per[r.id] || []).length, hunian: hunianRumah(r, per[r.id] || []) }));
}

const layanan = { daftar: daftarRumahHunian, simpan: rumahService.simpanRumah, hapus: rumahService.hapusRumah };
const STATUS = [{ value: 'dihuni', label: 'Dihuni' }, { value: 'kosong', label: 'Kosong' }];
const kodeRumah = (r) => r.kode || `${r.blok} ${r.nomor}`;

/**
 * Konfigurasi menu "Data rumah". Seluruh perbedaan menu ini dari menu lain ada di sini:
 * kolom, filter, aturan hapus, dan isian form. Tampilan dan perilaku umumnya dari HalamanData.
 * Hak akses mengikuti RLS tabel `rumah` (admin atau bendahara).
 */
export function konfigRumah({ blok, pengaturan, hak }) {
  const kelola = !!(hak.admin || hak.bendahara);
  const tarifStandar = pengaturan.tarif_ipl;
  return {
    kelas: 'page medium',
    judul: 'Data rumah',
    desc: 'Dasar penerbitan tagihan IPL. Rumah dibuat otomatis saat anggota disetujui. Hunian (milik sendiri/kontrak) diambil dari data warga yang tinggal di rumah itu.',
    satuan: 'rumah',
    layanan,
    label: (r) => `rumah ${kodeRumah(r)}`,

    cari: { placeholder: 'Cari kode rumah', ambil: (r) => `${kodeRumah(r)} ${r.blok || ''} ${r.nomor || ''}` },
    filter: [
      { key: 'blok', label: 'Blok', chips: true, options: blok.map((b) => ({ value: b.kode, label: b.nama })), test: (r, v) => r.blok === v },
      { key: 'status', label: 'Status', placeholder: 'Semua status', options: STATUS, test: (r, v) => r.status === v },
      { key: 'hunian', label: 'Hunian', placeholder: 'Semua hunian', options: Object.entries(LABEL_HUNIAN).map(([value, label]) => ({ value, label })), test: (r, v) => r.hunian === v },
    ],
    kolom: [
      { key: 'kode', label: 'Rumah', sort: (r) => kodeRumah(r), render: (r) => createElement('span', { className: 'cell-main' }, kodeRumah(r)) },
      { key: 'status', label: 'Status', sort: (r) => r.status, render: (r) => createElement(Badge, { tone: r.status === 'dihuni' ? 'ok' : '', dot: true }, r.status === 'dihuni' ? 'Dihuni' : 'Kosong') },
      { key: 'hunian', label: 'Hunian', sort: (r) => LABEL_HUNIAN[r.hunian], render: (r) => createElement(Badge, { tone: NADA_HUNIAN[r.hunian], dot: true }, LABEL_HUNIAN[r.hunian]) },
      { key: 'penghuni', label: 'Penghuni', className: 'right', sort: (r) => r.penghuni, render: (r) => createElement('span', { className: 'num' }, r.penghuni) },
      { key: 'tarif', label: 'Tarif IPL', className: 'right', sort: (r) => r.tarif_ipl ?? tarifStandar,
        render: (r) => (r.tarif_ipl != null
          ? createElement('span', { className: 'money' }, rupiah(r.tarif_ipl))
          : createElement('span', { className: 'muted' }, `Standar ${rupiah(tarifStandar)}`)) },
    ],

    tambah: { label: 'Tambah rumah', bisa: kelola },
    ubah: { bisa: () => kelola },
    hapus: kelola ? { dampak: 'Semua tagihan IPL rumah ini ikut terhapus.' } : undefined,

    form: {
      judul: (r) => (r ? `Ubah rumah ${kodeRumah(r)}` : 'Tambah rumah'),
      awal: (url) => ({ blok: url.get('blok') || '', nomor: '', status: 'dihuni', tarif_ipl: '' }),
      dari: (r) => ({ blok: r.blok || '', nomor: r.nomor || '', status: r.status, tarif_ipl: r.tarif_ipl ?? '' }),
      ke: (v, r) => ({ blok: v.blok, nomor: v.nomor, status: v.status, tarif_ipl: v.tarif_ipl, catatan: r?.catatan || null }),
      sukses: () => 'Rumah disimpan',
      fields: [
        { key: 'blok', label: 'Blok', type: 'select', placeholder: 'Pilih', wajib: true, pesanWajib: 'Pilih blok', options: blok.map((b) => ({ value: b.kode, label: b.nama })) },
        { key: 'nomor', label: 'Nomor', wajib: true, maxLength: 10, placeholder: 'Contoh: 3/5',
          validasi: (v) => (POLA_NOMOR_RUMAH.test(v.trim()) ? null : 'Nomor rumah: angka/huruf, boleh dengan / . - (mis. 3/5)'),
          ubah: (v) => String(v || '').trim().toUpperCase() },
        { key: 'status', label: 'Status', type: 'select', span: 2, options: [{ value: 'dihuni', label: 'Dihuni (ditagih IPL)' }, { value: 'kosong', label: 'Kosong (tidak ditagih)' }] },
        { key: 'tarif_ipl', label: 'Tarif IPL khusus', type: 'number', span: 2, opsional: true, min: 0,
          hint: `Kosongkan untuk memakai tarif standar ${rupiah(tarifStandar)}`,
          validasi: (v) => (Number(v) >= 0 ? null : 'Tarif tidak boleh negatif'),
          ubah: (v) => (v === '' || v == null ? null : Number(v)) },
      ],
    },

    ekspor: {
      nama: 'data-rumah',
      kolom: [
        { key: 'kode', label: 'rumah', nilai: kodeRumah },
        { key: 'blok', label: 'blok' },
        { key: 'nomor', label: 'nomor' },
        { key: 'status', label: 'status' },
        { key: 'hunian', label: 'hunian', nilai: (r) => LABEL_HUNIAN[r.hunian] },
        { key: 'penghuni', label: 'penghuni' },
        { key: 'tarif_ipl', label: 'tarif_ipl_khusus', nilai: (r) => (r.tarif_ipl ?? '') },
        { key: 'tarif_berlaku', label: 'tarif_berlaku', nilai: (r) => r.tarif_ipl ?? tarifStandar },
        { key: 'catatan', label: 'catatan' },
      ],
    },
    ringkasan: (rows) => {
      const n = (h) => rows.filter((r) => r.hunian === h).length;
      return `${rows.length - n('kosong')} dihuni · ${n('kosong')} kosong · ${n('milik_sendiri')} milik sendiri · ${n('kontrak')} kontrak · ${n('belum')} belum diisi`;
    },
    kosong: { icon: Building2, title: 'Belum ada rumah', text: 'Tambahkan manual atau setujui anggota baru.' },
  };
}
