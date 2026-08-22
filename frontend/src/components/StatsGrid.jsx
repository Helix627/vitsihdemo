/**
 * TRINETRA — StatsGrid
 *
 * Renders stats from GET /stats.
 * Backend keys: vendors, pgp_keys, edges (numeric) + links (metadata object).
 * Non-numeric entries such as "links" are skipped — they are API
 * navigation metadata, not statistics.
 */

import StatsCard from "./StatsCard";
import ErrorState from "./ErrorState";
import { formatStatKey } from "../utils/formatters";

export default function StatsGrid({ data, loading, error, onRetry }) {
  if (error) {
    return <ErrorState message={error.message} onRetry={onRetry} compact />;
  }

  // Render skeleton cards while loading
  if (loading && !data) {
    return (
      <div className="dashboard-stats">
        {[0, 1, 2, 3].map((i) => (
          <StatsCard key={i} loading />
        ))}
      </div>
    );
  }

  const entries = data
    ? Object.entries(data).filter(([, value]) => typeof value === "number")
    : [];

  if (entries.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", padding: "0.5rem 0" }}>
        No statistics available from backend.
      </div>
    );
  }

  return (
    <div className="dashboard-stats">
      {entries.map(([key, value]) => (
        <StatsCard key={key} label={formatStatKey(key)} value={value} />
      ))}
    </div>
  );
}
