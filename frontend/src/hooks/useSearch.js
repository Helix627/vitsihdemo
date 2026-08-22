/**
 * TRINETRA — useSearch hook
 *
 * Debounced search calling GET /search?q=
 * Debounce: 300ms — does NOT fire on every keystroke.
 */

import { useState, useCallback, useRef } from "react";
import { searchEntities } from "../services/api";

const DEBOUNCE_MS = 300;

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceTimer = useRef(null);

  const search = useCallback((q) => {
    setQuery(q);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!q || q.trim().length === 0) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    debounceTimer.current = setTimeout(async () => {
      try {
        const data = await searchEntities(q.trim());
        setResults(data);
      } catch (err) {
        const isNetworkError =
          err.code === "ERR_NETWORK" || err.code === "ECONNREFUSED" || !err.response;
        setError(
          isNetworkError
            ? "Unable to connect to intelligence backend."
            : (err.response?.data?.error
                ?? err.response?.data?.message
                ?? "Search failed.")
        );
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const clearSearch = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setQuery("");
    setResults([]);
    setLoading(false);
    setError(null);
  }, []);

  return { query, results, loading, error, search, clearSearch };
}
