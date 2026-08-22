/**
 * TRINETRA — StatsCard
 * Single compact statistic card. Only renders backend-provided values.
 */

import { formatCount } from "../utils/formatters";

export default function StatsCard({ label, value, icon, loading = false }) {
  if (loading) {
    return (
      <div style={styles.card}>
        <div className="skeleton" style={styles.skLabel} />
        <div className="skeleton" style={styles.skValue} />
      </div>
    );
  }

  return (
    <div style={styles.card} className="fade-in">
      <div style={styles.header}>
        {icon && <span style={styles.icon}>{icon}</span>}
        <span className="label-caps" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
      </div>
      <div style={styles.value}>{formatCount(value)}</div>
    </div>
  );
}

const styles = {
  card: {
    background: "var(--bg-panel)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    padding: "1rem 1.25rem",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
  },
  icon: {
    fontSize: "0.9rem",
    opacity: 0.7,
  },
  value: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
    lineHeight: 1,
    marginTop: "0.25rem",
  },
  skLabel: {
    height: "10px",
    width: "60%",
    borderRadius: "4px",
  },
  skValue: {
    height: "26px",
    width: "45%",
    borderRadius: "4px",
    marginTop: "8px",
  },
};
