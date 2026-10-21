import { useCallback, useEffect, useRef, useState } from "react";
import { friendlyError } from "../utils/errors";

/**
 * Runs an async loader and tracks { data, loading, error }. Re-runs when `deps` change;
 * call `reload()` after a transaction to refresh. The one data-loading hook for every page.
 */
export function useAsync(loader, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: null });
  const latest = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  const reload = useCallback(async () => {
    if (!enabled) return;
    const call = ++latest.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await run();
      if (call === latest.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (call === latest.current) setState({ data: null, loading: false, error: friendlyError(error) });
    }
  }, [run, enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}
