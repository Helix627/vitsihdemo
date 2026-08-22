/**
 * TRINETRA — Investigations (/investigations)
 *
 * Frontend-only investigation workspace.
 *
 * IMPORTANT DATA BOUNDARY:
 * - Investigations, notes, and links live in React state ONLY
 *   (session-scoped, never persisted — no backend endpoint exists).
 * - Attached entities are real records resolved via GET /search?q=.
 *
 * The UI labels this distinction explicitly.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSearch } from "../hooks/useSearch";
import EmptyState from "../components/EmptyState";
import { formatEntityType, entityTypeBadgeClass } from "../utils/formatters";

let nextId = 1;

export default function Investigations() {
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [newName, setNewName] = useState("");

  const active = items.find((i) => i.id === activeId) ?? null;

  function createInvestigation() {
    const name = newName.trim();
    if (!name) return;
    const item = {
      id: `inv_${nextId++}`,
      name,
      createdAt: new Date().toISOString(), // UI metadata only — not intelligence data
      notes: "",
      entities: [],
      status: "active",
    };
    setItems((list) => [item, ...list]);
    setActiveId(item.id);
    setNewName("");
  }

  function updateActive(patch) {
    setItems((list) =>
      list.map((i) => (i.id === activeId ? { ...i, ...patch } : i))
    );
  }

  function removeInvestigation(id) {
    setItems((list) => list.filter((i) => i.id !== id));
    if (activeId === id) setActiveId(null);
  }

  function attachEntity(entity) {
    if (!active || !entity?.id) return;
    if (active.entities.some((e) => e.id === entity.id)) return;
    updateActive({ entities: [...active.entities, entity] });
  }

  function detachEntity(entityId) {
    updateActive({
      entities: active.entities.filter((e) => e.id !== entityId),
    });
  }

  return (
    <div className="page-container">
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Investigations</h1>
          <p style={styles.subtitle}>
            Workspace state is stored locally in this browser session only — it is
            not persisted to the intelligence backend.
          </p>
        </div>
        <div style={styles.createRow}>
          <input
            style={styles.nameInput}
            type="text"
            placeholder="New investigation name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createInvestigation()}
            aria-label="New investigation name"
          />
          <button className="btn btn--primary btn--sm" onClick={createInvestigation} disabled={!newName.trim()}>
            Create
          </button>
        </div>
      </div>

      <div style={styles.columns}>
        {/* ── Investigation list ── */}
        <div className="panel" style={styles.listPanel}>
          <div className="panel__header">
            <span className="panel__title">Cases ({items.length})</span>
          </div>
          <div className="panel__body" style={{ padding: "0.5rem 0" }}>
            {items.length === 0 ? (
              <EmptyState
                title="No open investigations"
                message="Create an investigation to organize entities and analyst notes."
              />
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveId(item.id)}
                  style={{
                    ...styles.listItem,
                    ...(item.id === activeId ? styles.listItemActive : {}),
                  }}
                  aria-current={item.id === activeId}
                >
                  <span style={styles.listItemName}>{item.name}</span>
                  <span style={styles.listItemMeta}>
                    {item.entities.length} entit{item.entities.length === 1 ? "y" : "ies"}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Active investigation detail ── */}
        <div style={styles.detailColumn}>
          {!active ? (
            <div className="panel">
              <div className="panel__body">
                <EmptyState
                  title="No investigation selected"
                  message="Select a case on the left or create a new one."
                />
              </div>
            </div>
          ) : (
            <>
              {/* Case header */}
              <div className="panel" style={{ marginBottom: "var(--space-4)" }}>
                <div style={styles.caseHeader}>
                  <div>
                    <h2 style={styles.caseTitle}>{active.name}</h2>
                    <span className="label-caps">
                      Local case · opened {new Date(active.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div style={styles.caseActions}>
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={() =>
                        updateActive({ status: active.status === "active" ? "closed" : "active" })
                      }
                    >
                      {active.status === "active" ? "Mark Closed" : "Reopen"}
                    </button>
                    <button className="btn btn--danger btn--sm" onClick={() => removeInvestigation(active.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="panel" style={{ marginBottom: "var(--space-4)" }}>
                <div className="panel__header">
                  <span className="panel__title">Analyst Notes</span>
                  <span className="badge badge--neutral">Session-only</span>
                </div>
                <div className="panel__body">
                  <textarea
                    style={styles.notes}
                    placeholder="Record hypotheses, leads, and next steps for this investigation…"
                    value={active.notes}
                    onChange={(e) => updateActive({ notes: e.target.value })}
                    aria-label="Analyst notes"
                    rows={6}
                  />
                </div>
              </div>

              {/* Linked entities */}
              <div className="panel">
                <div className="panel__header">
                  <span className="panel__title">Linked Entities ({active.entities.length})</span>
                  <span className="badge badge--info">Resolved via GET /search</span>
                </div>
                <div className="panel__body">
                  <EntitySearchInput onPick={attachEntity} />
                  {active.entities.length === 0 ? (
                    <p style={styles.hint}>
                      No entities linked yet. Search above to attach vendors or PGP keys.
                    </p>
                  ) : (
                    <div style={styles.chipRow}>
                      {active.entities.map((e) => (
                        <span key={e.id} style={styles.chip}>
                          <span className={`badge ${entityTypeBadgeClass(e.type)}`}>
                            {formatEntityType(e.type)}
                          </span>
                          <strong style={styles.chipLabel}>{e.label}</strong>
                          <code style={styles.chipCode}>{e.id}</code>
                          <button
                            style={styles.chipRemove}
                            onClick={() => detachEntity(e.id)}
                            aria-label={`Unlink ${e.label}`}
                          >
                            Remove
                          </button>
                          <LinkButton entityId={e.id} label={e.label} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Navigates to the graph focused on a linked entity. */
function LinkButton({ entityId, label }) {
  const navigate = useNavigate();
  return (
    <button
      style={styles.chipOpen}
      onClick={() => navigate("/graph", { state: { focusEntity: { id: entityId, label } } })}
      aria-label={`Show ${label} in relationship graph`}
    >
      View in Graph
    </button>
  );
}

/** Debounced entity search box backed by GET /search?q=. */
function EntitySearchInput({ onPick }) {
  const { query, results, loading, error, search, clearSearch } = useSearch();
  const [open, setOpen] = useState(false);

  function pick(result) {
    onPick(result);
    clearSearch();
    setOpen(false);
  }

  return (
    <div style={{ position: "relative", marginBottom: "0.75rem" }}>
      <input
        style={styles.searchInput}
        type="text"
        placeholder="Search backend entities to link…"
        value={query}
        onChange={(e) => {
          search(e.target.value);
          setOpen(true);
        }}
        onFocus={() => query && setOpen(true)}
        aria-label="Search entities to link"
      />
      {open && query.trim() && (
        <div style={styles.dropdown}>
          {loading && <div style={styles.dropdownNote}>Searching…</div>}
          {!loading && error && <div style={styles.dropdownNote}>{error}</div>}
          {!loading && !error && results.length === 0 && (
            <div style={styles.dropdownNote}>No matching entities.</div>
          )}
          {results.map((r) => (
            <button key={r.id} style={styles.dropdownItem} onClick={() => pick(r)}>
              <span className={`badge ${entityTypeBadgeClass(r.type)}`}>
                {formatEntityType(r.type)}
              </span>
              <span style={styles.dropdownLabel}>{r.label}</span>
              <code style={styles.dropdownCode}>{r.id}</code>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "var(--space-4)",
    gap: "1rem",
    flexWrap: "wrap",
  },
  title: { fontSize: "1.125rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" },
  subtitle: { fontSize: "0.775rem", color: "var(--text-muted)", margin: "2px 0 0", maxWidth: "560px" },
  createRow: { display: "flex", gap: "0.5rem", alignItems: "center" },
  nameInput: {
    height: "34px", padding: "0 0.75rem", minWidth: "240px",
    border: "1px solid var(--border-panel)", borderRadius: "var(--radius-md)",
    background: "var(--bg-panel)", fontSize: "0.8125rem", outline: "none",
  },
  columns: {
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    gap: "var(--space-4)",
    alignItems: "start",
  },
  listPanel: {},
  listItem: {
    display: "block", width: "100%", textAlign: "left",
    padding: "0.5625rem 1rem", background: "none",
    border: "none", borderLeft: "3px solid transparent",
    cursor: "pointer", fontFamily: "inherit",
  },
  listItemActive: {
    borderLeftColor: "var(--color-selected)",
    background: "var(--bg-selected)",
  },
  listItemName: {
    display: "block", fontSize: "0.8125rem", fontWeight: 600,
    color: "var(--text-primary)",
  },
  listItemMeta: { display: "block", fontSize: "0.7rem", color: "var(--text-muted)" },
  detailColumn: { minWidth: 0 },
  caseHeader: {
    padding: "var(--space-4) var(--space-5)",
    display: "flex", justifyContent: "space-between",
    alignItems: "center", gap: "1rem", flexWrap: "wrap",
  },
  caseTitle: { fontSize: "1rem", fontWeight: 700, margin: "0 0 2px", color: "var(--text-primary)" },
  caseActions: { display: "flex", gap: "0.5rem" },
  notes: {
    width: "100%", minHeight: "120px", resize: "vertical",
    padding: "0.625rem 0.75rem", fontSize: "0.8125rem",
    border: "1px solid var(--border-panel)", borderRadius: "var(--radius-md)",
    fontFamily: "inherit", color: "var(--text-primary)",
    background: "var(--bg-panel)", lineHeight: 1.5,
  },
  hint: { fontSize: "0.775rem", color: "var(--text-muted)", fontStyle: "italic" },
  searchInput: {
    width: "100%", height: "34px", padding: "0 0.75rem",
    border: "1px solid var(--border-panel)", borderRadius: "var(--radius-md)",
    fontSize: "0.8125rem", outline: "none", background: "var(--bg-panel)",
    boxSizing: "border-box",
  },
  dropdown: {
    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
    background: "var(--bg-panel)", border: "1px solid var(--border-panel)",
    borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)",
    zIndex: 200, maxHeight: "240px", overflowY: "auto",
  },
  dropdownItem: {
    display: "flex", alignItems: "center", gap: "0.5rem",
    width: "100%", padding: "0.5rem 0.75rem", textAlign: "left",
    background: "none", border: "none",
    borderBottom: "1px solid var(--border-subtle)",
    cursor: "pointer", fontFamily: "inherit",
  },
  dropdownNote: { padding: "0.625rem 0.75rem", fontSize: "0.775rem", color: "var(--text-muted)" },
  dropdownLabel: {
    flex: 1, fontSize: "0.8125rem", color: "var(--text-primary)",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  dropdownCode: { fontSize: "0.6875rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" },
  chipRow: { display: "flex", flexDirection: "column", gap: "0.375rem" },
  chip: {
    display: "flex", alignItems: "center", gap: "0.5rem",
    padding: "0.375rem 0.5rem", border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-md)", flexWrap: "wrap",
  },
  chipLabel: { fontSize: "0.8125rem", color: "var(--text-primary)" },
  chipCode: { fontSize: "0.6875rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" },
  chipRemove: {
    marginLeft: "auto", background: "none", border: "none",
    color: "var(--color-danger)", fontSize: "0.7rem", cursor: "pointer",
    fontWeight: 600, padding: "2px 4px",
  },
  chipOpen: {
    background: "none", border: "1px solid var(--border-panel)",
    borderRadius: "var(--radius-sm)", color: "var(--color-selected)",
    fontSize: "0.7rem", cursor: "pointer", padding: "2px 8px",
  },
};
