/**
 * VoterVerse — Shared useFetch Hook
 * Provides centralized data fetching with:
 * - Automatic loading / error states
 * - Abort signal on unmount (prevents memory leaks)
 * - Optional caching via session storage
 */
import { useState, useEffect, useRef } from 'react';

/**
 * @param {string} url - Endpoint to GET
 * @param {{ cacheKey?: string, cacheMs?: number }} options
 */
export function useFetch(url, options = {}) {
  const { cacheKey, cacheMs = 60_000 } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!url) return;

    // Check session cache first
    if (cacheKey) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const { data: d, ts } = JSON.parse(cached);
          if (Date.now() - ts < cacheMs) {
            setData(d);
            setLoading(false);
            return;
          }
        }
      } catch { /* ignore cache errors */ }
    }

    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);

    fetch(url, { signal: abortRef.current.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then(d => {
        setData(d);
        if (cacheKey) {
          try { sessionStorage.setItem(cacheKey, JSON.stringify({ data: d, ts: Date.now() })); }
          catch { /* ignore quota errors */ }
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => abortRef.current?.abort();
  }, [url, cacheKey, cacheMs]);

  return { data, loading, error };
}
