import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import IdentityLinkingCard from "./IdentityLinkingCard";
import { analyzeIntelligence } from "../services/api";

const PRESET_SAMPLES = [
  {
    name: "Vendor Profile & PII Leak",
    text: `Vendor alias: TheRealSilkRoad
Contact: silkroad_ops@protonmail.com
Backup: darknet_trader@jabber.cz
Bitcoin Deposit: 1LPiyimWVLtWHJkvgGcvY8mKjZwpVgyaz
PGP Fingerprint: 483F3631151FBA4895F9FF8404B63E9BA4772C78
Hidden Service: http://agoramarket7u4k.onion
Phone: +1 (555) 839-2041
Password: darknet_master_pass!`,
  },
  {
    name: "Agora Listing Description",
    text: `★ PREMIUM CCcam Cardsharing Server 2026 ★
We offer 12 Months full package for all Enigma2 decoders.
Instant auto-dispatch upon 1 confirmation!
BTC: 1b2cToQTkrmsDUUDeP6YDAK34wXuQ
PGP: 2F4C5D998B102A3C4D5E6F7A8B9C0D1E2F3A4B5C
Contact: passman_admin@yahoo.com`,
  },
  {
    name: "Crypto Ransom Note",
    text: `All your databases have been encrypted.
To restore data send 0.5 BTC to bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq
Transaction proof to decryptor_service@onionmail.org
PGP Key: 994E8F231A4C5B6D7E8F901234567890ABCDEF12`,
  },
];

const IdentityAnalyzer = ({ onSelectVendor }) => {
  const [inputText, setInputText] = useState(PRESET_SAMPLES[0].text);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const cyRef = useRef(null);
  const cyInstance = useRef(null);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError("");

    try {
      const data = await analyzeIntelligence(inputText);
      setReport(data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to analyze intelligence");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleAnalyze();
  }, []);

  // Render Mini-Subgraph
  useEffect(() => {
    if (!cyRef.current || !report) return;

    const elements = [];
    const sourceNodeId = "submitted_text";

    elements.push({
      data: {
        id: sourceNodeId,
        label: "Analyzed Text",
        color: "#EF4444",
        shape: "round-rectangle",
      },
    });

    const entities = report.extracted_entities || {};
    (entities.emails || []).forEach((email, i) => {
      const id = `email_${i}`;
      elements.push({ data: { id, label: email, color: "#0284C7", shape: "hexagon" } });
      elements.push({ data: { source: sourceNodeId, target: id, label: "HAS_EMAIL" } });
    });

    (entities.bitcoin_wallets || []).forEach((w, i) => {
      const id = `btc_${i}`;
      elements.push({ data: { id, label: `${w.slice(0, 8)}...`, color: "#F59E0B", shape: "round-rectangle" } });
      elements.push({ data: { source: sourceNodeId, target: id, label: "HAS_WALLET" } });
    });

    (entities.pgp_fingerprints || []).forEach((p, i) => {
      const id = `pgp_${i}`;
      elements.push({ data: { id, label: `${p.slice(0, 8)}...`, color: "#F97316", shape: "diamond" } });
      elements.push({ data: { source: sourceNodeId, target: id, label: "HAS_PGP" } });
    });

    (report.stylometric_matches || []).forEach((m, i) => {
      const id = `vendor_match_${i}`;
      elements.push({ data: { id, label: m.vendor, color: "#10B981", shape: "ellipse" } });
      elements.push({
        data: {
          source: sourceNodeId,
          target: id,
          label: `LIKELY_SAME (${m.confidence_percentage}%)`,
        },
      });
    });

    if (cyInstance.current) {
      cyInstance.current.destroy();
    }

    cyInstance.current = cytoscape({
      container: cyRef.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            label: "data(label)",
            color: "#ffffff",
            "font-size": "10px",
            "text-valign": "center",
            "text-halign": "center",
            "text-outline-width": 2,
            "text-outline-color": "#1e293b",
            width: "50px",
            height: "50px",
            shape: "data(shape)",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#94a3b8",
            "target-arrow-color": "#94a3b8",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": "8px",
            color: "#475569",
          },
        },
      ],
      layout: {
        name: "cose",
        animate: false,
        padding: 20,
      },
    });

    return () => {
      if (cyInstance.current) {
        cyInstance.current.destroy();
      }
    };
  }, [report]);

  const confidentiality = report?.confidentiality || {};
  const probableMatches = report?.probable_matches || [];

  return (
    <div className="analyzer-container fade-in">
      <div className="analyzer-header">
        <h2>🕵️ Cyber Threat Intelligence: Identity Analyzer</h2>
        <p className="analyzer-subtitle">
          Normalizes unstructured darknet text, computes 0-100 Confidentiality Rating, extracts PII entities,
          profiles Agora writing style, and presents probabilistic matches for Human-in-the-Loop review.
        </p>
      </div>

      <div className="analyzer-card">
        <div className="preset-bar">
          <span className="preset-label">Intelligence Presets:</span>
          {PRESET_SAMPLES.map((sample) => (
            <button
              key={sample.name}
              type="button"
              className="preset-btn"
              onClick={() => setInputText(sample.text)}
            >
              {sample.name}
            </button>
          ))}
          <button type="button" className="clear-btn" onClick={() => setInputText("")}>
            Clear
          </button>
        </div>

        <textarea
          className="analyzer-textarea"
          rows={6}
          placeholder="Paste raw dark web listing, forum leak, email, PGP fingerprint, or wallet address..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />

        <div className="analyzer-actions">
          <span className="char-counter">{inputText.length} characters</span>
          <button
            type="button"
            className="analyze-submit-btn"
            disabled={loading || !inputText.trim()}
            onClick={handleAnalyze}
          >
            {loading ? <span className="spinner-small" /> : "⚡ Run Resolution & Risk Analysis"}
          </button>
        </div>

        {error && <div className="analyzer-error-alert">{error}</div>}
      </div>

      {report && (
        <div className="results-grid">
          {/* 1. Confidentiality & Risk Rating */}
          <div className="analyzer-card">
            <h3>🛡️ Confidentiality Rating & PII Exposure Assessment</h3>
            <div className="risk-display-wrap">
              <div className={`risk-badge-large tier-${confidentiality.badge || "safe"}`}>
                <div className="risk-score-num">{confidentiality.score || 0}%</div>
                <div className="risk-level-label">{(confidentiality.level || "Public").toUpperCase()}</div>
              </div>
              <div className="risk-details">
                <p className="risk-desc">{confidentiality.description}</p>
                <div className="recommendations-box">
                  <strong>Recommended Actions:</strong>
                  <ul>
                    {(confidentiality.recommended_actions || []).map((act, i) => (
                      <li key={i}>{act}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Identity Linking UI: Human-in-the-Loop Review */}
          <div className="analyzer-card">
            <h3>🔗 Probabilistic Resolution: Identity Linking Review</h3>
            <p className="section-note">
              Probabilistic matches require human verification. Review similarity scores and decide whether to merge personas.
            </p>
            {probableMatches.length > 0 ? (
              <div className="linking-cards-grid">
                {probableMatches.map((cand, idx) => (
                  <IdentityLinkingCard
                    key={idx}
                    candidate={cand}
                    queryAlias="Analyzed Target"
                    onActionComplete={(act) => console.log(`Action ${act} on ${cand.vendor}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="no-matches-box">
                No high-confidence probabilistic matches found for this text profile.
              </div>
            )}
          </div>

          {/* 3. Extracted & Normalized Entities */}
          <div className="analyzer-card">
            <h3>📑 Normalized Entity Extraction</h3>
            <div className="entities-summary-stats">
              <span>Emails: <strong>{(report.extracted_entities?.emails || []).length}</strong></span>
              <span>BTC Wallets: <strong>{(report.extracted_entities?.bitcoin_wallets || []).length}</strong></span>
              <span>PGP Keys: <strong>{(report.extracted_entities?.pgp_fingerprints || []).length}</strong></span>
              <span>Onion URLs: <strong>{(report.extracted_entities?.onion_domains || []).length}</strong></span>
            </div>
            <div className="matches-table-wrap">
              <table className="matches-table">
                <thead>
                  <tr>
                    <th>Entity Type</th>
                    <th>Normalized Value</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.extracted_entities?.emails || []).map((e, i) => (
                    <tr key={`e-${i}`}>
                      <td><span className="pill email">Email</span></td>
                      <td className="entity-val-cell">{e}</td>
                      <td><span className="confidence-badge">RFC 5322 Validated</span></td>
                    </tr>
                  ))}
                  {(report.extracted_entities?.bitcoin_wallets || []).map((w, i) => (
                    <tr key={`w-${i}`}>
                      <td><span className="pill bitcoin">Bitcoin</span></td>
                      <td className="entity-val-cell">{w}</td>
                      <td><span className="confidence-badge">Base58/Bech32 Verified</span></td>
                    </tr>
                  ))}
                  {(report.extracted_entities?.pgp_fingerprints || []).map((p, i) => (
                    <tr key={`p-${i}`}>
                      <td><span className="pill pgp">PGP</span></td>
                      <td className="entity-val-cell">{p}</td>
                      <td><span className="confidence-badge">40-Hex Fingerprint</span></td>
                    </tr>
                  ))}
                  {(report.extracted_entities?.onion_domains || []).map((o, i) => (
                    <tr key={`o-${i}`}>
                      <td><span className="pill username">Onion</span></td>
                      <td className="entity-val-cell">{o}</td>
                      <td><span className="confidence-badge">Hidden Service</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Mini Subgraph Preview */}
          <div className="analyzer-card">
            <h3>🕸️ Discovered Correlation Subgraph</h3>
            <div className="subgraph-canvas-wrap">
              <div ref={cyRef} className="subgraph-cy" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdentityAnalyzer;
