/**
 * TRINETRA — SearchResults
 * Dropdown results list used by SearchBar.
 * Only renders fields returned by the backend.
 */

import { formatEntityType, entityTypeBadgeClass, formatId } from "../utils/formatters";

export default function SearchResults({
  results,
  loading,
  error,
  query,
  onSelect,
  onClose,
}) {
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.statusRow}>
          <div className="spinner spinner--sm" style={{ marginRight: "8px" }} />
          <span style={styles.statusText}>Searching...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.statusRow, color: "var(--color-danger)" }}>
          <span style={{ fontSize: "0.75rem" }}>⚠ {error}</span>
        </div>
      </div>
    );
  }

  if (!query || query.trim().length === 0) return null;

  if (results.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.statusRow}>
          <span style={styles.statusText}>
            No results found for <strong>"{query}"</strong>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} role="listbox" aria-label="Search results">
      <div style={styles.header}>
        <span style={styles.headerText}>
          {results.length} result{results.length !== 1 ? "s" : ""}
        </span>
        <button
          style={styles.closeBtn}
          onClick={onClose}
          aria-label="Close search results"
        >
          ✕
        </button>
      </div>
      {results.map((result, idx) => (
        <button
          key={result.id ?? idx}
          style={styles.resultItem}
          onClick={() => onSelect(result)}
          role="option"
          aria-selected="false"
          title={result.label}
        >
          <span className={`badge ${entityTypeBadgeClass(result.type)}`}>
            {formatEntityType(result.type)}
          </span>
          <span style={styles.resultLabel}>{result.label}</span>
          {result.id && (
            <span style={styles.resultId}>{formatId(result.id)}</span>
          )}
        </button>
      ))}
    </div>
  );
}

const styles = {
  container: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    background: "var(--bg-panel)",
    border: "1px solid var(--border-panel)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-lg)",
    zIndex: 300,
    overflow: "hidden",
    maxHeight: "320px",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 10px",
    borderBottom: "1px solid var(--border-subtle)",
    background: "var(--bg-hover)",
  },
  headerText: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-muted)",
    fontSize: "0.7rem",
    padding: "0 2px",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    padding: "0.75rem 1rem",
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
  },
  statusText: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
  },
  resultItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    width: "100%",
    padding: "0.5rem 0.75rem",
    background: "none",
    border: "none",
    borderBottom: "1px solid var(--border-subtle)",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "var(--font-family)",
    transition: "background var(--transition-fast)",
  },
  resultLabel: {
    flex: 1,
    fontSize: "0.8125rem",
    color: "var(--text-primary)",
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  resultId: {
    fontSize: "0.7rem",
    fontFamily: "var(--font-mono)",
    color: "var(--text-muted)",
    flexShrink: 0,
  },
};
