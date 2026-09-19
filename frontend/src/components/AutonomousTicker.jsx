import React, { useEffect, useState } from "react";
import {
  fetchAutonomousStatus,
  toggleAutonomousEngine,
  triggerInstantScan,
} from "../services/api";

const AutonomousTicker = ({ onNewSuggestion }) => {
  const [status, setStatus] = useState({
    is_running: true,
    total_feeds_scanned: 0,
    auto_merged_count: 0,
    review_queued_count: 0,
    new_clusters_count: 0,
    recent_events: [],
  });
  const [open, setOpen] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Poll autonomous status every 5 seconds
  useEffect(() => {
    let prevQueued = 0;
    const poll = async () => {
      try {
        const data = await fetchAutonomousStatus();
        setStatus(data);
        if (data.last_scan_ts) {
          const diff = Math.max(0, Math.floor(Date.now() / 1000 - data.last_scan_ts));
          setSecondsAgo(diff);
        }
        if (data.review_queued_count > prevQueued && prevQueued > 0) {
          if (onNewSuggestion) onNewSuggestion();
        }
        prevQueued = data.review_queued_count;
      } catch (err) {
        // silent fallback
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [onNewSuggestion]);

  // Second counter ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggle = async () => {
    try {
      const updated = await toggleAutonomousEngine();
      setStatus(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualTrigger = async () => {
    setTriggering(true);
    try {
      const res = await triggerInstantScan();
      if (res.engine_state) {
        setStatus(res.engine_state);
        setSecondsAgo(0);
      }
      if (onNewSuggestion) onNewSuggestion();
    } catch (err) {
      console.error(err);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <>
      {/* Topbar Ticker Pill */}
      <button
        type="button"
        className={`autonomous-pill ${status.is_running ? "running" : "paused"}`}
        onClick={() => setOpen(true)}
        title="Click to view Autonomous Intelligence Daemon activity"
      >
        <span className="radar-dot" />
        <span className="autonomous-pill-label">
          {status.is_running ? "Autonomous Mode" : "Autonomous Paused"}
        </span>
        {status.is_running && (
          <span className="autonomous-time-tag">
            {secondsAgo < 5 ? "Just scanned" : `${secondsAgo}s ago`}
          </span>
        )}
      </button>

      {/* Modal Dialog for Autonomous Ingestion */}
      {open && (
        <div
          className="autonomous-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="autonomous-modal">
            {/* Header */}
            <div className="autonomous-modal-header">
              <div>
                <h3 className="autonomous-modal-title">
                  🤖 Autonomous Intelligence Collector
                </h3>
                <p className="autonomous-modal-subtitle">
                  Continuous darknet forum &amp; marketplace threat ingestion daemon (NTRO PS 26151)
                </p>
              </div>
              <button
                type="button"
                className="autonomous-modal-close"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="autonomous-modal-body">
              {/* KPI Counters */}
              <div className="drawer-kpis">
                <div className="drawer-kpi">
                  <span className="kpi-num">{status.total_feeds_scanned}</span>
                  <span className="kpi-lbl">Total Feeds Scanned</span>
                </div>
                <div className="drawer-kpi highlight-green">
                  <span className="kpi-num">{status.auto_merged_count}</span>
                  <span className="kpi-lbl">Auto-Merged (≥95% Conf)</span>
                </div>
                <div className="drawer-kpi highlight-amber">
                  <span className="kpi-num">{status.review_queued_count}</span>
                  <span className="kpi-lbl">Review Queue (60-94%)</span>
                </div>
              </div>

              {/* Action Bar */}
              <div className="drawer-actions">
                <button
                  type="button"
                  className={`btn-drawer-toggle ${status.is_running ? "btn-pause" : "btn-start"}`}
                  onClick={handleToggle}
                >
                  {status.is_running ? "⏸️ Pause Ingestion Daemon" : "▶️ Resume Ingestion Daemon"}
                </button>
                <button
                  type="button"
                  className="btn-drawer-trigger"
                  onClick={handleManualTrigger}
                  disabled={triggering}
                >
                  {triggering ? "⚡ Ingesting Feed…" : "⚡ Trigger Instant Scan Pulse"}
                </button>
              </div>

              {/* Real-Time Stream */}
              <div className="drawer-feed-list">
                <p className="feed-list-title">📡 Real-Time Autonomous Intelligence Stream:</p>
                {status.recent_events && status.recent_events.length > 0 ? (
                  status.recent_events.map((ev, idx) => (
                    <div
                      key={ev.id || idx}
                      className={`feed-event-item ${ev.status?.toLowerCase()}`}
                    >
                      <div className="feed-item-header">
                        <span className="feed-source">{ev.source}</span>
                        <span className={`feed-badge ${ev.status?.toLowerCase()}`}>
                          {ev.status === "AUTO_MERGED"
                            ? "⚡ AUTO MERGED"
                            : ev.status === "QUEUED_FOR_REVIEW"
                            ? "⚖️ REVIEW QUEUE"
                            : "✨ NEW CLUSTER"}
                        </span>
                      </div>
                      <p className="feed-reason">{ev.reason}</p>
                    </div>
                  ))
                ) : (
                  <p className="feed-empty">No scan events yet. Click 'Trigger Instant Scan Pulse' above.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AutonomousTicker;
