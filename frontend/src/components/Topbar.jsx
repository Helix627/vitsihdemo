const Topbar = ({
  layout,
  onLayoutChange,
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
      <div>
        <h1>Vendor Relationship Graph</h1>
        <p>Interactive visualization for vendors and PGP key relationships</p>
      </div>

      <div className="topbar-controls">
        <select
          className="layout-select"
          value={layout}
          onChange={(event) => onLayoutChange(event.target.value)}
          aria-label="Select graph layout"
        >
          <option value="cose">cose</option>
          <option value="breadthfirst">breadthfirst</option>
          <option value="circle">circle</option>
          <option value="grid">grid</option>
        </select>

        <button className="btn" onClick={onFit} type="button">
          Fit Graph
        </button>
        <button className="btn" onClick={onResetZoom} type="button">
          Reset Zoom
        </button>
        <button className="btn" onClick={onCenter} type="button">
          Center Graph
        </button>
        <button className="btn" onClick={onExport} type="button">
          Export PNG
        </button>
        <button className="btn" onClick={onFullscreen} type="button">
          Fullscreen
        </button>
        <button className="btn primary" onClick={onRefresh} type="button">
          Refresh Data
        </button>
        <button className="btn" onClick={onThemeToggle} type="button">
          {theme === "light" ? "Dark Mode" : "Light Mode"}
        </button>
      </div>
    </header>
  );
};

export default Topbar;
