import React from 'react';
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
  Check
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
  { value: 'ALL', label: 'All 8 Intents' },
  { value: 'FAMILY_STUDENT_PLAN_ELIGIBILITY', label: 'Family & Student Plan Eligibility' },
  { value: 'DEVICE_SMART_SPEAKER_CONNECT', label: 'Smart Speaker & Device Connectivity' },
  { value: 'APP_PERFORMANCE_STABILITY', label: 'App Stability & Crash Reports' },
  { value: 'AUDIO_PLAYBACK_STREAMING', label: 'Audio Streaming & Playback' },
  { value: 'FEATURE_REQUESTS_UI', label: 'Feature Requests & UI Enhancements' },
  { value: 'ACCOUNT_LOGIN_SECURITY', label: 'Account Login & Security Access' },
  { value: 'BILLING_SUBSCRIPTION_CHARGES', label: 'Billing & Subscription Inquiries' },
  { value: 'OFFLINE_PLAYLISTS_DOWNLOAD', label: 'Offline Playlists & Storage' }
];

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
  const startItem = totalTicketsCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, totalTicketsCount);

  return (
    <div className="space-y-6">
      
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-2xl glass-panel border border-gray-800 transition-all hover:border-gray-700 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Total Stream Tickets</span>
            <MessageSquare className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">{stats?.total_tickets || 0}</span>
            <span className="text-xs text-teal-400 font-medium">Cleaned Spotify</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-gray-800 transition-all hover:border-gray-700 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Auto-Handled by AI</span>
            <Bot className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-teal-300">{stats?.auto_handled || 0}</span>
            <span className="text-xs text-teal-500 font-medium">{stats?.automation_rate_pct}% Rate</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-gray-800 transition-all hover:border-gray-700 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Human Escalations</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-rose-400">{stats?.escalated || 0}</span>
            <span className="text-xs text-rose-500 font-medium">Flagged Risks</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-gray-800 transition-all hover:border-gray-700 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Resolved & Replied</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-emerald-400">{stats?.resolved || 0}</span>
            <span className="text-xs text-emerald-500 font-medium">Complete</span>
          </div>
        </div>

      </div>

      {/* Filter Bar & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-gray-800 shadow-lg">
        
        {/* Status Filter Buttons */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
          {[
            { id: 'ALL', label: 'All Tickets' },
            { id: 'AUTO_HANDLED', label: 'Auto-Handled' },
            { id: 'ESCALATED', label: 'Escalated' },
            { id: 'RESOLVED', label: 'Resolved' },
            { id: 'PENDING_REVIEW', label: 'Pending' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                if (setPage) setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-400 text-gray-950 font-bold shadow-md shadow-teal-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Intent Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tweet, replies, IDs..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (setPage) setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <select
            value={intentFilter}
            onChange={(e) => {
              setIntentFilter(e.target.value);
              if (setPage) setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-300 focus:outline-none focus:border-teal-500 cursor-pointer max-w-[200px]"
          >
            {SPOTIFY_INTENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-gray-900">
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-gray-900 border border-gray-700 text-gray-400 hover:text-teal-400 hover:border-teal-500/50 transition-colors"
            title="Refresh feed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
          </button>
        </div>

      </div>

      {/* Pagination Status & Controls (Top) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 text-xs text-gray-400">
        <div>
          Showing <span className="text-white font-bold">{startItem}–{endItem}</span> of{' '}
          <span className="text-white font-bold">{totalTicketsCount.toLocaleString()}</span> Spotify conversations
        </div>

        {totalPages > 1 && setPage && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1 || isLoading}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-800"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <span className="px-2 py-0.5 rounded bg-gray-950 text-gray-300 font-mono text-[11px] border border-gray-800">
              Page {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || isLoading}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-800"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Ticket Stream List */}
      <div className="space-y-3">
        {isLoading && tickets.length === 0 ? (
          <div className="p-12 text-center rounded-2xl glass-panel border border-gray-800">
            <div className="w-8 h-8 rounded-full border-2 border-teal-500/20 border-t-teal-400 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-300">Loading Spotify Customer Support Conversations...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center rounded-2xl glass-panel border border-gray-800">
            <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-300">No support tickets found matching filters</p>
            <p className="text-xs text-gray-500 mt-1">Try resetting search filters or changing intent criteria</p>
          </div>
        ) : (
          tickets.map((t) => (
            <div
              key={t.id || t.conversation_id}
              onClick={() => onSelectTicket(t)}
              className="p-4 rounded-2xl glass-panel glass-panel-hover border border-gray-800 cursor-pointer transition-all space-y-3"
            >
              
              {/* Card Top Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                
                {/* Author Info */}
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-800 to-teal-950 text-teal-300 font-bold text-xs flex items-center justify-center border border-gray-700">
                    {t.tweet?.author_handle?.slice(1, 3).toUpperCase() || 'SP'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-white">{t.tweet?.author_name || 'Spotify Customer'}</span>
                      <span className="text-xs text-gray-400">{t.tweet?.author_handle}</span>
                      <span className="text-[10px] font-mono text-gray-500">
                        • ID: {t.tweet?.tweet_id || t.conversation_id || t.id}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500">
                      Cleaned 2-Way Thread • Spotify Support
                    </span>
                  </div>
                </div>

                {/* Status & Intent Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  
                  {/* Intent Tag */}
                  <span className="px-2.5 py-1 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[11px] font-semibold flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-teal-400" />
                    <span>{t.intent}</span>
                  </span>

                  {/* True Intent Tag if annotated */}
                  {t.true_intent && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center space-x-1" title="Human-verified True Intent">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>True: {t.true_intent}</span>
                    </span>
                  )}

                  {/* Handling State Tag */}
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center space-x-1 ${
                    t.status === 'AUTO_HANDLED' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :
                    t.status === 'ESCALATED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    t.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {t.status === 'AUTO_HANDLED' && <Bot className="w-3 h-3" />}
                    {t.status === 'ESCALATED' && <ShieldAlert className="w-3 h-3" />}
                    {t.status === 'RESOLVED' && <CheckCircle2 className="w-3 h-3" />}
                    {t.status === 'PENDING_REVIEW' && <Clock className="w-3 h-3" />}
                    <span>{t.status.replace('_', ' ')}</span>
                  </span>

                </div>

              </div>

              {/* Customer Tweet Content */}
              <div className="bg-gray-950/70 p-3 rounded-xl border border-gray-800/80">
                <p className="text-xs text-gray-100 font-normal leading-relaxed">
                  {t.customer_tweet || t.tweet?.content}
                </p>
              </div>

              {/* Agent Reply Preview (Thread context) */}
              {(t.agent_reply || t.final_reply) && (
                <div className="pl-3 border-l-2 border-teal-500/40 text-[11px] text-gray-400 flex items-start space-x-2">
                  <span className="font-bold text-teal-400 flex-shrink-0">@SpotifyCares:</span>
                  <span className="line-clamp-1 text-gray-300">{t.agent_reply || t.final_reply}</span>
                </div>
              )}

              {/* Card Bottom Meta */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-800/60 text-[11px]">
                
                <div className="flex items-center space-x-4 text-gray-400">
                  <span>Confidence: <strong className="text-emerald-400 font-mono">{(t.intent_confidence * 100).toFixed(0)}%</strong></span>
                  <span>Sentiment: <strong className={`${
                    t.sentiment_label === 'VERY_NEGATIVE' ? 'text-rose-400' :
                    t.sentiment_label === 'NEGATIVE' ? 'text-rose-300' :
                    t.sentiment_label === 'POSITIVE' ? 'text-emerald-400' : 'text-amber-300'
                  }`}>{t.sentiment_label}</strong></span>
                  
                  {t.urgency_score >= 7 && (
                    <span className="flex items-center space-x-0.5 text-rose-400 font-semibold">
                      <Flame className="w-3 h-3" />
                      <span>Urgent ({t.urgency_score}/10)</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1 text-teal-400 font-semibold text-xs">
                  <span>View Details & Thread</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>

              </div>

            </div>
          ))
        )}
      </div>

      {/* Pagination Controls (Bottom) */}
      {totalPages > 1 && setPage && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-800 text-xs text-gray-400">
          <div>
            Page <span className="text-white font-bold">{page}</span> of{' '}
            <span className="text-white font-bold">{totalPages}</span> ({totalTicketsCount.toLocaleString()} total conversations)
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setPage(Math.max(1, page - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={page === 1 || isLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-800"
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
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-gray-950 font-bold disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-teal-500/20"
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
