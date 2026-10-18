import { useEffect, useRef, useState } from 'react';
import { ImageUp, FileText, X } from 'lucide-react';

/** Area pilih/seret foto atau PDF dengan pratinjau. */
export default function ImagePicker({ file, onChange, label = 'Pilih foto', hint = 'JPG, PNG, atau WEBP · maks. 5 MB', accept = 'image/jpeg,image/png,image/webp', previewUrl, capture }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file || file.type === 'application/pdf') { setUrl(null); return undefined; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const shown = url || (!file ? previewUrl : null);
  const open = () => ref.current?.click();
  return (
    <div
      className={`dropzone ${drag ? 'drag' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={file ? `Berkas dipilih: ${file.name}. Tekan untuk mengganti.` : label}
      onClick={open}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open())}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onChange(f); }}
    >
      <input ref={ref} type="file" accept={accept} capture={capture} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ''; }} />
      {shown ? (
        <img src={shown} alt="Pratinjau" className="preview" />
      ) : file ? (
        <>
          <span className="dz-icon"><FileText size={20} /></span>
          <strong className="ellipsis" style={{ maxWidth: '100%' }}>{file.name}</strong>
          <small>{Math.round(file.size / 1024)} KB · ketuk untuk mengganti</small>
        </>
      ) : (
        <>
          <span className="dz-icon"><ImageUp size={20} /></span>
          <strong>{label}</strong>
          <small>{hint}</small>
        </>
      )}
      {file && (
        <button type="button" className="btn secondary xs" onClick={(e) => { e.stopPropagation(); onChange(null); }}>
          <X size={14} /> Hapus berkas
        </button>
      )}
    </div>
  );
}
