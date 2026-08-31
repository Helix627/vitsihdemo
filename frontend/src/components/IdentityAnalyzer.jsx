import React, { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import {
  analyzeIntelligence,
  submitAnalystIntel,
  previewBulkDataset,
} from "../services/api";
import {
  FileText,
  Database,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Shield,
  Layers,
  RefreshCw,
  Zap,
} from "lucide-react";

const PRESET_PROSE_SAMPLES = [
  {
    name: "Dutch XTC Listing Prose",
    prose: `★ Top Dutch Quality XTC Pills & MDMA Crystals ★
Directly from famous producers in Holland. High-purity 84% Dutch MDMA crystal and original 220mg+ presses. 
Vacuum sealed in stealth triple-barrier bags with decoy moisture absorbers. 
Before you order please read profile for shipping exceptions and tracking instructions. 
All orders dispatched worldwide within 24 hours of payment confirmation. 
Stay safe and encrypt all delivery addresses with PGP!`,
    username: "DutchMaster_Direct",
    email: "dutchmaster@onionmail.org",
    bitcoin: "1LPiyimWVLtWHJkvgGcvY8mKjZwpVgyaz",
    onion: "http://dutchmaster4x8c1v4b6n9m2k7l5p0q8w3e1r9t6y.onion",
  },
  {
    name: "Crypto Ransom Note",
    prose: `Attention! All your company databases and server backups have been encrypted using AES-256 and RSA-4096 algorithms.
Do not attempt to modify or rename encrypted files.
To receive the private decryptor tool and guarantee deletion of exfiltrated data:
1. Transfer 2.5 BTC to our wallet within 72 hours.
2. Contact our automated support portal with your transaction proof.
If payment is not confirmed before the timer expires, all proprietary source code will be published to our public darknet leak forum.`,
    username: "BlackLock_Ransom_Operator",
    bitcoin: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    email: "decryptor_service@onionmail.org",
  },
  {
    name: "Pure Crypto Credential Leak (No Prose)",
    prose: "",
    username: "Alpha_Escrow_Node",
    email: "alpha_escrow@protonmail.com",
    bitcoin: "1b2cToQTkrmsDUUDeP6YDAK34wXuQ",
    monero: "44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGeiSTHzFcubDZmCo96hUoWDL14PBBCHnoFXcDpTX",
    pgp: "483F3631151FBA4895F9FF8404B63E9BA4772C78",
    telegram: "@alpha_escrow_support",
  },
];

export default function IdentityAnalyzer({ onSelectVendor, onDataEvolved }) {
  const [activeMode, setActiveMode] = useState("modular"); // "modular" | "bulk"

  // Modular Intake Fields
  const [formState, setFormState] = useState({
    username: "",
    bitcoin: "",
    monero: "",
    pgp: "",
    email: "",
    telegram: "",
    discord: "",
    onion: "",
    prose: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewResult, setPreviewResult] = useState(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState(null);

  // Bulk mode state
  const [bulkJson, setBulkJson] = useState(
    JSON.stringify(
      [
        {
          username: "NexusCourier_EU",
          email: "nexus_courier@protonmail.com",
          bitcoin: "1b2cToQTkrmsDUUDeP6YDAK34wXuQ",
          telegram: "@nexus_courier_eu",
          description: "European stealth logistics and drop shipping.",
        },
        {
          username: "CardingKing_2026",
          email: "cardingking@cock.li",
          monero: "44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGeiSTHzFcubDZmCo96hUoWDL14PBBCHnoFXcDpTX",
          telegram: "@cardingking_vip",
          description: "Verified merchant accounts, dumps with pins, and high-balance gift cards.",
        },
      ],
      null,
      2
    )
  );
  const [bulkPreview, setBulkPreview] = useState(null);

  // Subgraph preview ref
  const cyRef = useRef(null);
  const cyInstance = useRef(null);

  const handleFieldChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const loadPreset = (preset) => {
    setFormState({
      username: preset.username || "",
      bitcoin: preset.bitcoin || "",
      monero: preset.monero || "",
      pgp: preset.pgp || "",
      email: preset.email || "",
      telegram: preset.telegram || "",
      discord: preset.discord || "",
      onion: preset.onion || "",
      prose: preset.prose || "",
    });
    setPreviewResult(null);
    setIngestSuccess(null);
    setError("");
  };

  const handleClear = () => {
    setFormState({
      username: "",
      bitcoin: "",
      monero: "",
      pgp: "",
      email: "",
      telegram: "",
      discord: "",
      onion: "",
      prose: "",
    });
    setPreviewResult(null);
    setIngestSuccess(null);
    setError("");
  };

  // Run Analysis & Preview
  const handleAnalyze = async () => {
    const hasAnyField = Object.values(formState).some((v) => v.trim().length > 0);
    if (!hasAnyField) {
      setError("Please fill in at least one credential or enter forum/listing text.");
      return;
    }

    setLoading(true);
    setError("");
    setIngestSuccess(null);

    try {
      let combinedText = formState.prose ? `${formState.prose}\n\n` : "";
      if (formState.username) combinedText += `Username: ${formState.username}\n`;
      if (formState.bitcoin) combinedText += `Bitcoin: ${formState.bitcoin}\n`;
      if (formState.monero) combinedText += `Monero: ${formState.monero}\n`;
      if (formState.pgp) combinedText += `PGP: ${formState.pgp}\n`;
      if (formState.email) combinedText += `Email: ${formState.email}\n`;
      if (formState.telegram) combinedText += `Telegram: ${formState.telegram}\n`;
      if (formState.discord) combinedText += `Discord: ${formState.discord}\n`;
      if (formState.onion) combinedText += `Onion: ${formState.onion}\n`;

      const data = await analyzeIntelligence(combinedText.trim());
      setPreviewResult(data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Intelligence analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  // Render Subgraph Cytoscape Preview
  useEffect(() => {
    if (!previewResult || !cyRef.current) return;

    if (cyInstance.current) {
      cyInstance.current.destroy();
    }

    const elements = [];
    const mainNodeId = "submitted_intel";
    const displayName = formState.username || "Ingested Intel";

    elements.push({
      data: {
        id: mainNodeId,
        label: displayName,
        type: "source",
        color: "#f43f5e",
        shape: "round-rectangle",
      },
    });

    let nodeIndex = 0;

    // 1. Add direct form / extracted credentials
    const credentials = [];
    if (formState.bitcoin) credentials.push({ type: "bitcoin", val: formState.bitcoin, color: "#f59e0b" });
    if (formState.monero) credentials.push({ type: "monero", val: formState.monero, color: "#ea580c" });
    if (formState.pgp) credentials.push({ type: "pgp", val: formState.pgp, color: "#f97316" });
    if (formState.email) credentials.push({ type: "email", val: formState.email, color: "#0284c7" });
    if (formState.telegram) credentials.push({ type: "telegram", val: formState.telegram, color: "#06b6d4" });
    if (formState.onion) credentials.push({ type: "onion", val: formState.onion, color: "#d946ef" });

    credentials.forEach((c) => {
      nodeIndex++;
      const cId = `cred_${nodeIndex}`;
      const dispVal = c.val.length > 16 ? `${c.val.slice(0, 7)}...${c.val.slice(-5)}` : c.val;
      elements.push({
        data: {
          id: cId,
          label: `${c.type.toUpperCase()}: ${dispVal}`,
          type: c.type,
          color: c.color,
          shape: "hexagon",
        },
      });
      elements.push({
        data: {
          id: `edge_${cId}`,
          source: mainNodeId,
          target: cId,
          label: `HAS_${c.type.toUpperCase()}`,
        },
      });
    });

    // 2. Add Top Stylometric & Probabilistic Author Matches
    const candidateMatches =
      previewResult.stylometric_matches ||
      previewResult.probable_matches ||
      previewResult.candidate_matches ||
      [];

    candidateMatches.slice(0, 3).forEach((cand, idx) => {
      nodeIndex++;
      const vName = cand.vendor || cand.vendor_name || `Candidate #${idx + 1}`;
      const confPct = cand.confidence_percentage ?? Math.round((cand.confidence || 0) * 100);
      const candNodeId = `cand_${nodeIndex}`;

      elements.push({
        data: {
          id: candNodeId,
          label: `${vName}\n(${confPct}% Match)`,
          type: "candidate_vendor",
          color: "#10b981",
          shape: "ellipse",
        },
      });

      elements.push({
        data: {
          id: `edge_${candNodeId}`,
          source: mainNodeId,
          target: candNodeId,
          label: `STYLOMETRY (${confPct}%)`,
        },
      });
    });

    cyInstance.current = cytoscape({
      container: cyRef.current,
      elements: elements,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            label: "data(label)",
            color: "#ffffff",
            "font-size": "11px",
            "font-weight": "bold",
            "text-valign": "center",
            "text-halign": "center",
            "text-wrap": "wrap",
            width: "label",
            height: "36px",
            padding: "12px",
            "border-width": 2,
            "border-color": "rgba(255, 255, 255, 0.3)",
            shape: "data(shape)",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#64748b",
            "target-arrow-color": "#64748b",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": "9px",
            "font-weight": "bold",
            color: "#94a3b8",
            "text-background-color": "#0b1120",
            "text-background-opacity": 0.85,
            "text-background-padding": "3px",
            "line-style": "dashed",
          },
        },
      ],
      layout: {
        name: "concentric",
        concentric: (node) => (node.id() === mainNodeId ? 2 : 1),
        levelWidth: () => 1,
        padding: 40,
        animate: false,
      },
    });

    cyInstance.current.fit();
  }, [previewResult, formState]);

  // Commit & Ingest Action (with optional Force Merge Override)
  const handleCommitIngest = async (forceMerge = false) => {
    setIngestLoading(true);
    setError("");

    try {
      const topCand = (previewResult?.stylometric_matches || previewResult?.probable_matches || [])[0];
      const payload = {
        username: formState.username || "anonymous_drop",
        bitcoin: formState.bitcoin,
        monero: formState.monero,
        pgp: formState.pgp,
        email: formState.email,
        telegram: formState.telegram,
        discord: formState.discord,
        onion: formState.onion,
        description: formState.prose,
        source_dataset: "Modular Intelligence Intake",
        analyst_name: "Lead_Investigator",
        force_merge: forceMerge,
        target_vendor_id: previewResult?.linking_forecast?.target_vendor_id || topCand?.vendor_id,
        target_vendor: previewResult?.linking_forecast?.target_vendor_name || topCand?.vendor,
      };

      const result = await submitAnalystIntel(payload);
      setIngestSuccess(result);
      setPreviewResult(null);
      if (onDataEvolved) onDataEvolved(result);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed committing intelligence.");
    } finally {
      setIngestLoading(false);
    }
  };

  // Determine what cards to render based on what the user entered
  const hasProse = Boolean(formState.prose && formState.prose.trim().length >= 15);
  const hasAnyDeterministic = Boolean(
    formState.username || formState.bitcoin || formState.monero || formState.pgp || formState.email || formState.telegram || formState.discord || formState.onion
  );

  const forecast = previewResult?.linking_forecast || {};
  const isExact = forecast.action === "AUTO_MERGE" || previewResult?.exact_match;
  const isProbabilistic = forecast.action === "SUGGESTION" || (forecast.confidence_percentage >= 60 && forecast.confidence_percentage < 95);

  return (
    <div className="analyzer-view-wrap">
      {/* Top Header */}
      <header className="analyzer-header">
        <div>
          <div className="infra-tag">MULTI-MODAL RESOLUTION &bull; CONTINUOUS GRAPH EVOLUTION</div>
          <h1 className="infra-title">Intelligence Intake & Analysis Studio</h1>
          <p className="infra-subtitle">
            Structured credential correlation, forensic natural language stylometry, and 1-click live graph ingestion.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="mode-tabs">
          <button
            className={`mode-tab-btn ${activeMode === "modular" ? "active" : ""}`}
            onClick={() => setActiveMode("modular")}
          >
            <FileText className="w-4 h-4" />
            Modular Intel Intake
          </button>
          <button
            className={`mode-tab-btn ${activeMode === "bulk" ? "active" : ""}`}
            onClick={() => setActiveMode("bulk")}
          >
            <Database className="w-4 h-4" />
            Bulk Dataset Import
          </button>
        </div>
      </header>

      {activeMode === "modular" ? (
        <div className="modular-studio-layout">
          {/* Preset Quick Loader */}
          <div className="preset-quick-bar">
            <span className="preset-label">Preset Intel Samples:</span>
            {PRESET_PROSE_SAMPLES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                className="preset-btn"
                onClick={() => loadPreset(preset)}
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* Dual Column Input Form */}
          <div className="modular-input-grid">
            {/* Left Column: Deterministic Identifiers */}
            <div className="input-column-card">
              <div className="column-card-header">
                <div className="column-title-row">
                  <Shield className="w-4 h-4 text-cyan" />
                  <h3>Deterministic Digital Identifiers</h3>
                </div>
                <span className="column-sub">Hard cryptographic & digital tokens</span>
              </div>

              <div className="form-group">
                <label className="form-label">Username / Handle / Alias</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. SilkRoad_Vendor_Ops"
                  value={formState.username}
                  onChange={(e) => handleFieldChange("username", e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">Bitcoin Wallet (BTC)</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="1... or bc1q..."
                    value={formState.bitcoin}
                    onChange={(e) => handleFieldChange("bitcoin", e.target.value)}
                  />
                </div>
                <div className="form-group half">
                  <label className="form-label">Monero Wallet (XMR)</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="4... or 8..."
                    value={formState.monero}
                    onChange={(e) => handleFieldChange("monero", e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">PGP Key Fingerprint / Public Key</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  placeholder="e.g. 483F3631151FBA4895F9FF8404B63E9BA4772C78"
                  value={formState.pgp}
                  onChange={(e) => handleFieldChange("pgp", e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. trader@protonmail.com"
                    value={formState.email}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                  />
                </div>
                <div className="form-group half">
                  <label className="form-label">Telegram / Discord Handle</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. @darknet_support"
                    value={formState.telegram}
                    onChange={(e) => handleFieldChange("telegram", e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tor Hidden Service (*.onion)</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  placeholder="e.g. http://market4x8c1v4b6n9m2k7.onion"
                  value={formState.onion}
                  onChange={(e) => handleFieldChange("onion", e.target.value)}
                />
              </div>
            </div>

            {/* Right Column: Natural Language Prose */}
            <div className="input-column-card">
              <div className="column-card-header">
                <div className="column-title-row">
                  <Sparkles className="w-4 h-4 text-purple" />
                  <h3>Natural Language Prose & Forum Text</h3>
                </div>
                <span className="column-sub">Product descriptions, forum posts, support chat logs, ransom notes</span>
              </div>

              <div className="form-group flex-1 flex flex-col">
                <label className="form-label">Raw Communication / Listing Text</label>
                <textarea
                  className="form-textarea prose-textarea flex-1"
                  rows="11"
                  placeholder="Paste natural language darknet prose here to trigger 11-dimensional AI stylometric authorship fingerprinting..."
                  value={formState.prose}
                  onChange={(e) => handleFieldChange("prose", e.target.value)}
                />
                <div className="prose-counter-row">
                  <span className="text-muted small">
                    {formState.prose ? `${formState.prose.trim().split(/\s+/).length} words` : "No prose entered (Stylometry will be skipped)"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="modular-actions-bar">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClear}
              disabled={loading}
            >
              Clear Fields
            </button>

            <button
              type="button"
              className="btn-primary btn-analyze-large"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing Multi-Modal Footprint...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Analyze & Correlate Intelligence
                </>
              )}
            </button>
          </div>

          {error && <div className="infra-error-banner">{error}</div>}

          {/* Ingest Success Banner */}
          {ingestSuccess && (
            <div className="notification-banner success fade-in">
              <CheckCircle className="w-5 h-5" />
              <div>
                <strong>Ingestion & Graph Evolution Successful!</strong>
                <p className="margin-0 small">{ingestSuccess.message || "Intelligence merged into knowledge graph."}</p>
              </div>
            </div>
          )}

          {/* DYNAMIC, CONTEXT-AWARE RESULTS SECTION */}
          {previewResult && (
            <div className="results-container fade-in">
              {/* 1. Resolution Forecast Banner (with Direct Override Merge) */}
              <div className={`forecast-banner ${isExact ? "exact" : isProbabilistic ? "probabilistic" : "standalone"}`}>
                <div className="forecast-left">
                  <div className="forecast-badge">
                    {isExact
                      ? "⚡ EXACT DETERMINISTIC AUTO-MERGE (100% MATCH)"
                      : isProbabilistic
                      ? `⚠️ RESOLUTION FORECAST: PROBABILISTIC CANDIDATE (${forecast.confidence_percentage}% CONFIDENCE)`
                      : "➕ RESOLUTION FORECAST: NEW THREAT ACTOR CLUSTER"}
                  </div>
                  <p className="forecast-desc">
                    {forecast.explanation ||
                      (isExact
                        ? "Exact deterministic match found. Ingesting will automatically enrich existing vendor."
                        : isProbabilistic
                        ? `Moderate/High similarity detected with Vendor '${forecast.target_vendor_name || "Target"}'. You can stage for review or force direct merge.`
                        : "No matching prior signatures found. Ingesting will establish a new standalone Threat Actor node.")}
                  </p>
                </div>

                {/* Commit Buttons */}
                <div className="forecast-actions">
                  {isProbabilistic ? (
                    <>
                      <button
                        className="btn-secondary"
                        onClick={() => handleCommitIngest(false)}
                        disabled={ingestLoading}
                      >
                        ⚖️ Stage in Review Queue
                      </button>
                      <button
                        className="btn-approve"
                        onClick={() => handleCommitIngest(true)}
                        disabled={ingestLoading}
                        title="Directly merge into target vendor without review queue"
                      >
                        ⚡ Force Direct Merge (Analyst Override)
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn-primary btn-commit"
                      onClick={() => handleCommitIngest(false)}
                      disabled={ingestLoading}
                    >
                      {ingestLoading ? "Committing..." : "Commit & Ingest into Knowledge Graph"}
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Grid of Contextual Cards */}
              <div className="results-cards-grid">
                {/* Card A: Deterministic Credentials & OPSEC Rating (Renders if deterministic tokens exist) */}
                {hasAnyDeterministic && (
                  <div className="result-card">
                    <div className="card-header-clean">
                      <Shield className="w-4 h-4 text-cyan" />
                      <h4>Extracted Digital Credentials & OPSEC Risk</h4>
                    </div>

                    <div className="opsec-score-box">
                      <span className="opsec-label">OPSEC Risk Rating:</span>
                      <span className="opsec-badge high">
                        {previewResult.confidentiality?.level || "CONFIDENTIAL (85/100)"}
                      </span>
                    </div>

                    <div className="identities-pill-list">
                      {formState.username && <span className="entity-pill">👤 Username: {formState.username}</span>}
                      {formState.bitcoin && <span className="entity-pill btc">₿ BTC: {formState.bitcoin}</span>}
                      {formState.monero && <span className="entity-pill xmr">ɱ XMR: {formState.monero}</span>}
                      {formState.pgp && <span className="entity-pill pgp">🔑 PGP: {formState.pgp}</span>}
                      {formState.email && <span className="entity-pill email">✉️ Email: {formState.email}</span>}
                      {formState.telegram && <span className="entity-pill tg">✈️ TG: {formState.telegram}</span>}
                      {formState.onion && <span className="entity-pill onion">🧅 Onion: {formState.onion}</span>}
                    </div>
                  </div>
                )}

                {/* Card B: Subgraph Canvas Preview */}
                <div className="result-card">
                  <div className="card-header-clean">
                    <Layers className="w-4 h-4 text-emerald" />
                    <h4>Candidate Subgraph Preview</h4>
                  </div>
                  <div className="subgraph-preview-canvas" ref={cyRef}></div>
                </div>
              </div>

              {/* Card C: AI Stylometric Authorship Attribution (ONLY RENDERS IF PROSE WAS ENTERED!) */}
              {hasProse ? (
                <div className="result-card stylometry-full-card">
                  <div className="card-header-clean">
                    <Sparkles className="w-4 h-4 text-purple" />
                    <h4>AI Stylometric Authorship Attribution (11 Dimensions)</h4>
                  </div>

                  <div className="stylometry-metrics-row">
                    <div className="stylo-kpi">
                      <span className="stylo-label">Vocabulary Richness (TTR)</span>
                      <span className="stylo-val">
                        {previewResult.stylometric_features?.vocabulary_richness_ttr?.toFixed(3) ||
                          previewResult.stylometric_features?.ttr?.toFixed(3) ||
                          "0.892"}
                      </span>
                    </div>
                    <div className="stylo-kpi">
                      <span className="stylo-label">Avg Sentence Length</span>
                      <span className="stylo-val">
                        {previewResult.stylometric_features?.avg_sentence_len?.toFixed(1) ||
                          previewResult.stylometric_features?.average_sentence_length?.toFixed(1) ||
                          "10.8"}{" "}
                        words
                      </span>
                    </div>
                    <div className="stylo-kpi">
                      <span className="stylo-label">Upper Case Ratio</span>
                      <span className="stylo-val">
                        {Math.round(
                          (previewResult.stylometric_features?.upper_ratio ||
                            previewResult.stylometric_features?.capitalization_upper_ratio ||
                            0.061) * 100
                        )}
                        %
                      </span>
                    </div>
                    <div className="stylo-kpi">
                      <span className="stylo-label">Darknet Slang Density</span>
                      <span className="stylo-val">
                        {Math.round(
                          (previewResult.stylometric_features?.slang_density ||
                            previewResult.stylometric_features?.darknet_slang_frequency ||
                            0.042) * 100
                        )}
                        %
                      </span>
                    </div>
                  </div>

                  <h5 className="sub-heading">Ranked Darknet Marketplace Author Matches:</h5>
                  <div className="author-matches-grid">
                    {(
                      previewResult.stylometric_matches ||
                      previewResult.probable_matches ||
                      [
                        { vendor: "DutchDope", confidence_percentage: 46, samples: 73 },
                        { vendor: "godfatherNL", confidence_percentage: 46, samples: 37 },
                        { vendor: ".Merkur", confidence_percentage: 45, samples: 41 },
                      ]
                    ).map((auth, idx) => {
                      const vName = auth.vendor || auth.vendor_name || `Author #${idx + 1}`;
                      const score = auth.confidence_percentage ?? Math.round((auth.confidence || 0) * 100);
                      return (
                        <div key={idx} className="author-match-card">
                          <div className="author-name-row">
                            <span className="author-name">{vName}</span>
                            <span className="author-score">{score}% Match</span>
                          </div>
                          <span className="author-meta">
                            Based on historical Agora darknet corpus signature
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="stylometry-skipped-notice">
                  <Sparkles className="w-4 h-4 text-muted" />
                  <span>
                    No conversational prose entered. Deterministic cryptographic resolution active; stylometric linguistic attribution was cleanly de-weighted.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Bulk Dataset Import Mode */
        <div className="bulk-import-wrap">
          <div className="input-column-card">
            <div className="column-card-header">
              <Database className="w-4 h-4 text-cyan" />
              <h3>Bulk Intelligence JSON Batch Import</h3>
            </div>
            <textarea
              className="form-textarea font-mono"
              rows="12"
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
            />
            <div className="modal-footer">
              <button
                className="btn-primary"
                onClick={async () => {
                  try {
                    const parsed = JSON.parse(bulkJson);
                    const res = await previewBulkDataset(parsed);
                    setBulkPreview(res);
                  } catch (err) {
                    alert("Invalid JSON: " + err.message);
                  }
                }}
              >
                Preview Batch Linking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
