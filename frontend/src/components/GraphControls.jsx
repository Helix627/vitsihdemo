/**
 * TRINETRA — GraphControls (Toolbar)
 *
 * Provides: Fit, Reset, Center, Refresh, Layout selector, Clear Selection, Fullscreen.
 * Does NOT recalculate layout except when user explicitly requests it.
 */

import { useState, useRef, useEffect } from "react";
import { AVAILABLE_LAYOUTS } from "../utils/graphUtils";

export default function GraphControls({
  onFit,
  onReset,
  onCenter,
  onRefresh,
  onLayoutChange,
  onClearSelection,
  onFullscreen,
  currentLayout,
  hasSelection,
  loading,
}) {
  const [layoutOpen, setLayoutOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close layout dropdown on outside click
  useEffect(() => {
    function handle(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setLayoutOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const currentLayoutLabel =
    AVAILABLE_LAYOUTS.find((l) => l.id === currentLayout)?.label ?? "Layout";

  return (
    <div className="graph-toolbar">
      {/* Graph actions */}
      <div className="graph-toolbar__group">
        <button
          className="graph-toolbar__btn"
          onClick={onFit}
          disabled={loading}
          title="Fit all nodes in view"
          aria-label="Fit graph"
        >
          <FitIcon /> Fit
        </button>
        <button
          className="graph-toolbar__btn"
          onClick={onReset}
          disabled={loading}
          title="Reset zoom to 100%"
          aria-label="Reset zoom"
        >
          <ResetIcon /> Reset
        </button>
        <button
          className="graph-toolbar__btn"
          onClick={onCenter}
          disabled={loading || !hasSelection}
          title="Center on selected node"
          aria-label="Center on selected"
        >
          <CenterIcon /> Center
        </button>
      </div>

      <div className="graph-toolbar__divider" />

      {/* Refresh */}
      <div className="graph-toolbar__group">
        <button
          className="graph-toolbar__btn"
          onClick={onRefresh}
          disabled={loading}
          title="Reload graph data from backend"
          aria-label="Refresh graph"
        >
          <RefreshIcon spinning={loading} /> Refresh
        </button>
      </div>

      <div className="graph-toolbar__divider" />

      {/* Layout dropdown */}
      <div className="graph-toolbar__group">
        <div className="layout-dropdown" ref={dropdownRef}>
          <button
            className="graph-toolbar__btn"
            onClick={() => setLayoutOpen((o) => !o)}
            disabled={loading}
            title="Change graph layout"
            aria-label="Select layout"
            aria-expanded={layoutOpen}
          >
            <LayoutIcon />
            {currentLayoutLabel.split(" ")[0]} ▾
          </button>
          {layoutOpen && (
            <div className="layout-dropdown__menu" role="menu">
              {AVAILABLE_LAYOUTS.map((layout) => (
                <button
                  key={layout.id}
                  className={`layout-dropdown__option ${layout.id === currentLayout ? "active" : ""}`}
                  onClick={() => {
                    onLayoutChange(layout.id);
                    setLayoutOpen(false);
                  }}
                  role="menuitem"
                >
                  {layout.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="graph-toolbar__divider" />

      {/* Clear selection */}
      <div className="graph-toolbar__group">
        <button
          className={`graph-toolbar__btn ${hasSelection ? "graph-toolbar__btn--danger" : ""}`}
          onClick={onClearSelection}
          disabled={!hasSelection}
          title="Clear current selection"
          aria-label="Clear selection"
        >
          <ClearIcon /> Clear Selection
        </button>
      </div>

      {/* Fullscreen — pushed to end */}
      <div style={{ marginLeft: "auto" }}>
        <button
          className="graph-toolbar__btn"
          onClick={onFullscreen}
          title="Toggle fullscreen mode"
          aria-label="Toggle fullscreen"
        >
          <FullscreenIcon />
        </button>
      </div>
    </div>
  );
}

/* ── SVG Icons ── */
function FitIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 4v6h6" />
      <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
    </svg>
  );
}

function CenterIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
    </svg>
  );
}

function RefreshIcon({ spinning }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      style={spinning ? { animation: "spin 0.7s linear infinite" } : {}}
    >
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function LayoutIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}
