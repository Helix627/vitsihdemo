/**
 * TRINETRA — Formatters & Safe Field Accessors
 *
 * No intelligence is fabricated here.
 * All functions return safe defaults when input is missing.
 */

/**
 * Safely get a string value, returning a fallback when null/undefined/empty.
 */
export function safeStr(value, fallback = "Not available") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str) {
  if (!str) return "";
  return String(str).charAt(0).toUpperCase() + String(str).slice(1);
}

/**
 * Truncate a label to a maximum length with an ellipsis.
 */
export function truncateLabel(str, maxLen = 24) {
  if (!str) return "";
  const s = String(str);
  return s.length > maxLen ? s.slice(0, maxLen - 1) + "…" : s;
}

/**
 * Get a human-readable entity type label.
 */
export function formatEntityType(type) {
  const types = {
    vendor: "Vendor",
    pgp: "PGP Key",
    unknown: "Entity",
  };
  return types[type] ?? capitalize(type) ?? "Unknown Type";
}

/**
 * Safely format a count, returning "–" for null/undefined.
 */
export function formatCount(value) {
  if (value === null || value === undefined) return "–";
  const n = Number(value);
  if (isNaN(n)) return "–";
  return n.toLocaleString();
}

/**
 * Format a raw stat key into a human-readable label.
 * e.g. "total_vendors" → "Total Vendors"
 * e.g. "pgpKeys" → "PGP Keys"
 */
export function formatStatKey(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Determine a stat metric's icon based on its key (heuristic only).
 * Returns a simple emoji/text icon — no fabrication, purely cosmetic.
 */
export function getStatIcon(key) {
  const k = String(key).toLowerCase();
  if (k.includes("vendor")) return "👤";
  if (k.includes("pgp") || k.includes("key")) return "🔑";
  if (k.includes("relation") || k.includes("edge") || k.includes("link")) return "🔗";
  if (k.includes("node") || k.includes("graph")) return "⬡";
  if (k.includes("search")) return "🔍";
  return "◈";
}

/**
 * Build a CSS class name for entity type badges.
 */
export function entityTypeBadgeClass(type) {
  const map = {
    vendor: "badge--vendor",
    pgp: "badge--pgp",
  };
  return map[type] ?? "badge--neutral";
}

/**
 * Truncate a node/entity ID for display.
 * e.g. "vendor_12" → "vendor_12" (short enough)
 * e.g. "vendor_12345678901234" → "vendor_12345…"
 */
export function formatId(id) {
  if (!id) return "–";
  const s = String(id);
  return s.length > 20 ? s.slice(0, 17) + "…" : s;
}
