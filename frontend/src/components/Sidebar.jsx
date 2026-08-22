const Sidebar = ({ stats, selectedData, metrics }) => {
  const kind = selectedData?.kind || "vendor";
  const vendor = selectedData?.vendor;
  const identity = selectedData?.identity;
  const relationships = selectedData?.relationships || [];

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
                <p>
                  <strong>Vendor:</strong> {vendor.user_name}
                </p>
                <p>
                  <strong>Marketplace ID:</strong> #{vendor.market_id || "Agora"}
                </p>
                <p>
                  <strong>Linked Aliases:</strong> {(selectedData.aliases || []).length}
                </p>
                <p>
                  <strong>Emails:</strong>
                </p>
                <div className="item-badge-list">
                  {(selectedData.emails || []).map((e, idx) => (
                    <span key={idx} className="item-badge">
                      {e.value || e.normalized_value}
                    </span>
                  ))}
                </div>
                <p>
                  <strong>Bitcoin Wallets:</strong>
                </p>
                <div className="item-badge-list">
                  {(selectedData.bitcoin_wallets || []).map((b, idx) => (
                    <span key={idx} className="item-badge">
                      {b.value || b.normalized_value}
                    </span>
                  ))}
                </div>
                <p>
                  <strong>PGP Keys:</strong>
                </p>
                <div className="item-badge-list">
                  {(selectedData.pgp_keys || []).map((p, idx) => (
                    <span key={idx} className="item-badge">
                      {p.value || p.normalized_value}
                    </span>
                  ))}
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
                  <strong>Linked Vendors:</strong>
                </p>
                <div className="item-badge-list">
                  {(selectedData.linked_vendors || []).map((v, idx) => (
                    <span key={idx} className="item-badge">
                      {v.user_name || `Vendor #${v.vendor_id}`}
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
          <p className="search-hint">Click on any node in the graph canvas to inspect its cryptographic provenance and evidence.</p>
        )}
      </section>

      {/* 3. Visual Legend */}
      <section className="panel">
        <h2>🏷️ Visual Legend</h2>
        <div className="legend-item">
          <span className="legend-dot vendor-dot" /> <strong>Vendor / Persona</strong>
        </div>
        <div className="legend-item">
          <span className="legend-dot username-dot" /> <strong>Username / Alias</strong>
        </div>
        <div className="legend-item">
          <span className="legend-dot email-dot" /> <strong>Email Address</strong>
        </div>
        <div className="legend-item">
          <span className="legend-dot bitcoin-dot" /> <strong>Bitcoin Wallet</strong>
        </div>
        <div className="legend-item">
          <span className="legend-dot pgp-dot" /> <strong>PGP Key (Diamond)</strong>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: "#EC4899" }} /> <strong>Marketplace / Inferred Link</strong>
        </div>
      </section>
    </aside>
  );
};

export default Sidebar;
