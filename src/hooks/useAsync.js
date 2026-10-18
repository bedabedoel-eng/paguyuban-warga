import { useCallback, useEffect, useRef, useState } from 'react';
import { pesanError } from '../lib/errors';

/**
 * Jalankan fungsi async dan kelola status memuat/galat.
 * fn harus mengembalikan data (atau melempar galat).
 */
export function useAsync(fn, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: undefined, loading: enabled, error: null });
  const alive = useRef(true);
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      if (alive.current) setState({ data, loading: false, error: null });
      return data;
    } catch (e) {
      if (alive.current) setState((s) => ({ ...s, loading: false, error: pesanError(e) }));
      return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    alive.current = true;
    if (enabled) run();
    return () => { alive.current = false; };
  }, [run, enabled]);

  const setData = useCallback((upd) => setState((s) => ({ ...s, data: typeof upd === 'function' ? upd(s.data) : upd })), []);
  return { ...state, reload: run, setData };
}
