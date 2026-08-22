/**
 * TRINETRA — ErrorState
 * Consistent error display for all API failures.
 * Does NOT dump raw Axios errors.
 */

export default function ErrorState({ message, onRetry, compact = false }) {
  const displayMessage = message ?? "An unexpected error occurred.";

  if (compact) {
    return (
      <div style={styles.compact}>
        <span style={styles.compactIcon}>⚠</span>
        <span style={styles.compactMsg}>{displayMessage}</span>
        {onRetry && (
          <button className="btn btn--ghost btn--sm" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.iconWrap}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="#c62828" strokeWidth="1.5" />
          <line x1="12" y1="7" x2="12" y2="13" stroke="#c62828" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="0.75" fill="#c62828" />
        </svg>
      </div>
      <p style={styles.title}>Unable to load data</p>
      <p style={styles.message}>{displayMessage}</p>
      {onRetry && (
        <button className="btn btn--secondary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2.5rem 1rem",
    textAlign: "center",
    gap: "0.5rem",
  },
  iconWrap: {
    marginBottom: "0.5rem",
    opacity: 0.85,
  },
  title: {
    fontSize: "0.9375rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
  },
  message: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    maxWidth: "340px",
    lineHeight: 1.5,
    margin: "0 0 0.75rem",
  },
  compact: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 0.75rem",
    background: "var(--color-danger-light)",
    border: "1px solid #ef9a9a",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.8rem",
  },
  compactIcon: {
    color: "var(--color-danger)",
    flexShrink: 0,
  },
  compactMsg: {
    color: "var(--color-danger)",
    flex: 1,
  },
};
