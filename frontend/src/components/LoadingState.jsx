/**
 * TRINETRA — LoadingState
 * Subtle loading indicators: spinner and skeleton variants.
 */

/** Full-page or container spinner */
export function LoadingSpinner({ message, size = "md" }) {
  return (
    <div style={styles.container}>
      <div className={`spinner spinner--${size}`} role="status" aria-label="Loading" />
      {message && <p style={styles.message}>{message}</p>}
    </div>
  );
}

/** A single skeleton row — use several for a skeleton list */
export function SkeletonRow({ width = "100%", height = "14px", style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: "var(--radius-sm)", ...style }}
      aria-hidden="true"
    />
  );
}

/** Skeleton block for a stat card */
export function SkeletonCard() {
  return (
    <div style={styles.skeletonCard}>
      <SkeletonRow width="60%" height="11px" />
      <SkeletonRow width="40%" height="24px" style={{ marginTop: "8px" }} />
    </div>
  );
}

/** Skeleton block for a detail field */
export function SkeletonField() {
  return (
    <div style={styles.skeletonField}>
      <SkeletonRow width="35%" height="10px" />
      <SkeletonRow width="65%" height="13px" style={{ marginTop: "4px" }} />
    </div>
  );
}

/** Default export for simple usage */
export default function LoadingState({ message }) {
  return <LoadingSpinner message={message ?? "Loading..."} />;
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2.5rem 1rem",
    gap: "0.75rem",
  },
  message: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    margin: 0,
  },
  skeletonCard: {
    padding: "1rem",
    background: "var(--bg-panel)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border-subtle)",
  },
  skeletonField: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "0.5rem 0",
  },
};
