import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Shield, User, ArrowRight, RefreshCw, Layers } from 'lucide-react';
import { fetchSuggestions as apiFetchSuggestions, approveSuggestion as apiApproveSuggestion, rejectSuggestion as apiRejectSuggestion } from '../services/api';

export default function AnalystReviewPanel({ onApproveSuccess, onRejectSuccess, onRefreshGraph }) {
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
        setMsg({ type: 'success', text: data.message });
        setSuggestions(prev => prev.filter(s => s.suggestion_id !== suggId));
        if (onApproveSuccess) onApproveSuccess(data);
        if (onRefreshGraph) onRefreshGraph();
      } else {
        setMsg({ type: 'error', text: data.error || 'Approval failed' });
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err.message || 'Network error during approval';
      setMsg({ type: 'error', text: errorMsg });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (suggId) => {
    setProcessingId(suggId);
    setMsg(null);
    try {
      const notes = reviewNotes[suggId] || 'Analyst rejected match; distinct personas.';
      const data = await apiRejectSuggestion(suggId, 'Lead_Investigator', notes);
      if (data.success) {
        setMsg({ type: 'info', text: data.message });
        setSuggestions(prev => prev.filter(s => s.suggestion_id !== suggId));
        if (onRejectSuccess) onRejectSuccess(data);
      } else {
        setMsg({ type: 'error', text: data.error || 'Rejection failed' });
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err.message || 'Network error during rejection';
      setMsg({ type: 'error', text: errorMsg });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-6 text-slate-100 shadow-2xl max-w-5xl mx-auto my-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Analyst Review Console
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                {suggestions.length} Pending
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Review and adjudicate AI-suggested candidate identity mergers (Confidence 60% – 95%).
            </p>
          </div>
        </div>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Notification banner */}
      {msg && (
        <div className={`mb-6 p-3 rounded-lg text-xs font-medium border flex items-center gap-2 ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
          msg.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' :
          'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
        }`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {/* Empty State */}
      {suggestions.length === 0 && !loading && (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-80" />
          <h3 className="text-sm font-semibold text-slate-200">No Pending Suggestions</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            All candidate identity linkages have been resolved or auto-merged by the continuous intelligence pipeline.
          </p>
        </div>
      )}

      {/* Suggestions List */}
      <div className="space-y-4">
        {suggestions.map((s) => {
          const confPct = Math.round((s.confidence || 0) * 100);
          const bd = s.similarity_breakdown || {};
          const isHigh = confPct >= 80;

          return (
            <div
              key={s.suggestion_id}
              className="bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 rounded-xl p-5 transition"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
                {/* Persona Comparison */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg">
                    <User className="w-4 h-4 text-cyan-400" />
                    <span className="font-mono text-sm font-semibold text-cyan-200">{s.source_username}</span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />

                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg">
                    <User className="w-4 h-4 text-purple-400" />
                    <span className="font-mono text-sm font-semibold text-purple-200">{s.target_username}</span>
                  </div>
                </div>

                {/* Confidence Badge */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-medium">{s.decision_label || (isHigh ? 'Likely' : 'Possible')} Match</div>
                    <div className={`text-lg font-bold font-mono ${isHigh ? 'text-amber-400' : 'text-cyan-400'}`}>
                      {confPct}% Confidence
                    </div>
                  </div>
                  <div className={`w-3 h-10 rounded-full ${isHigh ? 'bg-amber-500' : 'bg-cyan-500'}`} />
                </div>
              </div>

              {/* 5-Stage Similarity Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-4">
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/60">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Stage 2: Username</span>
                  <span className="text-sm font-mono font-bold text-slate-200">
                    {Math.round((bd.username_similarity || bd.alias_similarity || 0) * 100)}%
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/60">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Stage 3: Behaviour</span>
                  <span className="text-sm font-mono font-bold text-slate-200">
                    {Math.round((bd.behavior_similarity || bd.behavioral_similarity || 0) * 100)}%
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/60">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Stage 4: Stylometry</span>
                  <span className="text-sm font-mono font-bold text-slate-200">
                    {Math.round((bd.stylometry_similarity || bd.stylometric_similarity || 0) * 100)}%
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/60">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Stage 4: Embeddings</span>
                  <span className="text-sm font-mono font-bold text-slate-200">
                    {Math.round((bd.embedding_similarity || 0) * 100)}%
                  </span>
                </div>
              </div>

              {/* Review notes input & Action buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <input
                  type="text"
                  placeholder="Optional analyst adjudication rationale or case notes..."
                  value={reviewNotes[s.suggestion_id] || ''}
                  onChange={(e) => setReviewNotes({ ...reviewNotes, [s.suggestion_id]: e.target.value })}
                  className="w-full sm:flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleReject(s.suggestion_id)}
                    disabled={processingId === s.suggestion_id}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>

                  <button
                    onClick={() => handleApprove(s.suggestion_id)}
                    disabled={processingId === s.suggestion_id}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-200 bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-950/40 transition"
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
