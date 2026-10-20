import { buatLayanan } from './_crud';

// `kode` adalah kolom turunan di database (blok + nomor), jadi tidak ikut dikirim saat simpan.
const rumah = buatLayanan({ tabel: 'rumah', urut: ['blok', 'nomor'], buang: ['kode'] });

export const daftarRumah = rumah.daftar;
export const simpanRumah = rumah.simpan;
export const hapusRumah = rumah.hapus;
