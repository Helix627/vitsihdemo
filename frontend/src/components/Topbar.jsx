import React, { useState } from "react";
import { Search, Bell, Moon, Sun } from "lucide-react";
import TimelineSlider from "./TimelineSlider";

const NAV_ITEMS = [
  { key: "overview", label: "Overview" },
  { key: "graph", label: "Relationship Graph" },
  { key: "analyzer", label: "Intelligence" },
  { key: "review", label: "Review" },
];

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
  graphMode = "2d",
  onGraphModeChange,
}) => {
  const [showTimeline, setShowTimeline] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar-main-row">
        {/* Brand Area */}
        <div className="topbar-brand" onClick={() => onTabChange("overview")} style={{ cursor: "pointer" }}>
          <div className="brand-logo-container">
            <img src="/onion_logo.png" alt="Onion Slayer Logo" className="brand-logo-img" />
          </div>
          <div className="brand-text-container">
            <h1 className="brand-name">Onion Slayer</h1>
            <p className="brand-tagline">THREAT INTELLIGENCE PLATFORM</p>
          </div>
        </div>

        {/* Center Navigation */}
        <nav className="topbar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-link ${activeTab === item.key ? "active" : ""}`}
              onClick={() => onTabChange(item.key)}
            >
              {item.label}
              {item.key === "review" && pendingSuggestionsCount > 0 && (
                <span className="nav-badge">{pendingSuggestionsCount}</span>
              )}
            </button>
          ))}
          <button
            type="button"
            className="nav-link nav-link-export"
            onClick={onOpenExport}
            title="Export CSV, JSON, or PDF Dossier"
          >
            Reports
          </button>
        </nav>

        {/* Right Controls */}
        <div className="topbar-controls">
          {activeTab === "graph" && (
            <>
              {/* 2D / 3D Mode Switcher */}
              <div className="graph-mode-toggle" role="group" aria-label="Graph Dimensions">
                <button
                  type="button"
                  className={`btn-mode-pill ${graphMode === "2d" ? "active" : ""}`}
                  onClick={() => onGraphModeChange("2d")}
                  title="2D Planar Layout"
                >
                  2D
                </button>
                <button
                  type="button"
                  className={`btn-mode-pill ${graphMode === "3d" ? "active" : ""}`}
                  onClick={() => onGraphModeChange("3d")}
                  title="3D Force-Directed"
                >
                  3D
                </button>
              </div>

              {/* Timeline Toggle */}
              {onTimelineChange && (
                <button
                  type="button"
                  className={`btn-icon ${showTimeline ? "active" : ""}`}
                  onClick={() => setShowTimeline((prev) => !prev)}
                  title="Toggle Timeline Analysis"
                >
                  Timeline {showTimeline ? "▴" : "▾"}
                </button>
              )}

              {graphMode === "2d" && (
                <select
                  className="layout-select"
                  value={layout}
                  onChange={(event) => onLayoutChange(event.target.value)}
                  aria-label="Select graph layout"
                >
                  <option value="cose">Force-directed</option>
                  <option value="concentric">Concentric</option>
                  <option value="breadthfirst">Breadthfirst</option>
                  <option value="circle">Circle</option>
                  <option value="grid">Grid</option>
                </select>
              )}

              <button className="btn-icon" onClick={onRefresh} type="button" title="Refresh Graph">
                ⚡
              </button>
            </>
          )}

          {/* Search icon */}
          <button
            className="btn-icon"
            type="button"
            title="Search"
            onClick={() => setSearchExpanded(!searchExpanded)}
          >
            <Search size={16} />
          </button>

          {/* Theme Toggle */}
          <button className="btn-icon" onClick={onThemeToggle} type="button" title="Toggle theme">
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* User Avatar */}
          <div className="user-avatar" title="User Profile">
            AK
          </div>
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
