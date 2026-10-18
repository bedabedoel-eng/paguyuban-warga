import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';

/** Kotak "Pilih Foto" bergaris putus-putus dengan pratinjau. */
export default function ImagePicker({ file, onChange, label = 'Pilih Foto', hint = 'JPG, PNG (Max 5MB)', accept = 'image/jpeg,image/png,image/webp', previewUrl, capture }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file) { setUrl(null); return undefined; }
    if (file.type === 'application/pdf') { setUrl(null); return undefined; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const shown = url || (!file ? previewUrl : null);
  return (
    <div
      className={`dropzone ${drag ? 'drag' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => ref.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onChange(f); }}
    >
      <input ref={ref} type="file" accept={accept} capture={capture} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ''; }} />
      {shown ? (
        <>
          <img src={shown} alt="Pratinjau" className="preview" />
          {file && (
            <button type="button" className="btn outline xs" onClick={(e) => { e.stopPropagation(); onChange(null); }}>
              <X size={14} /> Hapus foto
            </button>
          )}
        </>
      ) : file ? (
        <>
          <strong>{file.name}</strong>
          <small>{Math.round(file.size / 1024)} KB · klik untuk mengganti</small>
        </>
      ) : (
        <>
          <Camera size={26} className="dz-icon" />
          <strong>{label}</strong>
          <small>{hint}</small>
        </>
      )}
    </div>
  );
}
