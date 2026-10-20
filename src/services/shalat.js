/** Jadwal shalat gratis dari Aladhan (metode Kementerian Agama RI, tanpa kunci API). Disimpan per hari & lokasi di perangkat. */
const NAMA = [['Fajr', 'Subuh'], ['Dhuhr', 'Dzuhur'], ['Asr', 'Ashar'], ['Maghrib', 'Maghrib'], ['Isha', 'Isya']];

const kunciHari = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function jadwalShalat(lat, lon, tgl = new Date()) {
  if (lat == null || lon == null) return null;
  const kunci = `shalat:${kunciHari(tgl)}:${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}`;
  try { const c = JSON.parse(localStorage.getItem(kunci) || 'null'); if (c) return c; } catch { /* abaikan */ }
  const [y, m, d] = kunciHari(tgl).split('-');
  const r = await fetch(`https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${lat}&longitude=${lon}&method=20`);
  if (!r.ok) throw new Error('Jadwal shalat tidak dapat dimuat');
  const j = await r.json();
  const t = j?.data?.timings;
  if (!t) throw new Error('Jadwal shalat tidak tersedia');
  const waktu = NAMA.map(([k, label]) => {
    const [jam, menit] = String(t[k] || '').match(/\d{1,2}:\d{2}/)?.[0].split(':').map(Number) || [];
    return { label, jam, menit, teks: jam == null ? '--:--' : `${String(jam).padStart(2, '0')}:${String(menit).padStart(2, '0')}` };
  }).filter((w) => w.jam != null);
  if (!waktu.length) throw new Error('Jadwal shalat tidak tersedia');
  const hasil = { waktu, zona: j.data?.meta?.timezone || '' };
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k?.startsWith('shalat:') && k !== kunci) localStorage.removeItem(k); }
    localStorage.setItem(kunci, JSON.stringify(hasil));
  } catch { /* abaikan */ }
  return hasil;
}
