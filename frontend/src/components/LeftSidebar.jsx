import React from "react";
import { Home, Search, Eye, FileText, Settings, Activity } from "lucide-react";

const LeftSidebar = ({ activeTab, onTabChange }) => {
  return (
    <aside className="left-sidebar">
      <nav className="left-nav">
        <button
          className={`left-nav-item ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => onTabChange("overview")}
        >
          <Home size={18} />
          <span>Home</span>
        </button>
        <button
          className={`left-nav-item ${activeTab === "graph" ? "active" : ""}`}
          onClick={() => onTabChange("graph")}
        >
          <Search size={18} />
          <span>Investigations</span>
        </button>
        <button className="left-nav-item">
          <Eye size={18} />
          <span>Watchlist</span>
        </button>
        <button className="left-nav-item">
          <FileText size={18} />
          <span>Reports</span>
        </button>
        <button className="left-nav-item">
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </nav>

    </aside>
  );
};

export default LeftSidebar;
