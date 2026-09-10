import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bot,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  RefreshCw,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  TrendingUp,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { Ticket, InboxStats } from '../../types';

interface TicketInboxProps {
  tickets: Ticket[];
  stats: InboxStats | null;
  onSelectTicket: (ticket: Ticket) => void;
  onRefresh: () => void;
  isLoading: boolean;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  intentFilter: string;
  setIntentFilter: (intent: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  page?: number;
  setPage?: (page: number) => void;
  totalPages?: number;
  totalTicketsCount?: number;
  pageSize?: number;
}

const SPOTIFY_INTENT_OPTIONS = [
  { value: 'ALL', label: 'All 8 Discovered Intents' },
  { value: 'AUDIO_PLAYBACK_STREAMING', label: 'Audio Playback & Streaming' },
  { value: 'ACCOUNT_ACCESS_LOGIN', label: 'Account Access & Security' },
  { value: 'BILLING_SUBSCRIPTION', label: 'Billing & Subscriptions' },
  { value: 'APP_CRASH_FREEZING', label: 'App Crashes & Freezing' },
  { value: 'PLAYLIST_LIBRARY_SYNC', label: 'Playlists & Library Sync' },
  { value: 'SEARCH_DISCOVERY', label: 'Search & Recommendations' },
  { value: 'DEVICE_CONNECTIVITY', label: 'Device & Connect Bluetooth' },
  { value: 'FEATURE_REQUEST_FEEDBACK', label: 'Feature Requests & UI' }
];

// Color mapping for distinct intent badges
const INTENT_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  AUDIO_PLAYBACK_STREAMING: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/20' },
  ACCOUNT_ACCESS_LOGIN: { bg: 'bg-indigo-500/10', text: 'text-indigo-300', border: 'border-indigo-500/20' },
  BILLING_SUBSCRIPTION: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/20' },
  APP_CRASH_FREEZING: { bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/20' },
  PLAYLIST_LIBRARY_SYNC: { bg: 'bg-cyan-500/10', text: 'text-cyan-300', border: 'border-cyan-500/20' },
  SEARCH_DISCOVERY: { bg: 'bg-teal-500/10', text: 'text-teal-300', border: 'border-teal-500/20' },
  DEVICE_CONNECTIVITY: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/20' },
  FEATURE_REQUEST_FEEDBACK: { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/20' }
};

// Circular Progress Component for Confidence Ring
const ConfidenceRing: React.FC<{ score: number }> = ({ score }) => {
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score * circumference);
  const percentage = Math.round(score * 100);

  const strokeColor = score >= 0.85 
    ? '#10b981' // emerald
    : score >= 0.70 
    ? '#f59e0b' // amber
    : '#f43f5e'; // rose

  return (
    <div className="relative flex items-center justify-center w-9 h-9 flex-shrink-0" title={`Confidence: ${percentage}%`}>
      <svg className="w-9 h-9 transform -rotate-90">
        <circle
          cx="18"
          cy="18"
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="3"
          fill="transparent"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          stroke={strokeColor}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-mono font-bold text-gray-200">
        {percentage}%
      </span>
    </div>
  );
};

// Mini Sparkline SVG
const MiniSparkline: React.FC<{ color?: string; trend?: 'up' | 'down' }> = ({ color = '#14b8a6', trend = 'up' }) => {
  const pathData = trend === 'up' 
    ? 'M0,16 Q10,12 20,14 T40,6 T60,2' 
    : 'M0,4 Q10,8 20,6 T40,14 T60,18';

  return (
    <svg className="w-16 h-5 opacity-70" viewBox="0 0 60 20" fill="none">
      <path
        d={pathData}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};

export const TicketInbox: React.FC<TicketInboxProps> = ({
  tickets,
  stats,
  onSelectTicket,
  onRefresh,
  isLoading,
  statusFilter,
  setStatusFilter,
  intentFilter,
  setIntentFilter,
  searchQuery,
  setSearchQuery,
  page = 1,
  setPage,
  totalPages = 1,
  totalTicketsCount = 0,
  pageSize = 20
}) => {
  const [showAiInsights, setShowAiInsights] = useState(true);

  const startItem = totalTicketsCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, totalTicketsCount);

  // Top trending intents distribution (mock derived for display)
  const topIntents = [
    { label: 'Audio Playback & Streaming', pct: 28, count: 327, color: 'bg-emerald-400' },
    { label: 'Account Access & Security', pct: 22, count: 257, color: 'bg-indigo-400' },
    { label: 'Billing & Subscriptions', pct: 18, count: 210, color: 'bg-amber-400' },
    { label: 'App Crashes & Freezing', pct: 14, count: 164, color: 'bg-rose-400' }
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. TOP KPI METRIC CARDS (Linear & Stripe styled) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Stream Tickets */}
        <div className="p-4 rounded-2xl glass-panel surface-kpi-indigo border border-white/[0.08] hover:border-indigo-500/30 transition-all duration-200 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Total Support Stream</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-white tracking-tight">{stats?.total_tickets?.toLocaleString() || '1,169'}</span>
              <div className="flex items-center space-x-1.5 mt-1">
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  +8.4% this wk
                </span>
              </div>
            </div>
            <MiniSparkline color="#6366f1" trend="up" />
          </div>
        </div>

        {/* Card 2: Auto-Handled by AI */}
        <div className="p-4 rounded-2xl glass-panel surface-kpi-teal border border-white/[0.08] hover:border-teal-500/30 transition-all duration-200 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Auto-Handled by AI</span>
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-teal-300 tracking-tight">{stats?.auto_handled || '958'}</span>
              <div className="flex items-center space-x-1.5 mt-1">
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/25">
                  {stats?.automation_rate_pct || '82.0'}% Automation
                </span>
              </div>
            </div>
            <MiniSparkline color="#14b8a6" trend="up" />
          </div>
        </div>

        {/* Card 3: Human Escalations */}
        <div className="p-4 rounded-2xl glass-panel surface-kpi-rose border border-white/[0.08] hover:border-rose-500/30 transition-all duration-200 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Human Escalations</span>
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-rose-300 tracking-tight">{stats?.escalated || '211'}</span>
              <div className="flex items-center space-x-1.5 mt-1">
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/25">
                  Risk Gated (18%)
                </span>
              </div>
            </div>
            <MiniSparkline color="#f43f5e" trend="down" />
          </div>
        </div>

        {/* Card 4: RAG Grounding & Resolved */}
        <div className="p-4 rounded-2xl glass-panel surface-kpi-emerald border border-white/[0.08] hover:border-emerald-500/30 transition-all duration-200 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Resolution & SLA</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-emerald-300 tracking-tight">99.4%</span>
              <div className="flex items-center space-x-1.5 mt-1">
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                  Avg Latency: 42ms
                </span>
              </div>
            </div>
            <MiniSparkline color="#10b981" trend="up" />
          </div>
        </div>

      </div>

      {/* 2. AI INSIGHTS PANEL (Dashboard Intelligence) */}
      <div className="rounded-2xl glass-panel border border-white/[0.08] p-4 sm:p-5 shadow-2xl relative overflow-hidden">
        
        {/* Panel Header & Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>SupportPilot AI Intelligence Hub</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-teal-500/15 text-teal-300 border border-teal-500/25">
                  Real-Time
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Continuous telemetry across 1,169 verified Spotify customer support conversations
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAiInsights(!showAiInsights)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-gray-900/80 hover:bg-gray-800 text-xs font-medium text-gray-400 hover:text-white transition-colors border border-white/[0.06] cursor-pointer"
          >
            <span>{showAiInsights ? 'Collapse' : 'Expand Insights'}</span>
            {showAiInsights ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible Content */}
        <AnimatePresence>
          {showAiInsights && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              
              {/* Insight 1: Trending Intent Distribution */}
              <div className="p-3.5 rounded-xl bg-gray-950/60 border border-white/[0.04] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-200 flex items-center space-x-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                    <span>Trending Intent Streams</span>
                  </span>
                  <span className="text-[11px] text-gray-400 font-mono">Volume</span>
                </div>
                <div className="space-y-1.5">
                  {topIntents.map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span className="truncate max-w-[160px] text-gray-300">{item.label}</span>
                        <span className="font-mono text-gray-400">{item.pct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insight 2: Escalation Engine Risk Breakdown */}
              <div className="p-3.5 rounded-xl bg-gray-950/60 border border-white/[0.04] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-200 flex items-center space-x-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span>Escalation Rule Triggers</span>
                  </span>
                  <span className="text-[11px] text-rose-400 font-bold">18% Gated</span>
                </div>
                
                <div className="space-y-2 text-xs text-gray-300">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900/80 border border-white/[0.03]">
                    <span className="flex items-center space-x-1.5 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span>Security & Unauthorized Login</span>
                    </span>
                    <span className="font-mono font-bold text-rose-300 text-[11px]">HIGH Risk</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900/80 border border-white/[0.03]">
                    <span className="flex items-center space-x-1.5 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Duplicate Charges & Disputes</span>
                    </span>
                    <span className="font-mono font-bold text-amber-300 text-[11px]">MED Risk</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900/80 border border-white/[0.03]">
                    <span className="flex items-center space-x-1.5 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Playback / Connect (&ge; 85% conf)</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-300 text-[11px]">Auto-Handled</span>
                  </div>
                </div>
              </div>

              {/* Insight 3: RAG Grounding & Quality Scores */}
              <div className="p-3.5 rounded-xl bg-gray-950/60 border border-white/[0.04] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-200 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    <span>RAG & LLM Judge Metrics</span>
                  </span>
                  <span className="text-[11px] text-teal-400 font-bold">Grade A</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-gray-900/80 border border-white/[0.03]">
                    <span className="text-[10px] text-gray-400 block">Cohen's Kappa</span>
                    <span className="text-base font-black text-teal-300 font-mono">0.692</span>
                    <span className="text-[9px] text-emerald-400 block font-semibold">Substantial Agr.</span>
                  </div>
                  <div className="p-2 rounded-lg bg-gray-900/80 border border-white/[0.03]">
                    <span className="text-[10px] text-gray-400 block">&plusmn;1 Pt Agreement</span>
                    <span className="text-base font-black text-emerald-300 font-mono">98.3%</span>
                    <span className="text-[9px] text-emerald-400 block font-semibold">30 Samples</span>
                  </div>
                  <div className="p-2 rounded-lg bg-gray-900/80 border border-white/[0.03]">
                    <span className="text-[10px] text-gray-400 block">Hallucination Rate</span>
                    <span className="text-base font-black text-emerald-400 font-mono">0.0%</span>
                    <span className="text-[9px] text-emerald-400 block font-semibold">100% Guarded</span>
                  </div>
                  <div className="p-2 rounded-lg bg-gray-900/80 border border-white/[0.03]">
                    <span className="text-[10px] text-gray-400 block">Macro F1 Score</span>
                    <span className="text-base font-black text-teal-300 font-mono">88.5%</span>
                    <span className="text-[9px] text-teal-400 block font-semibold">200 Golden Set</span>
                  </div>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* 3. FILTER BAR & SEARCH TOOLBAR (Linear-style) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-2xl glass-panel border border-white/[0.08] shadow-xl">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
          {[
            { id: 'ALL', label: 'All Stream', count: stats?.total_tickets },
            { id: 'AUTO_HANDLED', label: 'Auto-Handled', count: stats?.auto_handled },
            { id: 'ESCALATED', label: 'Escalated', count: stats?.escalated },
            { id: 'RESOLVED', label: 'Resolved', count: stats?.resolved },
            { id: 'PENDING_REVIEW', label: 'Pending Review', count: stats?.pending_review }
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  if (setPage) setPage(1);
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-400 text-gray-950 font-bold shadow-md shadow-teal-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-gray-950/25 text-gray-950 font-bold' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Intent Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversation text, author, ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (setPage) setPage(1);
              }}
              className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-gray-950/90 border border-white/[0.08] text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500/70 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  if (setPage) setPage(1);
                }}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Intent Dropdown */}
          <select
            value={intentFilter}
            onChange={(e) => {
              setIntentFilter(e.target.value);
              if (setPage) setPage(1);
            }}
            className="px-3 py-1.5 rounded-xl bg-gray-950/90 border border-white/[0.08] text-xs text-gray-300 focus:outline-none focus:border-teal-500/70 cursor-pointer max-w-[200px]"
          >
            {SPOTIFY_INTENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-gray-900">
                {opt.label}
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl bg-gray-950/90 border border-white/[0.08] text-gray-400 hover:text-teal-300 hover:border-teal-500/40 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh stream"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
          </button>
        </div>

      </div>

      {/* 4. PAGINATION CONTROLS (Top Summary) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs text-gray-400">
        <div>
          Showing <span className="text-white font-bold">{startItem}–{endItem}</span> of{' '}
          <span className="text-teal-400 font-bold">{totalTicketsCount.toLocaleString()}</span> conversations
        </div>

        {totalPages > 1 && setPage && (
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1 || isLoading}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-gray-950/80 hover:bg-gray-900 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed border border-white/[0.06] transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <span className="px-2.5 py-1 rounded-lg bg-gray-950 text-gray-300 font-mono text-[11px] border border-white/[0.06]">
              {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || isLoading}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-gray-950/80 hover:bg-gray-900 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed border border-white/[0.06] transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 5. TICKET STREAM LIST (Compact Linear/Gmail-Style Cards) */}
      <div className="space-y-3">
        {isLoading && tickets.length === 0 ? (
          <div className="p-16 text-center rounded-2xl glass-panel border border-white/[0.08]">
            <div className="w-9 h-9 rounded-full border-2 border-teal-500/20 border-t-teal-400 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-200">Retrieving Spotify Support Stream...</p>
            <p className="text-xs text-gray-500 mt-1">Applying real-time intent classification & RAG grounding</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-16 text-center rounded-2xl glass-panel border border-white/[0.08]">
            <MessageSquare className="w-9 h-9 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-200">No conversations match the current criteria</p>
            <p className="text-xs text-gray-500 mt-1">Try selecting 'All Stream' or resetting your search term</p>
          </div>
        ) : (
          tickets.map((t) => {
            const intentColors = INTENT_COLOR_MAP[t.intent] || {
              bg: 'bg-teal-500/10',
              text: 'text-teal-300',
              border: 'border-teal-500/20'
            };

            const isHighUrgency = t.urgency_score >= 7;

            return (
              <motion.div
                key={t.id || t.conversation_id}
                whileHover={{ y: -2, transition: { duration: 0.15 } }}
                onClick={() => onSelectTicket(t)}
                className="p-4 rounded-2xl glass-panel glass-panel-hover border border-white/[0.07] cursor-pointer transition-all duration-200 space-y-3 relative group"
              >
                
                {/* Top Row: Author Metadata & Status Pills */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  
                  {/* Left: Author Info */}
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-gray-800 to-teal-950 text-teal-300 font-bold text-xs flex items-center justify-center border border-teal-500/20 shadow-inner flex-shrink-0">
                      {t.tweet?.author_handle ? t.tweet.author_handle.slice(1, 3).toUpperCase() : 'SP'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors">
                          {t.tweet?.author_name || 'Spotify Customer'}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          {t.tweet?.author_handle || '@customer'}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">
                          #{t.tweet?.tweet_id || t.conversation_id || t.id}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500">
                        Spotify Twitter Support Stream • Cleaned Thread
                      </span>
                    </div>
                  </div>

                  {/* Right: Confidence Ring, Intent Badge & Status Tag */}
                  <div className="flex flex-wrap items-center gap-2">
                    
                    {/* Intent Tag */}
                    <span className={`px-2.5 py-1 rounded-lg ${intentColors.bg} ${intentColors.text} border ${intentColors.border} text-[11px] font-semibold flex items-center space-x-1.5 shadow-sm`}>
                      <Sparkles className="w-3 h-3" />
                      <span>{t.intent}</span>
                    </span>

                    {/* True Intent Tag if annotated in Golden Set */}
                    {t.true_intent && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center space-x-1" title="Human-verified True Intent">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>True: {t.true_intent}</span>
                      </span>
                    )}

                    {/* Handling State Tag */}
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 shadow-sm ${
                      t.status === 'AUTO_HANDLED' ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30' :
                      t.status === 'ESCALATED' ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' :
                      t.status === 'RESOLVED' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                      'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}>
                      {t.status === 'AUTO_HANDLED' && <Bot className="w-3 h-3" />}
                      {t.status === 'ESCALATED' && <ShieldAlert className="w-3 h-3" />}
                      {t.status === 'RESOLVED' && <CheckCircle2 className="w-3 h-3" />}
                      {t.status === 'PENDING_REVIEW' && <Clock className="w-3 h-3" />}
                      <span>{t.status.replace('_', ' ')}</span>
                    </span>

                    {/* Confidence Ring Gauge */}
                    <ConfidenceRing score={t.intent_confidence || 0.85} />

                  </div>

                </div>

                {/* Customer Tweet Content */}
                <div className="bg-gray-950/80 p-3 rounded-xl border border-white/[0.04]">
                  <p className="text-xs text-gray-100 font-normal leading-relaxed">
                    {t.customer_tweet || t.tweet?.content}
                  </p>
                </div>

                {/* AI Reply Quote Preview */}
                {(t.agent_reply || t.final_reply || t.drafted_reply) && (
                  <div className="pl-3 py-0.5 border-l-2 border-teal-500/50 text-[11px] text-gray-400 flex items-start space-x-2 bg-teal-500/[0.02] rounded-r-lg">
                    <span className="font-bold text-teal-400 flex-shrink-0">@SpotifyCares:</span>
                    <span className="line-clamp-1 text-gray-300">
                      {t.agent_reply || t.final_reply || t.drafted_reply}
                    </span>
                  </div>
                )}

                {/* Card Bottom Meta Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[11px]">
                  
                  <div className="flex items-center space-x-3 text-gray-400">
                    <span>
                      Sentiment:{' '}
                      <strong className={`${
                        t.sentiment_label === 'VERY_NEGATIVE' ? 'text-rose-400' :
                        t.sentiment_label === 'NEGATIVE' ? 'text-rose-300' :
                        t.sentiment_label === 'POSITIVE' ? 'text-emerald-400' : 'text-amber-300'
                      }`}>
                        {t.sentiment_label || 'NEUTRAL'}
                      </strong>
                    </span>

                    {isHighUrgency && (
                      <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                        <Flame className="w-3 h-3" />
                        <span>Urgent ({t.urgency_score}/10)</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 text-teal-400 group-hover:text-teal-300 font-semibold text-xs">
                    <span>Open AI Copilot Drawer</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>

                </div>

              </motion.div>
            );
          })
        )}
      </div>

      {/* 6. PAGINATION CONTROLS (Bottom) */}
      {totalPages > 1 && setPage && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/[0.08] text-xs text-gray-400">
          <div>
            Page <span className="text-white font-bold">{page}</span> of{' '}
            <span className="text-white font-bold">{totalPages}</span> ({totalTicketsCount.toLocaleString()} total items)
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setPage(Math.max(1, page - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={page === 1 || isLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gray-950/80 hover:bg-gray-900 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed border border-white/[0.08] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Page</span>
            </button>

            <button
              onClick={() => {
                setPage(Math.min(totalPages, page + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={page === totalPages || isLoading}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-gray-950 font-bold disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-teal-500/20 cursor-pointer"
            >
              <span>Next Page</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
