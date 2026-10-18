import PageHeader from '../../components/layout/PageHeader';
import { Card } from '../../components/ui';
import Logo from '../../components/illustrations/Logo';
import Syarat from '../auth/Syarat';
import { useSettings } from '../../context/SettingsContext';

export default function Tentang() {
  const { pengaturan } = useSettings();
  return (
    <>
      <PageHeader title="Tentang Aplikasi" />
      <div className="page" style={{ maxWidth: 640 }}>
        <div className="page-inner">
          <Card pad className="center stack" style={{ alignItems: 'center' }}>
            <Logo size={72} />
            <h2>{pengaturan.nama_paguyuban}</h2>
            <p className="small muted">{pengaturan.tagline}</p>
            <p className="tiny muted">Versi 1.0.0</p>
          </Card>
          <Card pad><h2 className="mb-3">Kebijakan Privasi</h2><Syarat /></Card>
        </div>
      </div>
    </>
  );
}
