import StatsCard from "./StatsCard";

const Sidebar = ({ stats, selectedData, metrics }) => {
  const hasSelection = Boolean(selectedData);

  return (
    <aside className="sidebar">
      <section className="panel">
        <h2>Statistics</h2>
        <div className="stats-grid">
          <StatsCard label="Total Vendors" value={stats.vendors} />
          <StatsCard label="Total PGP Keys" value={stats.pgp_keys} />
          <StatsCard label="Total Relationships" value={stats.edges} />
        </div>
      </section>

      <section className="panel">
        <h2>Graph Metrics</h2>
        <div className="detail-lines">
          <p>
            <strong>Connected Components:</strong> {metrics.connectedComponents}
          </p>
          <p>
            <strong>Density:</strong> {metrics.density}
          </p>
          <p>
            <strong>Average Degree:</strong> {metrics.averageDegree}
          </p>
        </div>
      </section>

      <section className="panel">
        <h2>Selected Node Information</h2>
        {!hasSelection && <p>Click a node to inspect details.</p>}

        {selectedData?.kind === "vendor" && (
          <div className="detail-lines">
            <p>
              <strong>Name:</strong> {selectedData.vendor.label}
            </p>
            <p>
              <strong>Vendor ID:</strong> {selectedData.vendor.vendor_id ?? selectedData.vendor.id}
            </p>
            <p>
              <strong>Username:</strong> {selectedData.vendor.username || "N/A"}
            </p>
            <p>
              <strong>Alias:</strong> {selectedData.vendor.alias || "N/A"}
            </p>
            <p>
              <strong>Email:</strong> {selectedData.vendor.email || "N/A"}
            </p>
            <p>
              <strong>Bitcoin Wallet:</strong> {selectedData.vendor.bitcoin_wallet || "N/A"}
            </p>
            <p>
              <strong>Connected Keys:</strong> {selectedData.pgp_keys.length}
            </p>
            <p>
              <strong>Aliases:</strong>{" "}
              {selectedData.pgp_keys.map((key) => key.label).join(", ") || "None"}
            </p>
            {selectedData.links?.self && (
              <p>
                <strong>API Link:</strong> {selectedData.links.self}
              </p>
            )}
          </div>
        )}

        {selectedData?.kind === "pgp" && (
          <div className="detail-lines">
            <p>
              <strong>Alias:</strong> {selectedData.pgp.label}
            </p>
            <p>
              <strong>Fingerprint:</strong> {selectedData.pgp.fingerprint || "N/A"}
            </p>
            <p>
              <strong>Connected Vendors:</strong>{" "}
              {selectedData.vendors.map((vendor) => vendor.label).join(", ") || "None"}
            </p>
            {selectedData.links?.self && (
              <p>
                <strong>API Link:</strong> {selectedData.links.self}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="panel legend-panel">
        <h2>Legend</h2>
        <div className="legend-item">
          <span className="legend-dot vendor-dot" /> Vendor
        </div>
        <div className="legend-item">
          <span className="legend-dot pgp-dot" /> PGP Key
        </div>
      </section>
    </aside>
  );
};

export default Sidebar;
