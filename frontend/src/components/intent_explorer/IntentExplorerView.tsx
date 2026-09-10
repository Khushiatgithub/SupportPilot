import React, { useState, useEffect } from 'react';
import {
  Compass,
  Download,
  RefreshCw,
  Search,
  CheckCircle2,
  Sparkles,
  Layers,
  MessageSquare,
  Tag,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import type {
  DiscoveredIntent,
  IntentDiscoveryReport,
  IntentConversationItem
} from '../../types';
import {
  fetchDiscoveredIntents,
  runIntentDiscovery,
  fetchIntentConversations,
  getExportIntentsCsvUrl
} from '../../lib/api';

const INTENT_COLORS = [
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400', bar: 'bg-teal-500' },
  { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', bar: 'bg-blue-500' },
  { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', bar: 'bg-indigo-500' },
  { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', bar: 'bg-purple-500' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', bar: 'bg-amber-500' },
  { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', bar: 'bg-rose-500' },
  { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', bar: 'bg-cyan-500' },
];

export const IntentExplorerView: React.FC = () => {
  const [report, setReport] = useState<IntentDiscoveryReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunningDiscovery, setIsRunningDiscovery] = useState<boolean>(false);
  const [selectedIntentId, setSelectedIntentId] = useState<number>(0);

  // Table state
  const [conversations, setConversations] = useState<IntentConversationItem[]>([]);
  const [totalConversations, setTotalConversations] = useState<number>(0);
  const [isLoadingTable, setIsLoadingTable] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSuggested, setFilterSuggested] = useState<string>('ALL');
  const [filterTrue, setFilterTrue] = useState<string>('ALL');
  const [page, setPage] = useState<number>(0);
  const pageSize = 15;

  // Load report and discovered intents
  const loadDiscoveryReport = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDiscoveredIntents();
      setReport(data);
      if (data.intents && data.intents.length > 0) {
        setSelectedIntentId(data.intents[0].cluster_id);
      }
    } catch (err) {
      console.error('Failed to load intent discovery report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load searchable conversations
  const loadConversations = async () => {
    setIsLoadingTable(true);
    try {
      const res = await fetchIntentConversations({
        search: searchQuery || undefined,
        suggested_intent: filterSuggested !== 'ALL' ? filterSuggested : undefined,
        true_intent: filterTrue !== 'ALL' ? filterTrue : undefined,
        limit: pageSize,
        offset: page * pageSize,
      });
      setConversations(res.conversations);
      setTotalConversations(res.total);
    } catch (err) {
      console.error('Failed to load intent conversations:', err);
    } finally {
      setIsLoadingTable(false);
    }
  };

  useEffect(() => {
    loadDiscoveryReport();
  }, []);

  useEffect(() => {
    loadConversations();
  }, [searchQuery, filterSuggested, filterTrue, page]);

  const handleRunDiscovery = async () => {
    setIsRunningDiscovery(true);
    try {
      const data = await runIntentDiscovery();
      setReport(data);
      if (data.intents && data.intents.length > 0) {
        setSelectedIntentId(data.intents[0].cluster_id);
      }
      await loadConversations();
    } catch (err) {
      console.error('Failed to re-run intent discovery:', err);
    } finally {
      setIsRunningDiscovery(false);
    }
  };

  const intents: DiscoveredIntent[] = report?.intents || [];
  const selectedIntent = intents.find((i) => i.cluster_id === selectedIntentId) || intents[0];
  const maxConvCount = Math.max(...intents.map((i) => i.conversation_count), 1);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Spotify Intent Discovery & Explorer
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  8 Clusters
                </span>
              </h1>
              <p className="text-sm text-gray-400">
                Unsupervised semantic clustering analyzing <code className="text-teal-300 font-mono text-xs">customer_tweet</code> texts into 8 core intent taxonomies.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={getExportIntentsCsvUrl()}
            download="intents.csv"
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 text-xs font-semibold transition-all hover:border-gray-600 shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export intents.csv</span>
          </a>

          <button
            onClick={handleRunDiscovery}
            disabled={isRunningDiscovery}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-gray-950 text-xs font-bold shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRunningDiscovery ? 'animate-spin' : ''}`} />
            <span>{isRunningDiscovery ? 'Clustering Tweets...' : 'Re-run Discovery'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Analyzed Tweets */}
        <div className="p-5 rounded-2xl bg-[#0F1420] border border-gray-800 hover:border-gray-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Analyzed Customer Tweets
            </span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">
              {isLoading ? '...' : report?.total_conversations_analyzed ?? 0}
            </span>
            <span className="text-xs text-gray-400">customer_tweet only</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">TF-IDF N-Gram Vectorized</p>
        </div>

        {/* Discovered Clusters */}
        <div className="p-5 rounded-2xl bg-[#0F1420] border border-gray-800 hover:border-gray-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Discovered Intents
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-400">
              {isLoading ? '...' : report?.num_clusters_discovered ?? 8}
            </span>
            <span className="text-xs text-gray-400">k=8 Clusters</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Human-readable auto-taxonomies</p>
        </div>

        {/* Dataset Coverage */}
        <div className="p-5 rounded-2xl bg-[#0F1420] border border-gray-800 hover:border-gray-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Clustering Coverage
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-blue-300">100.0%</span>
            <span className="text-xs text-blue-400">Fully Assigned</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Saved to suggested_intent column</p>
        </div>

        {/* CSV Export Status */}
        <div className="p-5 rounded-2xl bg-[#0F1420] border border-gray-800 hover:border-gray-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Export Status
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-purple-300">intents.csv</span>
            <span className="text-xs text-purple-400">Ready</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Taxonomy & descriptions exportable</p>
        </div>
      </div>

      {/* Intent Distribution Chart */}
      <div className="p-6 rounded-2xl bg-[#0F1420] border border-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-400" />
              Intent Distribution & Volume Breakdown
            </h2>
            <p className="text-xs text-gray-400">
              Relative volume and percentage share for each discovered customer support intent cluster.
            </p>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            {report?.total_conversations_analyzed ?? 0} conversations clustered
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {intents.map((intent, idx) => {
            const colorScheme = INTENT_COLORS[idx % INTENT_COLORS.length];
            const isSelected = selectedIntent?.cluster_id === intent.cluster_id;

            return (
              <div
                key={intent.cluster_id}
                onClick={() => setSelectedIntentId(intent.cluster_id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? `${colorScheme.bg} ${colorScheme.border} ring-1 ring-teal-500/40 shadow-lg shadow-teal-500/10`
                    : 'bg-gray-900/60 border-gray-800/80 hover:bg-gray-900 hover:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-gray-400">#{idx + 1}</span>
                      <h3 className="text-xs font-bold text-white group-hover:text-teal-300">
                        {intent.intent_name}
                      </h3>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{intent.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-bold text-white font-mono">
                      {intent.conversation_count} convs
                    </span>
                    <span className={`block text-[11px] font-bold ${colorScheme.text}`}>
                      {intent.percentage.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`${colorScheme.bar} h-1.5 rounded-full transition-all duration-500`}
                    style={{ width: `${(intent.conversation_count / maxConvCount) * 100}%` }}
                  />
                </div>

                {/* Top keywords */}
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {intent.top_keywords.slice(0, 4).map((kw, kIdx) => (
                    <span
                      key={kIdx}
                      className="px-1.5 py-0.2 text-[10px] rounded bg-gray-800 text-gray-300 font-mono"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Discovered Intent Details & 10 Example Tweets */}
      {selectedIntent && (
        <div className="p-6 rounded-2xl bg-[#0F1420] border border-gray-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-800/80">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  {selectedIntent.intent_code}
                </span>
                <span className="text-xs font-semibold text-gray-400">
                  {selectedIntent.conversation_count} conversations ({selectedIntent.percentage.toFixed(2)}% of total)
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white">{selectedIntent.intent_name}</h2>
              <p className="text-xs text-gray-300 mt-1 max-w-3xl">{selectedIntent.description}</p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400 font-medium">Top Cluster Keywords:</span>
              <div className="flex flex-wrap gap-1">
                {selectedIntent.top_keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 font-mono"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 10 Representative Example Tweets List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                10 Representative Example Tweets (Centroid Prototypical Samples)
              </h3>
              <span className="text-xs text-gray-400">
                Extracted from Spotify customer inquiries
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedIntent.sample_tweets.map((tweet, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 hover:border-gray-700 transition-all space-y-2 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span className="font-mono text-teal-400 font-semibold flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Example #{idx + 1}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-gray-800 text-gray-300 font-mono text-[10px]">
                      customer_tweet
                    </span>
                  </div>
                  <p className="text-xs text-gray-100 font-sans leading-relaxed">"{tweet}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Searchable Conversations Table */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-teal-400" />
              All Conversations & Suggested Intent Mapping
            </h2>
            <p className="text-xs text-gray-400">
              Search and compare discovered <code className="text-teal-300 font-mono text-[11px]">suggested_intent</code> with ground-truth <code className="text-gray-300 font-mono text-[11px]">true_intent</code>.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search conversations..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 w-48 sm:w-56"
              />
            </div>

            {/* Filter by Suggested Intent */}
            <select
              value={filterSuggested}
              onChange={(e) => {
                setFilterSuggested(e.target.value);
                setPage(0);
              }}
              className="px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-teal-500/50 max-w-[200px]"
            >
              <option value="ALL">All Discovered Intents</option>
              {intents.map((i) => (
                <option key={i.cluster_id} value={i.intent_name}>
                  {i.intent_name}
                </option>
              ))}
            </select>

            {/* Filter by Ground Truth Intent */}
            <select
              value={filterTrue}
              onChange={(e) => {
                setFilterTrue(e.target.value);
                setPage(0);
              }}
              className="px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-teal-500/50 max-w-[200px]"
            >
              <option value="ALL">All True Intents</option>
              <option value="SUBSCRIPTION_BILLING">SUBSCRIPTION_BILLING</option>
              <option value="AUDIO_STREAMING_ISSUES">AUDIO_STREAMING_ISSUES</option>
              <option value="ACCOUNT_LOGIN_ACCESS">ACCOUNT_LOGIN_ACCESS</option>
              <option value="OFFLINE_DOWNLOAD_SYNC">OFFLINE_DOWNLOAD_SYNC</option>
              <option value="SMART_DEVICE_INTEGRATION">SMART_DEVICE_INTEGRATION</option>
              <option value="APP_CRASH_FREEZE">APP_CRASH_FREEZE</option>
              <option value="STUDENT_PLAN_VERIFICATION">STUDENT_PLAN_VERIFICATION</option>
              <option value="FEATURE_REQUEST_CATALOG">FEATURE_REQUEST_CATALOG</option>
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#0F1420]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-900/90 border-b border-gray-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Conv ID</th>
                  <th className="py-3.5 px-4 w-1/2">Customer Tweet</th>
                  <th className="py-3.5 px-4">Discovered (suggested_intent)</th>
                  <th className="py-3.5 px-4">Ground Truth (true_intent)</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {isLoadingTable ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-400 mb-2" />
                      Loading conversations...
                    </td>
                  </tr>
                ) : conversations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <HelpCircle className="w-6 h-6 mx-auto text-gray-600 mb-2" />
                      No conversations found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  conversations.map((conv) => (
                    <tr key={conv.conversation_id} className="hover:bg-gray-900/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-teal-400 font-semibold whitespace-nowrap">
                        {conv.conversation_id}
                      </td>
                      <td className="py-3 px-4 text-gray-100 font-sans leading-relaxed">
                        {conv.customer_tweet}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20 block truncate max-w-[220px]">
                          {conv.suggested_intent}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-800 text-gray-400">
                          {conv.true_intent || 'UNASSIGNED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-gray-500 text-[11px]">
                        {conv.created_at ? new Date(conv.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-900/40 text-xs text-gray-400">
            <span>
              Showing {conversations.length > 0 ? page * pageSize + 1 : 0} to{' '}
              {Math.min((page + 1) * pageSize, totalConversations)} of {totalConversations} conversations
            </span>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-40 text-xs font-semibold"
              >
                Previous
              </button>
              <span className="text-gray-500">
                Page {page + 1} of {Math.max(1, Math.ceil(totalConversations / pageSize))}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * pageSize >= totalConversations}
                className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-40 text-xs font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
