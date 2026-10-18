// Mock @supabase/supabase-js untuk pengujian tampilan. Hanya dipakai lewat tests/vite.mock.config.js.
import * as F from './fixtures.js';

const ROLES = {
  warga: { uid: 'u-warga', hak: {} },
  ketua: { uid: 'u-ketua', hak: { pengurus: true, ketua: true, bendahara: true, pimpinan: true, peran: ['ketua'], kelola_anggota: true, kelola_info: true, kelola_laporan: true, kelola_dokumen: true, kelola_pengurus: true, setujui_kas: true, lihat_kas_detail: true } },
  wakil: { uid: 'u-wakil', hak: { pengurus: true, pimpinan: true, peran: ['wakil_ketua'], kelola_anggota: true, kelola_info: true, kelola_laporan: true, kelola_dokumen: true, lihat_kas_detail: true } },
  sekretaris: { uid: 'u-sekretaris', hak: { pengurus: true, sekretaris: true, peran: ['sekretaris'], kelola_anggota: true, kelola_info: true, kelola_dokumen: true } },
  bendahara: { uid: 'u-bendahara', hak: { pengurus: true, bendahara: true, peran: ['bendahara'], lihat_kas_detail: true } },
  humas: { uid: 'u-humas', hak: { pengurus: true, humas: true, wilayah: ['A'], peran: ['humas'], kelola_info: true, kelola_laporan: true } },
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
  pengaturan: [F.PENGATURAN], blok: F.BLOK, warga: F.WARGA, warga_kontak: F.KONTAK, pengurus: F.PENGURUS, rumah: F.RUMAH,
  tagihan_ipl: F.TAGIHAN, pembayaran_ipl: F.PEMBAYARAN, transaksi_kas: F.KAS, pengumuman: F.PENGUMUMAN, kegiatan: F.KEGIATAN,
  laporan: F.LAPORAN, notifikasi: F.NOTIF, aktivitas: F.AKTIVITAS, dokumen: F.DOKUMEN, kontak_darurat: F.DARURAT,
};
const delay = (v) => new Promise((r) => setTimeout(() => r(v), 60));

// Pembatasan baris sederhana meniru RLS untuk tampilan per peran
function rls(table, rows) {
  const r = roleName(); const h = role()?.hak || {}; const m = me();
  if (table === 'warga' && !h.kelola_anggota) return rows.filter((w) => w.status === 'aktif' || (h.humas && h.wilayah.includes(w.blok)) || w.id === uid());
  if (table === 'laporan') return h.pimpinan ? rows : h.humas ? rows.filter((l) => h.wilayah.includes(l.pelapor.blok)) : rows.filter((l) => l.pelapor_id === uid());
  if (table === 'tagihan_ipl' && !h.bendahara) return rows.filter((t) => t.rumah_id === m?.rumah_id);
  if (table === 'transaksi_kas' && !h.lihat_kas_detail) return rows.filter((t) => t.status === 'disetujui');
  if (table === 'dokumen' && !h.pengurus) return rows.filter((d) => d.publik);
  if ((table === 'pengumuman' || table === 'kegiatan') && !h.kelola_anggota) return rows.filter((x) => !x.blok || x.blok === m?.blok || h.wilayah?.includes(x.blok));
  if (table === 'pembayaran_ipl' && !h.bendahara) return [];
  void r;
  return rows;
}

class Q {
  constructor(table) { this.t = table; this.f = []; this.o = []; this.lim = null; this.mode = 'select'; this.one = false; this.maybe = false; this.head = false; this.payload = null; }
  select(_c, opts) { if (this.mode === 'select') this.mode = 'select'; this.ret = true; if (opts?.head) this.head = true; return this; }
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
    if (this.mode === 'delete') return delay({ data: null, error: null });
    let rows = rls(this.t, [...(TABLES[this.t] || [])]).filter((r) => this.f.every((fn) => fn(r)));
    for (const [k, asc] of [...this.o].reverse()) rows.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1));
    if (this.head) return delay({ data: null, count: rows.length, error: null });
    if (this.lim) rows = rows.slice(0, this.lim);
    if (this.one) { if (!rows.length && !this.maybe) return delay({ data: null, error: { message: 'Data tidak ditemukan', code: 'PGRST116' } }); return delay({ data: rows[0] || null, error: null }); }
    return delay({ data: rows, error: null });
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
      wilayah: h.humas ? h.wilayah.map((b) => ({ blok: b, warga: aktif.filter((w) => w.blok === b).length, rumah: F.RUMAH.filter((r) => r.blok === b).length, menunggu: 1, laporan_aktif: 2, ipl_lunas: 2, ipl_belum: 3 })) : null,
    }),
    statistik_ipl_bulanan: () => Array.from({ length: 12 }, (_, i) => ({ bulan: i + 1, lunas: i <= new Date().getMonth() ? 9 + (i % 4) : 0, belum: i <= new Date().getMonth() ? 4 - (i % 3) : 0 })),
    arus_kas_bulanan: () => Array.from({ length: 12 }, (_, i) => ({ bulan: i + 1, pemasukan: i <= new Date().getMonth() ? 900000 + (i % 3) * 250000 : 0, pengeluaran: i <= new Date().getMonth() ? 650000 + (i % 4) * 300000 : 0 })),
    ringkasan_kas: () => ({ saldo, pemasukan_bulan: 1575000, pengeluaran_bulan: 920000, menunggu_jumlah: h.lihat_kas_detail ? menunggu.length : null, menunggu_nominal: h.lihat_kas_detail ? menunggu.reduce((a, k) => a + k.jumlah, 0) : null }),
    kontak_warga: () => { const k = F.KONTAK.find((x) => x.warga_id === params.p_id); return [{ nomor_hp: k?.tampilkan_hp || h.pengurus ? k?.nomor_hp : null, email: k?.email }]; },
    buat_tagihan_ipl: () => 0,
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
const storage = { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: PH }, error: null }), getPublicUrl: () => ({ data: { publicUrl: PH } }), upload: async () => ({ error: null }), remove: async () => ({ error: null }) }) };

export function createClient() {
  return {
    auth, storage,
    from: (t) => new Q(t),
    rpc: (n, p) => rpc(n, p || {}),
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: () => {},
  };
}
