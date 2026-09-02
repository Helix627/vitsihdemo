import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
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
  const response = await api.get("/statistics");
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
  window.open(`http://localhost:5000/api/v1/export/csv?${params}`, "_blank");
};

export const downloadExportJSON = (startTs = null, endTs = null) => {
  const params = new URLSearchParams();
  if (startTs) params.append("start_ts", startTs);
  if (endTs) params.append("end_ts", endTs);
  window.open(`http://localhost:5000/api/v1/export/json?${params}`, "_blank");
};

export const downloadGraphSnapshot = () => {
  window.open("http://localhost:5000/api/v1/export/graph-snapshot", "_blank");
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
  const response = await api.post("/analyze", { text });
  return response.data;
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
  const response = await api.post("/analyst/preview", payload);
  return response.data;
};

export const submitAnalystIntel = async (payload) => {
  const response = await api.post("/analyst/submit", payload);
  return response.data;
};

export const previewBulkDataset = async (payload) => {
  const response = await api.post("/datasets/preview", payload);
  return response.data;
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
