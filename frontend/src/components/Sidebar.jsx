import React, { useState, useEffect } from "react";
import { fetchVendorProvenance } from "../services/api";

const Sidebar = ({ stats, selectedData, metrics, onSelectNode }) => {
  const kind = selectedData?.kind || "vendor";
  const vendor = selectedData?.vendor;
  const identity = selectedData?.identity;
  const relationships = selectedData?.relationships || [];
  const crossMarketAccounts = selectedData?.cross_market_accounts || [];

  const [provenance, setProvenance] = useState([]);
  const [loadingProv, setLoadingProv] = useState(false);

  useEffect(() => {
    if (vendor?.vendor_id) {
      setLoadingProv(true);
      fetchVendorProvenance(vendor.vendor_id)
        .then((d) => setProvenance(d.provenance_timeline || []))
        .catch(() => setProvenance([]))
        .finally(() => setLoadingProv(false));
    } else {
      setProvenance([]);
    }
  }, [vendor?.vendor_id]);

  return (
    <aside className="sidebar">
      {/* 1. Global Network Summary */}
      <section className="panel">
        <h2>📊 Intelligence Metrics</h2>
        <div className="stats-grid">
          <div className="stats-card">
            <p className="stats-label">Total Digital Identities</p>
            <p className="stats-value">{stats.total_nodes || 0}</p>
          </div>
          <div className="stats-card">
            <p className="stats-label">Resolved Relationships</p>
            <p className="stats-value">{stats.edges || 0}</p>
          </div>
          <div className="stats-card">
            <p className="stats-label">Connected Actor Syndicates</p>
            <p className="stats-value">{stats.communities_count || metrics.connectedComponents || 0}</p>
          </div>
          <div className="stats-card">
            <p className="stats-label">Network Graph Density</p>
            <p className="stats-value">{metrics.density || "0.000"}</p>
          </div>
        </div>
      </section>

      {/* 2. Selected Entity Inspector */}
      <section className="panel">
        <h2>🔍 Persona Inspector</h2>
        {selectedData ? (
          <div className="detail-lines">
            {vendor && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>{vendor.user_name}</span>
                  <span className={`pill ${vendor.market_id === 101 ? "pgp" : vendor.market_id === 102 ? "username" : "vendor"}`}>
                    {vendor.marketplace_name || (vendor.market_id === 101 ? "ShadowBay" : vendor.market_id === 102 ? "NightMarket" : "Agora")}
                  </span>
                </div>

                {vendor.vendor_link && (
                  <p className="text-xs text-muted" style={{ wordBreak: "break-all", marginBottom: "8px" }}>
                    🔗 {vendor.vendor_link}
                  </p>
                )}

                {/* Cross-Marketplace Linked Accounts / Migration Chain */}
                {crossMarketAccounts.length > 0 && (
                  <div style={{ marginTop: "10px", marginBottom: "12px" }}>
                    <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#10b981", fontSize: "0.85rem" }}>
                      🌐 Cross-Marketplace Syndicates ({crossMarketAccounts.length}):
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {crossMarketAccounts.map((acct, idx) => (
                        <div
                          key={idx}
                          className="correlated-item"
                          style={{ cursor: "pointer", background: "rgba(16, 185, 129, 0.08)", borderLeft: "3px solid #10b981" }}
                          onClick={() => onSelectNode && onSelectNode({ id: `vendor_${acct.vendor_id}`, type: "vendor", label: acct.user_name })}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong>{acct.user_name}</strong>
                            <span className="pill vendor" style={{ fontSize: "0.68rem" }}>
                              {acct.marketplace_name}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                            Linked via: {acct.shared_types.join(", ").toUpperCase()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Provenance & Confidence Evolution Timeline */}
                {provenance.length > 0 && (
                  <div style={{ marginTop: "12px", marginBottom: "12px", background: "rgba(15, 23, 42, 0.6)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(51, 65, 85, 0.6)" }}>
                    <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#38bdf8", fontSize: "0.82rem" }}>
                      📜 Evidence Provenance & Confidence Timeline ({provenance.length}):
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderLeft: "2px solid #38bdf8", paddingLeft: "8px", marginLeft: "4px" }}>
                      {provenance.map((p, idx) => (
                        <div key={idx} style={{ fontSize: "0.74rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: "#e2e8f0" }}>
                            <span>{p.source_dataset}</span>
                            <span style={{ color: "#34d399" }}>{Math.round(p.confidence_after * 100)}%</span>
                          </div>
                          <div style={{ color: "var(--text-secondary)", fontSize: "0.70rem" }}>
                            {p.evidence_type} • <span style={{ fontStyle: "italic" }}>{p.analyst_id || "system"}</span>
                          </div>
                          {p.reason && (
                            <div style={{ color: "#94a3b8", fontSize: "0.68rem", marginTop: "2px" }}>
                              "{p.reason}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p>
                  <strong>Emails:</strong>
                </p>
                <div className="item-badge-list">
                  {(selectedData.grouped_identities?.emails || selectedData.emails || []).map((e, idx) => (
                    <span key={idx} className="item-badge">
                      {e.value || e.normalized_value}
                    </span>
                  ))}
                  {!(selectedData.grouped_identities?.emails || selectedData.emails)?.length && (
                    <span className="text-xs text-muted">None specified</span>
                  )}
                </div>

                <p>
                  <strong>Bitcoin Wallets:</strong>
                </p>
                <div className="item-badge-list">
                  {(selectedData.grouped_identities?.bitcoin_wallets || selectedData.bitcoin_wallets || []).map((b, idx) => (
                    <span key={idx} className="item-badge">
                      {b.value || b.normalized_value}
                    </span>
                  ))}
                  {!(selectedData.grouped_identities?.bitcoin_wallets || selectedData.bitcoin_wallets)?.length && (
                    <span className="text-xs text-muted">None specified</span>
                  )}
                </div>

                <p>
                  <strong>PGP Keys:</strong>
                </p>
                <div className="item-badge-list">
                  {(selectedData.grouped_identities?.pgp_keys || selectedData.pgp_keys || []).map((p, idx) => (
                    <span key={idx} className="item-badge">
                      {p.value || p.normalized_value}
                    </span>
                  ))}
                  {!(selectedData.grouped_identities?.pgp_keys || selectedData.pgp_keys)?.length && (
                    <span className="text-xs text-muted">None specified</span>
                  )}
                </div>
              </>
            )}

            {identity && (
              <>
                <p>
                  <strong>Identity Type:</strong>{" "}
                  <span className={`pill ${identity.identity_type}`}>{identity.identity_type}</span>
                </p>
                <p>
                  <strong>Normalized Value:</strong>
                </p>
                <code className="item-badge">{identity.normalized_value || identity.value}</code>
                <p>
                  <strong>Linked Vendors Across Markets:</strong>
                </p>
                <div className="item-badge-list">
                  {(selectedData.linked_vendors || []).map((v, idx) => (
                    <span key={idx} className="item-badge">
                      {v.user_name || `Vendor #${v.vendor_id}`} ({v.market_id === 101 ? "ShadowBay" : v.market_id === 102 ? "NightMarket" : "Agora"})
                    </span>
                  ))}
                </div>
                <p>
                  <strong>Graph Relationships ({relationships.length}):</strong>
                </p>
                <div className="item-badge-list">
                  {relationships.slice(0, 5).map((r, idx) => (
                    <div key={idx} className="correlated-item">
                      <strong>{r.relationship_type}</strong> (Weight: {r.weight})
                      <div className="text-xs text-muted">
                        Linked to: {r.id1_val === identity.normalized_value ? r.id2_val : r.id1_val}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="search-hint">Click on any vendor or credential node to inspect cross-marketplace migration chains, evidence provenance, and cryptographic links.</p>
        )}
      </section>

      {/* 3. Visual Legend */}
      <section className="panel">
        <h2>🏷️ Visual Legend</h2>
        
        <div style={{ marginBottom: "10px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
            Entity Nodes
          </p>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: "#EC4899", borderRadius: "2px" }} /> 
            <span><strong>Marketplace</strong> (Agora, ShadowBay, NightMarket)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: "#10B981" }} /> 
            <span><strong>Vendor / Persona</strong> (Threat Actor Root)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: "#8B5CF6" }} /> 
            <span><strong>Username / Alias</strong> (Platform Handle)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: "#F59E0B" }} /> 
            <span><strong>Bitcoin Wallet</strong> (BTC Base58/Bech32)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: "#EA580C" }} /> 
            <span><strong>Monero Wallet</strong> (XMR Standard/Subaddress)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: "#F97316", transform: "rotate(45deg)", borderRadius: "1px" }} /> 
            <span><strong>PGP Key</strong> (OpenPGP Fingerprint)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: "#0284C7" }} /> 
            <span><strong>Email Address</strong> (Proton, TorBox, Elude)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: "#06B6D4" }} /> 
            <span><strong>Telegram / Discord</strong> (@handle / tag)</span>
          </div>
        </div>

        <div>
          <p style={{ margin: "8px 0 6px", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
            Relationship Edges
          </p>
          <div className="legend-item">
            <span style={{ display: "inline-block", width: "16px", height: "3px", background: "#10B981", marginRight: "8px", verticalAlign: "middle" }} /> 
            <span><strong>Solid Green:</strong> Deterministic / Confirmed</span>
          </div>
          <div className="legend-item">
            <span style={{ display: "inline-block", width: "16px", height: "0px", borderTop: "3px dashed #F59E0B", marginRight: "8px", verticalAlign: "middle" }} /> 
            <span><strong>Dashed Orange:</strong> Pending Suggestion (60–94%)</span>
          </div>
          <div className="legend-item">
            <span style={{ display: "inline-block", width: "16px", height: "0px", borderTop: "3px dashed #EC4899", marginRight: "8px", verticalAlign: "middle" }} /> 
            <span><strong>Dashed Pink:</strong> Stylometric Author Match</span>
          </div>
        </div>
      </section>
    </aside>
  );
};

export default Sidebar;
