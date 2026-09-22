import React, { useState, useEffect } from 'react';

const noopIcon = () => null;
const CheckCircle = noopIcon;
const XCircle = noopIcon;
const AlertTriangle = noopIcon;
const Shield = noopIcon;
const User = noopIcon;
const ArrowRight = noopIcon;
const RefreshCw = noopIcon;
const Layers = noopIcon;
const Sparkles = noopIcon;
const GitMerge = noopIcon;
const Search = noopIcon;
const SlidersHorizontal = noopIcon;
const Check = noopIcon;
const X = noopIcon;
const FileText = noopIcon;
const Activity = noopIcon;
const Zap = noopIcon;
import {
  fetchSuggestions as apiFetchSuggestions,
  approveSuggestion as apiApproveSuggestion,
  rejectSuggestion as apiRejectSuggestion,
} from '../services/api';

export default function AnalystReviewPanel({
  onApproveSuccess,
  onRejectSuccess,
  onRefreshGraph,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});
  const [filterText, setFilterText] = useState('');
  const [minConfFilter, setMinConfFilter] = useState(0.6);
  const [msg, setMsg] = useState(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const data = await apiFetchSuggestions(50, 0);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
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
      const notes = reviewNotes[suggId] || 'Analyst confirmed identity match.';
      const data = await apiApproveSuggestion(suggId, 'Lead_Investigator', notes);
      if (data.success) {
        setMsg({ type: 'success', text: data.message || 'Identity clusters successfully unified.' });
        setSuggestions((prev) => prev.filter((s) => s.suggestion_id !== suggId));
        if (onApproveSuccess) onApproveSuccess(data);
        if (onRefreshGraph) onRefreshGraph();
      } else {
        setMsg({ type: 'error', text: data.error || 'Approval failed' });
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.error || err.message || 'Network error during approval';
      setMsg({ type: 'error', text: errorMsg });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (suggId) => {
    setProcessingId(suggId);
    setMsg(null);
    try {
      const notes =
        reviewNotes[suggId] || 'Analyst rejected match; distinct darknet actors.';
      const data = await apiRejectSuggestion(suggId, 'Lead_Investigator', notes);
      if (data.success) {
        setMsg({ type: 'info', text: data.message || 'Candidate correlation dismissed.' });
        setSuggestions((prev) => prev.filter((s) => s.suggestion_id !== suggId));
        if (onRejectSuccess) onRejectSuccess(data);
      } else {
        setMsg({ type: 'error', text: data.error || 'Rejection failed' });
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.error || err.message || 'Network error during rejection';
      setMsg({ type: 'error', text: errorMsg });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredSuggestions = suggestions.filter((s) => {
    const conf = s.confidence || 0;
    if (conf < minConfFilter) return false;
    if (!filterText) return true;
    const term = filterText.toLowerCase();
    return (
      (s.source_username || '').toLowerCase().includes(term) ||
      (s.target_username || '').toLowerCase().includes(term) ||
      (s.suggested_reason || '').toLowerCase().includes(term) ||
      (s.decision_label || '').toLowerCase().includes(term)
    );
  });

  const highConfCount = suggestions.filter((s) => (s.confidence || 0) >= 0.8).length;
  const modConfCount = suggestions.filter(
    (s) => (s.confidence || 0) >= 0.6 && (s.confidence || 0) < 0.8
  ).length;

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        color: 'var(--text-primary)',
        width: '100%',
        maxWidth: '1280px',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header & Overview KPIs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--border-soft)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
            }}
          >
            <GitMerge style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              Probabilistic Adjudication Console
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-soft)',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {suggestions.length} In Queue
              </span>
            </h2>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
              }}
            >
              Human-in-the-loop review for moderate confidence candidate merges (60% – 95%) resolved via stylometry & embeddings.
            </p>
          </div>
        </div>

        {/* Quick KPI Badges & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--bg-primary)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-soft)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <span style={{ color: 'var(--brand-emerald)' }}>●</span> {highConfCount} High (≥80%)
            <span style={{ color: 'var(--border-soft)', margin: '0 4px' }}>|</span>
            <span style={{ color: 'var(--brand-amber)' }}>●</span> {modConfCount} Moderate (60-79%)
          </div>

          <button
            type="button"
            onClick={fetchSuggestions}
            disabled={loading}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              padding: '7px 14px',
            }}
          >
            <RefreshCw
              style={{
                width: '14px',
                height: '14px',
                animation: loading ? 'spin 1s linear infinite' : 'none',
              }}
            />
            {loading ? 'Refreshing...' : 'Refresh Queue'}
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '20px',
          background: 'var(--bg-primary)',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid var(--border-soft)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: '1 1 250px',
            background: 'var(--bg-secondary)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border-soft)',
          }}
        >
          <Search style={{ width: '15px', height: '15px', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Filter candidates by handle, reason, or label..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
              width: '100%',
            }}
          />
          {filterText && (
            <button
              type="button"
              onClick={() => setFilterText('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              <X style={{ width: '14px', height: '14px' }} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SlidersHorizontal
            style={{ width: '14px', height: '14px', color: 'var(--text-secondary)' }}
          />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Min Confidence:
          </span>
          <select
            value={minConfFilter}
            onChange={(e) => setMinConfFilter(parseFloat(e.target.value))}
            className="layout-select"
            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
          >
            <option value="0.60">≥ 60% (All Candidates)</option>
            <option value="0.70">≥ 70% (Probable)</option>
            <option value="0.80">≥ 80% (High Confidence)</option>
            <option value="0.90">≥ 90% (Near Deterministic)</option>
          </select>
        </div>
      </div>

      {/* Notification Toast Banner */}
      {msg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '0.84rem',
            fontWeight: 500,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background:
              msg.type === 'success'
                ? 'rgba(16, 185, 129, 0.12)'
                : msg.type === 'error'
                ? 'rgba(239, 68, 68, 0.12)'
                : 'rgba(6, 182, 212, 0.12)',
            border:
              msg.type === 'success'
                ? '1px solid rgba(16, 185, 129, 0.35)'
                : msg.type === 'error'
                ? '1px solid rgba(239, 68, 68, 0.35)'
                : '1px solid rgba(6, 182, 212, 0.35)',
            color:
              msg.type === 'success'
                ? '#10b981'
                : msg.type === 'error'
                ? '#ef4444'
                : '#06b6d4',
          }}
        >
          {msg.type === 'success' ? (
            <CheckCircle style={{ width: '18px', height: '18px', flexShrink: 0 }} />
          ) : (
            <AlertTriangle style={{ width: '18px', height: '18px', flexShrink: 0 }} />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Empty State */}
      {filteredSuggestions.length === 0 && !loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            borderRadius: '14px',
            border: '1px dashed var(--border-soft)',
            background: 'var(--bg-primary)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              color: '#10b981',
            }}
          >
            <Shield style={{ width: '28px', height: '28px' }} />
          </div>
          <h3
            style={{
              margin: '0 0 6px',
              fontSize: '1.05rem',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {suggestions.length === 0 ? 'Adjudication Queue Empty' : 'No Matches for Current Filter'}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              maxWidth: '460px',
              marginInline: 'auto',
            }}
          >
            {suggestions.length === 0
              ? 'All probabilistic candidate personas have been adjudicated. High confidence records are automatically merged by the graph engine.'
              : 'Try lowering the minimum confidence threshold or clearing search terms to view remaining candidates.'}
          </p>
        </div>
      )}

      {/* Suggestions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredSuggestions.map((s) => {
          const conf = s.confidence || 0;
          const confPct = Math.round(conf * 100);
          const bd = s.similarity_breakdown || {};
          const isHigh = confPct >= 80;

          const usernameSim = Math.round((bd.username_similarity || bd.alias_similarity || 0) * 100);
          const behaviorSim = Math.round((bd.behavior_similarity || bd.behavioral_similarity || 0) * 100);
          const stylometrySim = Math.round((bd.stylometry_similarity || bd.stylometric_similarity || 0) * 100);
          const embeddingSim = Math.round((bd.embedding_similarity || 0) * 100);

          return (
            <div
              key={s.suggestion_id}
              style={{
                background: 'var(--bg-primary)',
                border: isHigh
                  ? '1px solid var(--brand-amber)'
                  : '1px solid var(--border-soft)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                transition: 'border-color 0.2s ease, transform 0.2s ease',
              }}
            >
              {/* Persona Comparison Row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid var(--border-soft)',
                }}
              >
                {/* Left & Right Actor Visual Matchup */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'var(--bg-secondary)',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-soft)',
                    }}
                  >
                    <User style={{ width: '16px', height: '16px', color: 'var(--brand-cyan)' }} />
                    <div>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--text-secondary)',
                          display: 'block',
                          fontWeight: 700,
                        }}
                      >
                        Source Ingest Persona
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          color: 'var(--brand-cyan)',
                        }}
                      >
                        {s.source_username}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                    }}
                  >
                    <ArrowRight
                      style={{
                        width: '18px',
                        height: '18px',
                        color: isHigh ? 'var(--brand-amber)' : 'var(--text-secondary)',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                      }}
                    >
                      CORRELATION
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'var(--bg-secondary)',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-soft)',
                    }}
                  >
                    <User style={{ width: '16px', height: '16px', color: 'var(--brand-purple)' }} />
                    <div>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--text-secondary)',
                          display: 'block',
                          fontWeight: 700,
                        }}
                      >
                        Existing Graph Actor
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          color: 'var(--brand-purple)',
                        }}
                      >
                        {s.target_username}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Confidence Badge & Decision Label */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        display: 'block',
                        fontWeight: 600,
                      }}
                    >
                      {s.decision_label || (isHigh ? 'High Probability' : 'Possible Link')}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: isHigh ? 'var(--brand-amber)' : 'var(--brand-cyan)',
                      }}
                    >
                      {confPct}% Confidence
                    </span>
                  </div>
                  <div
                    style={{
                      width: '6px',
                      height: '38px',
                      borderRadius: '4px',
                      background: isHigh ? 'var(--brand-amber)' : 'var(--brand-cyan)',
                      opacity: 0.8
                    }}
                  />
                </div>
              </div>

              {/* Rationale / Evidence Note */}
              {s.suggested_reason && (
                <div
                  style={{
                    margin: '14px 0 10px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-soft)',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Sparkles style={{ width: '14px', height: '14px', color: 'var(--brand-amber)', flexShrink: 0 }} />
                  <span>
                    <strong style={{ color: 'var(--text-primary)' }}>Heuristic Reason:</strong>{' '}
                    {s.suggested_reason}
                  </span>
                </div>
              )}

              {/* 5-Stage Multi-Feature Similarity Breakdown */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '10px',
                  margin: '14px 0',
                }}
              >
                {/* Stage 2: Username */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Handle Fuzzy Match
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem' }}>
                      {usernameSim}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: '4px',
                      borderRadius: '2px',
                      background: 'rgba(100, 116, 139, 0.2)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${usernameSim}%`,
                        background: 'var(--brand-cyan)',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                </div>

                {/* Stage 3: Behavior */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Behavioral Heuristics
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem' }}>
                      {behaviorSim}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: '4px',
                      borderRadius: '2px',
                      background: 'rgba(100, 116, 139, 0.2)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${behaviorSim}%`,
                        background: 'var(--brand-emerald)',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                </div>

                {/* Stage 4: Stylometry */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Stylometric Vector (11-d)
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem' }}>
                      {stylometrySim}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: '4px',
                      borderRadius: '2px',
                      background: 'rgba(100, 116, 139, 0.2)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${stylometrySim}%`,
                        background: 'var(--brand-purple)',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                </div>

                {/* Stage 5: Embeddings */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Neural Embeddings (384-d)
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem' }}>
                      {embeddingSim}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: '4px',
                      borderRadius: '2px',
                      background: 'rgba(100, 116, 139, 0.2)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${embeddingSim}%`,
                        background: 'var(--accent)',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Analyst Case Notes & Action Controls */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  paddingTop: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flex: '1 1 300px',
                    background: 'var(--bg-secondary)',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <FileText
                    style={{
                      width: '14px',
                      height: '14px',
                      color: 'var(--text-secondary)',
                      flexShrink: 0,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Case notes / justification rationale for this merge decision..."
                    value={reviewNotes[s.suggestion_id] || ''}
                    onChange={(e) =>
                      setReviewNotes({ ...reviewNotes, [s.suggestion_id]: e.target.value })
                    }
                    style={{
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      width: '100%',
                      fontFamily: 'var(--font-body)',
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleReject(s.suggestion_id)}
                    disabled={processingId === s.suggestion_id}
                    className="btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: 'var(--brand-rose)',
                      borderColor: 'transparent',
                      background: 'rgba(225, 29, 72, 0.08)',
                      fontSize: '0.82rem',
                      padding: '8px 16px',
                    }}
                  >
                    <X style={{ width: '14px', height: '14px' }} />
                    Reject Match
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(s.suggestion_id)}
                    disabled={processingId === s.suggestion_id}
                    className="btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'var(--brand-emerald)',
                      color: '#ffffff',
                      borderColor: 'transparent',
                      fontSize: '0.82rem',
                      padding: '8px 18px',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <Check style={{ width: '14px', height: '14px' }} />
                    {processingId === s.suggestion_id ? 'Merging...' : 'Approve & Merge'}
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

