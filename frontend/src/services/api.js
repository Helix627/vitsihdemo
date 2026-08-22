import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
  timeout: 30000,
});

export const fetchGraph = async (limit, minConfidence = 0.0) => {
  const response = await api.get("/graph", {
    params: {
      ...(limit ? { limit } : {}),
      ...(minConfidence > 0 ? { min_confidence: minConfidence } : {}),
    },
  });
  return response.data;
};

export const fetchStats = async () => {
  const response = await api.get("/statistics");
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
