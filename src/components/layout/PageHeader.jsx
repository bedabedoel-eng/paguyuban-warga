import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Judul halaman: header hijau di HP, judul + tombol aksi di tablet/desktop.
 * back: true (kembali ke riwayat) | string (path) | false
 */
export default function PageHeader({ title, back = true, actions, mobileActions }) {
  const nav = useNavigate();
  const goBack = () => (typeof back === 'string' ? nav(back) : window.history.length > 1 ? nav(-1) : nav('/'));
  return (
    <>
      <header className="m-header">
        {back && <button className="icon-btn" onClick={goBack} aria-label="Kembali"><ArrowLeft size={22} /></button>}
        <h1 style={{ paddingLeft: back ? 0 : 8 }}>{title}</h1>
        {(mobileActions !== undefined ? mobileActions : actions) && <div className="actions">{mobileActions !== undefined ? mobileActions : actions}</div>}
      </header>
      <div className="page-head">
        {back && <button className="back" onClick={goBack} aria-label="Kembali"><ArrowLeft size={18} /></button>}
        <h1>{title}</h1>
        {actions && <div className="actions">{actions}</div>}
      </div>
    </>
  );
}
