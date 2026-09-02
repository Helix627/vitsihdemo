import React, { useEffect, useState, useCallback } from "react";
import { fetchTimelineRange, fetchTimelineActivity } from "../services/api";

/**
 * TimelineSlider — Phase 4 (Month-Wise 2014–2015 Agora Darknet Era)
 * Provides 24 monthly activity buckets, dual-thumb range slider,
 * monthly tooltips, and preset quick-filters.
 */
const TimelineSlider = ({ onRangeChange, timeRange }) => {
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);

  // Month indices: 0 (Jan 2014) to 23 (Dec 2015)
  const [startIdx, setStartIdx] = useState(0);
  const [endIdx, setEndIdx] = useState(23);

  // Load monthly activity on mount
  useEffect(() => {
    fetchTimelineActivity()
      .then((data) => {
        const b = data.buckets || [];
        setBuckets(b);
        if (b.length > 0) {
          setStartIdx(0);
          setEndIdx(b.length - 1);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleStartChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (val <= endIdx) {
      setStartIdx(val);
    }
  };

  const handleEndChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (val >= startIdx) {
      setEndIdx(val);
    }
  };

  const handleBarClick = (idx) => {
    setStartIdx(idx);
    setEndIdx(idx);
    setActive(true);
    if (buckets[idx]) {
      onRangeChange(buckets[idx].start_ts, buckets[idx].end_ts);
    }
  };

  const handleApply = () => {
    if (!buckets.length) return;
    setActive(true);
    const startTs = buckets[startIdx]?.start_ts;
    const endTs = buckets[endIdx]?.end_ts;
    onRangeChange(startTs, endTs);
  };

  const handleClear = () => {
    if (!buckets.length) return;
    setActive(false);
    setStartIdx(0);
    setEndIdx(buckets.length - 1);
    onRangeChange(null, null);
  };

  const applyPreset = (sKey, eKey) => {
    const s = buckets.findIndex((b) => b.key === sKey);
    const e = buckets.findIndex((b) => b.key === eKey);
    if (s !== -1 && e !== -1) {
      setStartIdx(s);
      setEndIdx(e);
      setActive(true);
      onRangeChange(buckets[s].start_ts, buckets[e].end_ts);
    }
  };

  if (loading || !buckets.length) {
    return (
      <div className="timeline-slider-shell">
        <span className="timeline-loading">⏳ Loading monthly darknet activity…</span>
      </div>
    );
  }

  const maxCount = Math.max(...buckets.map((b) => b.vendors), 1);
  const totalInSelection = buckets
    .slice(startIdx, endIdx + 1)
    .reduce((sum, b) => sum + b.vendors, 0);

  const startLabel = buckets[startIdx]?.label || "Jan 2014";
  const endLabel = buckets[endIdx]?.label || "Dec 2015";

  const startPercent = (startIdx / (buckets.length - 1)) * 100;
  const endPercent = (endIdx / (buckets.length - 1)) * 100;

  return (
    <div className={`timeline-slider-shell ${active ? "timeline-active" : ""}`}>
      {/* Header Row */}
      <div className="timeline-header">
        <div className="timeline-title-area">
          <span className="timeline-label">
            📅 Monthly Threat Activity Timeline (2014–2015)
          </span>
          <span className="timeline-badge">
            {startLabel} → {endLabel}
          </span>
          <span className="timeline-count-chip">
            <strong>{totalInSelection.toLocaleString()}</strong> Active Personas Across Marketplaces
          </span>
        </div>

        <div className="timeline-header-actions">
          <button
            className="btn-timeline-apply"
            onClick={handleApply}
            type="button"
          >
            ✓ Apply Window
          </button>
          {active && (
            <button
              className="btn-timeline-clear"
              onClick={handleClear}
              type="button"
            >
              × Reset
            </button>
          )}
        </div>
      </div>

      {/* Quick Preset Filter Chips */}
      <div className="timeline-presets">
        <span className="preset-label">Quick Eras:</span>
        <button
          type="button"
          className="preset-chip"
          onClick={() => applyPreset("2014-01", "2015-12")}
        >
          🌐 Full Darknet Era (2014–2015)
        </button>
        <button
          type="button"
          className="preset-chip"
          onClick={() => applyPreset("2014-05", "2014-12")}
        >
          🚀 Early Market Inception (May–Dec '14)
        </button>
        <button
          type="button"
          className="preset-chip"
          onClick={() => applyPreset("2015-01", "2015-08")}
        >
          🔥 Peak Multi-Market Trading (Jan–Aug '15)
        </button>
        <button
          type="button"
          className="preset-chip"
          onClick={() => applyPreset("2015-09", "2015-12")}
        >
          🔄 Cross-Market Migration (Sep–Dec '15)
        </button>
      </div>

      {/* 24-Month Activity Histogram */}
      <div className="timeline-monthly-histogram">
        {buckets.map((b, idx) => {
          const inRange = idx >= startIdx && idx <= endIdx;
          const h = b.vendors > 0 ? Math.max(14, Math.round((b.vendors / maxCount) * 44)) : 4;
          return (
            <div
              key={b.key}
              className={`timeline-month-col ${inRange ? "in-range" : "out-range"}`}
              onClick={() => handleBarClick(idx)}
              title={`${b.label}: ${b.vendors.toLocaleString()} vendors registered / active`}
            >
              <div
                className="timeline-month-bar"
                style={{ height: `${h}px` }}
              >
                {b.vendors > 0 && <span className="month-bar-val">{b.vendors > 999 ? `${(b.vendors/1000).toFixed(1)}k` : b.vendors}</span>}
              </div>
              <span className="month-col-name">{b.short}</span>
            </div>
          );
        })}
      </div>

      {/* Dual Thumb Range Track */}
      <div className="timeline-track-wrapper">
        <div
          className="timeline-selection"
          style={{
            left: `${startPercent}%`,
            width: `${Math.max(2, endPercent - startPercent)}%`,
          }}
        />
        <input
          type="range"
          className="timeline-thumb timeline-thumb-start"
          min={0}
          max={buckets.length - 1}
          step={1}
          value={startIdx}
          onChange={handleStartChange}
          aria-label="Timeline start month"
        />
        <input
          type="range"
          className="timeline-thumb timeline-thumb-end"
          min={0}
          max={buckets.length - 1}
          step={1}
          value={endIdx}
          onChange={handleEndChange}
          aria-label="Timeline end month"
        />
      </div>

      {/* Boundary Labels */}
      <div className="timeline-labels">
        <span>Jan 2014 (Market Inception)</span>
        <span className="timeline-hint">💡 Drag handles or click any month bar to slice the knowledge graph</span>
        <span>Dec 2015 (Cross-Market Evolution)</span>
      </div>
    </div>
  );
};

export default TimelineSlider;
