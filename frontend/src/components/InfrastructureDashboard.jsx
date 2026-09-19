import { useEffect, useState } from "react";
import {
  correlateInfrastructure,
  fetchInfrastructureDetail,
  fetchInfrastructureServices,
  scanInfrastructure,
} from "../services/api";

function InfrastructureDashboard({ onSelectVendor, onViewInGraph, onRefreshGraph }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const [scanForm, setScanForm] = useState({
    onion_address: "",
    title: "",
    server_status_content: "",
    favicon_hash: "",
    etag: "",
  });
  const [copiedAddress, setCopiedAddress] = useState("");

  const loadServices = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchInfrastructureServices(100, 0);
      setServices(data.services || []);
    } catch (err) {
      setError(err?.message || "Failed loading infrastructure intelligence.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      loadServices();
      return;
    }

    setIsSearching(true);
    setError("");
    try {
      const data = await correlateInfrastructure(q);
      setServices(data.matches || []);
    } catch (err) {
      setError(err?.message || "Search correlation failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleInspectDetail = async (serviceId) => {
    setIsDetailLoading(true);
    try {
      const detail = await fetchInfrastructureDetail(serviceId);
      setSelectedService(detail);
    } catch (err) {
      console.error("Failed loading service detail", err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!scanForm.onion_address.trim()) return;

    setScanSubmitting(true);
    try {
      await scanInfrastructure(scanForm);
      setShowScanModal(false);
      setScanForm({
        onion_address: "",
        title: "",
        server_status_content: "",
        favicon_hash: "",
        etag: "",
      });
      await loadServices();
      if (onRefreshGraph) onRefreshGraph();
    } catch (err) {
      alert("Scan ingestion failed: " + (err?.response?.data?.error || err.message));
    } finally {
      setScanSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(""), 2000);
  };

  // Metrics summary
  const totalCount = services.length;
  const confirmedCount = services.filter((s) => s.threat_level === "CONFIRMED").length;
  const statusExposedCount = services.filter((s) => s.status_page_exposed).length;
  const sslCount = services.filter((s) => s.ssl_enabled).length;

  return (
    <div className="infra-dashboard-wrap">
      {/* Header */}
      <header className="infra-header">
        <div>
          <div className="infra-tag">CORE CAPABILITY #1 &bull; TOR DE-ANONYMIZATION</div>
          <h1 className="infra-title">Hidden Service Infrastructure Intelligence</h1>
          <p className="infra-subtitle">
            Forensic misconfiguration analysis matching Tor hidden services to Clearnet origin IP addresses, TLS/SSL SAN registries, and server-status leaks.
          </p>
        </div>
        <div className="infra-header-actions">
          <button className="btn-secondary" onClick={loadServices} title="Refresh Scans">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            Refresh
          </button>
          <button className="btn-primary" onClick={() => setShowScanModal(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Live Onion Scanner
          </button>
        </div>
      </header>

      {/* Summary KPI Cards */}
      <div className="infra-kpi-grid">
        <div className="infra-kpi-card">
          <div className="infra-kpi-label">Analyzed Hidden Services</div>
          <div className="infra-kpi-val">{totalCount}</div>
          <div className="infra-kpi-sub">Continuous Tor Crawl & Scans</div>
        </div>
        <div className="infra-kpi-card highlight-danger">
          <div className="infra-kpi-label">Confirmed Origin Attributions</div>
          <div className="infra-kpi-val text-danger">{confirmedCount}</div>
          <div className="infra-kpi-sub">&ge; 90% Confidence IP Attribution</div>
        </div>
        <div className="infra-kpi-card highlight-warning">
          <div className="infra-kpi-label">Exposed Status Pages</div>
          <div className="infra-kpi-val text-warning">{statusExposedCount}</div>
          <div className="infra-kpi-sub">Apache / Nginx Status Leaks</div>
        </div>
        <div className="infra-kpi-card highlight-info">
          <div className="infra-kpi-label">SSL SAN Leaks</div>
          <div className="infra-kpi-val text-info">{sslCount}</div>
          <div className="infra-kpi-sub">Clearnet Domain Certificates</div>
        </div>
      </div>

      {/* Correlator Search Bar */}
      <form className="infra-search-bar" onSubmit={handleSearch}>
        <div className="infra-search-input-wrap">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="infra-search-input"
            placeholder="Search by .onion address, Clearnet IP (e.g. 185.220.101.5), Domain, or ISP/Hosting ASN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="infra-search-clear"
              onClick={() => {
                setSearchQuery("");
                loadServices();
              }}
            >
              &times;
            </button>
          )}
        </div>
        <button type="submit" className="btn-primary" disabled={isSearching}>
          {isSearching ? "Correlating..." : "Correlate Origin"}
        </button>
      </form>

      {error && <div className="infra-error-banner">{error}</div>}

      {/* Services List / Cards */}
      {loading ? (
        <div className="infra-loading-state">
          <div className="loading-spinner"></div>
          <p>Analyzing Tor infrastructure & correlating clearnet origins...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="infra-empty-state">
          <p>No hidden service records matched your query &ldquo;{searchQuery}&rdquo;.</p>
          <button className="btn-secondary" onClick={() => { setSearchQuery(""); loadServices(); }}>
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="infra-services-grid">
          {services.map((svc) => {
            const confPct = svc.attribution_percentage ?? Math.round((svc.attribution_confidence || 0) * 100);
            const isConfirmed = svc.threat_level === "CONFIRMED" || confPct >= 90;

            return (
              <div key={svc.service_id || svc.onion_address} className="infra-service-card">
                <div className="infra-card-header">
                  <div>
                    <span className={`threat-badge ${isConfirmed ? "badge-confirmed" : "badge-high"}`}>
                      {svc.threat_level || (isConfirmed ? "CONFIRMED" : "HIGH_PROBABILITY")}
                    </span>
                    <h3 className="infra-service-title">{svc.title || "Tor Hidden Service"}</h3>
                  </div>
                  <div className="infra-confidence-badge">
                    <span className="conf-pct">{confPct}%</span>
                    <span className="conf-sub">Attribution</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="infra-progress-track">
                  <div
                    className={`infra-progress-fill ${isConfirmed ? "fill-danger" : "fill-warning"}`}
                    style={{ width: `${Math.min(100, confPct)}%` }}
                  />
                </div>

                {/* Onion address */}
                <div className="infra-onion-box">
                  <span className="onion-mono">{svc.onion_address}</span>
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(svc.onion_address)}
                    title="Copy Onion Address"
                  >
                    {copiedAddress === svc.onion_address ? "Copied!" : "Copy"}
                  </button>
                </div>

                {/* Clearnet Origin Discovery Highlight */}
                {svc.discovered_origin_ip ? (
                  <div className="infra-origin-box">
                    <div className="origin-ip-row">
                      <span className="origin-label">DISCOVERED CLEARNET ORIGIN:</span>
                      <span className="origin-ip-val">{svc.discovered_origin_ip}</span>
                    </div>
                    {(svc.isp || svc.country) && (
                      <div className="origin-meta-row">
                        {svc.isp && <span className="meta-pill">{svc.isp}</span>}
                        {svc.country && <span className="meta-pill">{svc.country}</span>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="infra-origin-box pending">
                    <span className="origin-label">CLEARNET ATTRIBUTION:</span>
                    <span className="origin-ip-val text-muted">Correlating network artifacts...</span>
                  </div>
                )}

                {/* Misconfiguration Tags */}
                <div className="infra-tags-row">
                  {svc.status_page_exposed && (
                    <span className="vuln-tag text-danger" title="Exposed /server-status leaking origin IP">
                      🚨 Exposed Server-Status
                    </span>
                  )}
                  {svc.ssl_enabled && (
                    <span className="vuln-tag text-info" title="TLS/SSL certificate SAN domain leak">
                      🔐 SSL/TLS SAN Leak
                    </span>
                  )}
                  {svc.favicon_hash && (
                    <span className="vuln-tag text-warning" title="Favicon MurmurHash3 match on Shodan">
                      🏷️ Favicon mmh3 ({svc.favicon_hash})
                    </span>
                  )}
                  {svc.server_banner && (
                    <span className="vuln-tag text-muted" title={svc.server_banner}>
                      ⚙️ {svc.server_banner.split("/")[0]}
                    </span>
                  )}
                </div>

                {/* Linked Threat Actor */}
                {svc.linked_vendor_name && (
                  <div className="infra-actor-link">
                    <span className="actor-link-label">Attributed Actor:</span>
                    <button
                      className="actor-link-btn"
                      onClick={() => onSelectVendor && onSelectVendor(svc.linked_vendor_name)}
                    >
                      👤 {svc.linked_vendor_name} (Vendor #{svc.vendor_id})
                    </button>
                  </div>
                )}

                {/* Card Actions */}
                <div className="infra-card-footer">
                  <button
                    className="btn-outline-sm"
                    onClick={() => handleInspectDetail(svc.service_id)}
                  >
                    Inspect Evidence
                  </button>
                  <button
                    className="btn-primary-sm"
                    onClick={() => {
                      if (onViewInGraph) {
                        onViewInGraph(`onion_${svc.service_id}`, svc.linked_vendor_name);
                      }
                    }}
                  >
                    View in Graph &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Intelligence Dossier Modal */}
      {selectedService && (
        <div className="modal-overlay fade-in" onClick={() => setSelectedService(null)}>
          <div className="modal-content infra-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <div>
                <span className="threat-badge badge-confirmed">
                  {selectedService.threat_level} &bull; {selectedService.attribution_percentage}% CONFIDENCE
                </span>
                <h2 className="modal-title">{selectedService.title}</h2>
                <div className="onion-mono modal-onion">{selectedService.onion_address}</div>
              </div>
              <button className="modal-close" onClick={() => setSelectedService(null)}>
                &times;
              </button>
            </header>

            <div className="modal-body">
              {/* Origin IP Attribution Banner */}
              {selectedService.discovered_origin_ip && (
                <div className="infra-dossier-origin-banner">
                  <div className="banner-title">CLEARNET ORIGIN SERVER IDENTIFIED</div>
                  <div className="banner-ip">{selectedService.discovered_origin_ip}</div>
                  <div className="banner-details">
                    <span><strong>Server Banner:</strong> {selectedService.server_banner || "N/A"}</span>
                    <span><strong>Status Page Exposed:</strong> {selectedService.status_page_exposed ? "YES (Public Access)" : "No"}</span>
                    <span><strong>First Discovered:</strong> {new Date(selectedService.first_discovered).toLocaleDateString()}</span>
                  </div>
                </div>
              )}

              {/* Evidence Indicators Table */}
              <h3 className="section-heading">Corroborated Infrastructure Indicators</h3>
              <div className="indicators-table-wrap">
                <table className="indicators-table">
                  <thead>
                    <tr>
                      <th>Indicator Type</th>
                      <th>Extracted Value / Leak</th>
                      <th>Target Clearnet IP / Host</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedService.indicators || []).map((ind, i) => (
                      <tr key={i}>
                        <td>
                          <span className="indicator-pill">{ind.indicator_type}</span>
                        </td>
                        <td className="indicator-val-cell">{ind.indicator_value}</td>
                        <td>
                          {ind.clearnet_ip && (
                            <div>
                              <strong className="text-danger">{ind.clearnet_ip}</strong>
                              {ind.clearnet_domain && <div className="text-muted small">{ind.clearnet_domain}</div>}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="conf-tag">
                            {Math.round((ind.confidence_score || 1.0) * 100)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Raw JSON Evidence */}
              <h3 className="section-heading">Forensic Evidence Payload</h3>
              <pre className="evidence-json-block">
                {JSON.stringify(selectedService.indicators, null, 2)}
              </pre>
            </div>

            <footer className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedService(null)}>
                Close Dossier
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  const sId = selectedService.service_id;
                  const vName = selectedService.linked_vendor_name;
                  setSelectedService(null);
                  if (onViewInGraph) onViewInGraph(`onion_${sId}`, vName);
                }}
              >
                Inspect on Knowledge Graph Canvas
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Live Scanner Modal */}
      {showScanModal && (
        <div className="modal-overlay fade-in" onClick={() => setShowScanModal(false)}>
          <div className="modal-content scan-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <div>
                <h2 className="modal-title">Live Tor Hidden Service Misconfiguration Scanner</h2>
                <p className="modal-sub">
                  Submit a .onion address, raw Apache /server-status dump, or TLS certificate to correlate against clearnet infrastructure in real time.
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowScanModal(false)}>
                &times;
              </button>
            </header>

            <form onSubmit={handleScanSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Onion Address (*.onion) *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. market4x8c1v4b6n9m2k7l5p0q8w3e1r9t6y4u2i0o7p5a3s1d.onion"
                    value={scanForm.onion_address}
                    onChange={(e) => setScanForm({ ...scanForm, onion_address: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Service Title / Marketplace Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Undercover Marketplace Mirror"
                    value={scanForm.title}
                    onChange={(e) => setScanForm({ ...scanForm, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Apache / Nginx Server Status Content (Optional)</label>
                  <textarea
                    className="form-textarea"
                    rows="4"
                    placeholder="Paste raw /server-status HTML or plain text showing VirtualHost, Uptime, or Access logs..."
                    value={scanForm.server_status_content}
                    onChange={(e) => setScanForm({ ...scanForm, server_status_content: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">Favicon MurmurHash3 (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. -1392847291"
                      value={scanForm.favicon_hash}
                      onChange={(e) => setScanForm({ ...scanForm, favicon_hash: e.target.value })}
                    />
                  </div>
                  <div className="form-group half">
                    <label className="form-label">HTTP ETag Header (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. W/&quot;602a8b9c-148c&quot;"
                      value={scanForm.etag}
                      onChange={(e) => setScanForm({ ...scanForm, etag: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <footer className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowScanModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={scanSubmitting}>
                  {scanSubmitting ? "Scanning & Correlating..." : "Ingest & Correlate Origin"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InfrastructureDashboard;
