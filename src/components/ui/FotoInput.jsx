import { useEffect, useState } from 'react';
import { Link2, Trash2 } from 'lucide-react';
import { SegTabs } from './Tabs';
import { Input } from './Field';
import Button from './Button';
import ImagePicker from './ImagePicker';
import { normalisasiLinkFoto } from '../../lib/image';

/**
 * Pilih foto dari perangkat (unggah) atau dari tautan gambar.
 * value: { mode: 'unggah' | 'link', file, link, hapus }
 */
export default function FotoInput({ value, onChange, adaFoto = false, ratio = '3 / 4', hint }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const [rusak, setRusak] = useState(false);
  let preview = '';
  let galat = '';
  if (value.mode === 'link' && value.link.trim()) {
    try { preview = normalisasiLinkFoto(value.link); } catch (e) { galat = e.message; }
  }
  useEffect(() => { setRusak(false); }, [preview]);

  return (
    <div className="stack-sm">
      <SegTabs label="Sumber foto" value={value.mode} onChange={(mode) => set({ mode, hapus: false })}
        tabs={[{ value: 'unggah', label: 'Unggah dari perangkat' }, { value: 'link', label: 'Dari tautan' }]} />
      {value.mode === 'unggah' ? (
        <ImagePicker file={value.file} onChange={(file) => set({ file, hapus: false })} label="Pilih atau seret foto" ratio={ratio}
          hint={hint || 'Foto berdiri/setengah badan, rasio 3:4. JPG, PNG, atau WEBP · maks. 5 MB'} />
      ) : (
        <>
          <Input label="Tautan gambar" type="url" inputMode="url" icon={Link2} value={value.link} onChange={(e) => set({ link: e.target.value, hapus: false })}
            placeholder="https://…" maxLength={480} error={galat || (rusak ? 'Gambar tidak dapat dimuat. Pastikan tautan dapat dibuka tanpa login.' : undefined)}
            hint="Tempel tautan gambar (https). Tautan berbagi Google Drive diubah otomatis; atur berbagi ke “Siapa saja yang memiliki link”." />
          {preview && !galat && (
            <div className="dropzone" style={{ cursor: 'default' }}>
              <img src={preview} alt="Pratinjau foto dari tautan" className="preview" referrerPolicy="no-referrer"
                onError={() => setRusak(true)} style={{ aspectRatio: ratio, objectFit: 'cover', maxHeight: 240, width: 'auto' }} />
            </div>
          )}
        </>
      )}
      {adaFoto && !value.file && !value.link.trim() && (
        value.hapus
          ? <p className="text-sm muted">Foto akan dihapus saat disimpan. <button type="button" className="link" onClick={() => set({ hapus: false })}>Batalkan</button></p>
          : <div><Button size="xs" variant="secondary" icon={Trash2} onClick={() => set({ hapus: true })}>Hapus foto saat ini</Button></div>
      )}
    </div>
  );
}
