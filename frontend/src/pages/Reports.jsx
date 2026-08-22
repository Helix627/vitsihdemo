/**
 * TRINETRA — Reports (/reports)
 *
 * Working data exports generated from currently loaded API responses:
 * - Graph JSON export (raw GET /graph payload)
 * - Nodes CSV / Edges CSV (safe tabular derivation)
 *
 * These are analyst working exports — NOT official threat
 * intelligence reports. The UI states this explicitly.
 */

import { useEffect } from "react";
import { useGraph, } from "../hooks/useGraph";
import ErrorState from "../components/ErrorState";

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Escape a value for CSV output. */
function csvCell(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers, rows) {
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\n");
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export default function Reports({ refreshSignal = 0 }) {
  const { data, loading, error, fetchGraph } = useGraph();

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph, refreshSignal]);

  function exportJson() {
    download(
      `trinetra_graph_${timestamp()}.json`,
      JSON.stringify(data, null, 2),
      "application/json"
    );
  }

  function exportNodesCsv() {
    // Only backend-provided fields are exported.
    const rows = data.nodes.map((n) => {
      const d = n.data;
      return [
        d.id,
        d.label,
        d.type,
        d.username ?? "",
        d.profile_alias ?? "",
        d.email ?? "",
        d.bitcoin_wallet ?? "",
        d.fingerprint ?? "",
      ];
    });
    download(
      `trinetra_nodes_${timestamp()}.csv`,
      toCsv(
        ["id", "label", "type", "username", "alias", "email", "bitcoin_wallet", "fingerprint"],
        rows
      ),
      "text/csv"
    );
  }

  function exportEdgesCsv() {
    const rows = data.edges.map((e) => [e.data.id, e.data.source, e.data.target]);
    download(
      `trinetra_edges_${timestamp()}.csv`,
      toCsv(["id", "source", "target"], rows),
      "text/csv"
    );
  }

  const ready = !loading && !error && data && data.nodes.length > 0;

  return (
    <div className="page-container">
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Reports</h1>
          <p style={styles.subtitle}>
            Working exports of the currently loaded relationship-graph dataset.
          </p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: "var(--space-4)" }}>
        <div className="panel__body" style={styles.disclaimer}>
          <strong style={styles.disclaimerTitle}>Scope notice.</strong>
          &nbsp;These files are raw data exports for analyst workflows. They are not
          formal threat intelligence reports and contain no analytical judgments
          beyond what the intelligence backend itself provides.
        </div>
      </div>

      <div className="panel">
        <div className="panel__header">
          <span className="panel__title">Available Exports</span>
          {ready && (
            <span className="badge badge--info">
              {data.nodes.length} nodes · {data.edges.length} edges loaded
            </span>
          )}
        </div>
        <div className="panel__body">
          {loading && (
            <p style={styles.note}>Loading graph data for export…</p>
          )}

          {!loading && error && (
            <ErrorState message={error.message} onRetry={fetchGraph} />
          )}

          {!loading && !error && (!data || data.nodes.length === 0) && (
            <p style={styles.note}>
              No graph data available from the backend — nothing to export.
            </p>
          )}

          {ready && (
            <div style={styles.exportList}>
              <ExportRow
                title="Graph Data (JSON)"
                description={`Complete GET /graph response — ${data.nodes.length} nodes, ${data.edges.length} edges.`}
                action="Export JSON"
                onClick={exportJson}
                primary
              />
              <ExportRow
                title="Entities (CSV)"
                description={`${data.nodes.length} rows — id, label, type and backend-provided attributes.`}
                action="Export Nodes CSV"
                onClick={exportNodesCsv}
              />
              <ExportRow
                title="Relationships (CSV)"
                description={`${data.edges.length} rows — edge id, source entity, target entity.`}
                action="Export Edges CSV"
                onClick={exportEdgesCsv}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExportRow({ title, description, action, onClick, primary = false }) {
  return (
    <div style={styles.exportRow}>
      <div>
        <div style={styles.exportTitle}>{title}</div>
        <div style={styles.exportDesc}>{description}</div>
      </div>
      <button
        className={`btn ${primary ? "btn--primary" : "btn--secondary"} btn--sm`}
        onClick={onClick}
        aria-label={action}
      >
        {action}
      </button>
    </div>
  );
}

const styles = {
  header: { marginBottom: "var(--space-4)" },
  title: { fontSize: "1.125rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" },
  subtitle: { fontSize: "0.775rem", color: "var(--text-muted)", margin: "2px 0 0" },
  disclaimer: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    background: "var(--bg-hover)",
    borderRadius: "var(--radius-md)",
    lineHeight: 1.5,
  },
  disclaimerTitle: { color: "var(--text-primary)" },
  note: { fontSize: "0.8rem", color: "var(--text-muted)" },
  exportList: { display: "flex", flexDirection: "column" },
  exportRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    padding: "0.75rem 0",
    borderBottom: "1px solid var(--border-subtle)",
    flexWrap: "wrap",
  },
  exportTitle: { fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" },
  exportDesc: { fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "2px" },
};
