/**
 * TRINETRA — Login Page
 *
 * Frontend shell only. No authentication endpoint exists in the current
 * backend contract. Structured for real auth integration later.
 *
 * Demo gate: "Continue to Investigation Console" button enters the app.
 */

import { useNavigate } from "react-router-dom";

export default function Login({ onEnter }) {
  const navigate = useNavigate();

  function handleContinue() {
    if (onEnter) {
      onEnter();
    } else {
      navigate("/");
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo / Brand */}
        <div style={styles.brand}>
          <div style={styles.brandMark}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="1.8" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <circle cx="12" cy="12" r="8" strokeOpacity="0.3" />
              <path d="M12 4V2M12 22v-2M4 12H2M22 12h-2" strokeOpacity="0.5" />
              <line x1="7" y1="7" x2="5" y2="5" strokeOpacity="0.4" />
              <line x1="17" y1="7" x2="19" y2="5" strokeOpacity="0.4" />
              <line x1="7" y1="17" x2="5" y2="19" strokeOpacity="0.4" />
              <line x1="17" y1="17" x2="19" y2="19" strokeOpacity="0.4" />
            </svg>
          </div>
          <div>
            <h1 style={styles.brandName}>TRINETRA</h1>
            <p style={styles.brandSub}>Threat Intelligence Investigation Platform</p>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Demo notice */}
        <div style={styles.notice}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={styles.noticeText}>
            Authentication integration pending. Operating in demonstration mode.
          </span>
        </div>

        {/* Credential fields — structured for future auth backend */}
        <div style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="analyst-id">Analyst ID</label>
            <input
              id="analyst-id"
              type="text"
              style={styles.input}
              placeholder="Enter analyst identifier"
              autoComplete="username"
              disabled
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="access-key">Access Key</label>
            <input
              id="access-key"
              type="password"
              style={styles.input}
              placeholder="Enter access key"
              autoComplete="current-password"
              disabled
            />
          </div>
        </div>

        <p style={styles.disabledNote}>
          Credential fields are disabled — authentication endpoint not yet available.
        </p>

        {/* Demo entry button */}
        <button
          style={styles.continueBtn}
          onClick={handleContinue}
          aria-label="Continue to Investigation Console"
        >
          Continue to Investigation Console
        </button>

        <p style={styles.version}>TRINETRA v0.1 — Investigation Console</p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100vw",
    background: "var(--bg-app)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
  },
  card: {
    background: "var(--bg-panel)",
    border: "1px solid var(--border-panel)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-lg)",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "400px",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "0.875rem",
    marginBottom: "1.5rem",
  },
  brandMark: {
    width: "48px",
    height: "48px",
    background: "var(--color-selected-light)",
    border: "1px solid #90caf9",
    borderRadius: "var(--radius-lg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  brandName: {
    fontSize: "1.5rem",
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "var(--text-primary)",
    margin: 0,
  },
  brandSub: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    margin: "2px 0 0",
    letterSpacing: "0.03em",
    lineHeight: 1.3,
  },
  divider: {
    height: "1px",
    background: "var(--border-subtle)",
    marginBottom: "1.25rem",
  },
  notice: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.5rem",
    background: "var(--color-selected-light)",
    border: "1px solid #90caf9",
    borderRadius: "var(--radius-md)",
    padding: "0.625rem 0.75rem",
    marginBottom: "1.25rem",
  },
  noticeText: {
    fontSize: "0.775rem",
    color: "var(--color-selected)",
    lineHeight: 1.4,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.875rem",
    marginBottom: "0.625rem",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  },
  label: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    letterSpacing: "0.04em",
  },
  input: {
    height: "36px",
    padding: "0 0.75rem",
    border: "1px solid var(--border-panel)",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-hover)",
    color: "var(--text-muted)",
    cursor: "not-allowed",
    fontSize: "0.875rem",
  },
  disabledNote: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    textAlign: "center",
    marginBottom: "1.25rem",
    fontStyle: "italic",
  },
  continueBtn: {
    width: "100%",
    height: "40px",
    background: "var(--color-selected)",
    color: "white",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--font-family)",
    transition: "background 150ms",
    marginBottom: "1rem",
    letterSpacing: "0.02em",
  },
  version: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    textAlign: "center",
    margin: 0,
  },
};
