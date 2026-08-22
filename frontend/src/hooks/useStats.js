/**
 * TRINETRA — useStats hook
 *
 * Fetches platform statistics from GET /stats.
 */

import { useState, useCallback } from "react";
import { getStats } from "../services/api";

export function useStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getStats();
      setData(result);
    } catch (err) {
      const isNetworkError =
        err.code === "ERR_NETWORK" || err.code === "ECONNREFUSED" || !err.response;
      setError({
        message: isNetworkError
          ? "Unable to connect to intelligence backend."
          : (err.response?.data?.error
              ?? err.response?.data?.message
              ?? err.message
              ?? "Failed to load statistics."),
        isNetwork: isNetworkError,
        status: err.response?.status ?? null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchStats };
}
