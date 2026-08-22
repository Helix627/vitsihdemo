/**
 * TRINETRA — EvidenceItem
 *
 * Structured evidence row derived from graph relationship data.
 * Only renders fields that exist — never fabricates source/score/date.
 */

import { safeStr, formatEntityType, entityTypeBadgeClass } from "../utils/formatters";

export default function EvidenceItem({ type, source, entity, relatedEntity, extra }) {
  const hasSource = source != null && source !== "";
  const hasEntity = entity != null && entity !== "";
  const hasRelated = relatedEntity != null && relatedEntity !== "";

  return (
    <div style={styles.row} className="fade-in">
      <div style={styles.badge}>
        <span className={`badge ${entityTypeBadgeClass(type) || "badge--neutral"}`}>
          {formatEntityType(type)}
        </span>
      </div>

      <div style={styles.fields}>
        {hasSource && (
          <div style={styles.field}>
            <span className="label-caps">Source</span>
            <span style={styles.value}>{safeStr(source)}</span>
          </div>
        )}
        {hasEntity && (
          <div style={styles.field}>
            <span className="label-caps">Entity</span>
            <code style={styles.code}>{safeStr(entity)}</code>
          </div>
        )}
        {hasRelated && (
          <div style={styles.field}>
            <span className="label-caps">Related</span>
            <code style={styles.code}>{safeStr(relatedEntity)}</code>
          </div>
        )}
        {extra && (
          <div style={styles.field}>
            <span className="label-caps">Detail</span>
            <span style={styles.value}>{safeStr(extra)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  row: {
    display: "flex",
    gap: "0.75rem",
    padding: "0.75rem 0",
    borderBottom: "1px solid var(--border-subtle)",
  },
  badge: {
    flexShrink: 0,
    paddingTop: "2px",
  },
  fields: {
    flex: 1,
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: "100px",
  },
  value: {
    fontSize: "0.8125rem",
    color: "var(--text-primary)",
  },
  code: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.75rem",
    background: "var(--bg-code)",
    padding: "1px 5px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-subtle)",
    color: "var(--color-danger)",
  },
};
