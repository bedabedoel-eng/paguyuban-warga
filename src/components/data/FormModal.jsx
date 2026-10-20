import { useEffect, useState } from 'react';
import { Modal, Button, Input, Select, Textarea, Checkbox } from '../ui';
import { useToast } from '../../context/ToastContext';

/**
 * Form dalam modal yang dibentuk dari konfigurasi bidang.
 * fields: [{
 *   key, label, type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' (bawaan text),
 *   wajib?, pesanWajib?, opsional?, hint?, placeholder?, maxLength?, min?, max?, span?: 2,
 *   options?: array | (nilaiSekarang) => array,       // untuk select
 *   validasi?: (nilai, semuaNilai) => string | null,  // dijalankan bila bidang terisi
 *   ubah?: (nilai) => nilai,                          // normalisasi sebelum dikirim (mis. huruf besar, angka)
 *   tampilJika?: (semuaNilai) => boolean,
 * }]
 * onSubmit(nilai) harus mengembalikan Promise; galat ditampilkan sebagai toast dan modal tetap terbuka.
 */
const kosong = (v) => v === '' || v === null || v === undefined || (typeof v === 'string' && !v.trim());

export default function FormModal({ open = true, onClose, title, desc, fields, awal = {}, onSubmit, okLabel = 'Simpan', sukses, wide }) {
  const toast = useToast();
  const [nilai, setNilai] = useState(awal);
  const [galat, setGalat] = useState({});
  const [memuat, setMemuat] = useState(false);
  useEffect(() => { if (open) { setNilai(awal); setGalat({}); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (key, v) => { setNilai((s) => ({ ...s, [key]: v })); setGalat((g) => (g[key] ? { ...g, [key]: undefined } : g)); };
  const tampak = (f) => !f.tampilJika || f.tampilJika(nilai);

  function periksa() {
    const er = {};
    for (const f of fields.filter(tampak)) {
      const v = nilai[f.key];
      if (f.type === 'checkbox') continue;
      if (kosong(v)) { if (f.wajib) er[f.key] = f.pesanWajib || `${f.label} wajib diisi`; continue; }
      const m = f.validasi?.(v, nilai);
      if (m) er[f.key] = m;
    }
    setGalat(er);
    return Object.keys(er).length === 0;
  }

  async function kirim() {
    if (!periksa()) return;
    const data = {};
    for (const f of fields) data[f.key] = f.ubah ? f.ubah(nilai[f.key]) : nilai[f.key];
    setMemuat(true);
    try {
      await onSubmit(data);
      const pesan = typeof sukses === 'function' ? sukses(data) : sukses;
      if (pesan) toast.success(pesan);
      onClose?.();
    } catch (e) { toast.error(e); } finally { setMemuat(false); }
  }

  const render = (f) => {
    const umum = { label: f.label, error: galat[f.key], hint: f.hint, optional: f.opsional, fieldClass: f.span === 2 ? 'span-2' : undefined };
    const v = nilai[f.key] ?? '';
    if (f.type === 'select') {
      const opsi = typeof f.options === 'function' ? f.options(nilai) : f.options || [];
      return <Select key={f.key} {...umum} value={v} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} options={opsi} />;
    }
    if (f.type === 'textarea') return <Textarea key={f.key} {...umum} value={v} maxLength={f.maxLength} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} style={{ minHeight: 90 }} />;
    if (f.type === 'checkbox') return <div key={f.key} className="span-2"><Checkbox checked={!!nilai[f.key]} onChange={(x) => set(f.key, x)} hint={f.hint}>{f.label}</Checkbox></div>;
    return <Input key={f.key} {...umum} type={f.type || 'text'} value={v} maxLength={f.maxLength} min={f.min} max={f.max} placeholder={f.placeholder} inputMode={f.type === 'number' ? 'numeric' : undefined} onChange={(e) => set(f.key, e.target.value)} />;
  };

  return (
    <Modal open={open} onClose={onClose} title={title} desc={desc} wide={wide}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button loading={memuat} onClick={kirim}>{okLabel}</Button></>}>
      <div className="form-grid">{fields.filter(tampak).map(render)}</div>
    </Modal>
  );
}
