import React, { useEffect, useState, useRef } from "react";
import {
  fetchExportPreview,
  downloadExportCSV,
  downloadExportJSON,
  downloadGraphSnapshot,
} from "../services/api";

// ─────────────────────────────────────────────────────────────────────────────
// ExportModal — Phase 5
// Three export modes: CSV table, CTI JSON package, PDF/Print dossier
// ─────────────────────────────────────────────────────────────────────────────
const MARKET_NAMES = {
  1: "Agora",
  101: "ShadowBay",
  102: "NightMarket",
};

const ExportModal = ({ isOpen, onClose, timeRange, graphData, stats }) => {
  const [mode, setMode] = useState("csv");   // csv | json | pdf
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const printRef = useRef(null);

  const [startTs, endTs] = timeRange || [null, null];

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchExportPreview(startTs, endTs)
      .then(setPreview)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, startTs, endTs]);

  if (!isOpen) return null;

  const handleCSV = () => downloadExportCSV(startTs, endTs, 5000);
  const handleJSON = () => downloadExportJSON(startTs, endTs);
  const handleSnapshot = () => downloadGraphSnapshot();

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>CTI Investigation Dossier — NTRO PS 26151</title>
      <style>
        body { font-family: 'Courier New', monospace; background: #fff; color: #111; margin: 40px; }
        h1 { font-size: 22px; border-bottom: 3px solid #111; padding-bottom: 8px; margin-bottom: 4px; }
        h2 { font-size: 14px; color: #444; margin: 0 0 24px; }
        h3 { font-size: 14px; border-bottom: 1px solid #ccc; padding: 4px 0; margin: 24px 0 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
        th { background: #222; color: #fff; padding: 6px 8px; text-align: left; }
        td { border-bottom: 1px solid #e5e5e5; padding: 5px 8px; }
        tr:nth-child(even) td { background: #f8f8f8; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
        .badge-red { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
        .badge-green { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
        .kpi-row { display: flex; gap: 24px; margin: 8px 0 20px; }
        .kpi { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 16px; min-width: 110px; }
        .kpi-val { font-size: 22px; font-weight: 900; }
        .kpi-lbl { font-size: 10px; color: #64748b; margin-top: 2px; }
        .section { margin-bottom: 32px; }
        .footer { margin-top: 40px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        @media print { body { margin: 20px; } button { display: none; } }
      </style>
    </head><body>
      <h1>🔍 Threat Intelligence Investigation Dossier</h1>
      <h2>Dark Web Identity Resolution Platform &nbsp;|&nbsp; NTRO Problem Statement 26151</h2>

      <div class="kpi-row">
        <div class="kpi"><div class="kpi-val">${preview?.vendor_count ?? "—"}</div><div class="kpi-lbl">Threat Actors</div></div>
        <div class="kpi"><div class="kpi-val">${preview?.graph_nodes ?? stats?.total_nodes ?? "—"}</div><div class="kpi-lbl">Graph Nodes</div></div>
        <div class="kpi"><div class="kpi-val">${preview?.graph_edges ?? stats?.edges ?? "—"}</div><div class="kpi-lbl">Graph Edges</div></div>
        <div class="kpi"><div class="kpi-val">${stats?.communities_count ?? "—"}</div><div class="kpi-lbl">Threat Syndicates</div></div>
      </div>

      ${startTs ? `<p><strong>Timeline Filter:</strong> ${new Date(startTs * 1000).getFullYear()} → ${new Date(endTs * 1000).getFullYear()}</p>` : "<p><strong>Timeline:</strong> All recorded activity</p>"}

      <div class="section">
        <h3>📊 Entity Distribution</h3>
        <table>
          <tr><th>Entity Type</th><th>Count</th></tr>
          <tr><td>Vendors / Aliases</td><td>${stats?.aliases ?? "—"}</td></tr>
          <tr><td>Usernames</td><td>${stats?.usernames ?? "—"}</td></tr>
          <tr><td>Bitcoin Wallets</td><td>${stats?.bitcoin_wallets ?? "—"}</td></tr>
          <tr><td>PGP Keys</td><td>${stats?.pgp_keys ?? "—"}</td></tr>
          <tr><td>Email Addresses</td><td>${stats?.emails ?? "—"}</td></tr>
        </table>
      </div>

      <div class="section">
        <h3>🌐 Marketplace Coverage</h3>
        <table>
          <tr><th>Marketplace</th><th>ID</th><th>Type</th></tr>
          <tr><td>Agora Marketplace</td><td>1</td><td>Primary Dataset</td></tr>
          <tr><td>ShadowBay</td><td>101</td><td>Synthetic Intelligence</td></tr>
          <tr><td>NightMarket</td><td>102</td><td>Synthetic Intelligence</td></tr>
        </table>
      </div>

      <div class="section">
        <h3>🧬 Graph Topology Metrics</h3>
        <table>
          <tr><th>Metric</th><th>Value</th></tr>
          <tr><td>Network Density</td><td>${stats?.density ?? "—"}</td></tr>
          <tr><td>Connected Components</td><td>${stats?.connected_components ?? stats?.communities_count ?? "—"}</td></tr>
          <tr><td>Total Nodes</td><td>${stats?.total_nodes ?? "—"}</td></tr>
          <tr><td>Total Edges</td><td>${stats?.edges ?? "—"}</td></tr>
        </table>
      </div>

      <div class="section">
        <h3>🔬 Analysis Capabilities Deployed</h3>
        <table>
          <tr><th>Capability</th><th>Status</th></tr>
          <tr><td>Deterministic Identity Resolution (PGP, BTC, XMR)</td><td><span class="badge badge-green">ACTIVE</span></td></tr>
          <tr><td>Probabilistic Stylometric Authorship Attribution</td><td><span class="badge badge-green">ACTIVE</span></td></tr>
          <tr><td>Tor Hidden Service Clearnet Origin Attribution</td><td><span class="badge badge-green">ACTIVE</span></td></tr>
          <tr><td>Cross-Marketplace Vendor Clustering</td><td><span class="badge badge-green">ACTIVE</span></td></tr>
          <tr><td>Analyst Review & Force-Merge Override</td><td><span class="badge badge-green">ACTIVE</span></td></tr>
          <tr><td>Timeline Temporal Range Filtering</td><td><span class="badge badge-green">ACTIVE</span></td></tr>
        </table>
      </div>

      <div class="section">
        <h3>📋 Methodology</h3>
        <p style="font-size:11px;line-height:1.6;color:#374151;">
          This dossier was generated by the Dark Web Identity Resolution Platform
          (NTRO PS 26151). The platform employs a 5-stage ingestion pipeline:
          (1) Entity Normalization, (2) Deterministic Exact Matching of cryptographic
          identifiers, (3) Probabilistic Resolution using 11-dimensional stylometric
          feature vectors and SentenceTransformer (all-MiniLM-L6-v2) embeddings,
          (4) Analyst Review Queue for 60–94% confidence matches, and
          (5) Continuous Knowledge Graph Evolution via a NetworkX multi-entity graph.
          Tor infrastructure de-anonymization leverages Apache mod_status leakage,
          SSL/TLS SAN certificate correlation, Favicon mmh3 hash matching, and
          HTTP ETag fingerprinting.
        </p>
      </div>

      <div class="footer">
        Generated: ${new Date().toISOString()} &nbsp;|&nbsp;
        Platform: Dark Web Identity Resolution — NTRO PS 26151 &nbsp;|&nbsp;
        Classification: RESTRICTED — FOR AUTHORIZED USE ONLY
      </div>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="export-modal-overlay" onClick={onClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="export-modal-header">
          <div>
            <h2 className="export-modal-title">⬇️ Export Intelligence</h2>
            <p className="export-modal-subtitle">
              {loading ? "Calculating…" : preview
                ? `${preview.vendor_count} vendors · ${preview.graph_nodes} nodes · ${preview.graph_edges} edges`
                : "Select export format"}
              {startTs && ` · ${new Date(startTs * 1000).getFullYear()}–${new Date(endTs * 1000).getFullYear()}`}
            </p>
          </div>
          <button className="export-modal-close" onClick={onClose} type="button">✕</button>
        </div>

        {/* Format Tabs */}
        <div className="export-format-tabs">
          {[
            { id: "csv", icon: "📄", label: "CSV Table" },
            { id: "json", icon: "🧬", label: "CTI JSON" },
            { id: "graph", icon: "🌐", label: "Graph Snapshot" },
            { id: "pdf", icon: "🖨️", label: "PDF Report" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`export-tab-btn ${mode === tab.id ? "active" : ""}`}
              onClick={() => setMode(tab.id)}
              type="button"
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Mode Content */}
        <div className="export-modal-body">
          {mode === "csv" && (
            <div className="export-mode-panel">
              <div className="export-mode-icon">📄</div>
              <h3 className="export-mode-title">CSV — Vendor Credential Table</h3>
              <p className="export-mode-desc">
                Downloads a flat CSV containing all vendor profiles with their
                correlated digital identifiers: aliases, emails, Bitcoin &amp;
                Monero wallets, PGP fingerprints, Telegram handles, and onion
                addresses.
              </p>
              <div className="export-field-list">
                {["vendor_id", "user_name", "market_id", "alias", "email", "bitcoin", "monero", "pgp", "telegram", "onion"].map((f) => (
                  <span key={f} className="export-field-pill">{f}</span>
                ))}
              </div>
              <button className="btn-export-action" onClick={handleCSV} type="button">
                ⬇️ Download CSV ({preview?.vendor_count ?? "…"} rows)
              </button>
            </div>
          )}

          {mode === "json" && (
            <div className="export-mode-panel">
              <div className="export-mode-icon">🧬</div>
              <h3 className="export-mode-title">CTI JSON — Structured Intelligence Package</h3>
              <p className="export-mode-desc">
                Exports a structured <strong>CTI dossier package</strong> with
                one object per threat actor. Compatible with STIX 2.1 consumers.
                Includes all resolved identifiers and marketplace metadata.
              </p>
              <pre className="export-schema-preview">{`{
  "type": "cti-bundle",
  "spec_version": "1.0",
  "objects": [
    {
      "id": "threat-actor--vendor-42",
      "type": "threat-actor",
      "name": "AlphaVendor",
      "identifiers": {
        "bitcoin": "1A2B3C...",
        "pgp": "DEADBEEF..."
      }
    }
  ]
}`}</pre>
              <button className="btn-export-action" onClick={handleJSON} type="button">
                ⬇️ Download CTI JSON ({preview?.vendor_count ?? "…"} actors)
              </button>
            </div>
          )}

          {mode === "graph" && (
            <div className="export-mode-panel">
              <div className="export-mode-icon">🌐</div>
              <h3 className="export-mode-title">Graph Snapshot — Cytoscape JSON</h3>
              <p className="export-mode-desc">
                Exports the current in-memory knowledge graph as a{" "}
                <strong>Cytoscape.js JSON</strong> file — importable into any
                Cytoscape-compatible tool, Gephi (via JSON plugin), or custom
                graph visualization pipelines.
              </p>
              <div className="export-stat-row">
                <div className="export-stat"><span className="export-stat-val">{preview?.graph_nodes ?? "—"}</span><span className="export-stat-lbl">Nodes</span></div>
                <div className="export-stat"><span className="export-stat-val">{preview?.graph_edges ?? "—"}</span><span className="export-stat-lbl">Edges</span></div>
              </div>
              <button className="btn-export-action" onClick={handleSnapshot} type="button">
                ⬇️ Download Graph Snapshot
              </button>
            </div>
          )}

          {mode === "pdf" && (
            <div className="export-mode-panel">
              <div className="export-mode-icon">🖨️</div>
              <h3 className="export-mode-title">PDF — CTI Investigation Dossier</h3>
              <p className="export-mode-desc">
                Generates a formatted, printable{" "}
                <strong>Threat Intelligence Investigation Dossier</strong> in a
                new browser tab — save as PDF using your browser's print dialog
                (<kbd>Ctrl+P</kbd>). Includes executive summary, entity
                distributions, graph topology metrics, capability audit, and
                methodology section.
              </p>
              <div className="export-dossier-preview">
                <div className="dossier-preview-header">🔍 Threat Intelligence Investigation Dossier</div>
                <div className="dossier-preview-body">
                  <div className="dossier-kpi-row">
                    <div className="dossier-kpi"><span>{preview?.vendor_count ?? "—"}</span>Actors</div>
                    <div className="dossier-kpi"><span>{preview?.graph_nodes ?? "—"}</span>Nodes</div>
                    <div className="dossier-kpi"><span>{stats?.communities_count ?? "—"}</span>Syndicates</div>
                  </div>
                  <div className="dossier-section-labels">
                    {["📊 Entity Distribution", "🌐 Marketplace Coverage", "🧬 Graph Topology", "🔬 Capabilities", "📋 Methodology"].map((s) => (
                      <div key={s} className="dossier-section-stub">{s}</div>
                    ))}
                  </div>
                </div>
              </div>
              <button className="btn-export-action btn-print" onClick={handlePrint} type="button">
                🖨️ Generate &amp; Print PDF Dossier
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
