const TIPE = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_UPLOAD = 5 * 1024 * 1024; // file asli maks 5 MB, dikompres sebelum diunggah

/** Validasi dan kompres foto di perangkat agar hemat kuota penyimpanan gratis. */
export async function compressImage(file, { maxSize = 1280, quality = 0.8, aspect, fokusY = 0.38 } = {}) {
  if (!file) throw new Error('File belum dipilih');
  if (file.type === 'application/pdf') {
    if (file.size > 3 * 1024 * 1024) throw new Error('Ukuran PDF maksimal 3 MB');
    return file;
  }
  if (!TIPE.includes(file.type)) throw new Error('Gunakan foto JPG, PNG, atau WEBP');
  if (file.size > MAX_UPLOAD) throw new Error('Ukuran foto maksimal 5 MB');
  const bitmap = await loadImage(file);
  // aspect (lebar/tinggi), mis. 3/4: potong dari tengah, sedikit condong ke atas agar wajah tidak terpotong
  let sx = 0; let sy = 0; let sw = bitmap.width; let sh = bitmap.height;
  if (aspect) {
    if (sw / sh > aspect) { sw = Math.round(sh * aspect); sx = Math.round((bitmap.width - sw) / 2); }
    else { sh = Math.round(sw / aspect); sy = Math.round((bitmap.height - sh) * fokusY); }
  }
  const scale = Math.min(1, maxSize / Math.max(sw, sh));
  const w = Math.round(sw * scale);
  const h = Math.round(sh * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', quality));
  if (!blob) return file;
  return new File([blob], (file.name || 'foto').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
}

function loadImage(file) {
  if ('createImageBitmap' in window) return createImageBitmap(file);
  return new Promise((ok, no) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => no(new Error('Foto tidak bisa dibaca'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Rapikan tautan foto: wajib https, tautan berbagi Google Drive / Dropbox diubah
 * menjadi tautan gambar langsung. Melempar Error bila tidak valid.
 */
export function normalisasiLinkFoto(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  if (/^http:\/\//i.test(s)) s = `https://${s.slice(7)}`;
  if (!/^https:\/\/[^\s]+$/i.test(s)) throw new Error('Tautan foto tidak valid. Tempel alamat gambar yang diawali https://');
  if (s.length > 480) throw new Error('Tautan foto terlalu panjang (maks. 480 karakter)');
  let u;
  try { u = new URL(s); } catch { throw new Error('Tautan foto tidak valid'); }
  if (u.hostname === 'drive.google.com') {
    const id = (u.pathname.match(/\/file\/d\/([\w-]+)/) || [])[1] || u.searchParams.get('id');
    if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
  }
  if (/(^|\.)dropbox\.com$/.test(u.hostname) && u.searchParams.get('dl') === '0') {
    u.searchParams.delete('dl');
    u.searchParams.set('raw', '1');
    return u.toString();
  }
  return s;
}

export const adaUrl = (p) => /^https?:/i.test(p || '');
