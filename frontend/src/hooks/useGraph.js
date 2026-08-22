/**
 * TRINETRA — useGraph hook
 *
 * Fetches graph data from GET /graph.
 * Manages loading, success, and error states.
 */

import { useState, useCallback } from "react";
import { getGraph } from "../services/api";

export function useGraph() {
  const [data, setData] = useState(null);       // { nodes, edges }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getGraph();
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
              ?? "An error occurred loading the graph."),
        isNetwork: isNetworkError,
        status: err.response?.status ?? null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchGraph };
}
