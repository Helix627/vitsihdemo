/**
 * TRINETRA — EmptyState
 * Reusable empty state component.
 */

export default function EmptyState({ icon, title, message, action }) {
  return (
    <div style={styles.container}>
      {icon && <div style={styles.icon}>{icon}</div>}
      {title && <p style={styles.title}>{title}</p>}
      {message && <p style={styles.message}>{message}</p>}
      {action && <div style={styles.action}>{action}</div>}
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
  icon: {
    fontSize: "2rem",
    marginBottom: "0.5rem",
    opacity: 0.5,
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
    margin: 0,
  },
  action: {
    marginTop: "0.75rem",
  },
};
