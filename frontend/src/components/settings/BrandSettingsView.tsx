import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  Save,
  Check,
  X,
  Sliders,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import type { BrandSettings } from '../../types';
import { fetchBrandSettings, updateBrandSettings } from '../../lib/api';

export const BrandSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<BrandSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // New tag inputs
  const [newVip, setNewVip] = useState('');
  const [newBanned, setNewBanned] = useState('');

  const loadSettings = async () => {
    try {
      const data = await fetchBrandSettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    try {
      const updated = await updateBrandSettings(settings);
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const addVipHandle = () => {
    if (!newVip.trim() || !settings) return;
    const formatted = newVip.startsWith('@') ? newVip.trim() : `@${newVip.trim()}`;
    if (!settings.vip_handles.includes(formatted)) {
      setSettings({
        ...settings,
        vip_handles: [...settings.vip_handles, formatted]
      });
    }
    setNewVip('');
  };

  const removeVipHandle = (tag: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      vip_handles: settings.vip_handles.filter((h) => h !== tag)
    });
  };

  const addBannedKeyword = () => {
    if (!newBanned.trim() || !settings) return;
    const formatted = newBanned.trim().toLowerCase();
    if (!settings.banned_keywords.includes(formatted)) {
      setSettings({
        ...settings,
        banned_keywords: [...settings.banned_keywords, formatted]
      });
    }
    setNewBanned('');
  };

  const removeBannedKeyword = (tag: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      banned_keywords: settings.banned_keywords.filter((k) => k !== tag)
    });
  };

  if (!settings) {
    return (
      <div className="p-12 text-center rounded-2xl glass-panel border border-gray-800 space-y-3">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 rounded-2xl glass-panel border border-gray-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Brand Voice & Escalation Rule Engine</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Tune confidence thresholds, sentiment tripwires, risk rules, and banned legal keywords.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold animate-fade-in">
            <Check className="w-4 h-4" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Brand Profile & Tone */}
        <div className="p-6 rounded-2xl glass-panel border border-gray-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>Brand Persona & Default Voice</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1">Brand Name</label>
              <input
                type="text"
                value={settings.brand_name}
                onChange={(e) => setSettings({ ...settings, brand_name: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1">Twitter / X Handle</label>
              <input
                type="text"
                value={settings.brand_handle}
                onChange={(e) => setSettings({ ...settings, brand_handle: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1">Default Response Tone</label>
              <select
                value={settings.default_tone}
                onChange={(e) => setSettings({ ...settings, default_tone: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200 focus:outline-none focus:border-teal-500"
              >
                <option value="Empathetic & Solution-Oriented">Empathetic & Solution-Oriented</option>
                <option value="Professional & Concise">Professional & Concise</option>
                <option value="Casual & Friendly">Casual & Friendly</option>
                <option value="Urgent & Apologetic">Urgent & Apologetic</option>
              </select>
            </div>
          </div>
        </div>

        {/* Triage & Decision Thresholds */}
        <div className="p-6 rounded-2xl glass-panel border border-gray-800 space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-teal-400" />
            <span>Automated Decision Thresholds & Safety Limits</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            {/* Auto-Handle Confidence Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-semibold">Min Auto-Handle Confidence</span>
                <span className="font-mono text-teal-400 font-bold">
                  {(settings.auto_handle_threshold * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.05"
                value={settings.auto_handle_threshold}
                onChange={(e) => setSettings({ ...settings, auto_handle_threshold: Number(e.target.value) })}
                className="w-full accent-teal-500 cursor-pointer"
              />
              <p className="text-[10px] text-gray-500">
                Tickets classified below this confidence will be escalated to human agents for review.
              </p>
            </div>

            {/* Negative Sentiment Escalation Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-semibold">Sentiment Escalation Tripwire</span>
                <span className="font-mono text-rose-400 font-bold">
                  {settings.escalation_sentiment_threshold}
                </span>
              </div>
              <input
                type="range"
                min="-0.80"
                max="-0.10"
                step="0.05"
                value={settings.escalation_sentiment_threshold}
                onChange={(e) => setSettings({ ...settings, escalation_sentiment_threshold: Number(e.target.value) })}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <p className="text-[10px] text-gray-500">
                Customer tweets with sentiment lower than this score trigger immediate supervisor routing.
              </p>
            </div>

            {/* Refund Amount Limit */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-semibold">Max Auto-Refund Limit</span>
                <span className="font-mono text-emerald-400 font-bold">
                  ${settings.refund_amount_limit.toFixed(2)}
                </span>
              </div>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  value={settings.refund_amount_limit}
                  onChange={(e) => setSettings({ ...settings, refund_amount_limit: Number(e.target.value) })}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200 focus:outline-none focus:border-teal-500"
                />
              </div>
              <p className="text-[10px] text-gray-500">
                Financial claims exceeding this value require mandatory manual approval.
              </p>
            </div>

          </div>
        </div>

        {/* VIP Customer Handles */}
        <div className="p-6 rounded-2xl glass-panel border border-gray-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>VIP Customer & High-Influence Handles</span>
          </h3>

          <div className="flex flex-wrap gap-2">
            {settings.vip_handles.map((handle) => (
              <span
                key={handle}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold"
              >
                <span>{handle}</span>
                <button
                  type="button"
                  onClick={() => removeVipHandle(handle)}
                  className="hover:text-rose-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center space-x-2 max-w-sm">
            <input
              type="text"
              placeholder="@handle"
              value={newVip}
              onChange={(e) => setNewVip(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVipHandle(); } }}
              className="flex-1 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={addVipHandle}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
            >
              Add VIP
            </button>
          </div>
        </div>

        {/* Legal & Compliance Banned Keywords */}
        <div className="p-6 rounded-2xl glass-panel border border-gray-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Legal, Regulatory & Risk Trigger Keywords</span>
          </h3>

          <div className="flex flex-wrap gap-2">
            {settings.banned_keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-semibold"
              >
                <span>{kw}</span>
                <button
                  type="button"
                  onClick={() => removeBannedKeyword(kw)}
                  className="hover:text-rose-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center space-x-2 max-w-sm">
            <input
              type="text"
              placeholder="e.g. lawsuit, scam, lawyer..."
              value={newBanned}
              onChange={(e) => setNewBanned(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBannedKeyword(); } }}
              className="flex-1 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200 focus:outline-none focus:border-rose-500"
            />
            <button
              type="button"
              onClick={addBannedKeyword}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
            >
              Add Keyword
            </button>
          </div>
        </div>

        {/* Submit Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-gray-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-gray-950" />
            <span>{isSaving ? 'Saving Configurations...' : 'Save All Settings'}</span>
          </button>
        </div>

      </form>

    </div>
  );
};
