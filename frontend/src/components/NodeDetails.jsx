/**
 * TRINETRA — NodeDetails
 *
 * Right-side inspector panel shown when a graph node is selected.
 *
 * Data sources (exact backend contract):
 * - vendor node -> GET /vendor/<numeric-id> -> { vendor: {...}, pgp_keys: [...] }
 * - pgp node    -> GET /pgp/<numeric-id>    -> { pgp: {...}, vendors: [...] }
 *
 * Only renders fields actually returned by the API. Missing fields show
 * "Not available from current intelligence source." — never fabricated.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getVendor, getPGP } from "../services/api";
import { parseNodeId, getNodeConfig } from "../utils/graphUtils";
import {
  safeStr,
  formatEntityType,
  formatId,
} from "../utils/formatters";
import ConfidenceBadge from "./ConfidenceBadge";
import { SkeletonField } from "./LoadingState";
import ErrorState from "./ErrorState";

const NA = "Not available from current intelligence source.";

export default function NodeDetails({
  nodeId,
  nodeData,
  onFocusNode,
  onShowNeighbors,
  onOpenEntity,
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const { type } = parseNodeId(nodeId);
  const config = getNodeConfig(type);

  // Fetch entity details when nodeId changes
  useEffect(() => {
    if (!nodeId) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);

    async function load() {
      try {
        // api.getVendor/getPGP accept node-style ids and resolve numeric ids
        if (type === "vendor") {
          const result = await getVendor(nodeId);
          if (!cancelled) setDetail(result);
        } else if (type === "pgp") {
          const result = await getPGP(nodeId);
          if (!cancelled) setDetail(result);
        }
        // Unknown type: no endpoint exists in the current contract
      } catch (err) {
        if (!cancelled) {
          const isNetwork =
            err.code === "ERR_NETWORK" || err.code === "ECONNREFUSED" || !err.response;
          setError(
            isNetwork
              ? "Unable to connect to intelligence backend."
              : (err.response?.data?.error ??
                 err.response?.data?.message ??
                 `Entity details unavailable (${err.response?.status ?? "network error"}).`)
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [nodeId, type]);

  if (!nodeId) {
    return (
      <div style={styles.empty}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ opacity: 0.25 }} aria-hidden="true">
          <circle cx="10" cy="10" r="6" />
          <line x1="21" y1="21" x2="14.5" y2="14.5" />
        </svg>
        <p style={styles.emptyTitle}>No entity selected</p>
        <p style={styles.emptyMsg}>Click a node in the graph to inspect it.</p>
      </div>
    );
  }

  const displayLabel = nodeData?.label ?? detail?.vendor?.label ?? detail?.pgp?.label ?? formatId(nodeId);

  return (
    <div style={styles.panel}>
      {/* Entity header */}
      <div style={{ ...styles.section, background: "var(--bg-hover)", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }}>
        <div style={styles.entityHeader}>
          <div
            style={{
              ...styles.entityDot,
              background: config.background,
              border: `2px solid ${config.borderColor}`,
              borderRadius: type === "pgp" ? "0" : "50%",
              transform: type === "pgp" ? "rotate(45deg)" : "none",
            }}
            aria-hidden="true"
          />
          <div>
            <span className={`badge badge--${type === "vendor" ? "vendor" : type === "pgp" ? "pgp" : "neutral"}`}>
              {formatEntityType(type)}
            </span>
            <h3 style={styles.entityName}>{displayLabel}</h3>
          </div>
        </div>
        <div style={styles.entityId}>
          <span className="label-caps">ID</span>
          <code style={styles.idCode}>{formatId(nodeId)}</code>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={styles.section}>
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={styles.section}>
          <ErrorState message={error} compact />
        </div>
      )}

      {/* Detail sections */}
      {!loading && !error && type === "vendor" && (
        <VendorSection detail={detail} onOpenEntity={onOpenEntity} />
      )}
      {!loading && !error && type === "pgp" && (
        <PGPSection detail={detail} onOpenEntity={onOpenEntity} />
      )}
      {!loading && !error && type !== "vendor" && type !== "pgp" && (
        <div style={styles.section}>
          <p style={styles.na}>{NA}</p>
        </div>
      )}

      {/* Confidence — prepared for future backend integration */}
      <div style={styles.section}>
        <span className="label-caps" style={{ display: "block", marginBottom: "0.375rem" }}>
          Attribution Confidence
        </span>
        <ConfidenceBadge score={detail?._raw?.confidence ?? detail?._raw?.confidence_score} />
      </div>

      {/* Actions */}
      <div style={styles.section}>
        <div className="label-caps" style={{ marginBottom: "0.5rem" }}>Actions</div>
        <div style={styles.actions}>
          <button className="btn btn--secondary btn--sm" onClick={() => onFocusNode?.(nodeId)} aria-label="Focus this node">
            Focus Node
          </button>
          <button className="btn btn--secondary btn--sm" onClick={() => onShowNeighbors?.(nodeId)} aria-label="Show neighbors">
            Show Neighbors
          </button>
          {type === "vendor" && (
            <button
              className="btn btn--primary btn--sm"
              onClick={() => navigate(`/actors/${encodeURIComponent(nodeId)}`)}
              aria-label="Open actor profile"
            >
              Open Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Vendor detail sections ── */
function VendorSection({ detail, onOpenEntity }) {
  const v = detail?.vendor;

  return (
    <>
      <div style={styles.section}>
        <div className="label-caps" style={{ marginBottom: "0.75rem" }}>Profile</div>
        <Field label="Username" value={v?.username} />
        <Field label="Alias" value={v?.alias} />
        <Field label="Email" value={v?.email} mono />
        <Field label="Bitcoin Wallet" value={v?.bitcoinWallet} mono />
      </div>

      <div style={styles.section}>
        <div className="label-caps" style={{ marginBottom: "0.75rem" }}>
          Relationships{detail?.pgpKeys?.length ? ` (${detail.pgpKeys.length})` : ""}
        </div>
        {detail?.pgpKeys?.length > 0 ? (
          detail.pgpKeys.map((k) => (
            <button
              key={k.id ?? k.label}
              style={styles.relButton}
              onClick={() => k.id && onOpenEntity?.(k.id)}
              title={k.fingerprint ? `Fingerprint: ${k.fingerprint}` : undefined}
              aria-label={`Inspect ${safeStr(k.label, "PGP key")}`}
            >
              <span style={{ ...styles.relDot }} aria-hidden="true" />
              <code style={styles.relCode}>{safeStr(k.label, "Unknown")}</code>
            </button>
          ))
        ) : (
          <p style={styles.na}>No PGP associations returned by the API.</p>
        )}
      </div>
    </>
  );
}

/* ── PGP detail sections ── */
function PGPSection({ detail, onOpenEntity }) {
  const p = detail?.pgp;

  return (
    <>
      <div style={styles.section}>
        <div className="label-caps" style={{ marginBottom: "0.75rem" }}>Key Information</div>
        <Field label="Fingerprint" value={p?.fingerprint} mono />
      </div>

      <div style={styles.section}>
        <div className="label-caps" style={{ marginBottom: "0.75rem" }}>
          Associated Vendors{detail?.vendors?.length ? ` (${detail.vendors.length})` : ""}
        </div>
        {detail?.vendors?.length > 0 ? (
          detail.vendors.map((v) => (
            <button
              key={v.id ?? v.label}
              style={styles.relButton}
              onClick={() => v.id && onOpenEntity?.(v.id)}
              aria-label={`Inspect ${safeStr(v.label, "vendor")}`}
            >
              <span style={{ ...styles.relDot, background: "var(--color-vendor)" }} aria-hidden="true" />
              <code style={styles.relCode}>{safeStr(v.label, "Unknown")}</code>
            </button>
          ))
        ) : (
          <p style={styles.na}>No associated vendors returned by the API.</p>
        )}
      </div>
    </>
  );
}

/* ── Reusable field row ── */
function Field({ label, value, mono = false }) {
  const displayValue = value !== null && value !== undefined && value !== "";

  return (
    <div style={styles.fieldRow}>
      <span className="label-caps">{label}</span>
      {displayValue ? (
        <span style={mono ? styles.monoValue : styles.fieldValue}>{value}</span>
      ) : (
        <span style={styles.naValue}>{NA}</span>
      )}
    </div>
  );
}

const styles = {
  panel: {
    height: "100%",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    padding: "2rem",
    textAlign: "center",
    gap: "0.5rem",
    color: "var(--text-muted)",
  },
  emptyTitle: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
  },
  emptyMsg: {
    fontSize: "0.775rem",
    color: "var(--text-muted)",
    margin: 0,
  },
  section: {
    padding: "0.875rem 1rem",
    borderBottom: "1px solid var(--border-subtle)",
  },
  entityHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    marginBottom: "0.625rem",
  },
  entityDot: {
    width: "20px",
    height: "20px",
    flexShrink: 0,
    marginTop: "3px",
  },
  entityName: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: "0.25rem 0 0",
    lineHeight: 1.2,
    wordBreak: "break-all",
  },
  entityId: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  idCode: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    background: "var(--bg-code)",
    padding: "1px 5px",
    borderRadius: "3px",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
  },
  fieldRow: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    marginBottom: "0.625rem",
  },
  fieldValue: {
    fontSize: "0.8125rem",
    color: "var(--text-primary)",
    fontWeight: 500,
  },
  monoValue: {
    fontSize: "0.75rem",
    fontFamily: "var(--font-mono)",
    color: "var(--text-primary)",
    wordBreak: "break-all",
  },
  naValue: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    fontStyle: "italic",
  },
  na: {
    fontSize: "0.775rem",
    color: "var(--text-muted)",
    fontStyle: "italic",
  },
  relButton: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "4px 6px",
    margin: "0 -6px",
    background: "none",
    border: "1px solid transparent",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    fontFamily: "inherit",
    transition: "background var(--transition-fast), border-color var(--transition-fast)",
  },
  relDot: {
    width: "9px",
    height: "9px",
    borderRadius: "50%",
    background: "var(--color-pgp)",
    flexShrink: 0,
  },
  relCode: {
    fontSize: "0.75rem",
    fontFamily: "var(--font-mono)",
    color: "var(--text-secondary)",
    wordBreak: "break-all",
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  },
};
