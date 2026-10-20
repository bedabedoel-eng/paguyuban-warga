import PageHeader from '../../components/layout/PageHeader';
import { Card, CardHead, CardBody } from '../../components/ui';
import Logo from '../../components/illustrations/Logo';
import Syarat from '../auth/Syarat';
import { useSettings } from '../../context/SettingsContext';

export default function Tentang() {
  const { pengaturan } = useSettings();
  return (
    <div className="page narrow">
      <PageHeader back="/pengaturan" title="Tentang aplikasi" />
      <Card pad className="row" style={{ gap: 16 }}>
        <Logo size={56} tile />
        <div>
          <h2>{pengaturan.nama_paguyuban}</h2>
          <p className="text-sm muted">{pengaturan.tagline}</p>
          <p className="text-xs muted" style={{ marginTop: 4 }}>Versi 2.0</p>
          <p className="text-sm" style={{ marginTop: 8 }}><span className="muted">Pengembang: </span><b>Ahmad Dawami</b> <span className="muted">(C3/5)</span></p>
        </div>
      </Card>
      <Card><CardHead title="Penggunaan data" /><CardBody><Syarat /></CardBody></Card>
    </div>
  );
}
