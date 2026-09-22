import React, { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import IdentityLinkingCard from "./IdentityLinkingCard";
import {
  analyzeIntelligence,
  previewDossierIntel,
  submitAnalystIntel,
  previewBulkDataset,
  importDataset,
} from "../services/api";

const noopIcon = () => null;
const UploadCloud = noopIcon;
const FileText = noopIcon;
const Database = noopIcon;
const CheckCircle = noopIcon;
const AlertTriangle = noopIcon;
const Send = noopIcon;
const Sparkles = noopIcon;
const Shield = noopIcon;
const Layers = noopIcon;
const ArrowRight = noopIcon;
const UserPlus = noopIcon;
const GitMerge = noopIcon;
const HelpCircle = noopIcon;
const PlusCircle = noopIcon;
const RefreshCw = noopIcon;
const Eye = noopIcon;
const Check = noopIcon;
const XCircle = noopIcon;
const Ban = noopIcon;
const X = noopIcon;
const Download = noopIcon;
const FileCode = noopIcon;
import { exportToJson, exportToPdf } from "../utils/exportUtils";

export default function IdentityAnalyzer({ onSelectVendor, onDataEvolved }) {
  const [activeSubTab, setActiveSubTab] = useState("analyzer"); // 'analyzer' | 'dossier' | 'bulk'

  // 1. Raw Text Analyzer state
  const [inputText, setInputText] = useState("");
  const [analyzedText, setAnalyzedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestResult, setIngestResult] = useState(null);
  const cyRef = useRef(null);
  const cyInstance = useRef(null);

  // 2. Structured Dossier Form state
  const [dossier, setDossier] = useState({
    username: "ShadowOps_Vortex",
    email: "vortex_ops@tutanota.com",
    bitcoin: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    monero: "888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsA2sPGLDctzU66W4sm2ghjWjBg63LJGkUhy6ugPrBBQD1ACYWVm5",
    pgp: "994E8F231A4C5B6D7E8F901234567890ABCDEF12",
    telegram: "@vortex_darknet_ops",
    discord: "vortex#2026",
    forum_handle: "vortex_underground",
    description: "High-speed bulletproof hosting operator and reverse proxy infrastructure. 99.9% uptime SLA. BTC and XMR accepted via automated escrow.",
    source_dataset: "Special Operations Dossier #402",
    analyst_name: "Lead_Investigator",
  });
  const [dossierPreview, setDossierPreview] = useState(null);
  const [dossierPreviewLoading, setDossierPreviewLoading] = useState(false);

  // 3. Bulk JSON state
  const [bulkJson, setBulkJson] = useState(
    JSON.stringify(
      [
        {
          username: "NexusCourier_EU",
          email: "nexus_courier@protonmail.com",
          bitcoin: "1b2cToQTkrmsDUUDeP6YDAK34wXuQ",
          telegram: "@nexus_courier_eu",
          discord: "nexus_courier#9999",
          description:
            "European stealth logistics and drop shipping. Vacuum sealed with next-day dispatch.",
        },
        {
          username: "CardingKing_2026",
          email: "cardingking@cock.li",
          monero:
            "44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGeiSTHzFcubDZmCo96hUoWDL14PBBCHnoFXcDpTX",
          telegram: "@cardingking_vip",
          description:
            "Verified merchant accounts, dumps with pins, and high-balance gift cards.",
        },
        {
          username: "ZeroDayBroker",
          email: "zeroday@onionmail.org",
          bitcoin: "1LPiyimWVLtWHJkvgGcvY8mKjZwpVgyaz",
          pgp: "483F3631151FBA4895F9FF8404B63E9BA4772C78",
          description:
            "Private exploit seller and source code auditing service. PGP encrypted communications only.",
        },
      ],
      null,
      2
    )
  );
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkPreviewLoading, setBulkPreviewLoading] = useState(false);
  const [bulkSelectedIndices, setBulkSelectedIndices] = useState(new Set());
  const [bulkFilter, setBulkFilter] = useState("all");

  // =========================================================================
  // Mode 1: Raw Text Analysis
  // =========================================================================
  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError("");
    setIngestResult(null);

    try {
      const data = await analyzeIntelligence(inputText);
      setReport(data);
      setAnalyzedText(inputText);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err.message ||
          "Failed to analyze intelligence"
      );
    } finally {
      setLoading(false);
    }
  };

  const isTextDirty = inputText !== analyzedText;

  const handleIngestFromAnalysis = async () => {
    if (!report) return;
    setIngestLoading(true);
    setIngestResult(null);

    try {
      const entities = report.extracted_entities || {};
      const emails = entities.emails || [];
      const wallets = entities.bitcoin_wallets || [];
      const pgps = entities.pgp_fingerprints || [];
      const candidateVendor = (report.stylometric_matches || [])[0]?.vendor || "";

      const lines = inputText.split("\n");
      let extractedUsername = candidateVendor || "Analyzed_Persona";
      let moneroVal = "";
      let telegramVal = "";
      let discordVal = "";

      for (const line of lines) {
        const lower = line.toLowerCase();
        if (
          lower.includes("alias:") ||
          lower.includes("vendor:") ||
          lower.includes("handle:")
        ) {
          const parts = line.split(":");
          if (parts[1]) extractedUsername = parts.slice(1).join(":").trim();
        }
        if (lower.includes("monero:") || lower.includes("xmr:")) {
          moneroVal = line.split(":")[1]?.trim() || "";
        }
        if (lower.includes("telegram:") || lower.includes("tg:")) {
          telegramVal = line.split(":")[1]?.trim() || "";
        }
        if (lower.includes("discord:")) {
          discordVal = line.split(":")[1]?.trim() || "";
        }
      }

      const payload = {
        username: extractedUsername,
        email: emails[0] || "",
        bitcoin: wallets[0] || "",
        monero: moneroVal || "",
        pgp: pgps[0] || "",
        telegram: telegramVal || "",
        discord: discordVal || "",
        description: inputText.slice(0, 500),
        source_dataset: "AI Text Intake Analysis",
        analyst_name: "Lead_Investigator",
      };

      const data = await submitAnalystIntel(payload);
      setIngestResult(data);
      if (onDataEvolved) onDataEvolved(data);
    } catch (err) {
      const errorMsg =
        err?.response?.data?.error ||
        err.message ||
        "Failed committing intelligence to Knowledge Graph";
      setIngestResult({ error: errorMsg });
    } finally {
      setIngestLoading(false);
    }
  };

  const handleRejectAnalysis = () => {
    setReport(null);
    setIngestResult({
      message: "Intelligence analysis rejected and discarded by analyst.",
    });
  };

  // =========================================================================
  // Mode 2: Dossier Two-Step (1. Preview -> 2. Commit)
  // =========================================================================
  const handleDossierPreview = async (e) => {
    if (e) e.preventDefault();
    if (!dossier.username.trim()) return;
    setDossierPreviewLoading(true);
    setIngestResult(null);

    try {
      const data = await previewDossierIntel(dossier);
      setDossierPreview(data);
    } catch (err) {
      const errorMsg =
        err?.response?.data?.error ||
        err.message ||
        "Failed to preview dossier linking";
      setIngestResult({ error: errorMsg });
    } finally {
      setDossierPreviewLoading(false);
    }
  };

  const handleDossierCommit = async () => {
    if (!dossier.username.trim()) return;
    setIngestLoading(true);
    setIngestResult(null);

    try {
      const data = await submitAnalystIntel({
        username: dossier.username,
        email: dossier.email,
        bitcoin: dossier.bitcoin,
        monero: dossier.monero,
        pgp: dossier.pgp,
        telegram: dossier.telegram,
        discord: dossier.discord,
        forum_handle: dossier.forum_handle,
        description: dossier.description,
        source_dataset: dossier.source_dataset,
        analyst_name: dossier.analyst_name,
      });
      setIngestResult(data);
      if (onDataEvolved) onDataEvolved(data);
    } catch (err) {
      const errorMsg =
        err?.response?.data?.error ||
        err.message ||
        "Failed committing dossier to Knowledge Graph";
      setIngestResult({ error: errorMsg });
    } finally {
      setIngestLoading(false);
    }
  };

  const handleRejectDossier = () => {
    setDossierPreview(null);
    setIngestResult({
      message: "Dossier intake rejected and discarded by analyst.",
    });
  };

  // =========================================================================
  // Mode 3: Bulk JSON Two-Step (1. Preview -> 2. Commit Selective)
  // =========================================================================
  const [bulkRejectedIndices, setBulkRejectedIndices] = useState(new Set());

  const handleBulkPreview = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!bulkJson.trim()) return;
    setBulkPreviewLoading(true);
    setIngestResult(null);

    try {
      let parsed;
      try {
        parsed = JSON.parse(bulkJson);
      } catch (parseErr) {
        setIngestResult({
          error: `Invalid JSON syntax: ${parseErr.message}`,
        });
        setBulkPreviewLoading(false);
        return;
      }

      const records = Array.isArray(parsed)
        ? parsed
        : parsed.records || [parsed];
      const data = await previewBulkDataset({ records });
      setBulkPreview(data);
      const list = data.records_preview || data.previews || data.records || [];
      setBulkSelectedIndices(new Set(list.map((_, idx) => idx)));
      setBulkRejectedIndices(new Set());
      setBulkFilter("all");
    } catch (err) {
      const errorMsg =
        err?.response?.data?.error ||
        err.message ||
        "Failed previewing bulk dataset";
      setIngestResult({ error: errorMsg });
    } finally {
      setBulkPreviewLoading(false);
    }
  };

  const toggleBulkSelect = (idx) => {
    if (bulkRejectedIndices.has(idx)) {
      setBulkRejectedIndices((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }
    setBulkSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAllBulk = () => {
    if (!bulkPreview) return;
    const list = bulkPreview.records_preview || bulkPreview.previews || bulkPreview.records || [];
    setBulkSelectedIndices(new Set(list.map((_, idx) => idx)));
    setBulkRejectedIndices(new Set());
  };

  const deselectAllBulk = () => {
    setBulkSelectedIndices(new Set());
  };

  const handleBulkFilterChange = (filter) => {
    setBulkFilter(filter);
    if (!bulkPreview) return;
    const list = bulkPreview.records_preview || bulkPreview.previews || bulkPreview.records || [];
    if (filter === "all") {
      setBulkSelectedIndices(new Set(list.map((_, idx) => idx)));
    } else {
      const matched = list
        .map((r, idx) => ({ r, idx }))
        .filter(({ r }) => (r.linking_forecast?.action || r.resolution || "").toUpperCase() === filter.toUpperCase())
        .map(({ idx }) => idx);
      setBulkSelectedIndices(new Set(matched));
    }
  };

  const handleRejectBulkRecord = (idx) => {
    setBulkSelectedIndices((prev) => {
      const next = new Set(prev);
      next.delete(idx);
      return next;
    });
    setBulkRejectedIndices((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };

  const handleRejectBulkBatch = () => {
    const total = bulkPreview?.total_records || 0;
    setBulkPreview(null);
    setBulkSelectedIndices(new Set());
    setBulkRejectedIndices(new Set());
    setIngestResult({
      message: `Bulk dataset ingestion (${total} records) rejected and discarded by analyst.`,
    });
  };

  const handleBulkCommit = async (customIndices = null) => {
    if (!bulkPreview) return;
    const targetIndices = customIndices !== null ? customIndices : bulkSelectedIndices;
    if (targetIndices.size === 0) return;
    setIngestLoading(true);
    setIngestResult(null);

    try {
      const parsed = JSON.parse(bulkJson);
      const allRecords = Array.isArray(parsed)
        ? parsed
        : parsed.records || [parsed];
      const records = allRecords.filter((_, idx) => targetIndices.has(idx));
      const data = await importDataset({
        source_name: "Selective Bulk Import",
        analyst_name: "Lead_Investigator",
        records,
      });
      setIngestResult(data);
      if (onDataEvolved) onDataEvolved(data);
    } catch (err) {
      const errorMsg =
        err?.response?.data?.error || err.message || "Failed importing dataset";
      setIngestResult({ error: errorMsg });
    } finally {
      setIngestLoading(false);
    }
  };

  // Render Mini-Subgraph for Raw Text Analyzer
  useEffect(() => {
    if (!cyRef.current || !report || activeSubTab !== "analyzer") return;

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
      elements.push({
        data: { id, label: email, color: "#0284C7", shape: "hexagon" },
      });
      elements.push({
        data: { source: sourceNodeId, target: id, label: "HAS_EMAIL" },
      });
    });

    (entities.bitcoin_wallets || []).forEach((w, i) => {
      const id = `btc_${i}`;
      elements.push({
        data: {
          id,
          label: `${w.slice(0, 8)}...`,
          color: "#F59E0B",
          shape: "round-rectangle",
        },
      });
      elements.push({
        data: { source: sourceNodeId, target: id, label: "HAS_WALLET" },
      });
    });

    (entities.pgp_fingerprints || []).forEach((p, i) => {
      const id = `pgp_${i}`;
      elements.push({
        data: {
          id,
          label: `${p.slice(0, 8)}...`,
          color: "#F97316",
          shape: "diamond",
        },
      });
      elements.push({
        data: { source: sourceNodeId, target: id, label: "HAS_PGP" },
      });
    });

    (report.stylometric_matches || []).forEach((m, i) => {
      const id = `vendor_match_${i}`;
      elements.push({
        data: { id, label: m.vendor, color: "#10B981", shape: "ellipse" },
      });
      elements.push({
        data: {
          source: sourceNodeId,
          target: id,
          label: `LIKELY_SAME (${Math.round(m.confidence_percentage)}%)`,
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
            color: "#94a3b8",
          },
        },
      ],
      layout: {
        name: "cose",
        animate: false,
      },
    });
  }, [report, activeSubTab]);

  const forecast = report?.linking_forecast;

  return (
    <div
      className="analyzer-container"
      style={{ maxWidth: "1280px", margin: "0 auto", padding: "16px" }}
    >
      {/* Studio Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "1.3rem",
              fontWeight: 700,
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            📥 Intelligence Intake & Analysis Studio
          </h2>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              margin: "4px 0 0",
            }}
          >
            Two-step intelligence intake: Preview resolution and linking
            possibilities before committing to the permanent Knowledge Graph.
          </p>
        </div>
      </div>

      {/* Sub-Tab Navigation Switcher */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          background: "rgba(15, 23, 42, 0.6)",
          padding: "6px",
          borderRadius: "10px",
          border: "1px solid rgba(51, 65, 85, 0.6)",
          marginBottom: "20px",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveSubTab("analyzer");
            setIngestResult(null);
          }}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            background: activeSubTab === "analyzer" ? "#2563eb" : "transparent",
            color: activeSubTab === "analyzer" ? "#ffffff" : "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <FileText className="w-4 h-4" />
          1. Raw Text Analysis & 1-Click Ingest
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab("dossier");
            setIngestResult(null);
          }}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            background: activeSubTab === "dossier" ? "#10b981" : "transparent",
            color: activeSubTab === "dossier" ? "#ffffff" : "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <UserPlus className="w-4 h-4" />
          2. Single Actor Dossier (Preview & Ingest)
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab("bulk");
            setIngestResult(null);
          }}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            background: activeSubTab === "bulk" ? "#10b981" : "transparent",
            color: activeSubTab === "bulk" ? "#ffffff" : "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <Database className="w-4 h-4" />
          3. Bulk Dataset Import (Batch Preview & Ingest)
        </button>
      </div>

      {/* ==================================================================== */}
      {/* Mode 1: Raw Text Analysis & 1-Click Ingest                           */}
      {/* ==================================================================== */}
      {activeSubTab === "analyzer" && (
        <>
          <div className="analyzer-input-box">
            <textarea
              rows={6}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste raw unformatted dark web post, PGP signed message, or vendor profile here..."
              className="analyzer-textarea"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                background: "rgba(15, 23, 42, 0.8)",
                color: "#fff",
                border: "1px solid #334155",
                fontFamily: "monospace",
                fontSize: "0.82rem",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "10px",
              }}
            >
              <button
                type="button"
                className="btn primary"
                onClick={handleAnalyze}
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                {loading ? (
                  <Sparkles className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                1. Analyze Intelligence & Preview Linking
              </button>

              {isTextDirty && report && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#f59e0b",
                    fontStyle: "italic",
                  }}
                >
                  ⚠️ Text changed — Click "Analyze Intelligence" to refresh
                  forecast
                </span>
              )}
            </div>
          </div>

          {/* Linking Resolution Forecast Card */}
          {report && forecast && (
            <div
              style={{
                marginTop: "16px",
                padding: "16px 20px",
                borderRadius: "10px",
                background:
                  forecast.action === "AUTO_MERGE"
                    ? "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)"
                    : forecast.action === "SUGGESTION"
                    ? "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%)"
                    : "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%)",
                border: `1px solid ${
                  forecast.action === "AUTO_MERGE"
                    ? "rgba(16, 185, 129, 0.4)"
                    : forecast.action === "SUGGESTION"
                    ? "rgba(245, 158, 11, 0.4)"
                    : "rgba(59, 130, 246, 0.4)"
                }`,
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ flex: 1, minWidth: "300px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                    }}
                  >
                    {forecast.action === "AUTO_MERGE" ? (
                      <GitMerge className="w-5 h-5 text-emerald-400" />
                    ) : forecast.action === "SUGGESTION" ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    ) : (
                      <PlusCircle className="w-5 h-5 text-blue-400" />
                    )}
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color:
                          forecast.action === "AUTO_MERGE"
                            ? "#34d399"
                            : forecast.action === "SUGGESTION"
                            ? "#fbbf24"
                            : "#60a5fa",
                      }}
                    >
                      {forecast.action === "AUTO_MERGE" &&
                        "⚡ Resolution Forecast: Exact Deterministic Auto-Merge (100% Match)"}
                      {forecast.action === "SUGGESTION" &&
                        `⚖️ Resolution Forecast: Probabilistic Candidate Match (${Math.round(
                          forecast.confidence_percentage
                        )}% Confidence)`}
                      {forecast.action === "NEW_CLUSTER" &&
                        "🆕 Resolution Forecast: New Threat Actor Cluster (No Prior Links)"}
                    </h3>
                  </div>

                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: "0.82rem",
                      color: "#e2e8f0",
                      lineHeight: "1.4",
                    }}
                  >
                    {forecast.explanation}
                  </p>

                  {forecast.matched_identifier && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "0.75rem",
                        color: "#cbd5e1",
                      }}
                    >
                      <span>Matched Evidence:</span>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: "rgba(16, 185, 129, 0.2)",
                          border: "1px solid rgba(16, 185, 129, 0.5)",
                          color: "#34d399",
                          fontWeight: 600,
                          fontFamily: "monospace",
                        }}
                      >
                        {forecast.matched_identifier.type}:{" "}
                        {forecast.matched_identifier.value}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ alignSelf: "center", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleIngestFromAnalysis}
                    disabled={ingestLoading || isTextDirty}
                    style={{
                      background:
                        forecast.action === "AUTO_MERGE"
                          ? "rgba(16, 185, 129, 0.25)"
                          : "rgba(37, 99, 235, 0.25)",
                      borderColor:
                        forecast.action === "AUTO_MERGE"
                          ? "#10b981"
                          : "#2563eb",
                      color:
                        forecast.action === "AUTO_MERGE"
                          ? "#34d399"
                          : "#60a5fa",
                      fontWeight: 700,
                      padding: "10px 18px",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: isTextDirty ? "not-allowed" : "pointer",
                      opacity: isTextDirty ? 0.6 : 1,
                    }}
                  >
                    {ingestLoading ? (
                      <Sparkles className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    2. Commit & Ingest into Knowledge Graph
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleRejectAnalysis}
                    disabled={ingestLoading}
                    style={{
                      background: "rgba(244, 63, 94, 0.15)",
                      borderColor: "#f43f5e",
                      color: "#fb7185",
                      fontWeight: 700,
                      padding: "10px 16px",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <Ban className="w-4 h-4" />
                    Reject Analysis
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => exportToJson(report, `analysis_intel_${Date.now()}`)}
                    style={{
                      background: "rgba(56, 189, 248, 0.15)",
                      borderColor: "#38bdf8",
                      color: "#38bdf8",
                      fontWeight: 600,
                      padding: "10px 14px",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                    title="Export structured JSON intelligence"
                  >
                    <FileCode className="w-4 h-4" />
                    Export JSON
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => exportToPdf({
                      title: "Raw Text Intelligence Attribution Report",
                      extractedEntities: report.extracted_entities,
                      stylometricFeatures: report.stylometric_features,
                      heuristicReason: report.linking_forecast?.explanation,
                      confidence: report.linking_forecast?.confidence_percentage,
                      resolution: report.linking_forecast?.action,
                      rawText: inputText,
                    }, `forensic_report_${Date.now()}`)}
                    style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      borderColor: "#10b981",
                      color: "#34d399",
                      fontWeight: 600,
                      padding: "10px 14px",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                    title="Export formal PDF forensic dossier"
                  >
                    <Download className="w-4 h-4" />
                    Export PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ingestion Result Notification */}
          {ingestResult && (
            <div
              style={{
                margin: "16px 0",
                padding: "12px 16px",
                borderRadius: "8px",
                background: ingestResult.error
                  ? "rgba(244, 63, 94, 0.15)"
                  : "rgba(16, 185, 129, 0.15)",
                border: `1px solid ${
                  ingestResult.error
                    ? "rgba(244, 63, 94, 0.4)"
                    : "rgba(16, 185, 129, 0.4)"
                }`,
                fontSize: "0.82rem",
              }}
            >
              <strong
                style={{
                  color: ingestResult.error ? "#f43f5e" : "#34d399",
                }}
              >
                {ingestResult.error
                  ? "Ingestion Error:"
                  : "✓ Knowledge Graph Ingestion Complete:"}
              </strong>{" "}
              {ingestResult.message || ingestResult.error}
              {ingestResult.evolution_report && (
                <div
                  style={{
                    marginTop: "6px",
                    display: "flex",
                    gap: "12px",
                    fontSize: "0.75rem",
                    color: "#cbd5e1",
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    New Nodes:{" "}
                    <strong>
                      +{ingestResult.evolution_report.new_nodes_created}
                    </strong>
                  </span>
                  <span>
                    Updated:{" "}
                    <strong>
                      {ingestResult.evolution_report.existing_nodes_updated}
                    </strong>
                  </span>
                  <span>
                    Strengthened:{" "}
                    <strong>
                      +{ingestResult.evolution_report.relationships_strengthened}
                    </strong>
                  </span>
                  <span>
                    Action: <strong>{ingestResult.action}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Analysis Report Grid */}
          {report && (
            <div
              className="analyzer-report-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginTop: "16px",
              }}
            >
              <div className="panel">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h3>🛡️ PII & OPSEC Risk Evaluation</h3>
                  <span
                    className={`pill ${report.confidentiality?.badge || "info"}`}
                  >
                    {report.confidentiality?.level || "Public"} (
                    {report.confidentiality?.score || 0}/100)
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  {report.confidentiality?.description}
                </p>

                <h4 style={{ fontSize: "0.85rem", marginTop: "12px" }}>
                  Extracted Identity Elements:
                </h4>
                <div className="item-badge-list">
                  {(report.extracted_entities?.emails || []).map((e, i) => (
                    <span key={i} className="item-badge">
                      📧 {e}
                    </span>
                  ))}
                  {(report.extracted_entities?.bitcoin_wallets || []).map(
                    (b, i) => (
                      <span key={i} className="item-badge">
                        ₿ {b}
                      </span>
                    )
                  )}
                  {(report.extracted_entities?.monero_wallets || []).map(
                    (x, i) => (
                      <span key={i} className="item-badge">
                        ɱ {x.slice(0, 12)}...
                      </span>
                    )
                  )}
                  {(report.extracted_entities?.pgp_fingerprints || []).map(
                    (p, i) => (
                      <span key={i} className="item-badge">
                        🔑 {p.slice(0, 16)}...
                      </span>
                    )
                  )}
                  {(report.extracted_entities?.credentials || []).map(
                    (c, i) => (
                      <span
                        key={i}
                        className="item-badge"
                        style={{ borderColor: "#ef4444" }}
                      >
                        🔒 {c}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="panel">
                <h3>🕸️ Extracted Subgraph Preview</h3>
                <div
                  ref={cyRef}
                  style={{
                    width: "100%",
                    height: "260px",
                    background: "rgba(15, 23, 42, 0.6)",
                    borderRadius: "8px",
                    border: "1px solid rgba(51, 65, 85, 0.4)",
                  }}
                />
              </div>

              <div className="panel" style={{ gridColumn: "1 / -1" }}>
                <h3>
                  ✍️ AI Stylometric Authorship Attribution (11 Dimensions)
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "10px",
                    margin: "10px 0",
                  }}
                >
                  <div className="stats-card">
                    <p className="stats-label">Vocabulary Richness (TTR)</p>
                    <p className="stats-value">
                      {report.stylometric_features?.vocabulary_richness?.toFixed(
                        3
                      ) || "0.000"}
                    </p>
                  </div>
                  <div className="stats-card">
                    <p className="stats-label">Avg Sentence Length</p>
                    <p className="stats-value">
                      {report.stylometric_features?.avg_sentence_len?.toFixed(
                        1
                      ) || "0.0"}{" "}
                      words
                    </p>
                  </div>
                  <div className="stats-card">
                    <p className="stats-label">Upper Case Ratio</p>
                    <p className="stats-value">
                      {(
                        (report.stylometric_features?.upper_ratio || 0) * 100
                      ).toFixed(1)}
                      %
                    </p>
                  </div>
                  <div className="stats-card">
                    <p className="stats-label">Darknet Slang Frequency</p>
                    <p className="stats-value">
                      {(
                        (report.stylometric_features?.slang_freq || 0) * 100
                      ).toFixed(1)}
                      %
                    </p>
                  </div>
                </div>

                <h4 style={{ fontSize: "0.85rem", marginTop: "12px" }}>
                  Ranked Darknet Vendor Matches:
                </h4>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {(report.stylometric_matches || []).map((m, i) => (
                    <div
                      key={i}
                      className="correlated-item"
                      style={{ flex: 1, minWidth: "220px", cursor: "pointer" }}
                      onClick={() =>
                        onSelectVendor && onSelectVendor(m.vendor)
                      }
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <strong>{m.vendor}</strong>
                        <span style={{ color: "#10b981", fontWeight: 700 }}>
                          {Math.round(m.confidence_percentage)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted">
                        Based on {m.listing_count} historical Agora listing
                        corpus signatures
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================================================================== */}
      {/* Mode 2: Single Actor Dossier (Two-Step Flow)                         */}
      {/* ==================================================================== */}
      {activeSubTab === "dossier" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <form
            onSubmit={handleDossierPreview}
            className="panel"
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <h3 style={{ margin: 0 }}>👤 Threat Actor Dossier Form</h3>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              Step 1: Fill out the dossier and click <strong>Preview Linking & Validate</strong> to see how the platform will resolve these credentials.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#94a3b8",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Target Handle / Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. darkman145"
                  value={dossier.username}
                  onChange={(e) => {
                    setDossier({ ...dossier, username: e.target.value });
                    setDossierPreview(null);
                    setIngestResult(null);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "#0f172a",
                    border: "1px solid #334155",
                    color: "#fff",
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#94a3b8",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="trader@protonmail.com"
                  value={dossier.email}
                  onChange={(e) => {
                    setDossier({ ...dossier, email: e.target.value });
                    setDossierPreview(null);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "#0f172a",
                    border: "1px solid #334155",
                    color: "#fff",
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#94a3b8",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Bitcoin Wallet
                </label>
                <input
                  type="text"
                  placeholder="1ABC... or bc1q..."
                  value={dossier.bitcoin}
                  onChange={(e) => {
                    setDossier({ ...dossier, bitcoin: e.target.value });
                    setDossierPreview(null);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "#0f172a",
                    border: "1px solid #334155",
                    color: "#fff",
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#94a3b8",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Monero (XMR) Wallet
                </label>
                <input
                  type="text"
                  placeholder="4... or 8..."
                  value={dossier.monero}
                  onChange={(e) => {
                    setDossier({ ...dossier, monero: e.target.value });
                    setDossierPreview(null);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "#0f172a",
                    border: "1px solid #334155",
                    color: "#fff",
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#94a3b8",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Telegram Handle
                </label>
                <input
                  type="text"
                  placeholder="@darkops_vendor"
                  value={dossier.telegram}
                  onChange={(e) => {
                    setDossier({ ...dossier, telegram: e.target.value });
                    setDossierPreview(null);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "#0f172a",
                    border: "1px solid #334155",
                    color: "#fff",
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#94a3b8",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Discord Tag
                </label>
                <input
                  type="text"
                  placeholder="operator#1337"
                  value={dossier.discord}
                  onChange={(e) => {
                    setDossier({ ...dossier, discord: e.target.value });
                    setDossierPreview(null);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "#0f172a",
                    border: "1px solid #334155",
                    color: "#fff",
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#94a3b8",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                PGP Fingerprint (40-hex)
              </label>
              <input
                type="text"
                placeholder="483F3631151FBA4895F9FF8404B63E9BA4772C78"
                value={dossier.pgp}
                onChange={(e) => {
                  setDossier({ ...dossier, pgp: e.target.value });
                  setDossierPreview(null);
                }}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  background: "#0f172a",
                  border: "1px solid #334155",
                  color: "#fff",
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#94a3b8",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Profile Bio / Writing Sample (For Stylometry)
              </label>
              <textarea
                rows={3}
                placeholder="Paste vendor profile bio, terms of service, or item descriptions..."
                value={dossier.description}
                onChange={(e) => {
                  setDossier({ ...dossier, description: e.target.value });
                  setDossierPreview(null);
                }}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  background: "#0f172a",
                  border: "1px solid #334155",
                  color: "#fff",
                  fontSize: "0.8rem",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "8px",
              }}
            >
              <span
                style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
              >
                Source: {dossier.source_dataset}
              </span>
              <button
                type="button"
                onClick={handleDossierPreview}
                disabled={dossierPreviewLoading}
                className="btn primary"
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "0.85rem", fontWeight: 600 }}
              >
                {dossierPreviewLoading ? (
                  <Sparkles className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                1. Preview Dossier Linking & Validate
              </button>
            </div>
          </form>

          {/* Dossier Linking Forecast & Commit Card */}
          {dossierPreview && dossierPreview.linking_forecast && (
            <div
              style={{
                padding: "16px 20px",
                borderRadius: "10px",
                background:
                  dossierPreview.linking_forecast.action === "AUTO_MERGE"
                    ? "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)"
                    : dossierPreview.linking_forecast.action === "SUGGESTION"
                    ? "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%)"
                    : "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%)",
                border: `1px solid ${
                  dossierPreview.linking_forecast.action === "AUTO_MERGE"
                    ? "rgba(16, 185, 129, 0.4)"
                    : dossierPreview.linking_forecast.action === "SUGGESTION"
                    ? "rgba(245, 158, 11, 0.4)"
                    : "rgba(59, 130, 246, 0.4)"
                }`,
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ flex: 1, minWidth: "300px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                    }}
                  >
                    {dossierPreview.linking_forecast.action === "AUTO_MERGE" ? (
                      <GitMerge className="w-5 h-5 text-emerald-400" />
                    ) : dossierPreview.linking_forecast.action === "SUGGESTION" ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    ) : (
                      <PlusCircle className="w-5 h-5 text-blue-400" />
                    )}
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color:
                          dossierPreview.linking_forecast.action === "AUTO_MERGE"
                            ? "#34d399"
                            : dossierPreview.linking_forecast.action === "SUGGESTION"
                            ? "#fbbf24"
                            : "#60a5fa",
                      }}
                    >
                      {dossierPreview.linking_forecast.action === "AUTO_MERGE" &&
                        "⚡ Dossier Forecast: Exact Deterministic Auto-Merge (100% Match)"}
                      {dossierPreview.linking_forecast.action === "SUGGESTION" &&
                        `⚖️ Dossier Forecast: Probabilistic Suggestion (${Math.round(
                          dossierPreview.linking_forecast.confidence_percentage
                        )}% Confidence)`}
                      {dossierPreview.linking_forecast.action === "NEW_CLUSTER" &&
                        "🆕 Dossier Forecast: New Threat Actor Cluster (No Prior Links)"}
                    </h3>
                  </div>

                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: "0.82rem",
                      color: "#e2e8f0",
                      lineHeight: "1.4",
                    }}
                  >
                    {dossierPreview.linking_forecast.explanation}
                  </p>

                  <h4 style={{ fontSize: "0.78rem", margin: "8px 0 4px", color: "#94a3b8" }}>
                    Normalized Canonical Entities:
                  </h4>
                  <div className="item-badge-list" style={{ marginBottom: "8px" }}>
                    {(dossierPreview.normalized_entities || []).map((ne, idx) => (
                      <span key={idx} className="item-badge">
                        {ne.type.toUpperCase()}: <strong>{ne.normalized}</strong>
                      </span>
                    ))}
                  </div>

                  {dossierPreview.confidentiality && (
                    <div style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
                      OPSEC Exposure Risk: <span className={`pill ${dossierPreview.confidentiality.badge}`}>{dossierPreview.confidentiality.level} ({dossierPreview.confidentiality.score}/100)</span>
                    </div>
                  )}
                </div>

                <div style={{ alignSelf: "center" }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleDossierCommit}
                    disabled={ingestLoading}
                    style={{
                      background:
                        dossierPreview.linking_forecast.action === "AUTO_MERGE"
                          ? "rgba(16, 185, 129, 0.25)"
                          : "rgba(37, 99, 235, 0.25)",
                      borderColor:
                        dossierPreview.linking_forecast.action === "AUTO_MERGE"
                          ? "#10b981"
                          : "#2563eb",
                      color:
                        dossierPreview.linking_forecast.action === "AUTO_MERGE"
                          ? "#34d399"
                          : "#60a5fa",
                      fontWeight: 700,
                      padding: "10px 18px",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                  >
                    {ingestLoading ? (
                      <Sparkles className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    2. Commit Dossier into Knowledge Graph
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleRejectDossier}
                    disabled={ingestLoading}
                    style={{
                      background: "rgba(244, 63, 94, 0.15)",
                      borderColor: "#f43f5e",
                      color: "#fb7185",
                      fontWeight: 700,
                      padding: "10px 16px",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <Ban className="w-4 h-4" />
                    Reject Dossier
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => exportToJson({ dossier, dossierPreview }, `dossier_${dossier.username}_${Date.now()}`)}
                    style={{
                      background: "rgba(56, 189, 248, 0.15)",
                      borderColor: "#38bdf8",
                      color: "#38bdf8",
                      fontWeight: 600,
                      padding: "10px 14px",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                    title="Export structured JSON dossier"
                  >
                    <FileCode className="w-4 h-4" />
                    Export JSON
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => exportToPdf({
                      title: `Threat Actor Dossier: ${dossier.username}`,
                      actorHandle: dossier.username,
                      sourceDataset: dossier.source_dataset,
                      confidence: dossierPreview.linking_forecast?.confidence_percentage,
                      resolution: dossierPreview.linking_forecast?.action,
                      extractedEntities: {
                        emails: dossier.email ? [dossier.email] : [],
                        bitcoin_wallets: dossier.bitcoin ? [dossier.bitcoin] : [],
                        monero_wallets: dossier.monero ? [dossier.monero] : [],
                        pgp_fingerprints: dossier.pgp ? [dossier.pgp] : [],
                        telegram_handles: dossier.telegram ? [dossier.telegram] : [],
                        discord_handles: dossier.discord ? [dossier.discord] : [],
                      },
                      heuristicReason: dossierPreview.linking_forecast?.explanation,
                      rawText: dossier.description,
                    }, `dossier_${dossier.username}_${Date.now()}`)}
                    style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      borderColor: "#10b981",
                      color: "#34d399",
                      fontWeight: 600,
                      padding: "10px 14px",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                    title="Export formal PDF forensic dossier"
                  >
                    <Download className="w-4 h-4" />
                    Export PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dossier Ingest Result */}
          {ingestResult && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "8px",
                background: ingestResult.error
                  ? "rgba(244, 63, 94, 0.15)"
                  : "rgba(16, 185, 129, 0.15)",
                border: `1px solid ${
                  ingestResult.error
                    ? "rgba(244, 63, 94, 0.4)"
                    : "rgba(16, 185, 129, 0.4)"
                }`,
                fontSize: "0.82rem",
              }}
            >
              <strong
                style={{
                  color: ingestResult.error ? "#f43f5e" : "#34d399",
                }}
              >
                {ingestResult.error
                  ? "Submission Error:"
                  : "✓ Dossier Knowledge Graph Ingestion Complete:"}
              </strong>{" "}
              {ingestResult.message || ingestResult.error}
              {ingestResult.evolution_report && (
                <div
                  style={{
                    marginTop: "6px",
                    display: "flex",
                    gap: "12px",
                    fontSize: "0.75rem",
                    color: "#cbd5e1",
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    New Nodes: <strong>+{ingestResult.evolution_report.new_nodes_created}</strong>
                  </span>
                  <span>
                    Updated: <strong>{ingestResult.evolution_report.existing_nodes_updated}</strong>
                  </span>
                  <span>
                    Strengthened: <strong>+{ingestResult.evolution_report.relationships_strengthened}</strong>
                  </span>
                  <span>
                    Action: <strong>{ingestResult.action}</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* Mode 3: Bulk JSON Dataset Ingestion (Two-Step Flow)                  */}
      {/* ==================================================================== */}
      {activeSubTab === "bulk" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <form
            onSubmit={handleBulkPreview}
            className="panel"
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <h3 style={{ margin: 0 }}>📁 Bulk Dataset Ingestion (JSON Array)</h3>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              Step 1: Paste your multi-record intelligence dump and click <strong>Preview Batch Linking</strong> to inspect predicted merges, suggestions, and new clusters across all records.
            </p>

            <textarea
              rows={9}
              required
              placeholder={`[\n  {\n    "username": "shadow_courier_99",\n    "email": "courier99@protonmail.com",\n    "bitcoin": "1LPiyimWVLtWHJkvgGcvY8mKjZwpVgyaz",\n    "telegram": "@shadow_courier"\n  }\n]`}
              value={bulkJson}
              onChange={(e) => {
                setBulkJson(e.target.value);
                setBulkPreview(null);
                setIngestResult(null);
              }}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                background: "#0f172a",
                border: "1px solid #334155",
                color: "#38bdf8",
                fontFamily: "monospace",
                fontSize: "0.8rem",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                paddingTop: "4px",
              }}
            >
              <button
                type="button"
                onClick={handleBulkPreview}
                disabled={bulkPreviewLoading}
                className="btn primary"
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "0.85rem", fontWeight: 600 }}
              >
                {bulkPreviewLoading ? (
                  <Sparkles className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                1. Preview Batch Linking & Validate ({bulkPreview ? "Validated" : "Analyze"})
              </button>
            </div>
          </form>

          {/* Bulk Batch Preview Analysis Card */}
          {bulkPreview && (
            <div
              style={{
                padding: "16px 20px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)",
                border: "1px solid rgba(51, 65, 85, 0.6)",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "14px",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#38bdf8" }}>
                    📊 Batch Intelligence Resolution Forecast
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                    Forecast of how all {bulkPreview.total_records} records will be integrated into the Knowledge Graph. Select which records to ingest below.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => handleBulkCommit()}
                    disabled={ingestLoading || bulkSelectedIndices.size === 0}
                    style={{
                      background: bulkSelectedIndices.size > 0 ? "rgba(16, 185, 129, 0.25)" : "rgba(51, 65, 85, 0.3)",
                      borderColor: bulkSelectedIndices.size > 0 ? "#10b981" : "#475569",
                      color: bulkSelectedIndices.size > 0 ? "#34d399" : "#94a3b8",
                      fontWeight: 700,
                      padding: "10px 18px",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: bulkSelectedIndices.size > 0 ? "pointer" : "not-allowed",
                    }}
                  >
                    {ingestLoading ? (
                      <Sparkles className="w-4 h-4 animate-spin" />
                    ) : (
                      <Database className="w-4 h-4" />
                    )}
                    2. Commit Selected ({bulkSelectedIndices.size} of {bulkPreview.total_records} Records) to Knowledge Graph
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleRejectBulkBatch}
                    disabled={ingestLoading}
                    style={{
                      background: "rgba(244, 63, 94, 0.15)",
                      borderColor: "#f43f5e",
                      color: "#fb7185",
                      fontWeight: 700,
                      padding: "10px 16px",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <Ban className="w-4 h-4" />
                    Reject & Discard Batch
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => exportToJson(bulkPreview, `batch_intel_${Date.now()}`)}
                    style={{
                      background: "rgba(56, 189, 248, 0.15)",
                      borderColor: "#38bdf8",
                      color: "#38bdf8",
                      fontWeight: 600,
                      padding: "10px 14px",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                    title="Export batch JSON intelligence"
                  >
                    <FileCode className="w-4 h-4" />
                    Export JSON
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => exportToPdf({
                      title: `Darknet Batch Intelligence Resolution Forecast (${bulkPreview.total_records} Records)`,
                      recordsCount: bulkPreview.total_records,
                      recordsPreview: bulkPreview.records_preview,
                      heuristicReason: `Summary: ${bulkPreview.predicted_auto_merges} Auto-Merges, ${bulkPreview.predicted_suggestions} Review Suggestions, ${bulkPreview.predicted_new_clusters} New Personas.`,
                    }, `batch_report_${Date.now()}`)}
                    style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      borderColor: "#10b981",
                      color: "#34d399",
                      fontWeight: 600,
                      padding: "10px 14px",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                    title="Export formal PDF batch report"
                  >
                    <Download className="w-4 h-4" />
                    Export PDF
                  </button>
                </div>
              </div>

              {/* Batch Stat Metric Badges */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >
                <div className="stats-card" style={{ borderLeft: "3px solid #10b981" }}>
                  <p className="stats-label">⚡ Predicted Auto-Merges</p>
                  <p className="stats-value" style={{ color: "#34d399" }}>{bulkPreview.predicted_auto_merges}</p>
                </div>
                <div className="stats-card" style={{ borderLeft: "3px solid #f59e0b" }}>
                  <p className="stats-label">⚖️ Predicted Review Suggestions</p>
                  <p className="stats-value" style={{ color: "#fbbf24" }}>{bulkPreview.predicted_suggestions}</p>
                </div>
                <div className="stats-card" style={{ borderLeft: "3px solid #3b82f6" }}>
                  <p className="stats-label">🆕 Predicted New Personas</p>
                  <p className="stats-value" style={{ color: "#60a5fa" }}>{bulkPreview.predicted_new_clusters}</p>
                </div>
              </div>

              {/* Selective Filter Toolbar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "rgba(15, 23, 42, 0.7)",
                  borderRadius: "8px",
                  border: "1px solid rgba(51, 65, 85, 0.7)",
                  marginBottom: "12px",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>
                    Filter & Select:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleBulkFilterChange("all")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      border: bulkFilter === "all" ? "1px solid #38bdf8" : "1px solid transparent",
                      background: bulkFilter === "all" ? "rgba(56, 189, 248, 0.2)" : "rgba(30, 41, 59, 0.8)",
                      color: bulkFilter === "all" ? "#38bdf8" : "#94a3b8",
                    }}
                  >
                    All ({bulkPreview.total_records})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkFilterChange("AUTO_MERGE")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      border: bulkFilter === "AUTO_MERGE" ? "1px solid #34d399" : "1px solid transparent",
                      background: bulkFilter === "AUTO_MERGE" ? "rgba(52, 211, 153, 0.2)" : "rgba(30, 41, 59, 0.8)",
                      color: bulkFilter === "AUTO_MERGE" ? "#34d399" : "#94a3b8",
                    }}
                  >
                    ⚡ Auto-Merges ({bulkPreview.predicted_auto_merges})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkFilterChange("SUGGESTION")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      border: bulkFilter === "SUGGESTION" ? "1px solid #fbbf24" : "1px solid transparent",
                      background: bulkFilter === "SUGGESTION" ? "rgba(251, 191, 36, 0.2)" : "rgba(30, 41, 59, 0.8)",
                      color: bulkFilter === "SUGGESTION" ? "#fbbf24" : "#94a3b8",
                    }}
                  >
                    ⚖️ Suggestions ({bulkPreview.predicted_suggestions})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkFilterChange("NEW_CLUSTER")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      border: bulkFilter === "NEW_CLUSTER" ? "1px solid #60a5fa" : "1px solid transparent",
                      background: bulkFilter === "NEW_CLUSTER" ? "rgba(96, 165, 250, 0.2)" : "rgba(30, 41, 59, 0.8)",
                      color: bulkFilter === "NEW_CLUSTER" ? "#60a5fa" : "#94a3b8",
                    }}
                  >
                    🆕 New Personas ({bulkPreview.predicted_new_clusters})
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", padding: "2px 8px", background: "rgba(56, 189, 248, 0.15)", borderRadius: "4px" }}>
                    Selected: {bulkSelectedIndices.size} of {bulkPreview.total_records}
                  </span>
                  <button
                    type="button"
                    onClick={selectAllBulk}
                    style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.75rem", textDecoration: "underline", cursor: "pointer" }}
                  >
                    Select All
                  </button>
                  <span style={{ color: "#475569" }}>|</span>
                  <button
                    type="button"
                    onClick={deselectAllBulk}
                    style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.75rem", textDecoration: "underline", cursor: "pointer" }}
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Per-Record Breakdown Cards */}
              <h4 style={{ fontSize: "0.82rem", margin: "10px 0 8px", color: "#cbd5e1" }}>
                Individual Record Resolution Previews:
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {(bulkPreview.records_preview || []).map((rp, idx) => {
                  const isSelected = bulkSelectedIndices.has(idx);
                  const isRejected = bulkRejectedIndices.has(idx);
                  const act = rp.linking_forecast?.action || "NEW_CLUSTER";
                  if (bulkFilter !== "all" && act !== bulkFilter) return null;

                  return (
                    <div
                      key={idx}
                      onClick={() => toggleBulkSelect(idx)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "6px",
                        background: isRejected
                          ? "rgba(244, 63, 94, 0.08)"
                          : isSelected
                          ? "rgba(15, 23, 42, 0.9)"
                          : "rgba(15, 23, 42, 0.4)",
                        opacity: isRejected ? 0.45 : isSelected ? 1 : 0.6,
                        border: `1px solid ${
                          isRejected
                            ? "rgba(244, 63, 94, 0.3)"
                            : isSelected
                            ? act === "AUTO_MERGE"
                              ? "rgba(16, 185, 129, 0.6)"
                              : act === "SUGGESTION"
                              ? "rgba(245, 158, 11, 0.6)"
                              : "rgba(59, 130, 246, 0.6)"
                            : "rgba(51, 65, 85, 0.4)"
                        }`,
                        boxShadow: isSelected ? "0 0 10px rgba(56, 189, 248, 0.15)" : "none",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        gap: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleBulkSelect(idx)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#38bdf8" }}
                        />
                        <span style={{ color: "#64748b", fontFamily: "monospace", fontSize: "0.75rem" }}>
                          #{idx + 1}
                        </span>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <strong style={{ color: isRejected ? "#94a3b8" : "#fff", textDecoration: isRejected ? "line-through" : "none" }}>
                              {rp.username}
                            </strong>
                            {isRejected ? (
                              <span
                                style={{
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontWeight: 700,
                                  fontSize: "0.68rem",
                                  background: "rgba(244, 63, 94, 0.2)",
                                  color: "#fb7185",
                                  border: "1px solid rgba(244, 63, 94, 0.4)",
                                }}
                              >
                                🚫 EXCLUDED
                              </span>
                            ) : (
                              <span
                                style={{
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontWeight: 700,
                                  fontSize: "0.68rem",
                                  background:
                                    act === "AUTO_MERGE"
                                      ? "rgba(16, 185, 129, 0.2)"
                                      : act === "SUGGESTION"
                                      ? "rgba(245, 158, 11, 0.2)"
                                      : "rgba(59, 130, 246, 0.2)",
                                  color:
                                    act === "AUTO_MERGE"
                                      ? "#34d399"
                                      : act === "SUGGESTION"
                                      ? "#fbbf24"
                                      : "#60a5fa",
                                  border: `1px solid ${
                                    act === "AUTO_MERGE"
                                      ? "rgba(16, 185, 129, 0.4)"
                                      : act === "SUGGESTION"
                                      ? "rgba(245, 158, 11, 0.4)"
                                      : "rgba(59, 130, 246, 0.4)"
                                  }`,
                                }}
                              >
                                {act === "AUTO_MERGE" && "⚡ AUTO-MERGE"}
                                {act === "SUGGESTION" && "⚖️ SUGGESTION"}
                                {act === "NEW_CLUSTER" && "🆕 NEW ENTITY"}
                              </span>
                            )}
                            {rp.linking_forecast?.target_vendor_name && !isRejected && (
                              <span style={{ color: "#34d399", fontSize: "0.75rem", fontFamily: "monospace" }}>
                                → Matched: {rp.linking_forecast.target_vendor_name}
                              </span>
                            )}
                          </div>
                          <div style={{ color: "#94a3b8", fontSize: "0.74rem", marginTop: "3px", lineHeight: "1.4" }}>
                            {rp.linking_forecast.explanation}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", shrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        <span style={{ fontWeight: 700, color: "#f8fafc", fontFamily: "monospace", fontSize: "0.85rem" }}>
                          {rp.linking_forecast?.confidence_percentage?.toFixed(1)}%
                        </span>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {!isRejected ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleBulkCommit(new Set([idx]))}
                                disabled={ingestLoading}
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  fontSize: "0.68rem",
                                  background: "rgba(30, 41, 59, 0.8)",
                                  border: "1px solid rgba(71, 85, 105, 0.8)",
                                  color: "#cbd5e1",
                                  cursor: "pointer",
                                }}
                                title="Ingest only this single record into Knowledge Graph"
                              >
                                Ingest Only
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectBulkRecord(idx)}
                                disabled={ingestLoading}
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  fontSize: "0.68rem",
                                  background: "rgba(244, 63, 94, 0.15)",
                                  border: "1px solid rgba(244, 63, 94, 0.4)",
                                  color: "#fb7185",
                                  cursor: "pointer",
                                }}
                                title="Exclude this record from ingestion"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleBulkSelect(idx)}
                              style={{
                                padding: "3px 8px",
                                borderRadius: "4px",
                                fontSize: "0.68rem",
                                background: "rgba(56, 189, 248, 0.15)",
                                border: "1px solid rgba(56, 189, 248, 0.4)",
                                color: "#38bdf8",
                                cursor: "pointer",
                              }}
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bulk Ingest Result */}
          {ingestResult && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "8px",
                background: ingestResult.error
                  ? "rgba(244, 63, 94, 0.15)"
                  : "rgba(16, 185, 129, 0.15)",
                border: `1px solid ${
                  ingestResult.error
                    ? "rgba(244, 63, 94, 0.4)"
                    : "rgba(16, 185, 129, 0.4)"
                }`,
                fontSize: "0.82rem",
              }}
            >
              <strong
                style={{
                  color: ingestResult.error ? "#f43f5e" : "#34d399",
                }}
              >
                {ingestResult.error
                  ? "Import Error:"
                  : "✓ Dataset Knowledge Graph Ingestion Complete:"}
              </strong>{" "}
              {ingestResult.message ||
                `Successfully processed ${ingestResult.records_processed} records. Graph expanded to ${ingestResult.graph_statistics?.total_nodes} nodes and ${ingestResult.graph_statistics?.total_edges} edges.`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
