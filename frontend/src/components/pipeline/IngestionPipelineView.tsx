import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Filter,
  Search,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Info,
  Clock,
  Music2,
  UserCheck
} from 'lucide-react';
import type { IngestionReportData, CleanedConversation } from '../../types';
import { fetchIngestionReport, runIngestionPipeline } from '../../lib/api';

export const IngestionPipelineView: React.FC = () => {
  const [report, setReport] = useState<IngestionReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIntent, setSelectedIntent] = useState<string>('ALL');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadReport = async () => {
    setIsLoading(true);
    setUploadError(null);
    try {
      const data = await fetchIngestionReport();
      setReport(data);
    } catch (err: any) {
      console.error('Failed to load ingestion report:', err);
      setUploadError(err?.message || 'Failed to fetch ingestion report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleRunPipeline = async (file?: File) => {
    setIsRunning(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const result = await runIngestionPipeline(undefined, file);
      setReport(result);
      setUploadSuccess(
        file
          ? `Successfully processed and cleaned uploaded CSV: ${file.name}`
          : 'Successfully executed Spotify TWCS ingestion pipeline!'
      );
    } catch (err: any) {
      console.error('Pipeline execution failed:', err);
      setUploadError(err?.message || 'Pipeline execution failed');
    } finally {
      setIsRunning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleRunPipeline(file);
    }
  };

  const previewConversations: CleanedConversation[] = report?.preview_conversations || [];

  const filteredConversations = previewConversations.filter((c) => {
    const matchesSearch =
      searchQuery === '' ||
      c.conversation_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customer_tweet.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.agent_reply && c.agent_reply.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesIntent =
      selectedIntent === 'ALL' || (c.true_intent && c.true_intent === selectedIntent);

    return matchesSearch && matchesIntent;
  });

  const uniqueIntents = Array.from(
    new Set(previewConversations.map((c) => c.true_intent).filter(Boolean))
  ) as string[];

  const breakdown = report?.removed_breakdown || {};
  const nonSpotify = breakdown.non_spotify_brand_rows ?? 0;
  const unresolved = breakdown.unresolved_conversations_no_reply ?? 0;
  const deletedEmpty = breakdown.empty_or_deleted_messages ?? 0;
  const duplicates = breakdown.duplicate_threads ?? 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Kaggle TWCS Data Ingestion Pipeline
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Spotify Edition
                </span>
              </h1>
              <p className="text-sm text-gray-400">
                Automated multi-step ETL pipeline: Filter, thread reconstruction, deduplication, cleaning, and PostgreSQL persistence.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isRunning}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 text-xs font-semibold transition-all hover:border-gray-600 disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4 text-teal-400" />
            <span>Upload twcs.csv</span>
          </button>

          <button
            onClick={() => handleRunPipeline()}
            disabled={isRunning}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-gray-950 text-xs font-bold shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Processing Pipeline...' : 'Run Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {uploadSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {uploadError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center space-x-2">
          <Trash2 className="w-5 h-5 flex-shrink-0 text-red-400" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Raw Rows */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-[#0F1420] border border-gray-800 hover:border-gray-700 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Total Raw Rows
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">
              {isLoading ? '...' : (report?.total_raw_rows ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-gray-400">Input Tweets</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Streamed from Kaggle twcs.csv dataset</p>
        </div>

        {/* Rows Removed */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-[#0F1420] border border-gray-800 hover:border-gray-700 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Rows Filtered / Removed
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Filter className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-amber-400">
              {isLoading ? '...' : (report?.rows_removed ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-gray-400">Noise / Unresolved</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Filtered non-Spotify, deleted, & duplicates</p>
        </div>

        {/* Final Cleaned Conversations */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-[#0F1420] border border-gray-800 hover:border-gray-700 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Cleaned Conversations
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-400">
              {isLoading ? '...' : (report?.final_cleaned_conversations ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-gray-400">Reconstructed</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Stored in PostgreSQL conversations table</p>
        </div>

        {/* Retention Rate */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-[#0F1420] border border-gray-800 hover:border-gray-700 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Retention Efficiency
            </span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-teal-300">
              {isLoading ? '...' : `${(report?.percentage_retained ?? 0).toFixed(2)}%`}
            </span>
            <span className="text-xs text-teal-400/80">Yield Rate</span>
          </div>
          <div className="mt-2 w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-emerald-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, report?.percentage_retained ?? 0)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Cleaning Report Breakdown & Pipeline Architecture Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Removal Breakdown Details */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0F1420] border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-teal-400" />
              Data Cleansing & Removal Audit Breakdown
            </h2>
            <span className="text-xs text-gray-400">Kaggle twcs.csv rules</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Non-Spotify */}
            <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Non-Spotify Brands</span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {nonSpotify} rows
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Filtered out AppleSupport, AmazonHelp, Uber_Support, Delta, and other brand interactions.
              </p>
            </div>

            {/* Unresolved Threads */}
            <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Unresolved Inquiries</span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {unresolved} rows
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Discarded customer tweets that never received a Spotify support agent response.
              </p>
            </div>

            {/* Corrupted / Deleted / Empty */}
            <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Deleted & Empty Tweets</span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                  {deletedEmpty} rows
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Purged [deleted], placeholder text, NaN, and blank whitespace payloads.
              </p>
            </div>

            {/* Duplicate Pairs */}
            <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Duplicate Threads</span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {duplicates} rows
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Deduplicated identical customer-agent dialogue pairs and redundant message IDs.
              </p>
            </div>
          </div>
        </div>

        {/* Database & Schema Specs */}
        <div className="p-6 rounded-2xl bg-[#0F1420] border border-gray-800 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-emerald-400" />
              Target Database Schema
            </h2>
            <div className="space-y-3 text-xs text-gray-300">
              <div className="flex justify-between py-1.5 border-b border-gray-800">
                <span className="text-gray-400">Target Table:</span>
                <span className="font-mono text-teal-400 font-semibold">conversations</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-800">
                <span className="text-gray-400">Target Brand:</span>
                <span className="font-semibold text-white">Spotify (@SpotifyCares)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-800">
                <span className="text-gray-400">Primary Key:</span>
                <span className="font-mono text-gray-300">conversation_id (VARCHAR 64)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-800">
                <span className="text-gray-400">Timestamp:</span>
                <span className="font-mono text-gray-300">created_at (TIMESTAMPTZ)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-400">Is Customer Flag:</span>
                <span className="font-mono text-emerald-400">is_customer (BOOLEAN)</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-3 rounded-xl bg-teal-500/5 border border-teal-500/20 text-xs text-teal-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <span>Thread reconstruction pairs each customer inquiry with its official SpotifyCares reply.</span>
          </div>
        </div>
      </div>

      {/* Cleaned Conversations Preview Header & Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-teal-400" />
              Cleaned Conversations Preview (First 20 Reconstructed Pairs)
            </h2>
            <p className="text-xs text-gray-400">
              Displaying the first 20 ground-truth Spotify support dialogue pairs populated in the PostgreSQL database.
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 w-48 sm:w-60"
              />
            </div>

            {/* Intent Filter Dropdown */}
            {uniqueIntents.length > 0 && (
              <select
                value={selectedIntent}
                onChange={(e) => setSelectedIntent(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-teal-500/50"
              >
                <option value="ALL">All Intents ({previewConversations.length})</option>
                {uniqueIntents.map((intent) => (
                  <option key={intent} value={intent}>
                    {intent}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Conversations List */}
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 bg-[#0F1420] rounded-2xl border border-gray-800">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-400 mb-3" />
            <p className="text-sm font-semibold text-gray-300">Loading Cleaned Conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-12 text-center text-gray-400 bg-[#0F1420] rounded-2xl border border-gray-800">
            <Info className="w-8 h-8 mx-auto text-gray-500 mb-2" />
            <p className="text-sm font-semibold text-gray-300">No conversations match your criteria</p>
            <p className="text-xs text-gray-500 mt-1">Try clearing your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredConversations.map((conv, index) => (
              <div
                key={conv.conversation_id || index}
                className="p-5 rounded-2xl bg-[#0F1420] border border-gray-800 hover:border-gray-700 transition-all space-y-4"
              >
                {/* Top Meta Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-800/80 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono px-2 py-0.5 rounded-md bg-gray-800 text-teal-300 font-semibold">
                      #{index + 1} {conv.conversation_id}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                      <Music2 className="w-3 h-3" />
                      {conv.brand}
                    </span>
                    {conv.true_intent && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                        {conv.true_intent}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center text-gray-500 text-[11px] space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {conv.created_at ? new Date(conv.created_at).toLocaleString() : 'Recent'}
                    </span>
                  </div>
                </div>

                {/* Conversation Dialogue Pairs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Tweet Bubble */}
                  <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5" />
                          Customer Inbound Tweet
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-300 font-mono">
                          is_customer: true
                        </span>
                      </div>
                      <p className="text-sm text-gray-100 font-sans leading-relaxed">
                        {conv.customer_tweet}
                      </p>
                    </div>
                  </div>

                  {/* Spotify Agent Reply Bubble */}
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <Music2 className="w-3.5 h-3.5" />
                          Spotify Support Reply (@SpotifyCares)
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 font-semibold">
                          Agent Verified
                        </span>
                      </div>
                      <p className="text-sm text-gray-100 font-sans leading-relaxed">
                        {conv.agent_reply || <span className="text-gray-500 italic">No reply recorded</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
