import React from "react";
import AutonomousTicker from "./AutonomousTicker";
import TimelineSlider from "./TimelineSlider";

const Topbar = ({
  activeTab,
  onTabChange,
  layout,
  onLayoutChange,
  onFit,
  onFullscreen,
  onRefresh,
  theme,
  onThemeToggle,
  pendingSuggestionsCount = 0,
  onOpenExport,
  onTimelineChange,
  timeRange,
  onNewSuggestion,
}) => {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <h1>Dark Web Identity Resolution Platform</h1>
        <p>Deterministic &amp; Probabilistic Threat Intelligence Graph linking personas, PGP keys, and crypto wallets</p>
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
          className={`tab-btn ${activeTab === "infrastructure" ? "active" : ""}`}
          onClick={() => onTabChange("infrastructure")}
        >
          🛡️ Tor Infrastructure &amp; Attribution
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "review" ? "active" : ""}`}
          onClick={() => onTabChange("review")}
        >
          ⚖️ Review Suggestions
          {pendingSuggestionsCount > 0 && (
            <span className="pending-badge">{pendingSuggestionsCount}</span>
          )}
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "analyzer" ? "active" : ""}`}
          onClick={() => onTabChange("analyzer")}
        >
          📥 Intelligence Studio
        </button>

        {/* Phase 5 — Export Button */}
        <button
          type="button"
          className="tab-btn tab-btn-export"
          onClick={onOpenExport}
          title="Export CSV, JSON, or PDF Dossier"
        >
          ⬇️ Export
        </button>
      </div>

      <div className="topbar-controls">
        {/* Autonomous Ingestion Daemon Widget */}
        <AutonomousTicker onNewSuggestion={onNewSuggestion} />

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

      {/* Phase 4 — Timeline Slider (shown only on graph tab) */}
      {activeTab === "graph" && onTimelineChange && (
        <div className="topbar-timeline">
          <TimelineSlider onRangeChange={onTimelineChange} timeRange={timeRange} />
        </div>
      )}
    </header>
  );
};

export default Topbar;
