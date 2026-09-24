import React, { useState } from "react";
import { Search, Bell, Moon, Sun } from "lucide-react";
import TimelineSlider from "./TimelineSlider";

const NAV_ITEMS = [
  { key: "overview", label: "Overview" },
  { key: "graph", label: "Relationship Graph" },
  { key: "analyzer", label: "Intelligence" },
  { key: "review", label: "Review" },
  { key: "infra", label: "Infrastructure" },
  { key: "exports", label: "Exports" },
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
              onClick={() => {
                if (item.key === "exports") {
                  onOpenExport();
                } else {
                  onTabChange(item.key);
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right Controls */}
        <div className="topbar-controls">
          {/* Search Bar */}
          <div className="topbar-search">
            <Search size={14} />
            <input placeholder="Search identities, wallets, PGP, domains..." />
          </div>

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
          <button className="btn-icon" type="button" title="Search">
            <Search size={16} />
          </button>

          {/* Theme Toggle */}
          <button className="btn-icon" onClick={onThemeToggle} type="button" title="Toggle Theme">
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* User Avatar */}
          <div className="user-avatar" title="User Profile">
            AS
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
