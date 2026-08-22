import ConfidenceSlider from "./ConfidenceSlider";

const Topbar = ({
  activeTab,
  onTabChange,
  layout,
  onLayoutChange,
  confidenceThreshold,
  onConfidenceChange,
  onFit,
  onResetZoom,
  onCenter,
  onRefresh,
  onExport,
  onFullscreen,
  theme,
  onThemeToggle,
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
          className={`tab-btn ${activeTab === "analyzer" ? "active" : ""}`}
          onClick={() => onTabChange("analyzer")}
        >
          🕵️ Analyze Identity
        </button>
      </div>

      <div className="topbar-controls">
        {activeTab === "graph" && (
          <>
            <ConfidenceSlider value={confidenceThreshold} onChange={onConfidenceChange} />

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
