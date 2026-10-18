/** Ubah galat Supabase/jaringan menjadi pesan bahasa Indonesia yang ramah. */
export function pesanError(err) {
  if (!err) return '';
  const m = String(err.message || err.error_description || err || '');
  const code = err.code || err.error_code || '';
  if (/Invalid login credentials/i.test(m)) return 'Nomor HP atau kata sandi salah.';
  if (/User already registered|already been registered/i.test(m)) return 'Nomor HP ini sudah terdaftar. Silakan masuk.';
  if (/Email not confirmed/i.test(m)) return 'Akun belum dikonfirmasi. Minta admin menonaktifkan "Confirm email" di Supabase.';
  if (/email_address_invalid|Email address .* is invalid/i.test(m + code)) return 'Domain akun internal ditolak Supabase. Admin perlu mengganti VITE_AUTH_EMAIL_DOMAIN.';
  if (/Password should be at least|weak_password/i.test(m + code)) return 'Kata sandi terlalu lemah (minimal 8 karakter).';
  if (/rate limit|too many/i.test(m) || code === 'over_request_rate_limit') return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.';
  if (/Signups not allowed/i.test(m)) return 'Pendaftaran sedang ditutup oleh admin.';
  if (/provider is not enabled|Unsupported provider/i.test(m)) return 'Login Google belum diaktifkan di Supabase.';
  if (/duplicate key.*nomor_hp|warga_kontak_nomor_hp_key/i.test(m)) return 'Nomor HP sudah dipakai akun lain.';
  if (/duplicate key|23505/.test(m + code)) return 'Data yang sama sudah ada.';
  if (/row-level security|permission denied|not authorized/i.test(m)) return 'Anda tidak memiliki akses untuk tindakan ini.';
  if (/check constraint/i.test(m)) return 'Isian tidak sesuai ketentuan. Periksa kembali.';
  if (/Failed to fetch|NetworkError|Load failed|fetch failed/i.test(m)) return 'Tidak dapat terhubung ke server. Periksa koneksi internet.';
  if (/mime type|invalid_mime_type/i.test(m)) return 'Jenis file tidak didukung. Gunakan JPG, PNG, atau WEBP.';
  if (/exceeded the maximum allowed size|Payload too large/i.test(m)) return 'Ukuran file terlalu besar (maks. 3 MB).';
  if (/JWT expired/i.test(m)) return 'Sesi berakhir. Silakan masuk kembali.';
  return m || 'Terjadi kesalahan. Coba lagi.';
}
