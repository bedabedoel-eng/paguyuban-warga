import { ShieldCheck, Receipt, Megaphone } from 'lucide-react';
import Logo, { Roofline } from '../../components/illustrations/Logo';
import { useSettings } from '../../context/SettingsContext';

/** Kerangka halaman masuk/daftar: panel identitas (desktop) + formulir. */
export default function AuthLayout({ children }) {
  const { pengaturan } = useSettings();
  const lingkungan = [pengaturan.nama_lingkungan, pengaturan.rt && `RT ${pengaturan.rt}`, pengaturan.rw && `RW ${pengaturan.rw}`].filter(Boolean).join(' · ');
  return (
    <div className="auth">
      <aside className="auth-aside">
        <div className="brand">
          <Logo size={44} />
          <div>
            <div className="name">{pengaturan.nama_paguyuban}</div>
            {lingkungan && <div className="sub">{lingkungan}</div>}
          </div>
        </div>
        <div className="pitch">
          <h2>{pengaturan.tagline || 'Satu tempat untuk urusan warga'}</h2>
          <p>Iuran, kabar lingkungan, kegiatan, dan aspirasi dikelola terbuka oleh pengurus paguyuban.</p>
          <div className="facts">
            <div><Receipt size={18} />Tagihan IPL dan bukti bayar tersimpan rapi, kas bisa dilihat semua warga.</div>
            <div><Megaphone size={18} />Pengumuman sampai ke HP tanpa tenggelam di grup percakapan.</div>
            <div><ShieldCheck size={18} />Nomor HP dan data pribadi hanya terlihat oleh yang berwenang.</div>
          </div>
        </div>
        <div className="foot">Masuk memakai nomor HP dan PIN 6 angka.</div>
        <Roofline />
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mbrand">
            <Logo size={44} tile />
            <div>
              <div className="name">{pengaturan.nama_paguyuban}</div>
              {lingkungan && <div className="sub">{lingkungan}</div>}
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
