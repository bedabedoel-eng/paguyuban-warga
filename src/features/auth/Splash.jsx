import Logo, { Roofline } from '../../components/illustrations/Logo';
import { useSettings } from '../../context/SettingsContext';

export default function Splash() {
  const { pengaturan } = useSettings();
  return (
    <div className="splash" role="status" aria-label="Memuat aplikasi">
      <div className="splash-in">
        <Logo size={76} />
        <h1>{pengaturan.nama_paguyuban}</h1>
        {pengaturan.tagline && <p>{pengaturan.tagline}</p>}
        <span className="bar" aria-hidden="true"><i /></span>
      </div>
      <Roofline />
    </div>
  );
}
