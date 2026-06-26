import { useState, useCallback, useRef, useEffect } from 'react';

const DEFAULT_TIMEOUT_MS = 9000;

/**
 * useFetchWithTimeout
 *
 * Wraps any async fetch function with:
 *  - A configurable timeout (default 9 s)
 *  - loading / error / data states
 *  - A stable retry() callback
 *  - Automatic setLoading(false) in finally — always
 *
 * Usage:
 *   const { loading, error, data, retry } = useFetchWithTimeout(fetchFn, { immediate: true });
 */
export function useFetchWithTimeout(fetchFn, { immediate = true, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const [loading, setLoading] = useState(immediate);
  const [error,   setError]   = useState('');
  const [data,    setData]    = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const run = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    setError('');

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const result = await fetchFn(controller.signal);
      if (mountedRef.current) setData(result);
    } catch (err) {
      if (!mountedRef.current) return;
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        setError(err?.message || 'An unexpected error occurred. Please try again.');
      }
      console.error('[useFetchWithTimeout] fetch error:', err);
    } finally {
      clearTimeout(timer);
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchFn, timeoutMs]);

  useEffect(() => {
    if (immediate) run();
  }, [run, immediate]);

  return { loading, error, data, retry: run };
}

/**
 * fetchWithTimeout
 *
 * Standalone promise-based helper for use inside existing
 * imperative fetch functions (not hook-based).
 */
export async function fetchWithTimeout(asyncFn, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await asyncFn(controller.signal);
  } catch (err) {
    if (err?.name === 'AbortError' || controller.signal.aborted) {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
