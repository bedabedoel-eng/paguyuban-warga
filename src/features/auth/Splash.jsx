import Logo from '../../components/illustrations/Logo';
import HouseScene from '../../components/illustrations/HouseScene';
import { useSettings } from '../../context/SettingsContext';

export default function Splash() {
  const { pengaturan } = useSettings();
  return (
    <div className="splash" role="status" aria-label="Memuat aplikasi">
      <div className="splash-center">
        <Logo size={112} />
        <h1>{pengaturan.nama_paguyuban}</h1>
        <p>{pengaturan.tagline}</p>
        <span className="splash-dots"><i /><i /><i /></span>
      </div>
      <div className="splash-scene"><HouseScene variant="dark" /></div>
    </div>
  );
}
