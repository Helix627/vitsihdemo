/**
 * TRINETRA — API Service
 *
 * All HTTP requests live here. Components never call Axios directly.
 *
 * Backend contract (verified against backend/app.py + graph_builder.py):
 *   GET /              -> "Backend Running" (plain text)
 *   GET /graph         -> { nodes: [{ data: {...} }], edges: [{ data: {...} }] }
 *                         node.data: id, label, type ("vendor"|"pgp"), color, shape,
 *                           detail_url, + vendor: username, profile_alias, email,
 *                           bitcoin_wallet | pgp: fingerprint
 *   GET /stats         -> { vendors, pgp_keys, edges, links }
 *   GET /vendor/<int>  -> { vendor: {...}, pgp_keys: [...], links } | 404 { error }
 *   GET /pgp/<int>     -> { pgp: {...}, vendors: [...], links } | 404 { error }
 *   GET /search?q=     -> { vendors: [...], pgp_keys: [...] }
 *
 * NOTE: /vendor/<id> and /pgp/<id> require NUMERIC ids (Flask <int:> converter).
 * Graph/search entity ids are node-style ("vendor_12"), so we extract the
 * numeric part before calling detail endpoints.
 *
 * Normalization adapters safely access fields — missing fields become null,
 * never fabricated intelligence.
 */

import axios from "axios";

const API_BASE_URL = "http://localhost:5000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

/* =========================================================
   ID Helpers
   ========================================================= */

/**
 * Extract the numeric portion from a node-style or plain id.
 *   "vendor_12" -> "12"
 *   "pgp_5"     -> "5"
 *   "12"        -> "12"
 *   "abc"       -> null
 */
export function extractNumericId(id) {
  if (id === null || id === undefined) return null;
  const match = String(id).match(/(\d+)\s*$/);
  return match ? match[1] : null;
}

/* =========================================================
   Normalization Adapters
   ========================================================= */

function normalizeNode(rawNode) {
  const d = rawNode?.data ?? {};
  const id = d.id ?? `node_${Math.random().toString(36).slice(2)}`;
  return {
    data: {
      // Preserve every backend-provided field (email, fingerprint, etc.)
      ...d,
      // Guarantee the fields Cytoscape requires
      id,
      label: d.label ?? id,
      type: d.type ?? "unknown",
    },
  };
}

function normalizeEdge(rawEdge) {
  const d = rawEdge?.data ?? {};
  return {
    data: {
      ...d,
      id: d.id ?? `${d.source}_${d.target}`,
      source: d.source ?? "",
      target: d.target ?? "",
    },
  };
}

/** Normalize GET /graph response into Cytoscape-ready elements. */
export function normalizeGraphResponse(data) {
  const nodes = Array.isArray(data?.nodes) ? data.nodes.map(normalizeNode) : [];
  const edges = Array.isArray(data?.edges) ? data.edges.map(normalizeEdge) : [];
  return { nodes, edges };
}

/** Normalize GET /stats response. Keys: vendors, pgp_keys, edges, links. */
export function normalizeStatsResponse(data) {
  if (!data || typeof data !== "object") return {};
  return data;
}

/**
 * Normalize GET /vendor/<id> response.
 * Expected: { vendor: {...}, pgp_keys: [...], links }
 */
export function normalizeVendorResponse(data) {
  if (!data || typeof data !== "object") return null;
  const v = data.vendor ?? {};
  return {
    vendor: {
      id: v.id ?? null,
      vendorId: v.vendor_id ?? null,
      label: v.label ?? null,
      type: v.type ?? "vendor",
      username: v.username || null,
      alias: v.alias || null,
      email: v.email || null,
      bitcoinWallet: v.bitcoin_wallet || null,
      detailUrl: v.detail_url ?? null,
    },
    pgpKeys: Array.isArray(data.pgp_keys)
      ? data.pgp_keys.map((k) => ({
          id: k.id ?? null,
          label: k.label ?? k.id ?? null,
          fingerprint: k.fingerprint || null,
          detailUrl: k.detail_url ?? null,
        }))
      : [],
    _raw: data,
  };
}

/**
 * Normalize GET /pgp/<id> response.
 * Expected: { pgp: {...}, vendors: [...], links }
 */
export function normalizePGPResponse(data) {
  if (!data || typeof data !== "object") return null;
  const p = data.pgp ?? {};
  return {
    pgp: {
      id: p.id ?? null,
      label: p.label ?? null,
      type: p.type ?? "pgp",
      fingerprint: p.fingerprint || null,
      detailUrl: p.detail_url ?? null,
    },
    vendors: Array.isArray(data.vendors)
      ? data.vendors.map((v) => ({
          id: v.id ?? null,
          label: v.label ?? v.id ?? null,
          detailUrl: v.detail_url ?? null,
        }))
      : [],
    _raw: data,
  };
}

/**
 * Normalize GET /search?q= response.
 * Expected: { vendors: [...], pgp_keys: [...] }
 * Flattened into a unified result list tagged with entity type.
 */
export function normalizeSearchResponse(data) {
  const vendors = Array.isArray(data?.vendors) ? data.vendors : [];
  const pgpKeys = Array.isArray(data?.pgp_keys) ? data.pgp_keys : [];

  const results = [];

  vendors.forEach((v) => {
    if (!v?.id) return;
    results.push({
      id: v.id,
      label: v.label ?? v.username ?? v.alias ?? v.id,
      type: "vendor",
      username: v.username || null,
      alias: v.alias || null,
      email: v.email || null,
    });
  });

  pgpKeys.forEach((k) => {
    if (!k?.id) return;
    results.push({
      id: k.id,
      label: k.label ?? k.id,
      type: "pgp",
      fingerprint: k.fingerprint || null,
    });
  });

  return results;
}

/* =========================================================
   API Functions
   ========================================================= */

/** Health check. GET / -> "Backend Running" (plain text). */
export async function checkHealth() {
  const res = await api.get("/");
  return res.data;
}

/** Fetch graph data. GET /graph -> normalized { nodes, edges }. */
export async function getGraph() {
  const res = await api.get("/graph");
  return normalizeGraphResponse(res.data);
}

/** Fetch platform statistics. GET /stats. */
export async function getStats() {
  const res = await api.get("/stats");
  return normalizeStatsResponse(res.data);
}

/**
 * Fetch vendor details. GET /vendor/<int>.
 * Accepts node-style id ("vendor_12") or plain numeric id ("12").
 */
export async function getVendor(id) {
  const numeric = extractNumericId(id);
  const target = numeric ?? String(id);
  const res = await api.get(`/vendor/${encodeURIComponent(target)}`);
  return normalizeVendorResponse(res.data);
}

/**
 * Fetch PGP key details. GET /pgp/<int>.
 * Accepts node-style id ("pgp_5") or plain numeric id ("5").
 */
export async function getPGP(id) {
  const numeric = extractNumericId(id);
  const target = numeric ?? String(id);
  const res = await api.get(`/pgp/${encodeURIComponent(target)}`);
  return normalizePGPResponse(res.data);
}

/** Search entities. GET /search?q=<query>. */
export async function searchEntities(query) {
  if (!query || query.trim().length === 0) return [];
  const res = await api.get("/search", { params: { q: query.trim() } });
  return normalizeSearchResponse(res.data);
}

export default api;
