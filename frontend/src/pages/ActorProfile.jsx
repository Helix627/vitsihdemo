/**
 * TRINETRA — Actor Profile (/actors/:id)
 *
 * Investigation profile for a vendor (or PGP key) entity.
 *
 * Data sources:
 * - GET /vendor/<id> or GET /pgp/<id>  -> profile fields + relationships
 * - GET /graph                         -> subgraph preview derivation
 *
 * Only renders sections supported by actual API data. No invented
 * location, threat score, attribution, or timestamps.
 *
 * Also exports ActorsDirectory — the /actors index listing vendor
 * entities derived from the loaded relationship graph.
 */

import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getVendor, getPGP, getGraph } from "../services/api";
import GraphView from "../components/GraphView";
import EvidenceItem from "../components/EvidenceItem";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonField } from "../components/LoadingState";
import ConfidenceBadge from "../components/ConfidenceBadge";
import { parseNodeId } from "../utils/graphUtils";
import {
  formatEntityType,
  formatCount,
} from "../utils/formatters";

export default function ActorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { type } = parseNodeId(id);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState(null);

  const [graphData, setGraphData] = useState(null);
  const [graphError, setGraphError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setDetailLoading(true);
    setDetailError(null);

    async function load() {
      try {
        const result = type === "pgp" ? await getPGP(id) : await getVendor(id);
        if (!cancelled) setDetail(result);
      } catch (err) {
        if (!cancelled) {
          const isNetwork =
            err.code === "ERR_NETWORK" || err.code === "ECONNREFUSED" || !err.response;
          setDetailError({
            message: isNetwork
              ? "Unable to connect to intelligence backend."
              : (err.response?.data?.error ??
                 err.response?.data?.message ??
                 `Entity unavailable (${err.response?.status ?? "network error"}).`),
            status: err.response?.status ?? null,
          });
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id, type]);

  useEffect(() => {
    let cancelled = false;
    getGraph()
      .then((data) => { if (!cancelled) setGraphData(data); })
      .catch((err) => {
        if (!cancelled) {
          setGraphError(
            err.code === "ERR_NETWORK" || !err.response
              ? "Unable to connect to intelligence backend."
              : "Failed to load graph context."
          );
        }
      });
    return () => { cancelled = true; };
  }, []);

  /* Derive the closed-neighborhood subgraph for the preview panel */
  const subgraph = useMemo(() => {
    if (!graphData || !id) return null;
    const self = graphData.nodes.find((n) => n.data.id === id);
    if (!self) return null;
    const edges = graphData.edges.filter(
      (e) => e.data.source === id || e.data.target === id
    );
    const ids = new Set([id]);
    edges.forEach((e) => { ids.add(e.data.source); ids.add(e.data.target); });
    return {
      nodes: graphData.nodes.filter((n) => ids.has(n.data.id)),
      edges,
    };
  }, [graphData, id]);

  const label =
    detail?.vendor?.label ?? detail?.pgp?.label ?? null;

  function handleSubgraphNodeSelect(nodeId, nodeData) {
    if (nodeId === id) return;
    const t = parseNodeId(nodeId).type;
    if (t === "vendor") {
      navigate(`/actors/${encodeURIComponent(nodeId)}`);
    } else {
      navigate("/graph", {
        state: { focusEntity: { id: nodeId, label: nodeData?.label ?? nodeId } },
      });
    }
  }

  return (
    <div className="page-container">
      {/* ── Header ── */}
      <div className="panel" style={{ marginBottom: "var(--space-5)" }}>
        <div style={styles.header}>
          <div>
            <div style={styles.headerMeta}>
              <span className={`badge badge--${type === "vendor" ? "vendor" : type === "pgp" ? "pgp" : "neutral"}`}>
                {formatEntityType(type)}
              </span>
              {!detailLoading && !detailError && (
                <span className="badge badge--info">Available</span>
              )}
            </div>
            <h1 style={styles.name}>
              {detailLoading ? "Loading entity…" : (label ?? formatEntityType(type) + " " + String(id))}
            </h1>
            <div style={styles.ids}>
              <span className="label-caps">ID</span>
              <code>{String(id)}</code>
              {type !== "unknown" && (
                <>
                  <span className="label-caps" style={{ marginLeft: "0.75rem" }}>Numeric ID</span>
                  <code>{parseNodeId(id).numericId}</code>
                </>
              )}
            </div>
          </div>
          <div style={styles.confidenceBox}>
            <span className="label-caps">Attribution Confidence</span>
            <ConfidenceBadge score={detail?._raw?.confidence ?? detail?._raw?.confidence_score} />
          </div>
        </div>
      </div>

      {/* ── Detail error (404 / network) ── */}
      {detailError && (
        <div className="panel" style={{ marginBottom: "var(--space-5)" }}>
          <div className="panel__body">
            <ErrorState
              message={
                detailError.status === 404
                  ? "This entity was not found in the intelligence backend."
                  : detailError.message
              }
              onRetry={() => window.location.reload()}
            />
          </div>
        </div>
      )}

      {/* ── Overview ── */}
      <div className="dashboard-lower">
        <section>
          <SectionTitle>Overview</SectionTitle>
          <div className="panel">
            <div className="panel__body">
              {detailLoading && <><SkeletonField /><SkeletonField /><SkeletonField /></>}
              {!detailLoading && !detailError && type === "vendor" && (
                <>
                  <Field label="Username" value={detail?.vendor?.username} />
                  <Field label="Alias" value={detail?.vendor?.alias} />
                  <Field label="Email" value={detail?.vendor?.email} mono />
                  <Field label="Bitcoin Wallet" value={detail?.vendor?.bitcoinWallet} mono />
                </>
              )}
              {!detailLoading && !detailError && type === "pgp" && (
                <Field label="Fingerprint" value={detail?.pgp?.fingerprint} mono />
              )}
              {!detailLoading && !detailError && type !== "vendor" && type !== "pgp" && (
                <p style={styles.na}>Not available from current intelligence source.</p>
              )}
            </div>
          </div>
        </section>

        {/* ── Relationships ── */}
        <section>
          <SectionTitle>Relationships</SectionTitle>
          <div className="panel">
            <div className="panel__body">
              {detailLoading && <><SkeletonField /><SkeletonField /></>}
              {!detailLoading && !detailError && type === "vendor" && (
                <RelList
                  items={detail?.pgpKeys}
                  emptyMsg="No PGP associations returned by the API."
                  renderLabel={(k) => k.label}
                  onOpen={(k) =>
                    k.id
                      ? navigate("/graph", { state: { focusEntity: { id: k.id, label: k.label } } })
                      : null
                  }
                />
              )}
              {!detailLoading && !detailError && type === "pgp" && (
                <RelList
                  items={detail?.vendors}
                  emptyMsg="No associated vendors returned by the API."
                  renderLabel={(v) => v.label}
                  onOpen={(v) => v.id && navigate(`/actors/${encodeURIComponent(v.id)}`)}
                />
              )}
            </div>
          </div>
        </section>

        {/* ── Graph preview ── */}
        <section>
          <SectionTitle>Graph Context</SectionTitle>
          <div className="panel" style={{ height: "320px", overflow: "hidden", position: "relative" }}>
            {subgraph ? (
              <GraphView
                data={subgraph}
                loading={false}
                error={null}
                layout="cose"
                onNodeSelect={handleSubgraphNodeSelect}
                onClearSelect={() => {}}
                selectedNodeId={null}
                onCyReady={() => {}}
              />
            ) : graphError ? (
              <div style={styles.centeredNote}>{graphError}</div>
            ) : (
              <div style={styles.centeredNote}>Loading graph context…</div>
            )}
          </div>
        </section>

        {/* ── Evidence ── */}
        <section>
          <SectionTitle>Evidence</SectionTitle>
          <div className="panel">
            <div className="panel__body">
              {!detailLoading && !detailError && type === "vendor" && (
                <EvidenceList
                  items={detail?.pgpKeys}
                  renderItem={(k) => (
                    <EvidenceItem
                      key={k.id ?? k.label}
                      type="pgp"
                      source={detail?.vendor?.detailUrl ? `GET ${detail.vendor.detailUrl}` : "GET /vendor/<id>"}
                      entity={String(id)}
                      relatedEntity={k.id}
                    />
                  )}
                  emptyMsg="No evidence records derivable from current API data."
                />
              )}
              {!detailLoading && !detailError && type === "pgp" && (
                <EvidenceList
                  items={detail?.vendors}
                  renderItem={(v) => (
                    <EvidenceItem
                      key={v.id ?? v.label}
                      type="vendor"
                      source={detail?.pgp?.detailUrl ? `GET ${detail.pgp.detailUrl}` : "GET /pgp/<id>"}
                      entity={String(id)}
                      relatedEntity={v.id}
                    />
                  )}
                  emptyMsg="No evidence records derivable from current API data."
                />
              )}
              {(detailLoading || detailError) && (
                <p style={styles.na}>Evidence unavailable for this entity right now.</p>
              )}
            </div>
          </div>
        </section>

        {/* ── Activity ── */}
        <section>
          <SectionTitle>Activity</SectionTitle>
          <div className="panel">
            <div className="panel__body">
              <EmptyState
                title="No activity data available"
                message="The current API does not expose timestamped activity for this entity."
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* =========================================================
   Actors Directory — /actors index derived from /graph nodes
   ========================================================= */

export function ActorsDirectory() {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getGraph()
      .then((data) => { if (!cancelled) setGraphData(data); })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.code === "ERR_NETWORK" || !err.response
              ? "Unable to connect to intelligence backend."
              : "Failed to load actor list."
          );
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /** Vendors with connection counts derived from loaded graph edges. */
  const vendors = useMemo(() => {
    if (!graphData) return [];
    const degree = {};
    graphData.edges.forEach((e) => {
      degree[e.data.source] = (degree[e.data.source] ?? 0) + 1;
      degree[e.data.target] = (degree[e.data.target] ?? 0) + 1;
    });
    return graphData.nodes
      .filter((n) => n.data.type === "vendor")
      .map((n) => ({
        id: n.data.id,
        label: n.data.label,
        username: n.data.username || null,
        connections: degree[n.data.id] ?? 0,
      }))
      .sort((a, b) => b.connections - a.connections);
  }, [graphData]);

  const filtered = vendors.filter(
    (v) =>
      !filter.trim() ||
      v.label.toLowerCase().includes(filter.trim().toLowerCase()) ||
      v.id.toLowerCase().includes(filter.trim().toLowerCase())
  );

  return (
    <div className="page-container">
      <div style={styles.dirHeader}>
        <div>
          <h1 style={styles.dirTitle}>Actors</h1>
          <p style={styles.dirSub}>
            Vendor entities derived from the loaded relationship graph.
          </p>
        </div>
        <input
          style={styles.dirFilter}
          type="text"
          placeholder="Filter by name or ID…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter actors"
        />
      </div>

      <div className="panel">
        {loading && (
          <div className="panel__body"><SkeletonField /><SkeletonField /><SkeletonField /></div>
        )}
        {!loading && error && (
          <div className="panel__body"><ErrorState message={error} onRetry={() => window.location.reload()} /></div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="panel__body">
            <EmptyState
              title={vendors.length === 0 ? "No vendor entities in the loaded graph" : "No actors match the filter"}
              message={vendors.length === 0
                ? "The relationship graph did not return any vendor nodes."
                : undefined}
            />
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Alias</th>
                <th style={styles.th}>Entity ID</th>
                <th style={styles.th}>Connections</th>
                <th style={styles.th} aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} style={styles.tr}>
                  <td style={styles.tdStrong}>{v.label}</td>
                  <td style={styles.td}><code>{v.id}</code></td>
                  <td style={styles.td}>{formatCount(v.connections)}</td>
                  <td style={styles.td}>
                    <Link
                      className="btn btn--secondary btn--sm"
                      to={`/actors/${encodeURIComponent(v.id)}`}
                      aria-label={`Open profile for ${v.label}`}
                    >
                      Open Profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── Shared small components ── */

function SectionTitle({ children }) {
  return (
    <div style={styles.sectionHeader}>
      <h2 style={styles.sectionTitleText}>{children}</h2>
    </div>
  );
}

function Field({ label, value, mono = false }) {
  const present = value !== null && value !== undefined && value !== "";
  return (
    <div style={styles.fieldRow}>
      <span className="label-caps">{label}</span>
      {present ? (
        <span style={mono ? styles.monoValue : styles.fieldValue}>{value}</span>
      ) : (
        <span style={styles.na}>Not available from current intelligence source.</span>
      )}
    </div>
  );
}

function RelList({ items, emptyMsg, renderLabel, onOpen }) {
  if (!items || items.length === 0) {
    return <p style={styles.na}>{emptyMsg}</p>;
  }
  return (
    <div style={styles.relWrap}>
      {items.map((item, i) => (
        <button key={item.id ?? i} style={styles.relRow} onClick={() => onOpen(item)}>
          <span style={styles.relDot} aria-hidden="true" />
          <span style={styles.relLabel}>{renderLabel(item)}</span>
          {item.fingerprint && <code style={styles.relCode}>{item.fingerprint}</code>}
        </button>
      ))}
    </div>
  );
}

function EvidenceList({ items, renderItem, emptyMsg }) {
  if (!items || items.length === 0) {
    return <p style={styles.na}>{emptyMsg}</p>;
  }
  return <div>{items.map(renderItem)}</div>;
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1rem",
    padding: "var(--space-5)",
    flexWrap: "wrap",
  },
  headerMeta: { display: "flex", gap: "0.5rem", marginBottom: "0.5rem" },
  name: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  ids: { display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.5rem" },
  confidenceBox: { display: "flex", flexDirection: "column", gap: "0.375rem" },
  sectionHeader: { marginBottom: "0.75rem" },
  sectionTitleText: {
    fontSize: "0.9375rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
  },
  fieldRow: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    marginBottom: "0.625rem",
  },
  fieldValue: { fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: 500 },
  monoValue: {
    fontSize: "0.8125rem",
    fontFamily: "var(--font-mono)",
    color: "var(--text-primary)",
    wordBreak: "break-all",
  },
  na: { fontSize: "0.775rem", color: "var(--text-muted)", fontStyle: "italic" },
  relWrap: { display: "flex", flexDirection: "column", gap: "2px" },
  relRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "5px 6px",
    margin: "0 -6px",
    background: "none",
    border: "1px solid transparent",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
  },
  relDot: {
    width: "9px", height: "9px", borderRadius: "50%",
    background: "var(--color-pgp)", flexShrink: 0,
  },
  relLabel: { fontSize: "0.8125rem", color: "var(--text-primary)", fontWeight: 500 },
  relCode: {
    fontSize: "0.6875rem", fontFamily: "var(--font-mono)",
    color: "var(--text-muted)", overflow: "hidden",
    textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "220px",
  },
  centeredNote: {
    position: "absolute", inset: 0, display: "flex",
    alignItems: "center", justifyContent: "center",
    color: "var(--text-muted)", fontSize: "0.8rem", padding: "1rem",
    textAlign: "center",
  },
  dirHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-end", marginBottom: "var(--space-4)",
    gap: "1rem", flexWrap: "wrap",
  },
  dirTitle: { fontSize: "1.125rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" },
  dirSub: { fontSize: "0.775rem", color: "var(--text-muted)", margin: "2px 0 0" },
  dirFilter: {
    height: "34px", padding: "0 0.75rem", minWidth: "240px",
    border: "1px solid var(--border-panel)", borderRadius: "var(--radius-md)",
    background: "var(--bg-panel)", fontSize: "0.8125rem", color: "var(--text-primary)",
    outline: "none",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" },
  th: {
    textAlign: "left", padding: "0.625rem 1rem",
    borderBottom: "1px solid var(--border-subtle)",
    fontSize: "0.7rem", letterSpacing: "0.06em", textTransform: "uppercase",
    color: "var(--text-muted)", fontWeight: 600,
  },
  tr: { transition: "background var(--transition-fast)" },
  td: { padding: "0.5625rem 1rem", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-secondary)" },
  tdStrong: { padding: "0.5625rem 1rem", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontWeight: 500 },
};
