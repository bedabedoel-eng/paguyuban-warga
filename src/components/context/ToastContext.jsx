import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CircleCheck, CircleAlert, Info, X } from 'lucide-react';
import { pesanError } from '../lib/errors';

const Ctx = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const close = useCallback((id) => setItems((s) => s.filter((t) => t.id !== id)), []);
  const show = useCallback((text, type = 'info', ms = 3800) => {
    const id = Math.random().toString(36).slice(2);
    setItems((s) => [...s.slice(-2), { id, text, type }]);
    setTimeout(() => close(id), ms);
  }, [close]);
  const api = useMemo(() => ({
    show,
    success: (t) => show(t, 'success'),
    error: (e) => show(typeof e === 'string' ? e : pesanError(e), 'error', 5500),
    info: (t) => show(t, 'info'),
  }), [show]);
  const Icon = { success: CircleCheck, error: CircleAlert, info: Info };
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => {
          const I = Icon[t.type] || Info;
          return (
            <div key={t.id} className={`toast ${t.type}`}>
              <I size={18} />
              <span>{t.text}</span>
              <button onClick={() => close(t.id)} aria-label="Tutup"><X size={16} /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
