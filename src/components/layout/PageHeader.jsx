import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Judul halaman. Di HP: bilah atas ringkas (kembali + judul + aksi ikon).
 * Di desktop: judul besar, deskripsi, dan tombol aksi.
 * back: true (riwayat) | string (path) | false
 */
export default function PageHeader({ title, desc, back = false, actions, mobileActions }) {
  const nav = useNavigate();
  const goBack = () => (typeof back === 'string' ? nav(back) : window.history.length > 1 ? nav(-1) : nav('/'));
  const mAct = mobileActions !== undefined ? mobileActions : null;
  return (
    <>
      <header className="m-header">
        {back ? <button className="icon-btn" onClick={goBack} aria-label="Kembali"><ArrowLeft size={22} /></button> : <span style={{ width: 4 }} />}
        <h1>{title}</h1>
        {mAct && <div className="actions">{mAct}</div>}
      </header>
      <div className={`page-head has-m-header${mAct ? ' has-m-act' : ''}`}>
        {back && <button className="icon-btn back only-desktop" onClick={goBack} aria-label="Kembali"><ArrowLeft size={20} /></button>}
        <div className="t">
          <h1>{title}</h1>
          {desc && <p className="only-desktop">{desc}</p>}
        </div>
        {actions && <div className="actions">{actions}</div>}
      </div>
    </>
  );
}
