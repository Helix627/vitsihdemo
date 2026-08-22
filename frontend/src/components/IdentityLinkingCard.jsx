import { useState } from "react";
import { executeMerge } from "../services/api";

const IdentityLinkingCard = ({ candidate, queryAlias, onActionComplete }) => {
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const handleAction = async (action) => {
    setLoading(true);
    try {
      // In real scenario we use candidate entity IDs if mapped, else simulate
      await executeMerge(
        candidate.primary_id || 1,
        candidate.merged_id || 2,
        action,
        candidate.overall_confidence || 0.9,
        notes || `Reviewer action: ${action}`
      );
      setDecision(action);
      if (onActionComplete) {
        onActionComplete(action, candidate);
      }
    } catch (err) {
      console.error("Action failed", err);
    } finally {
      setLoading(false);
    }
  };

  const scores = candidate.scores || {};
  const evidence = candidate.evidence || {};

  return (
    <div className={`linking-card ${decision ? `decision-${decision}` : ""}`}>
      <div className="linking-card-header">
        <div className="linking-title-wrap">
          <span className="possible-match-badge">Possible Match</span>
          <h4 className="linking-vendor-name">{candidate.vendor}</h4>
        </div>
        <div className="linking-confidence-pill">
          <span className="conf-value">{candidate.confidence_percentage}%</span>
          <span className="conf-label">Confidence</span>
        </div>
      </div>

      <div className="linking-metrics-grid">
        <div className="metric-box">
          <span className="metric-title">Alias Similarity</span>
          <span className="metric-val">{scores.alias_percentage || (scores.alias_similarity * 100).toFixed(0)}%</span>
        </div>

        <div className="metric-box">
          <span className="metric-title">Stylometry</span>
          <span className="metric-val">{scores.stylometry_percentage || (scores.stylometry_similarity * 100).toFixed(0)}%</span>
        </div>

        <div className="metric-box">
          <span className="metric-title">Shared Wallet</span>
          <span className={`metric-val ${evidence.shared_wallet ? "val-yes" : "val-no"}`}>
            {evidence.shared_wallet ? "Yes" : "No"}
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-title">Shared PGP</span>
          <span className={`metric-val ${evidence.shared_pgp ? "val-yes" : "val-no"}`}>
            {evidence.shared_pgp ? "Yes" : "No"}
          </span>
        </div>

        <div className="metric-box full-width">
          <span className="metric-title">Marketplace & Category</span>
          <span className="metric-val text-sm">{evidence.marketplace || "Agora"} ({evidence.category || "General"})</span>
        </div>
      </div>

      {decision ? (
        <div className={`decision-alert alert-${decision}`}>
          ✓ Decision Recorded: <strong>{decision.replace("_", " ").toUpperCase()}</strong>
        </div>
      ) : (
        <div className="linking-actions">
          <button
            type="button"
            className="btn-link-action merge-btn"
            disabled={loading}
            onClick={() => handleAction("merge")}
            title="Automatically link these entities with a SAME_AS edge"
          >
            {loading ? "Processing..." : "Merge"}
          </button>
          <button
            type="button"
            className="btn-link-action separate-btn"
            disabled={loading}
            onClick={() => handleAction("keep_separate")}
            title="Mark these personas as distinct actors"
          >
            Keep Separate
          </button>
          <button
            type="button"
            className="btn-link-action later-btn"
            disabled={loading}
            onClick={() => handleAction("review_later")}
            title="Queue for secondary investigator review"
          >
            Review Later
          </button>
        </div>
      )}
    </div>
  );
};

export default IdentityLinkingCard;
