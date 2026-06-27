import { useState, useEffect, useCallback } from "react";

// Runs an async function on mount (and when deps change). Returns
// { data, loading, error, reload }.
export function useApi(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => {
    setLoading(true);
    Promise.resolve(fn())
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, deps);

  useEffect(() => { run(); }, [run]);

  return { data, loading, error, reload: run };
}
