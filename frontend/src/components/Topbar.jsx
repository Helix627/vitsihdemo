import React from "react";

const Topbar = ({
  activeTab,
  onTabChange,
  layout,
  onLayoutChange,
  onFit,
  onResetZoom,
  onRefresh,
  onExport,
  onFullscreen,
  theme,
  onThemeToggle,
  pendingSuggestionsCount = 0,
}) => {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <h1>Dark Web Identity Resolution Platform</h1>
        <p>Deterministic & Probabilistic Threat Intelligence Graph linking personas, PGP keys, and crypto wallets</p>
      </div>

      <div className="topbar-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === "graph" ? "active" : ""}`}
          onClick={() => onTabChange("graph")}
        >
          🌐 Relationship Graph
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "review" ? "active" : ""}`}
          onClick={() => onTabChange("review")}
        >
          ⚖️ Review Suggestions
          {pendingSuggestionsCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/30 text-amber-300 border border-amber-500/50">
              {pendingSuggestionsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "analyzer" ? "active" : ""}`}
          onClick={() => onTabChange("analyzer")}
        >
          📥 Intelligence Studio
        </button>
      </div>

      <div className="topbar-controls">
        {activeTab === "graph" && (
          <>
            <select
              className="layout-select"
              value={layout}
              onChange={(event) => onLayoutChange(event.target.value)}
              aria-label="Select graph layout"
            >
              <option value="cose">cose (force-directed)</option>
              <option value="concentric">concentric (hierarchical)</option>
              <option value="breadthfirst">breadthfirst</option>
              <option value="circle">circle</option>
              <option value="grid">grid</option>
            </select>

            <button className="btn" onClick={onFit} type="button">
              Fit
            </button>
            <button className="btn" onClick={onResetZoom} type="button">
              Reset
            </button>
            <button className="btn" onClick={onExport} type="button">
              Export PNG
            </button>
            <button className="btn" onClick={onFullscreen} type="button">
              Fullscreen
            </button>
            <button className="btn primary" onClick={onRefresh} type="button">
              Refresh
            </button>
          </>
        )}
        <button className="btn" onClick={onThemeToggle} type="button">
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>
    </header>
  );
};

export default Topbar;
