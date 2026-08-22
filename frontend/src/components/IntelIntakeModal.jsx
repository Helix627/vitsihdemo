import React, { useState } from 'react';
import { UploadCloud, PlusCircle, CheckCircle, AlertTriangle, ShieldCheck, Database, FileText, Send, Sparkles } from 'lucide-react';

export default function IntelIntakeModal({ isOpen, onClose, onSubmitSuccess }) {
  const [mode, setMode] = useState('single'); // 'single' | 'bulk'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Single form fields
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    bitcoin: '',
    monero: '',
    pgp: '',
    telegram: '',
    discord: '',
    forum_handle: '',
    description: '',
    source_dataset: 'Analyst Dossier #101',
    analyst_name: 'Lead_Investigator',
  });

  // Bulk JSON string
  const [bulkJson, setBulkJson] = useState('');

  if (!isOpen) return null;

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/v1/analyst/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setResult(data);
      if (onSubmitSuccess) onSubmitSuccess(data);
    } catch (err) {
      setResult({ error: 'Network error submitting intelligence dossier' });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      let parsed;
      try {
        parsed = JSON.parse(bulkJson);
      } catch (pErr) {
        setResult({ error: 'Invalid JSON format. Please provide a valid JSON array of records.' });
        setLoading(false);
        return;
      }

      const records = Array.isArray(parsed) ? parsed : (parsed.records || [parsed]);
      const res = await fetch('/api/v1/datasets/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_name: 'Bulk Analyst Import',
          analyst_name: 'Lead_Investigator',
          records,
        }),
      });
      const data = await res.json();
      setResult(data);
      if (onSubmitSuccess) onSubmitSuccess(data);
    } catch (err) {
      setResult({ error: 'Network error during bulk dataset import' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-slate-100 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Continuous Intelligence Intake
              </h2>
              <p className="text-xs text-slate-400">
                Feed new intelligence to automatically enrich the permanent knowledge graph.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800 mb-6">
          <button
            onClick={() => { setMode('single'); setResult(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
              mode === 'single' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Single Threat Actor Dossier
          </button>
          <button
            onClick={() => { setMode('bulk'); setResult(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
              mode === 'bulk' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Bulk Dataset Ingestion (JSON)
          </button>
        </div>

        {/* Mode 1: Single Dossier Form */}
        {mode === 'single' && (
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">Target Handle / Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. darkman145"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="trader@protonmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">Bitcoin Wallet</label>
                <input
                  type="text"
                  placeholder="1ABC... or bc1q..."
                  value={formData.bitcoin}
                  onChange={(e) => setFormData({ ...formData, bitcoin: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">Monero (XMR) Wallet</label>
                <input
                  type="text"
                  placeholder="4... or 8..."
                  value={formData.monero}
                  onChange={(e) => setFormData({ ...formData, monero: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">Telegram Handle</label>
                <input
                  type="text"
                  placeholder="@darkops_vendor"
                  value={formData.telegram}
                  onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">Discord Tag</label>
                <input
                  type="text"
                  placeholder="operator#1337"
                  value={formData.discord}
                  onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">PGP Fingerprint (40-hex)</label>
              <input
                type="text"
                placeholder="483F3631151FBA4895F9FF8404B63E9BA4772C78"
                value={formData.pgp}
                onChange={(e) => setFormData({ ...formData, pgp: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">Profile / Listing Text / Writing Sample (For Stylometry)</label>
              <textarea
                rows={3}
                placeholder="Paste vendor profile bio, terms of service, or item descriptions for 11-dimension stylometric analysis..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">Source: {formData.source_dataset}</span>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white rounded-xl shadow-lg shadow-emerald-950/50 transition"
              >
                {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Execute Pipeline & Evolve Graph
              </button>
            </div>
          </form>
        )}

        {/* Mode 2: Bulk JSON Ingestion */}
        {mode === 'bulk' && (
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">JSON Records Array</label>
              <textarea
                rows={8}
                required
                placeholder={`[\n  {\n    "username": "shadow_courier",\n    "email": "courier@tutanota.com",\n    "bitcoin": "1LPiyimWVLtWHJkvgGcvY8mKjZwpVgyaz",\n    "telegram": "@shadow_courier"\n  }\n]`}
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 placeholder-slate-700 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white rounded-xl shadow-lg shadow-emerald-950/50 transition"
              >
                {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                Import Dataset & Expand Graph
              </button>
            </div>
          </form>
        )}

        {/* Evolution Result Card */}
        {result && (
          <div className="mt-6 p-4 rounded-xl border border-slate-800 bg-slate-950/80 text-xs">
            <div className="flex items-center gap-2 font-bold mb-2">
              {result.error ? (
                <span className="text-rose-400 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {result.error}</span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> {result.message || 'Dataset Ingested Successfully!'}</span>
              )}
            </div>

            {result.evolution_report && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800">
                <div className="bg-slate-900 p-2 rounded">
                  <span className="text-[10px] text-slate-400 block">New Nodes</span>
                  <span className="text-sm font-bold text-emerald-400">+{result.evolution_report.new_nodes_created}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded">
                  <span className="text-[10px] text-slate-400 block">Nodes Updated</span>
                  <span className="text-sm font-bold text-cyan-400">{result.evolution_report.existing_nodes_updated}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded">
                  <span className="text-[10px] text-slate-400 block">Strengthened</span>
                  <span className="text-sm font-bold text-purple-400">+{result.evolution_report.relationships_strengthened}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded">
                  <span className="text-[10px] text-slate-400 block">Suggestions</span>
                  <span className="text-sm font-bold text-amber-400">{result.evolution_report.suggestions_generated}</span>
                </div>
              </div>
            )}

            {result.records_processed && (
              <div className="mt-2 text-slate-400">
                Processed <strong className="text-white">{result.records_processed}</strong> records. Graph expanded to <strong className="text-emerald-400">{result.graph_statistics.total_nodes} nodes</strong> and <strong className="text-cyan-400">{result.graph_statistics.total_edges} edges</strong>.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
