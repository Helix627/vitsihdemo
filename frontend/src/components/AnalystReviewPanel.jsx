import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  fetchSuggestions as apiFetchSuggestions,
  approveSuggestion as apiApproveSuggestion,
  rejectSuggestion as apiRejectSuggestion,
} from "../services/api";

export default function AnalystReviewPanel({
  onApproveSuccess,
  onRejectSuccess,
  onRefreshGraph,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});
  const [msg, setMsg] = useState(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const data = await apiFetchSuggestions(50, 0);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleApprove = async (suggId) => {
    setProcessingId(suggId);
    setMsg(null);
    try {
      const notes = reviewNotes[suggId] || "Analyst confirmed identity match.";
      const data = await apiApproveSuggestion(suggId, "Lead_Investigator", notes);
      if (data.success) {
        setMsg({ type: "success", text: data.message });
        setSuggestions((prev) => prev.filter((s) => s.suggestion_id !== suggId));
        if (onApproveSuccess) onApproveSuccess(data);
        if (onRefreshGraph) onRefreshGraph();
      } else {
        setMsg({ type: "error", text: data.error || "Approval failed" });
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.error || err.message || "Network error during approval";
      setMsg({ type: "error", text: errorMsg });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (suggId) => {
    setProcessingId(suggId);
    setMsg(null);
    try {
      const notes = reviewNotes[suggId] || "Analyst rejected match; distinct personas.";
      const data = await apiRejectSuggestion(suggId, "Lead_Investigator", notes);
      if (data.success) {
        setMsg({ type: "info", text: data.message });
        setSuggestions((prev) => prev.filter((s) => s.suggestion_id !== suggId));
        if (onRejectSuccess) onRejectSuccess(data);
      } else {
        setMsg({ type: "error", text: data.error || "Rejection failed" });
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.error || err.message || "Network error during rejection";
      setMsg({ type: "error", text: errorMsg });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="review-console-card">
      {/* Header */}
      <div className="review-header">
        <div className="review-header-left">
          <div className="review-icon-wrap">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="review-title-row">
              <h2 className="review-title">Analyst Review Console</h2>
              <span className="pending-badge">
                {suggestions.length} Pending
              </span>
            </div>
            <p className="review-subtitle">
              Review and adjudicate AI-suggested candidate identity mergers (Confidence 60% – 95%).
            </p>
          </div>
        </div>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="btn-secondary"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Notification banner */}
      {msg && (
        <div className={`notification-banner ${msg.type}`}>
          {msg.type === "success" ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Empty State */}
      {suggestions.length === 0 && !loading && (
        <div className="review-empty-box">
          <CheckCircle className="review-empty-icon" />
          <h3 className="review-empty-title">No Pending Suggestions</h3>
          <p className="review-empty-desc">
            All candidate identity linkages have been resolved or auto-merged by the continuous intelligence pipeline.
          </p>
        </div>
      )}

      {/* Suggestions List */}
      <div className="suggestions-list">
        {suggestions.map((s) => {
          const confPct = Math.round((s.confidence || 0) * 100);
          const bd = s.similarity_breakdown || {};
          const isHigh = confPct >= 80;

          return (
            <div key={s.suggestion_id} className="suggestion-card">
              <div className="suggestion-card-header">
                {/* Persona Comparison */}
                <div className="persona-pair">
                  <div className="persona-pill src">
                    <User className="w-4 h-4 text-cyan" />
                    <span className="persona-name">{s.source_username}</span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-muted shrink-0" />

                  <div className="persona-pill tgt">
                    <User className="w-4 h-4 text-purple" />
                    <span className="persona-name">{s.target_username}</span>
                  </div>
                </div>

                {/* Confidence Badge */}
                <div className="confidence-meter">
                  <div className="text-right">
                    <div className="conf-label">
                      {s.decision_label || (isHigh ? "Likely" : "Possible")} Match
                    </div>
                    <div
                      className={`conf-value-big ${
                        isHigh ? "text-amber" : "text-cyan"
                      }`}
                    >
                      {confPct}% Confidence
                    </div>
                  </div>
                  <div
                    className={`conf-bar-indicator ${
                      isHigh ? "bg-amber" : "bg-cyan"
                    }`}
                  />
                </div>
              </div>

              {/* 4-Stage Similarity Breakdown */}
              <div className="stage-breakdown-grid">
                <div className="breakdown-box">
                  <span className="breakdown-label">Stage 2: Username</span>
                  <span className="breakdown-val">
                    {Math.round(
                      (bd.username_similarity || bd.alias_similarity || 0) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="breakdown-box">
                  <span className="breakdown-label">Stage 3: Behaviour</span>
                  <span className="breakdown-val">
                    {Math.round(
                      (bd.behavior_similarity || bd.behavioral_similarity || 0) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="breakdown-box">
                  <span className="breakdown-label">Stage 4: Stylometry</span>
                  <span className="breakdown-val">
                    {Math.round(
                      (bd.stylometry_similarity || bd.stylometric_similarity || 0) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="breakdown-box">
                  <span className="breakdown-label">Stage 4: Embeddings</span>
                  <span className="breakdown-val">
                    {Math.round((bd.embedding_similarity || 0) * 100)}%
                  </span>
                </div>
              </div>

              {/* Review notes input & Action buttons */}
              <div className="suggestion-action-row">
                <input
                  type="text"
                  placeholder="Optional analyst adjudication rationale or case notes..."
                  value={reviewNotes[s.suggestion_id] || ""}
                  onChange={(e) =>
                    setReviewNotes({
                      ...reviewNotes,
                      [s.suggestion_id]: e.target.value,
                    })
                  }
                  className="form-input review-input"
                />

                <div className="action-buttons-group">
                  <button
                    onClick={() => handleReject(s.suggestion_id)}
                    disabled={processingId === s.suggestion_id}
                    className="btn-reject"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>

                  <button
                    onClick={() => handleApprove(s.suggestion_id)}
                    disabled={processingId === s.suggestion_id}
                    className="btn-approve"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Approve Merge
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
