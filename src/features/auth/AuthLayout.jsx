import Logo from '../../components/illustrations/Logo';
import HouseScene from '../../components/illustrations/HouseScene';
import { useSettings } from '../../context/SettingsContext';

/** Kerangka halaman masuk/daftar: panel hijau (desktop) + formulir. */
export default function AuthLayout({ children, compactBrand = false }) {
  const { pengaturan } = useSettings();
  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="auth-side-inner">
          <Logo size={96} />
          <h2 className="brand-name">{pengaturan.nama_paguyuban}</h2>
          <p className="brand-tag">{pengaturan.tagline}</p>
        </div>
        <div className="auth-side-scene"><HouseScene variant="dark" /></div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className={`auth-brand ${compactBrand ? 'compact' : ''}`}>
            <Logo size={compactBrand ? 52 : 68} />
            <div className="brand-name-green">{pengaturan.nama_paguyuban}</div>
          </div>
          {children}
        </div>
        <div className="auth-scene"><HouseScene variant="light" /></div>
      </main>
    </div>
  );
}
