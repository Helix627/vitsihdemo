/**
 * TRINETRA — ConfidenceBadge
 *
 * Prepared for future integration when/if the backend provides
 * attribution confidence scores. Currently renders "Confidence unavailable"
 * when no score is provided.
 *
 * DO NOT pass fabricated scores into this component.
 */

export default function ConfidenceBadge({ score }) {
  // If backend provides a numeric score in [0, 100]
  if (typeof score === "number" && !isNaN(score)) {
    const level = score >= 75 ? "high" : score >= 45 ? "medium" : "low";
    const colors = {
      high: { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
      medium: { bg: "#fff3e0", color: "#ef6c00", border: "#ffcc80" },
      low: { bg: "#ffebee", color: "#c62828", border: "#ef9a9a" },
    };
    const c = colors[level];
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "0.7rem",
          fontWeight: 600,
          padding: "2px 7px",
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${c.border}`,
          background: c.bg,
          color: c.color,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
        title={`Confidence: ${score}%`}
      >
        {score}% — {level}
      </span>
    );
  }

  // Default: score not available from current API
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: "0.7rem",
        fontWeight: 500,
        padding: "2px 7px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-hover)",
        color: "var(--text-muted)",
        letterSpacing: "0.04em",
      }}
    >
      Confidence unavailable
    </span>
  );
}
