/** Lempar galat Supabase bila ada, kembalikan data. */
export function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}
