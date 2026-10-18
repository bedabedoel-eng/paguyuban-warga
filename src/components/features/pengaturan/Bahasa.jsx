import { Check } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Card } from '../../components/ui';

export default function Bahasa() {
  return (
    <>
      <PageHeader title="Bahasa" />
      <div className="page" style={{ maxWidth: 640 }}>
        <Card pad>
          <div className="list">
            <div className="list-item"><span className="grow title">Bahasa Indonesia</span><Check size={20} className="green" /></div>
          </div>
          <p className="small muted mt-3">Saat ini aplikasi tersedia dalam Bahasa Indonesia.</p>
        </Card>
      </div>
    </>
  );
}
