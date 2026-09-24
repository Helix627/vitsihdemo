import React from "react";
import { Users, GitBranch, Layers, AlertTriangle, ArrowRight } from "lucide-react";

const RightSidebar = () => {
  return (
    <aside className="right-sidebar">
      {/* Total Entities — Large Card */}
      <div className="kpi-card-lg">
        <div className="kpi-header">
          <Users size={14} className="kpi-icon" />
          <span className="kpi-label">Total Entities</span>
        </div>
        <div className="kpi-row">
          <span className="kpi-number">235</span>
          <span className="kpi-change up">↑ 12%</span>
        </div>
        <span className="kpi-sub">vs. last 7 days</span>
      </div>

      {/* Resolved Relationships — Large Card */}
      <div className="kpi-card-lg">
        <div className="kpi-header">
          <GitBranch size={14} className="kpi-icon" />
          <span className="kpi-label">Resolved Relationships</span>
        </div>
        <div className="kpi-row">
          <span className="kpi-number">582</span>
          <span className="kpi-change up">↑ 8%</span>
        </div>
        <span className="kpi-sub">vs. last 7 days</span>
      </div>

      {/* Actor Clusters + Needs Review — Side by Side */}
      <div className="kpi-row-sm">
        <div className="kpi-card-sm">
          <div className="kpi-header">
            <Layers size={13} className="kpi-icon" />
            <span className="kpi-label">Actor Clusters</span>
          </div>
          <div className="kpi-row">
            <span className="kpi-number">47</span>
            <span className="kpi-change up">↑ 5%</span>
          </div>
        </div>
        <div className="kpi-card-sm">
          <div className="kpi-header">
            <AlertTriangle size={13} className="kpi-icon" />
            <span className="kpi-label">Needs Review</span>
          </div>
          <div className="kpi-row">
            <span className="kpi-number">18</span>
            <span className="kpi-change down">↓ 3%</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="activity-section">
        <div className="activity-header">
          <span className="activity-title">Recent Activity</span>
          <button className="activity-view-all">
            View all <ArrowRight size={12} />
          </button>
        </div>
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-dot blue" />
            <div className="activity-body">
              <div className="activity-body-row">
                <span className="activity-text-main">New relationship detected</span>
                <span className="activity-time">12m ago</span>
              </div>
              <span className="activity-text-sub">ShadowOps_Vortex ? ShadowOps Dark Market</span>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-dot green" />
            <div className="activity-body">
              <div className="activity-body-row">
                <span className="activity-text-main">Entity enriched</span>
                <span className="activity-time">18m ago</span>
              </div>
              <span className="activity-text-sub">ShadowOps_Vortex</span>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-dot orange" />
            <div className="activity-body">
              <div className="activity-body-row">
                <span className="activity-text-main">New infrastructure correlation found</span>
                <span className="activity-time">32m ago</span>
              </div>
              <span className="activity-text-sub">ShadowOps Market Mirror</span>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-dot amber" />
            <div className="activity-body">
              <div className="activity-body-row">
                <span className="activity-text-main">Review suggestion</span>
                <span className="activity-time">1h ago</span>
              </div>
              <span className="activity-text-sub">ShadowOps_Vortex ? existing actor cluster</span>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-dot purple" />
            <div className="activity-body">
              <div className="activity-body-row">
                <span className="activity-text-main">Export completed</span>
                <span className="activity-time">2h ago</span>
              </div>
              <span className="activity-text-sub">CTI package</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;
