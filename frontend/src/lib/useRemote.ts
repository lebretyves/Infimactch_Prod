import { useEffect, useState, useCallback } from 'react';
export function useRemote<T>(load: (signal: AbortSignal) => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    const controller = new AbortController(); setData(null); setLoading(true); setError('');
    load(controller.signal).then(v => { if (!controller.signal.aborted) setData(v); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
    // The key identifies all arguments used by load.
  }, [key, version]);
  return { data, error, loading, reload };
}
