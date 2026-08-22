/**
 * TRINETRA — Dashboard
 *
 * Analyst overview:
 * - Statistics from GET /stats (only backend-provided metrics)
 * - Graph preview using the same GraphView component
 * - Graph-derived metrics clearly separated from backend stats
 * - No fabricated activity feed — explicit empty state instead
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStats } from "../hooks/useStats";
import { useGraph } from "../hooks/useGraph";
import StatsGrid from "../components/StatsGrid";
import GraphView from "../components/GraphView";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { computeGraphMetrics } from "../utils/graphUtils";
import { formatCount } from "../utils/formatters";

export default function Dashboard({ refreshSignal = 0 }) {
  const { data: statsData, loading: statsLoading, error: statsError, fetchStats } = useStats();
  const { data: graphData, loading: graphLoading, error: graphError, fetchGraph } = useGraph();
  const [cyInstance, setCyInstance] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchGraph();
  }, [fetchStats, fetchGraph, refreshSignal]);

  const graphMetrics = cyInstance ? computeGraphMetrics(cyInstance) : null;

  function handleFit() {
    cyInstance?.fit(undefined, 32);
  }

  /** Preview node click -> open full graph focused on that entity. */
  function handlePreviewNodeSelect(nodeId, nodeData) {
    navigate("/graph", {
      state: {
        focusEntity: { id: nodeId, label: nodeData?.label ?? nodeId },
      },
    });
  }

  return (
    <div className="page-container">
      <div className="dashboard-grid">
        {/* Statistics from /stats */}
        <section>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Platform Statistics</h2>
            <span style={styles.sectionSub}>Source: GET /stats</span>
          </div>
          <StatsGrid
            data={statsData}
            loading={statsLoading}
            error={statsError}
            onRetry={fetchStats}
          />
        </section>

        {/* Graph-derived metrics — clearly distinguished from backend stats */}
        {!graphLoading && !graphError && graphMetrics && (
          <section>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Graph Metrics</h2>
              <span style={styles.sectionSub}>Derived from loaded graph — not from /stats</span>
            </div>
            <div className="dashboard-stats">
              <MetricCard label="Total Nodes" value={graphMetrics.totalNodes} />
              <MetricCard label="Total Edges" value={graphMetrics.totalEdges} />
              <MetricCard label="Vendor Nodes" value={graphMetrics.vendorNodes} />
              <MetricCard label="PGP Nodes" value={graphMetrics.pgpNodes} />
            </div>
          </section>
        )}
        {!graphLoading && graphError && (
          <section>
            <div className="panel">
              <div className="panel__body">
                <ErrorState message={graphError.message} onRetry={fetchGraph} compact />
              </div>
            </div>
          </section>
        )}

        {/* Relationship graph preview */}
        <section>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Relationship Graph</h2>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn--ghost btn--sm" onClick={handleFit}>
                Fit
              </button>
              <button className="btn btn--secondary btn--sm" onClick={() => navigate("/graph")}>
                Open Full Graph
              </button>
            </div>
          </div>
          <div className="panel" style={{ height: "380px", overflow: "hidden", position: "relative" }}>
            <GraphView
              data={graphData}
              loading={graphLoading}
              error={graphError}
              onRetry={fetchGraph}
              layout="cose"
              onNodeSelect={handlePreviewNodeSelect}
              onClearSelect={() => {}}
              selectedNodeId={null}
              onCyReady={setCyInstance}
            />
          </div>
        </section>

        {/* Activity feed — backend provides no timestamps; show honest empty state */}
        <section>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Recent Intelligence Activity</h2>
          </div>
          <div className="panel">
            <div className="panel__body">
              <EmptyState
                title="No recent activity data available"
                message="The current intelligence API does not provide timestamped events. This section will populate when timeline data becomes available."
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div style={metricStyles.card}>
      <span style={metricStyles.label}>{label}</span>
      <span style={metricStyles.value}>{formatCount(value)}</span>
    </div>
  );
}

const metricStyles = {
  card: {
    background: "var(--bg-panel)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    padding: "0.875rem 1.25rem",
    boxShadow: "var(--shadow-sm)",
    borderLeft: "3px solid var(--color-selected)",
  },
  label: {
    display: "block",
    fontSize: "0.7rem",
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    marginBottom: "0.25rem",
  },
  value: {
    fontSize: "1.4rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
  },
};

const styles = {
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.75rem",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  sectionTitle: {
    fontSize: "0.9375rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
  },
  sectionSub: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    fontFamily: "var(--font-mono)",
  },
};
