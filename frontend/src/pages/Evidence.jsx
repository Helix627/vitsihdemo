/**
 * TRINETRA — Evidence (/evidence)
 *
 * Structured evidence rows derived from loaded relationship-graph edges
 * (GET /graph). The backend provides no dedicated evidence endpoint, so
 * every row here represents an actual backend-returned relationship.
 * No scores, dates, or sources are fabricated.
 */

import { useEffect, useMemo, useState } from "react";
import { useGraph } from "../hooks/useGraph";
import EvidenceItem from "../components/EvidenceItem";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";

export default function EvidencePage({ refreshSignal = 0 }) {
  const { data, loading, error, fetchGraph } = useGraph();
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph, refreshSignal]);

  /** Build lookup of node types for row badges. */
  const nodeTypes = useMemo(() => {
    const map = {};
    data?.nodes.forEach((n) => { map[n.data.id] = n.data.type ?? "unknown"; });
    return map;
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.edges.map((e) => ({
      id: e.data.id,
      source: e.data.source,
      target: e.data.target,
    }));
  }, [data]);

  const filtered = rows.filter((r) => {
    if (!filter.trim()) return true;
    const q = filter.trim().toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      r.source.toLowerCase().includes(q) ||
      r.target.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-container">
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Evidence</h1>
          <p style={styles.subtitle}>
            Relationship records derived from GET /graph — the current backend
            provides no dedicated evidence endpoint.
          </p>
        </div>
        <input
          style={styles.filter}
          type="text"
          placeholder="Filter by entity ID…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter evidence rows"
        />
      </div>

      <div className="panel">
        <div className="panel__header">
          <span className="panel__title">
            Relationship Records{rows.length > 0 ? ` (${filtered.length} of ${rows.length})` : ""}
          </span>
          <span className="badge badge--info">Derived from loaded graph</span>
        </div>

        <div className="panel__body">
          {loading && (
            <p style={styles.note}>Loading relationship records…</p>
          )}

          {!loading && error && (
            <ErrorState message={error.message} onRetry={fetchGraph} />
          )}

          {!loading && !error && rows.length === 0 && (
            <EmptyState
              title="No relationship records available"
              message="The relationship graph did not return any edges."
            />
          )}

          {!loading && !error && rows.length > 0 && filtered.length === 0 && (
            <EmptyState
              title="No records match the filter"
              message={`No relationship IDs contain "${filter}".`}
            />
          )}

          {!loading && !error &&
            filtered.map((row) => (
              <EvidenceItem
                key={row.id}
                type={nodeTypes[row.target] ?? "unknown"}
                source="GET /graph — relationship edge"
                entity={row.source}
                relatedEntity={row.target}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "var(--space-4)",
    gap: "1rem",
    flexWrap: "wrap",
  },
  title: {
    fontSize: "1.125rem",
    fontWeight: 700,
    margin: 0,
    color: "var(--text-primary)",
  },
  subtitle: {
    fontSize: "0.775rem",
    color: "var(--text-muted)",
    margin: "2px 0 0",
    maxWidth: "560px",
  },
  filter: {
    height: "34px",
    padding: "0 0.75rem",
    minWidth: "240px",
    border: "1px solid var(--border-panel)",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-panel)",
    fontSize: "0.8125rem",
    color: "var(--text-primary)",
    outline: "none",
  },
  note: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
  },
};
