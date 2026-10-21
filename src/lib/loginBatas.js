/** Teks lama tunggu: 30 -> "30 detik", 60 -> "1 menit", 300 -> "5 menit", 3600 -> "1 jam". Dibulatkan ke atas. */
export function teksTunggu(detik) {
  const s = Math.max(0, Math.ceil(Number(detik) || 0));
  if (s < 60) return `${s} detik`;
  if (s < 3600) return `${Math.ceil(s / 60)} menit`;
  return `${Math.ceil(s / 3600)} jam`;
}

/** Hitung mundur untuk tampilan: 75 -> "1:15", 9 -> "0:09". */
export function jamHitungMundur(detik) {
  const s = Math.max(0, Math.ceil(Number(detik) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const pesanTunda = (detik) => `Terlalu banyak percobaan salah. Coba lagi dalam ${teksTunggu(detik)}.`;

/** Galat khusus: login sedang ditunda. `tunggu` = sisa detik. */
export class LoginDitunda extends Error {
  constructor(tunggu) {
    super(pesanTunda(tunggu));
    this.name = 'LoginDitunda';
    this.tunggu = Math.max(1, Math.ceil(Number(tunggu) || 0));
  }
}

/** Pesan salah PIN dengan sisa percobaan, mis. "Nomor HP atau PIN salah. Sisa 2 percobaan sebelum login ditunda." */
export function pesanSalahPin(sisa) {
  const n = Number(sisa);
  if (Number.isFinite(n) && n > 0 && n <= 3) return `Nomor HP atau PIN salah. Sisa ${n} percobaan sebelum login ditunda sementara.`;
  return 'Nomor HP atau PIN salah.';
}
