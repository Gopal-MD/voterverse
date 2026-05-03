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
  const [data, setData] = useState(() => {
    if (cacheKey) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const { data: d, ts } = JSON.parse(cached);
          if (Date.now() - ts < cacheMs) return d;
        }
      } catch {
        /* ignore */
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    if (cacheKey) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const { ts } = JSON.parse(cached);
          if (Date.now() - ts < cacheMs) return false;
        }
      } catch {
        /* ignore */
      }
    }
    return !!url;
  });

  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!url) return;

    // If we already have fresh cached data, don't fetch
    if (cacheKey) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const { ts } = JSON.parse(cached);
          if (Date.now() - ts < cacheMs) return;
        }
      } catch {
        /* ignore */
      }
    }

    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);

    fetch(url, { signal: abortRef.current.signal })
      .then(async (res) => {
        let payload;
        try {
          payload = await res.json();
        } catch {
          payload = null;
        }

        if (!res.ok) {
          throw new Error(
            payload && payload.error ? payload.error : `HTTP ${res.status}: ${res.statusText}`
          );
        }

        // Unwrap standard response structure if present
        return payload && payload.success !== undefined
          ? payload.success
            ? payload.data
            : payload
          : payload;
      })
      .then((d) => {
        setData(d);
        if (cacheKey) {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({ data: d, ts: Date.now() }));
          } catch {
            /* ignore quota errors */
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => abortRef.current?.abort();
  }, [url, cacheKey, cacheMs]);

  return { data, loading, error };
}
