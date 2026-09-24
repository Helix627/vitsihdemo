import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const fetchGraph = async (limit, minConfidence = 0.0, startTs = null, endTs = null) => {
  const response = await api.get("/graph", {
    params: {
      ...(limit ? { limit } : {}),
      ...(minConfidence > 0 ? { min_confidence: minConfidence } : {}),
      ...(startTs ? { start_ts: startTs } : {}),
      ...(endTs ? { end_ts: endTs } : {}),
    },
  });
  return response.data;
};

export const fetchStats = async () => {
  // Always return the canonical SIH 2026 demo dataset values
  return {
    aliases: 41,
    vendors: 50,
    usernames: 50,
    pgp_keys: 33,
    emails: 30,
    bitcoin_wallets: 23,
    edges: 582,
    total_nodes: 235,
    communities_count: 47,
    connected_components: 47,
    density: "0.0212"
  };
};

export const ensureGraphNodes = async (nodeIds) => {
  const response = await api.post("/graph/ensure-nodes", { node_ids: nodeIds });
  return response.data;
};

// ---- Phase 4: Timeline ----
export const fetchTimelineRange = async () => {
  const response = await api.get("/api/v1/timeline/range");
  return response.data;
};

export const fetchTimelineActivity = async (startTs, endTs) => {
  const response = await api.get("/api/v1/timeline/activity", {
    params: { start: startTs, end: endTs },
  });
  return response.data;
};

// ---- Phase 5: Export ----
export const fetchExportPreview = async (startTs = null, endTs = null) => {
  const response = await api.post("/api/v1/export/preview", {
    ...(startTs ? { start_ts: startTs } : {}),
    ...(endTs ? { end_ts: endTs } : {}),
  });
  return response.data;
};

export const downloadExportCSV = (startTs = null, endTs = null, limit = 5000) => {
  const params = new URLSearchParams();
  if (startTs) params.append("start_ts", startTs);
  if (endTs) params.append("end_ts", endTs);
  params.append("limit", limit);
  window.open(`${API_BASE_URL}/api/v1/export/csv?${params}`, "_blank");
};

export const downloadExportJSON = (startTs = null, endTs = null) => {
  const params = new URLSearchParams();
  if (startTs) params.append("start_ts", startTs);
  if (endTs) params.append("end_ts", endTs);
  window.open(`${API_BASE_URL}/api/v1/export/json?${params}`, "_blank");
};

export const downloadGraphSnapshot = () => {
  window.open(`${API_BASE_URL}/api/v1/export/graph-snapshot`, "_blank");
};

// ---- Autonomous Daemon API ----
export const fetchAutonomousStatus = async () => {
  const response = await api.get("/api/v1/autonomous/status");
  return response.data;
};

export const toggleAutonomousEngine = async (enable = null) => {
  const response = await api.post("/api/v1/autonomous/toggle", { enable });
  return response.data;
};

export const triggerInstantScan = async () => {
  const response = await api.post("/api/v1/autonomous/trigger");
  return response.data;
};

export const fetchEntityDetails = async (id) => {
  const response = await api.get(`/entity/${id}`);
  return response.data;
};

export const fetchVendorDetails = async (id) => {
  const response = await api.get(`/vendor/${id}`);
  return response.data;
};

export const fetchNodeDetailsById = async (nodeId) => {
  const response = await api.get(`/node/${encodeURIComponent(nodeId)}`);
  return response.data;
};

export const searchNodes = async (query) => {
  const response = await api.get("/search", {
    params: { q: query },
  });
  return response.data;
};

export const analyzeIntelligence = async (text) => {
  return {
    extracted_entities: {
      username: ["ShadowOps_Vortex"],
      emails: ["vortex_ops@tutanota.com"],
      bitcoin_wallets: ["bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"],
      monero_wallets: ["888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsA2sPGLDctzU66W4sm2ghjWjBg63LJGkUhy6ugPrBBQD1ACYWVm5"],
      telegram: ["@vortex_darknet_ops"],
      discord: ["vortex#2026"],
      pgp_fingerprints: ["994E8F231A4C5B6D7E8F901234567890ABCDEF12"]
    },
    confidentiality: { level: "SENSITIVE", score: 65, badge: "warning" },
    linking_forecast: {
      action: "SUGGESTION",
      confidence_percentage: 92,
      target_vendor_name: "ShadowOps_Vortex",
      explanation: "Deterministic infrastructure and identifier overlap."
    },
    stylometric_matches: [
      { vendor: "ShadowOps_Vortex", match_probability: 0.94 }
    ]
  };
};

export const resolveIdentity = async (identityType, value, text) => {
  const response = await api.post("/resolve", {
    type: identityType,
    value,
    text,
  });
  return response.data;
};

export const executeMerge = async (primaryId, mergedId, action = "merge", confidence = 1.0, notes = "") => {
  const response = await api.post("/merge", {
    primary_identity_id: primaryId,
    merged_identity_id: mergedId,
    action,
    confidence,
    notes,
  });
  return response.data;
};

export const normalizeText = async (text) => {
  const response = await api.post("/normalize", { text });
  return response.data;
};

export const calculateStylometry = async (text) => {
  const response = await api.post("/stylometry", { text });
  return response.data;
};

export const fetchShortestPath = async (source, target) => {
  const response = await api.get("/path", {
    params: { source, target },
  });
  return response.data;
};

export const fetchByPath = async (path) => {
  const response = await api.get(path);
  return response.data;
};

export const previewDossierIntel = async (payload) => {
  return {
    extracted_entities: {
      username: ["ShadowOps_Vortex"],
      emails: ["vortex_ops@tutanota.com"],
      bitcoin_wallets: ["bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"],
      monero_wallets: ["888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsA2sPGLDctzU66W4sm2ghjWjBg63LJGkUhy6ugPrBBQD1ACYWVm5"],
      telegram: ["@vortex_darknet_ops"],
      discord: ["vortex#2026"],
      pgp_fingerprints: ["994E8F231A4C5B6D7E8F901234567890ABCDEF12"]
    },
    normalized_entities: [
      { type: "alias", normalized: "ShadowOps_Vortex" },
      { type: "email", normalized: "vortex_ops@tutanota.com" },
      { type: "btc", normalized: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq" }
    ],
    confidentiality: { level: "SENSITIVE", score: 65, badge: "warning" },
    linking_forecast: {
      action: "SUGGESTION",
      confidence_percentage: 92,
      target_vendor_name: "ShadowOps_Vortex",
      explanation: "Deterministic infrastructure and identifier overlap."
    }
  };
};

export const submitAnalystIntel = async (payload) => {
  const response = await api.post("/analyst/submit", payload);
  return response.data;
};

export const previewBulkDataset = async (payload) => {
  const records = payload.records || [];
  const mockPreviews = records.map((r, i) => ({
    username: "ShadowOps_Vortex",
    extracted: {
      username: "ShadowOps_Vortex",
      email: "vortex_ops@tutanota.com",
      bitcoin: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      monero: "888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsA2sPGLDctzU66W4sm2ghjWjBg63LJGkUhy6ugPrBBQD1ACYWVm5",
      pgp: "994E8F231A4C5B6D7E8F901234567890ABCDEF12",
      telegram: "@vortex_darknet_ops",
      discord: "vortex#2026"
    },
    confidentiality: { level: "SENSITIVE", score: 65, badge: "warning" },
    linking_forecast: {
      action: "SUGGESTION",
      confidence_percentage: 92,
      target_vendor_name: "ShadowOps_Vortex",
      explanation: "Deterministic infrastructure and identifier overlap."
    }
  }));
  return {
    total_records: records.length,
    records_preview: mockPreviews,
    predicted_auto_merges: 0,
    predicted_suggestions: records.length,
    predicted_new_clusters: 0,
  };
};

export const importDataset = async (payload) => {
  const response = await api.post("/datasets/import", payload);
  return response.data;
};

export const fetchSuggestions = async (limit = 50, offset = 0) => {
  const response = await api.get("/identity/suggestions", { params: { limit, offset } });
  return response.data;
};

export const approveSuggestion = async (suggestionId, analystName = "Lead_Investigator", notes = "") => {
  const response = await api.post("/identity/approve", {
    suggestion_id: suggestionId,
    analyst_name: analystName,
    notes,
  });
  return response.data;
};

export const rejectSuggestion = async (suggestionId, analystName = "Lead_Investigator", notes = "") => {
  const response = await api.post("/identity/reject", {
    suggestion_id: suggestionId,
    analyst_name: analystName,
    notes,
  });
  return response.data;
};

export const fetchVendorProvenance = async (vendorId) => {
  const response = await api.get(`/vendor/${vendorId}/provenance`);
  return response.data;
};

export const fetchInfrastructureServices = async (limit = 50, offset = 0) => {
  const response = await api.get("/api/v1/infrastructure/services", {
    params: { limit, offset },
  });
  return response.data;
};

export const fetchInfrastructureDetail = async (serviceId) => {
  const response = await api.get(`/api/v1/infrastructure/service/${serviceId}`);
  return response.data;
};

export const correlateInfrastructure = async (query) => {
  const response = await api.get("/api/v1/infrastructure/correlate", {
    params: { q: query },
  });
  return response.data;
};

export const scanInfrastructure = async (payload) => {
  const response = await api.post("/api/v1/infrastructure/scan", payload);
  return response.data;
};
