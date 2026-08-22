/**
 * TRINETRA — Timeline
 *
 * Displays timestamped events if provided by the backend.
 * If no timestamp data exists, shows an EmptyState.
 * Never generates artificial dates.
 *
 * Props:
 *   events: Array<{ timestamp, event, entity, source }> | null
 */

import EmptyState from "./EmptyState";
import { safeStr } from "../utils/formatters";

export default function Timeline({ events }) {
  if (!events || events.length === 0) {
    return (
      <EmptyState
        icon="📅"
        title="No timeline data"
        message="Timeline data is not available from the current API."
      />
    );
  }

  return (
    <div style={styles.container}>
      {events.map((event, idx) => (
        <div key={idx} style={styles.item} className="fade-in">
          <div style={styles.dotCol}>
            <div style={styles.dot} />
            {idx < events.length - 1 && <div style={styles.line} />}
          </div>
          <div style={styles.content}>
            {event.timestamp && (
              <time style={styles.time} dateTime={event.timestamp}>
                {event.timestamp}
              </time>
            )}
            {event.event && (
              <p style={styles.eventText}>{safeStr(event.event)}</p>
            )}
            <div style={styles.meta}>
              {event.entity && (
                <span style={styles.metaItem}>
                  <span className="label-caps">Entity</span>{" "}
                  <code style={styles.code}>{safeStr(event.entity)}</code>
                </span>
              )}
              {event.source && (
                <span style={styles.metaItem}>
                  <span className="label-caps">Source</span>{" "}
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                    {safeStr(event.source)}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    padding: "0.5rem 0",
  },
  item: {
    display: "flex",
    gap: "0.75rem",
  },
  dotCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "14px",
    flexShrink: 0,
  },
  dot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "var(--color-selected)",
    border: "2px solid var(--bg-panel)",
    flexShrink: 0,
    marginTop: "3px",
  },
  line: {
    width: "2px",
    flex: 1,
    background: "var(--border-subtle)",
    marginTop: "2px",
  },
  content: {
    paddingBottom: "1.25rem",
    flex: 1,
  },
  time: {
    fontSize: "0.7rem",
    fontFamily: "var(--font-mono)",
    color: "var(--text-muted)",
    display: "block",
    marginBottom: "2px",
  },
  eventText: {
    fontSize: "0.875rem",
    color: "var(--text-primary)",
    margin: "0 0 0.375rem",
    fontWeight: 500,
  },
  meta: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
  },
  code: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    background: "var(--bg-code)",
    padding: "0px 4px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-subtle)",
    color: "var(--color-danger)",
  },
};
