import { createContext, useCallback, useContext, useState } from 'react';
import Modal from './Modal';
import Button from './Button';

const Ctx = createContext(null);

/** confirm({ title, text, okLabel, danger }) -> Promise<boolean> */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const confirm = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
  const done = (v) => { state?.resolve(v); setState(null); };
  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => done(false)}
        title={state?.title || 'Konfirmasi'}
        footer={(
          <>
            <Button variant="secondary" onClick={() => done(false)}>Batal</Button>
            <Button variant={state?.danger ? 'danger' : 'primary'} onClick={() => done(true)}>{state?.okLabel || 'Lanjutkan'}</Button>
          </>
        )}
      >
        <p className="ink-2">{state?.text}</p>
      </Modal>
    </Ctx.Provider>
  );
}

export const useConfirm = () => useContext(Ctx);
