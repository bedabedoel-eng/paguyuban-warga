// Mock @supabase/supabase-js untuk pengujian tampilan. Hanya dipakai lewat tests/vite.mock.config.js.
import * as F from './fixtures.js';

const ROLES = {
  warga: { uid: 'u-warga', hak: {} },
  ketua: { uid: 'u-ketua', hak: { pengurus: true, ketua: true, bendahara: true, pimpinan: true, peran: ['ketua'], kelola_anggota: true, kelola_info: true, kelola_laporan: true, kelola_dokumen: true, kelola_pengurus: true, setujui_kas: true, lihat_kas_detail: true } },
  wakil: { uid: 'u-wakil', hak: { pengurus: true, pimpinan: true, peran: ['wakil_ketua'], kelola_anggota: true, kelola_info: true, kelola_laporan: true, kelola_dokumen: true, lihat_kas_detail: true } },
  sekretaris: { uid: 'u-sekretaris', hak: { pengurus: true, sekretaris: true, peran: ['sekretaris'], kelola_anggota: true, kelola_info: true, kelola_dokumen: true } },
  bendahara: { uid: 'u-bendahara', hak: { pengurus: true, bendahara: true, peran: ['bendahara'], lihat_kas_detail: true } },
  humas: { uid: 'u-humas', hak: { pengurus: true, humas: true, wilayah: ['g-zamrud'], peran: ['humas'], kelola_info: true, kelola_laporan: true } },
  admin: { uid: 'u-admin', hak: { pengurus: true, admin: true, ketua: true, bendahara: true, pimpinan: true, kelola_anggota: true, kelola_info: true, kelola_laporan: true, kelola_dokumen: true, kelola_pengurus: true, setujui_kas: true, lihat_kas_detail: true } },
};
const qs = new URLSearchParams(location.search);
if (qs.get('as')) localStorage.setItem('mock_role', qs.get('as'));
if (qs.get('logout')) localStorage.removeItem('mock_role');
const roleName = () => localStorage.getItem('mock_role');
const role = () => ROLES[roleName()] || null;
const uid = () => role()?.uid;
const me = () => F.WARGA.find((w) => w.id === uid());

const TABLES = {
  pengaturan: [F.PENGATURAN], blok: F.BLOK, gang: F.GANG, warga: F.WARGA, warga_kontak: F.KONTAK, pengurus: F.PENGURUS, rumah: F.RUMAH,
  tagihan_ipl: F.TAGIHAN, pembayaran_ipl: F.PEMBAYARAN, transaksi_kas: F.KAS, pengumuman: F.PENGUMUMAN, kegiatan: F.KEGIATAN,
  laporan: F.LAPORAN, notifikasi: F.NOTIF, aktivitas: F.AKTIVITAS, dokumen: F.DOKUMEN, kontak_darurat: F.DARURAT,
};
// Data contoh log audit (dibuat dari transaksi manual pertama supaya tampil nyata)
const k0 = F.KAS.find((k) => k.sumber === 'manual') || F.KAS[0];
const AUDIT = [
  { id: 3, waktu: new Date(Date.now() - 3600e3).toISOString(), pelaku_id: 'u-bendahara', pelaku_nama: 'Bendahara', tabel: 'transaksi_kas', aksi: 'DELETE', baris_id: 'x-hapus', sebelum: { ...k0, id: 'x-hapus', keterangan: 'Beli lampu taman (salah input)', sumber: 'manual' }, sesudah: null },
  { id: 2, waktu: new Date(Date.now() - 86400e3).toISOString(), pelaku_id: 'u-bendahara', pelaku_nama: 'Bendahara', tabel: 'transaksi_kas', aksi: 'UPDATE', baris_id: k0.id, sebelum: k0, sesudah: { ...k0, jumlah: k0.jumlah + 5000 } },
  { id: 1, waktu: new Date(Date.now() - 2 * 86400e3).toISOString(), pelaku_id: 'u-bendahara', pelaku_nama: 'Bendahara', tabel: 'transaksi_kas', aksi: 'INSERT', baris_id: k0.id, sebelum: null, sesudah: k0 },
];
TABLES.audit_log = AUDIT;
// Polling contoh (state di memori; berubah saat memberi suara)
const hariLagi = (n) => new Date(Date.now() + n * 86400e3).toISOString();
const POLLS = [
  { id: 'pl-1', judul: 'Setujukah iuran keamanan naik Rp 10.000 mulai Januari?', deskripsi: 'Untuk menambah honor dua petugas keamanan malam.', blok: null, gang_id: null, pilih_banyak: false, per_rumah: true, tutup_at: hariLagi(3), ditutup_at: null, created_at: hariLagi(-1), pembuat: 'Hendra Wijaya', selesai: false, sudah_memilih: false, hak_suara: 20, pemilih: 8, opsi: [['Setuju', 5], ['Tidak setuju', 2], ['Abstain', 1]] },
  { id: 'pl-2', judul: 'Kegiatan 17 Agustus', deskripsi: null, blok: null, gang_id: null, pilih_banyak: true, per_rumah: false, tutup_at: hariLagi(-10), ditutup_at: null, created_at: hariLagi(-20), pembuat: 'Hendra Wijaya', selesai: true, sudah_memilih: true, hak_suara: 42, pemilih: 30, opsi: [['Lomba anak', 24], ['Jalan sehat', 18], ['Bazar', 11]] },
].map((p) => ({ ...p, opsi: p.opsi.map(([teks, jumlah], i) => ({ id: `${p.id}-o${i}`, teks, jumlah })) }));
const delay = (v) => new Promise((r) => setTimeout(() => r(v), 60));

// Pembatasan baris sederhana meniru RLS untuk tampilan per peran
function rls(table, rows) {
  const r = roleName(); const h = role()?.hak || {}; const m = me();
  if (table === 'warga' && !h.kelola_anggota) return rows.filter((w) => w.status === 'aktif' || (h.humas && h.wilayah.includes(w.gang_id)) || w.id === uid());
  if (table === 'laporan') return h.pimpinan ? rows : h.humas ? rows.filter((l) => h.wilayah.includes(l.pelapor.gang_id) || l.pelapor_id === uid()) : rows.filter((l) => l.pelapor_id === uid());
  if (table === 'tagihan_ipl' && !h.bendahara) return rows.filter((t) => t.rumah_id === m?.rumah_id);
  if (table === 'transaksi_kas' && !h.lihat_kas_detail) return rows.filter((t) => t.status === 'disetujui');
  if (table === 'audit_log' && !h.lihat_kas_detail) return [];
  if (table === 'dokumen' && !h.pengurus) return rows.filter((d) => d.publik);
  if ((table === 'pengumuman' || table === 'kegiatan') && !h.kelola_anggota) return rows.filter((x) => ((!x.blok || x.blok === m?.blok) && (!x.gang_id || x.gang_id === m?.gang_id)) || h.wilayah?.includes(x.gang_id));
  if (table === 'pembayaran_ipl' && !h.bendahara) return [];
  void r;
  return rows;
}

class Q {
  constructor(table) { this.t = table; this.f = []; this.o = []; this.lim = null; this.mode = 'select'; this.one = false; this.maybe = false; this.head = false; this.payload = null; this.rng = null; this.cnt = false; }
  select(_c, opts) { if (this.mode === 'select') this.mode = 'select'; this.ret = true; if (opts?.head) this.head = true; if (opts?.count) this.cnt = true; return this; }
  eq(k, v) { this.f.push((r) => String(r[k]) === String(v)); return this; }
  neq(k, v) { this.f.push((r) => r[k] !== v); return this; }
  in(k, v) { this.f.push((r) => v.includes(r[k])); return this; }
  is(k, v) { this.f.push((r) => (r[k] ?? null) === v); return this; }
  ilike(k, v) { const s = v.replace(/%/g, '').trim().toLowerCase(); this.f.push((r) => String(r[k] || '').toLowerCase().includes(s)); return this; }
  gte(k, v) { this.f.push((r) => r[k] >= v); return this; }
  gt(k, v) { this.f.push((r) => r[k] > v); return this; }
  lte(k, v) { this.f.push((r) => r[k] <= v); return this; }
  lt(k, v) { this.f.push((r) => r[k] < v); return this; }
  order(k, { ascending = true } = {}) { this.o.push([k, ascending]); return this; }
  not(k, op, v) { if (op === 'is') this.f.push((r) => (r[k] ?? null) !== v); else this.f.push((r) => r[k] !== v); return this; }
  range(a, b) { this.rng = [a, b]; return this; }
  limit(n) { this.lim = n; return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; this.maybe = true; return this; }
  insert(p) { this.mode = 'insert'; this.payload = p; return this; }
  update(p) { this.mode = 'update'; this.payload = p; return this; }
  upsert(p) { this.mode = 'insert'; this.payload = p; return this; }
  delete() { this.mode = 'delete'; return this; }
  then(res, rej) { return this.run().then(res, rej); }
  async run() {
    if (this.mode === 'insert') { const row = { id: `new-${Date.now()}`, status: this.t === 'transaksi_kas' && this.payload.jenis === 'pengeluaran' && this.payload.jumlah >= 1000000 && !role()?.hak.setujui_kas ? 'menunggu' : 'disetujui', ...this.payload, created_at: new Date().toISOString() }; return delay({ data: this.one ? row : [row], error: null }); }
    if (this.mode === 'update') { const rows = (TABLES[this.t] || []).filter((r) => this.f.every((fn) => fn(r))); const row = { ...(rows[0] || {}), ...this.payload }; return delay({ data: this.one ? row : [row], error: null }); }
    if (this.mode === 'delete') return delay({ data: this.ret ? [{ id: 'dihapus' }] : null, error: null });
    let rows = rls(this.t, [...(TABLES[this.t] || [])]).filter((r) => this.f.every((fn) => fn(r)));
    for (const [k, asc] of [...this.o].reverse()) rows.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1));
    if (this.head) return delay({ data: null, count: rows.length, error: null });
    const total = rows.length;
    if (this.rng) rows = rows.slice(this.rng[0], this.rng[1] + 1);
    if (this.lim) rows = rows.slice(0, this.lim);
    const cnt = this.cnt ? { count: total } : {};
    if (this.one) { if (!rows.length && !this.maybe) return delay({ data: null, error: { message: 'Data tidak ditemukan', code: 'PGRST116' } }); return delay({ data: rows[0] || null, error: null }); }
    return delay({ data: rows, ...cnt, error: null });
  }
}

function rpc(name, params) {
  const h = role()?.hak || {};
  const aktif = F.WARGA.filter((w) => w.status === 'aktif');
  const per = F.TAGIHAN.reduce((a, t) => (t.periode > a ? t.periode : a), '');
  const tg = F.TAGIHAN.filter((t) => t.periode === per);
  const disetujui = F.KAS.filter((k) => k.status === 'disetujui');
  const saldo = disetujui.reduce((a, k) => a + (k.jenis === 'pemasukan' ? k.jumlah : -k.jumlah), 0);
  const menunggu = F.KAS.filter((k) => k.status === 'menunggu');
  const R = {
    hak_saya: () => ({ aktif: true, pengurus: false, admin: false, bendahara: false, ketua: false, pimpinan: false, sekretaris: false, humas: false, wilayah: [], peran: [], kelola_anggota: false, kelola_info: false, kelola_laporan: false, kelola_dokumen: false, kelola_pengurus: false, setujui_kas: false, lihat_kas_detail: false, ...h }),
    statistik_dashboard: () => ({
      total_warga: aktif.length, kepala_keluarga: aktif.filter((w) => w.kepala_keluarga).length, pengurus_aktif: 7, pengurus_total: 7,
      total_rumah: F.RUMAH.length, rumah_dihuni: F.RUMAH.filter((r) => r.status === 'dihuni').length, periode_ipl: per,
      ipl_total_tagihan: tg.reduce((a, t) => a + t.nominal, 0), ipl_lunas: tg.filter((t) => t.status === 'lunas').length, ipl_belum: tg.filter((t) => t.status !== 'lunas').length,
      saldo_kas: saldo,
      anggota_menunggu: h.kelola_anggota ? 2 : h.humas ? 1 : null,
      pembayaran_menunggu: h.bendahara ? F.PEMBAYARAN.length : null,
      laporan_baru: h.pimpinan ? 3 : h.humas ? 2 : null,
      pengeluaran_menunggu: h.lihat_kas_detail ? menunggu.length : null,
      pengeluaran_menunggu_nominal: h.lihat_kas_detail ? menunggu.reduce((a, k) => a + k.jumlah, 0) : null,
      dokumen_bulan_ini: h.kelola_dokumen ? 2 : null,
      wilayah: h.humas ? h.wilayah.map((id) => { const g = F.GANG.find((x) => x.id === id); return { gang: id, nama: g.nama, blok: g.blok, warga: aktif.filter((w) => w.gang_id === id).length, rumah: aktif.filter((w) => w.gang_id === id).length, menunggu: 1, laporan_aktif: 2, ipl_lunas: 2, ipl_belum: 3 }; }) : null,
    }),
    statistik_ipl_bulanan: () => Array.from({ length: 12 }, (_, i) => ({ bulan: i + 1, lunas: i <= new Date().getMonth() ? 9 + (i % 4) : 0, belum: i <= new Date().getMonth() ? 4 - (i % 3) : 0 })),
    arus_kas_bulanan: () => Array.from({ length: 12 }, (_, i) => ({ bulan: i + 1, pemasukan: i <= new Date().getMonth() ? 900000 + (i % 3) * 250000 : 0, pengeluaran: i <= new Date().getMonth() ? 650000 + (i % 4) * 300000 : 0 })),
    ringkasan_kas: () => ({ saldo, pemasukan_bulan: 1575000, pengeluaran_bulan: 920000, menunggu_jumlah: h.lihat_kas_detail ? menunggu.length : null, menunggu_nominal: h.lihat_kas_detail ? menunggu.reduce((a, k) => a + k.jumlah, 0) : null }),
    kontak_warga: () => { const k = F.KONTAK.find((x) => x.warga_id === params.p_id); return [{ nomor_hp: k?.tampilkan_hp || h.pengurus ? k?.nomor_hp : null, email: k?.email }]; },
    buat_tagihan_ipl: () => 0,
    tunggakan_ipl: () => {
      if (!h.bendahara) return [];
      const hari = new Date().toISOString().slice(0, 10);
      const per = {};
      F.TAGIHAN.filter((t) => t.status === 'belum_bayar' && (t.jatuh_tempo || t.periode) < hari).forEach((t) => { (per[t.rumah_id] ||= []).push(t); });
      return Object.entries(per).map(([rid, ts]) => {
        const r = F.RUMAH.find((x) => x.id === rid); const w = F.WARGA.find((x) => x.rumah_id === rid && x.status === 'aktif'); const k = F.KONTAK.find((x) => x.warga_id === w?.id);
        const ps = ts.map((t) => t.periode).sort();
        return { rumah_id: rid, kode: r.kode, blok: r.blok, gang_id: w?.gang_id || null, gang_nama: w?.gang_id ? (F.GANG.find((g) => g.id === w.gang_id)?.nama || null) : null, jumlah_bulan: ts.length, total: ts.reduce((a, t) => a + t.nominal, 0), periode_tertua: ps[0], periode_terbaru: ps[ps.length - 1], nama: w?.nama || null, nomor_hp: k?.nomor_hp || null };
      }).sort((a, b) => b.total - a.total);
    },
    daftar_polling: () => POLLS.map((p) => {
      const lihat = p.selesai || p.sudah_memilih || !!h.kelola_info;
      return { ...p, bisa_kelola: !!h.ketua, hasil_terlihat: lihat, pemilih: lihat ? p.pemilih : null, opsi: p.opsi.map((o) => ({ ...o, jumlah: lihat ? o.jumlah : null })) };
    }),
    beri_suara: () => {
      const p = POLLS.find((x) => x.id === params.p_polling);
      if (p && !p.sudah_memilih) { p.sudah_memilih = true; p.pemilih += 1; p.opsi.forEach((o) => { if (params.p_opsi.includes(o.id)) o.jumlah += 1; }); }
      return null;
    },
    buat_polling: () => 'pl-baru',
    tutup_polling: () => { const p = POLLS.find((x) => x.id === params.p_id); if (p) p.selesai = true; return null; },
    hapus_polling: () => null,
    periode_ipl_tersedia: () => [...new Set(F.TAGIHAN.map((t) => t.periode))].sort().reverse(),
    ringkasan_transaksi: () => {
      const rs = rls('transaksi_kas', [...F.KAS]).filter((k) => (!params.p_jenis || k.jenis === params.p_jenis) && (!params.p_dari || k.tanggal >= params.p_dari) && (!params.p_sampai || k.tanggal <= params.p_sampai));
      const sum = (j) => rs.filter((k) => k.jenis === j && k.status === 'disetujui').reduce((a, k) => a + k.jumlah, 0);
      return { jumlah: rs.length, pemasukan: sum('pemasukan'), pengeluaran: sum('pengeluaran') };
    },
    pulihkan_transaksi: () => 'pulih-1',
    cek_batas_login: () => ({ tunggu: 0, sisa: 5 }),
    // Nomor berakhiran 99999 meniru akun yang sedang ditunda (untuk memeriksa hitung mundur di halaman masuk)
    catat_login_gagal: () => (String(params.p_hp || '').endsWith('99999') ? { tunggu: 45, sisa: 0 } : { tunggu: 0, sisa: 4 }),
    catat_login_berhasil: () => null,
    buka_kunci_login: () => null,
    status_penegakan_login: () => ({ hook_aktif: false, terakhir: null }),
    status_tagihan_otomatis: () => ({ saklar: true, cron_ada: false, jadwal_ada: false, jadwal_aktif: false, terakhir_jalan: null, terakhir_status: null, tagihan_bulan_ini: 0, siap: false, masalah: 'pg_cron belum aktif (contoh tampilan mock).', perlu_tindakan: true }),
    // Tiruan import_warga: PIN acak per akun, hanya untuk tampilan (tidak menyimpan apa pun)
    import_warga: () => {
      const baris = Array.isArray(params.p_rows) ? params.p_rows : [];
      return { dibuat: baris.length, dilewati: [], akun: baris.map((r, i) => ({ baris: i + 1, nama: r.nama, hp: String(r.hp || ''), pin: String(100000 + Math.floor(Math.random() * 900000)) })) };
    },
    // Tiruan perbarui_warga_massal (SQL 20): menerapkan patch ke data contoh di memori agar tampilan ikut berubah
    perbarui_warga_massal: () => {
      const baris = Array.isArray(params.p_rows) ? params.p_rows : [];
      const dilewati = [];
      let diubah = 0;
      baris.forEach((r, i) => {
        const w = F.WARGA.find((x) => x.id === r.id);
        const k = F.KONTAK.find((x) => x.warga_id === r.id);
        if (!w) { dilewati.push({ baris: i + 1, nama: r.nama || '', alasan: 'Warga tidak ditemukan (id mungkin sudah dihapus)' }); return; }
        if (!h.admin && w.role === 'admin') { dilewati.push({ baris: i + 1, nama: w.nama, alasan: 'Data admin hanya dapat diubah admin' }); return; }
        for (const kol of ['nama', 'blok', 'no_rumah', 'pekerjaan', 'status']) if (kol in r) w[kol] = r[kol] || null;
        if ('gang' in r) w.gang_id = F.GANG.find((g) => g.nama === r.gang)?.id || null;
        if ('kepala_keluarga' in r) w.kepala_keluarga = r.kepala_keluarga === 'ya';
        if ('foto' in r && r.foto) w.foto_path = r.foto;
        if (k) {
          for (const kol of ['status_pernikahan', 'status_hunian']) if (kol in r) k[kol] = r[kol] || null;
          if ('jumlah_anak' in r) k.jumlah_anak = r.jumlah_anak === '' ? null : Number(r.jumlah_anak);
          if (!k.status_pernikahan || k.status_pernikahan === 'belum_menikah') k.jumlah_anak = null;
          if (r.hp) k.nomor_hp = String(r.hp).replace(/\D/g, '').replace(/^0/, '62');
        }
        diubah += 1;
      });
      return { diubah, dilewati };
    },
    ubah_hp_warga: () => null,
  };
  const fn = R[name];
  return delay({ data: fn ? fn() : null, error: null });
}

const listeners = new Set();
const session = () => (uid() ? { access_token: 'mock', user: { id: uid(), app_metadata: { provider: 'email' } } } : null);
const auth = {
  getSession: async () => ({ data: { session: session() } }),
  onAuthStateChange: (cb) => { listeners.add(cb); return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }; },
  signInWithPassword: async ({ email }) => {
    const hp = email.split('@')[0];
    const k = F.KONTAK.find((x) => x.nomor_hp === hp);
    const nm = Object.entries(ROLES).find(([, v]) => v.uid === k?.warga_id)?.[0];
    if (!nm) return { data: null, error: { message: 'Invalid login credentials' } };
    localStorage.setItem('mock_role', nm);
    listeners.forEach((cb) => cb('SIGNED_IN', session()));
    return { data: { session: session() }, error: null };
  },
  signUp: async () => ({ data: { session: null }, error: { message: 'Email not confirmed' } }),
  signOut: async () => { localStorage.removeItem('mock_role'); listeners.forEach((cb) => cb('SIGNED_OUT', null)); return { error: null }; },
  signInWithOAuth: async () => ({ error: null }),
};

const PH = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#dfe8e3"/><text x="300" y="210" font-family="sans-serif" font-size="28" fill="#5b7064" text-anchor="middle">Bukti transfer</text></svg>');
// Foto potret 3:4 palsu untuk path contoh/foto-N.jpg
const potret = (path) => {
  const n = Number((path.match(/foto-(\d+)/) || [])[1] || 0);
  const bg = ['#cfe3d8', '#e6d9bd', '#c9d6ea', '#e3cfd9', '#d5e0c6', '#d9d2ea'][n % 6];
  const kulit = ['#e0b690', '#c68d62', '#f0c8a4', '#a8714a'][n % 4];
  const baju = ['#127a55', '#1d5fa8', '#8a6413', '#6a3dbd', '#a8460b', '#0e7490'][n % 6];
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="${bg}"/><ellipse cx="300" cy="840" rx="250" ry="330" fill="${baju}"/><circle cx="300" cy="330" r="118" fill="${kulit}"/><path d="M178 320 Q190 190 300 190 Q410 190 422 320 Q380 250 300 250 Q220 250 178 320Z" fill="#2b2118"/></svg>`);
};
const storage = { from: () => ({ createSignedUrl: async (path) => ({ data: { signedUrl: /foto-\d+/.test(path || '') ? potret(path) : PH }, error: null }), getPublicUrl: () => ({ data: { publicUrl: PH } }), upload: async () => ({ error: null }), remove: async () => ({ error: null }) }) };

export function createClient() {
  return {
    auth, storage,
    from: (t) => new Q(t),
    rpc: (n, p) => rpc(n, p || {}),
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: () => {},
  };
}
