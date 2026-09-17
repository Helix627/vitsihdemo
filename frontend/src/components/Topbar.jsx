import React, { useState } from "react";
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
  const [showTimeline, setShowTimeline] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar-main-row">
        {/* Brand Area */}
        <div className="topbar-brand" onClick={() => onTabChange("graph")} style={{ cursor: "pointer" }}>
          <div className="brand-logo-container">
            <img src="/onion_logo.png" alt="Onion Slayer Logo" className="brand-logo-img" />
            <div className="brand-logo-glow" />
          </div>
          <div className="brand-text-container">
            <div className="brand-title-line">
              <h1 className="brand-name">Onion Slayer</h1>
              <span className="brand-badge-pill">CTI ATTRIBUTION</span>
            </div>
            <p className="brand-tagline">UNMASKING THREATS. SECURING TOMORROW.</p>
          </div>
        </div>

        {/* Navigation Tabs */}
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

          <button
            type="button"
            className="tab-btn tab-btn-export"
            onClick={onOpenExport}
            title="Export CSV, JSON, or PDF Dossier"
          >
            ⬇️ Export
          </button>
        </div>

        {/* Right Controls */}
        <div className="topbar-controls">
          {/* Autonomous Ingestion Daemon Widget */}
          <AutonomousTicker onNewSuggestion={onNewSuggestion} />

          {activeTab === "graph" && (
            <>
              {/* Timeline Toggle Button */}
              {onTimelineChange && (
                <button
                  type="button"
                  className={`btn btn-timeline-toggle ${showTimeline ? "active" : ""}`}
                  onClick={() => setShowTimeline((prev) => !prev)}
                  title="Toggle 2014-2015 Monthly Darknet Era Timeline Analysis"
                >
                  📅 Timeline {showTimeline ? "▴" : "▾"}
                </button>
              )}

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

              <button className="btn primary" onClick={onRefresh} type="button">
                ⚡ Refresh
              </button>
            </>
          )}

          <button className="btn btn-theme-toggle" onClick={onThemeToggle} type="button">
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
        </div>
      </div>

      {/* Collapsible Timeline Drawer */}
      {activeTab === "graph" && onTimelineChange && showTimeline && (
        <div className="topbar-timeline-drawer fade-in">
          <TimelineSlider onRangeChange={onTimelineChange} timeRange={timeRange} />
        </div>
      )}
    </header>
  );
};

export default Topbar;
