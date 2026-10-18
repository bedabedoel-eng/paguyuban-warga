import { supabase } from './supabase';
import { compressImage } from './image';

const cache = new Map(); // key -> { url, exp }

/** Unggah file (dikompres) ke bucket/folder. Mengembalikan path. */
export async function uploadFile(bucket, folder, file, opts) {
  const f = await compressImage(file, opts);
  const ext = f.type === 'application/pdf' ? 'pdf' : 'jpg';
  const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, f, { contentType: f.type, upsert: false, cacheControl: '3600' });
  if (error) throw error;
  return path;
}

export async function removeFile(bucket, path) {
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}

/** URL bertanda tangan (cache 50 menit) untuk file privat. */
export async function signedUrl(bucket, path) {
  if (!path) return null;
  if (/^https?:/.test(path)) return path;
  if (bucket === 'publik') return supabase.storage.from('publik').getPublicUrl(path).data.publicUrl;
  const key = `${bucket}/${path}`;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) return null;
  cache.set(key, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

export function publicUrl(path) {
  if (!path) return null;
  return supabase.storage.from('publik').getPublicUrl(path).data.publicUrl;
}
