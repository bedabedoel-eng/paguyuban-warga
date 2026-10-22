import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandingkanCsv, patchMassal, petaKolomPerbaikan } from '../../src/lib/perbaikanWarga.js';
import { KOLOM_EKSPOR_WARGA } from '../../src/lib/eksporWarga.js';
import { parseCsv, toCsv } from '../../src/lib/csv.js';

const BLOK = ['A', 'B', 'C'];
const GANG = [
  { id: 'g-zamrud', nama: 'Jl. Zamrud', blok: 'C', nomor: '3' },
  { id: 'g-safir', nama: 'Jl. Safir', blok: 'C' },
  { id: 'g-melati', nama: 'Jl. Melati', blok: 'A' },
];
const WARGA = [
  { id: 'u-1', nama: 'Budi Santoso', blok: 'C', no_rumah: '3/5', gang_id: 'g-zamrud', pekerjaan: 'Guru', kepala_keluarga: true, status: 'aktif', role: 'warga', foto_path: 'avatar/x.jpg', bergabung_at: '2025-01-02T00:00:00Z',
    kontak: { nomor_hp: '6281234567890', status_pernikahan: 'menikah', jumlah_anak: 2, status_hunian: 'milik_sendiri' } },
  { id: 'u-2', nama: 'Siti Aminah', blok: 'A', no_rumah: '12', gang_id: 'g-melati', pekerjaan: null, kepala_keluarga: false, status: 'aktif', role: 'warga', foto_path: null, bergabung_at: null,
    kontak: { nomor_hp: '6281298765432', status_pernikahan: null, jumlah_anak: null, status_hunian: null } },
  { id: 'u-adm', nama: 'Yusuf Admin', blok: 'B', no_rumah: '1', gang_id: null, pekerjaan: null, kepala_keluarga: true, status: 'aktif', role: 'admin', foto_path: null,
    kontak: { nomor_hp: '6281300000001' } },
  { id: 'u-tunggu', nama: 'Andi Baru', blok: 'C', no_rumah: '3/14', gang_id: 'g-zamrud', kepala_keluarga: false, status: 'menunggu', role: 'warga',
    kontak: { nomor_hp: '6281300000099' } },
];
const opsi = (o = {}) => ({ warga: WARGA, blokKode: BLOK, gang: GANG, admin: true, uid: 'u-adm', ...o });
const banding = (csv, o) => bandingkanCsv(parseCsv(csv), opsi(o));

test('hasil Ekspor CSV yang diimpor ulang tanpa diubah = semua "sama"', () => {
  const csv = toCsv(WARGA, KOLOM_EKSPOR_WARGA(GANG));
  const { kurang, list, jumlah } = banding(csv);
  assert.deepEqual(kurang, []);
  assert.deepEqual(jumlah, { baru: 0, ubah: 0, sama: 4, galat: 0 }, JSON.stringify(list.map((x) => [x.jenis, x.galat, x.perubahan])));
});

test('ekspor memuat kolom id dan keanggotaan', () => {
  const [header] = parseCsv(toCsv(WARGA.slice(0, 1), KOLOM_EKSPOR_WARGA(GANG)));
  assert.equal(header.at(-1), 'id');
  assert.ok(header.includes('keanggotaan'));
  const idx = petaKolomPerbaikan(header);
  assert.ok(idx.keanggotaan >= 0 && idx.status_pernikahan >= 0 && idx.keanggotaan !== idx.status_pernikahan);
});

test('perbaikan di Excel terbaca sebagai perubahan per kolom', () => {
  const rows = parseCsv(toCsv(WARGA, KOLOM_EKSPOR_WARGA(GANG)));
  const h = rows[0];
  const set = (r, kol, v) => { rows[r][h.indexOf(kol)] = v; };
  set(1, 'jalan', 'Jl. Safir'); set(1, 'status_hunian', 'kontrak'); set(1, 'jumlah_anak', '3');
  set(2, 'pekerjaan', 'Bidan'); set(2, 'status_pernikahan', 'menikah'); set(2, 'jumlah_anak', '1');
  const { list, jumlah } = bandingkanCsv(rows, opsi());
  assert.deepEqual(jumlah, { baru: 0, ubah: 2, sama: 2, galat: 0 });
  assert.deepEqual(list[0].patch, { id: 'u-1', gang: 'Jl. Safir', jumlah_anak: '3', status_hunian: 'kontrak' });
  assert.deepEqual(list[0].perubahan.map((p) => `${p.label}: ${p.lama} -> ${p.baru}`), [
    'Jalan: Jl. Zamrud -> Jl. Safir', 'Jumlah anak: 2 -> 3', 'Rumah ditempati: Milik sendiri -> Kontrak']);
  assert.deepEqual(list[1].patch, { id: 'u-2', pekerjaan: 'Bidan', status_pernikahan: 'menikah', jumlah_anak: '1' });
});

test('berkas sebagian: kolom yang tidak ada tidak diubah', () => {
  const { list, jumlah } = banding('id;status_hunian\nu-1;kontrak\nu-2;milik sendiri\n');
  assert.deepEqual(jumlah, { baru: 0, ubah: 2, sama: 0, galat: 0 });
  assert.deepEqual(list[0].patch, { id: 'u-1', status_hunian: 'kontrak' });
  assert.deepEqual(list[1].patch, { id: 'u-2', status_hunian: 'milik_sendiri' });
});

test('tanpa kolom id: dicocokkan lewat nomor HP; nomor baru jadi akun baru (admin)', () => {
  const { list, jumlah } = banding('nama,hp,blok,no_rumah,pekerjaan\nBudi Santoso,0812-3456-7890,C,3/5,Dosen\nAgus Wijaya,085611112222,A,7,Montir\n');
  assert.deepEqual(jumlah, { baru: 1, ubah: 1, sama: 0, galat: 0 });
  assert.equal(list[0].jenis, 'ubah');
  assert.deepEqual(list[0].patch, { id: 'u-1', pekerjaan: 'Dosen' });
  assert.equal(list[1].jenis, 'baru');
  assert.equal(list[1].buat.hp, '6285611112222');
});

test('selain admin: tidak bisa membuat akun, HP dan foto diabaikan dengan catatan', () => {
  const csv = 'id,nama,hp,foto,pekerjaan\nu-1,Budi Santoso,081299990000,https://contoh.id/b.jpg,Dosen\n,Orang Baru,085611112222,,\n';
  const { list } = banding(csv, { admin: false, uid: 'u-humas' });
  assert.equal(list[0].jenis, 'ubah');
  assert.deepEqual(list[0].patch, { id: 'u-1', pekerjaan: 'Dosen' });
  assert.equal(list[0].catatan.length, 2);
  assert.equal(list[1].jenis, 'galat');
  assert.match(list[1].galat, /Hanya admin/);
});

test('kewenangan wilayah, data admin, dan data diri sendiri', () => {
  const csv = 'id,pekerjaan\nu-1,A\nu-2,B\nu-adm,C\n';
  const { list } = banding(csv, { admin: false, uid: 'u-2', bolehUbah: (w) => w.gang_id === 'g-zamrud' || w.id === 'u-2' || w.id === 'u-adm' });
  assert.equal(list[0].jenis, 'ubah');
  assert.match(list[1].galat, /diri sendiri/);
  assert.match(list[2].galat, /Data admin/);
  const lain = banding('id,pekerjaan\nu-2,B\n', { admin: false, uid: 'x', bolehUbah: () => false });
  assert.match(lain.list[0].galat, /di luar wilayah/);
});

test('pindah blok: jalan di blok lama dikosongkan otomatis', () => {
  const { list } = banding('id,blok,no_rumah\nu-1,A,9\n');
  assert.equal(list[0].jenis, 'ubah');
  assert.deepEqual(list[0].patch, { id: 'u-1', blok: 'A', no_rumah: '9', gang: '' });
  assert.ok(list[0].catatan.some((c) => /pindah blok/.test(c)));
});

test('alamat ditulis gabungan tetap dipahami', () => {
  const { list } = banding('id,blok,no_rumah\nu-1,C3,5\nu-2,A,A12\n');
  assert.equal(list[0].jenis, 'sama');
  assert.equal(list[1].jenis, 'sama');
});

test('galat per baris: id tidak dikenal, nilai tidak dikenal, nomor HP bentrok, baris ganda', () => {
  const csv = [
    'id,hp,status_hunian,status_pernikahan,keanggotaan,jalan',
    'u-x,,,,,',
    'u-1,,rumah dinas,,,',
    'u-1,,,,,',
    'u-2,081234567890,,,,',
    'u-tunggu,,,,aktif,',
    'u-2,,,,,',
    'u-adm,,,,nonaktif,',
  ].join('\n');
  const { list } = banding(csv);
  assert.match(list[0].galat, /id tidak cocok/);
  assert.match(list[1].galat, /rumah dinas/);
  assert.match(list[2].galat, /baris 3/);
  assert.match(list[3].galat, /sudah dipakai Budi/);
  assert.match(list[4].galat, /Verifikasi anggota/);
  assert.match(list[5].galat, /baris 5/);
  assert.match(list[6].galat, /akun sendiri/);
});

test('jalan harus ada di blok warga', () => {
  const { list } = banding('id,jalan\nu-2,Jl. Zamrud\nu-2x,\n');
  assert.match(list[0].galat, /belum ada di Blok A/);
});

test('belum menikah mengosongkan jumlah anak', () => {
  const { list } = banding('id,status_pernikahan\nu-1,belum menikah\n');
  assert.deepEqual(list[0].patch, { id: 'u-1', status_pernikahan: 'belum_menikah', jumlah_anak: '' });
});

test('berkas tanpa kolom id maupun hp ditolak', () => {
  const { kurang } = banding('nama,blok\nBudi,C\n');
  assert.equal(kurang.length, 1);
});

test('ubah massal: jalan hanya untuk warga di blok jalan itu', () => {
  const { patch, sama, lewat } = patchMassal(WARGA.slice(0, 2), 'gang', 'g-safir', { gang: GANG });
  assert.deepEqual(patch, [{ id: 'u-1', gang: 'Jl. Safir' }]);
  assert.equal(sama.length, 0);
  assert.equal(lewat.length, 1);
  assert.match(lewat[0].alasan, /tidak ada di Blok A/);
});

test('ubah massal: rumah ditempati, kepala keluarga, pekerjaan, kosongkan', () => {
  assert.deepEqual(patchMassal(WARGA.slice(0, 2), 'status_hunian', 'kontrak').patch, [{ id: 'u-1', status_hunian: 'kontrak' }, { id: 'u-2', status_hunian: 'kontrak' }]);
  assert.deepEqual(patchMassal(WARGA.slice(0, 2), 'kepala_keluarga', 'ya').patch, [{ id: 'u-2', kepala_keluarga: 'ya' }]);
  assert.deepEqual(patchMassal(WARGA.slice(0, 2), 'pekerjaan', ' Guru ').sama.map((w) => w.id), ['u-1']);
  assert.deepEqual(patchMassal(WARGA.slice(0, 2), 'gang', '', { gang: GANG }).patch, [{ id: 'u-1', gang: '' }, { id: 'u-2', gang: '' }]);
});

test('nilai berawalan tanda rumus tetap "sama" setelah ekspor-impor', () => {
  const w = [{ ...WARGA[1], pekerjaan: '-Freelance', nama: '@Siti' }];
  const { jumlah } = bandingkanCsv(parseCsv(toCsv(w, KOLOM_EKSPOR_WARGA(GANG))), opsi({ warga: w }));
  assert.equal(jumlah.sama, 1);
});
