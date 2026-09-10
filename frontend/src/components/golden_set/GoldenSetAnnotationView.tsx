import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Sparkles,
  Save,
  RotateCcw,
  Clock,
  MessageSquare,
  Search,
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type {
  GoldenSetItem,
  GoldenSetStatusResponse
} from '../../types';

import {
  fetchGoldenSetItems,
  saveGoldenSetAnnotation,
  resampleGoldenSet,
  getExportGoldenSetCsvUrl
} from '../../lib/api';

export const GoldenSetAnnotationView: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [resampling, setResampling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Status & items data
  const [statusData, setStatusData] = useState<GoldenSetStatusResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedIntent, setSelectedIntent] = useState<string>('');
  
  // UI states
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [showAgentReply, setShowAgentReply] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNANNOTATED' | 'ANNOTATED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Load Golden Set dataset
  const loadGoldenSet = async (preserveIndex = true) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchGoldenSetItems();
      setStatusData(data);
      
      if (!preserveIndex || currentIndex >= data.items.length) {
        // Find first unannotated item
        const firstUnannotated = data.items.findIndex(item => !item.is_annotated);
        setCurrentIndex(firstUnannotated >= 0 ? firstUnannotated : 0);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load golden set items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoldenSet(false);
  }, []);

  const currentItem: GoldenSetItem | undefined = statusData?.items[currentIndex];

  // Sync selectedIntent whenever currentItem changes
  useEffect(() => {
    if (currentItem) {
      setSelectedIntent(currentItem.true_intent || '');
      setShowAgentReply(false);
    }
  }, [currentIndex, currentItem?.conversation_id, currentItem?.true_intent]);

  // Save annotation handler
  const handleSaveAnnotation = async (intentToSave?: string, shouldAdvance = false) => {
    const finalIntent = intentToSave || selectedIntent;
    if (!currentItem || !finalIntent) return;

    try {
      setSaving(true);
      const res = await saveGoldenSetAnnotation(currentItem.conversation_id, finalIntent);
      
      // Update local state smoothly
      if (statusData) {
        const updatedItems = [...statusData.items];
        updatedItems[currentIndex] = {
          ...updatedItems[currentIndex],
          true_intent: finalIntent,
          is_annotated: true
        };
        setStatusData({
          ...statusData,
          annotated_count: res.annotated_count,
          remaining_count: res.remaining_count,
          progress_pct: res.progress_pct,
          is_complete: res.is_complete,
          items: updatedItems
        });
      }

      setSaveSuccessMsg(`Saved true intent for Sample #${currentItem.sample_order}`);
      setTimeout(() => setSaveSuccessMsg(null), 2500);

      if (shouldAdvance && currentIndex < (statusData?.items.length || 200) - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save annotation.');
    } finally {
      setSaving(false);
    }
  };

  // Intent selection tile click
  const handleSelectIntent = (intentName: string) => {
    setSelectedIntent(intentName);
    if (autoAdvance) {
      handleSaveAnnotation(intentName, true);
    }
  };

  // Keyboard navigation & quick shortcuts (1-8 keys, Left/Right arrow, Enter)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore key events if user is typing in search input
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      if (!statusData || !currentItem) return;

      // Keys 1 through 8 for intents
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= (statusData.available_intents.length || 8)) {
        const targetIntent = statusData.available_intents[keyNum - 1];
        if (targetIntent) {
          e.preventDefault();
          handleSelectIntent(targetIntent.intent_name);
        }
      }

      // Arrow navigation
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        setCurrentIndex(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < statusData.items.length - 1) {
        e.preventDefault();
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'Enter' && selectedIntent) {
        e.preventDefault();
        handleSaveAnnotation(selectedIntent, true);
      }
    },
    [statusData, currentItem, currentIndex, selectedIntent, autoAdvance]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Jump to next unannotated sample
  const handleJumpNextUnannotated = () => {
    if (!statusData) return;
    const nextIdx = statusData.items.findIndex((item, idx) => idx > currentIndex && !item.is_annotated);
    if (nextIdx >= 0) {
      setCurrentIndex(nextIdx);
    } else {
      const firstIdx = statusData.items.findIndex(item => !item.is_annotated);
      if (firstIdx >= 0) setCurrentIndex(firstIdx);
    }
  };

  // Resample confirmation
  const handleResample = async () => {
    if (!window.confirm("Are you sure you want to resample 200 random Spotify conversations? This will replace the current golden set sample set.")) {
      return;
    }
    try {
      setResampling(true);
      setError(null);
      const data = await resampleGoldenSet();
      setStatusData(data);
      setCurrentIndex(0);
    } catch (err: any) {
      setError(err?.message || 'Failed to resample golden set.');
    } finally {
      setResampling(false);
    }
  };

  // Copy tweet text
  const handleCopyTweet = () => {
    if (currentItem?.customer_tweet) {
      navigator.clipboard.writeText(currentItem.customer_tweet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Filtered samples for quick jump bar
  const filteredIndices = statusData?.items
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => {
      if (filterMode === 'UNANNOTATED' && item.is_annotated) return false;
      if (filterMode === 'ANNOTATED' && !item.is_annotated) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.customer_tweet.toLowerCase().includes(q) ||
          item.conversation_id.toLowerCase().includes(q) ||
          (item.true_intent && item.true_intent.toLowerCase().includes(q)) ||
          (item.suggested_intent && item.suggested_intent.toLowerCase().includes(q))
        );
      }
      return true;
    }) || [];

  if (loading && !statusData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-teal-500/20 border-t-teal-400 animate-spin" />
        <p className="text-gray-400 text-sm font-medium animate-pulse">
          Loading 200 Sampled Spotify Conversations for Golden Set...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 via-[#0E1526] to-gray-900 border border-gray-800 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Award className="w-6 h-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Golden Set Annotation Studio
              </h1>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                200 Sampled Conversations
              </span>
            </div>
            <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
              Human-in-the-loop ground truth verification. Review individual customer tweets, reference AI clustering suggestions, and select the definitive <strong className="text-teal-300">true_intent</strong> from the 8 canonical support classes.
            </p>
          </div>

          {/* Action Export and Resample buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={getExportGoldenSetCsvUrl()}
              download="golden_set.csv"
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-gray-950 font-bold text-xs hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-500/20 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Export golden_set.csv</span>
              {statusData && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-gray-950/20 text-[10px] font-extrabold">
                  {statusData.annotated_count}/{statusData.total_samples}
                </span>
              )}
            </a>

            <button
              onClick={handleResample}
              disabled={resampling}
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-gray-800/80 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700/60 text-xs font-semibold transition-all disabled:opacity-50"
              title="Resample 200 random conversations"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resampling ? 'animate-spin text-teal-400' : ''}`} />
              <span>{resampling ? 'Resampling...' : 'Resample 200'}</span>
            </button>
          </div>
        </div>

        {/* Progress Metrics & Bar */}
        {statusData && (
          <div className="mt-6 pt-6 border-t border-gray-800/80">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
              <div className="flex items-center space-x-4">
                <div className="text-xs">
                  <span className="text-gray-400">Progress: </span>
                  <span className="font-extrabold text-white text-base">
                    {statusData.annotated_count}
                  </span>
                  <span className="text-gray-500"> / {statusData.total_samples} Completed</span>
                </div>
                <div className="hidden sm:inline-block h-4 w-px bg-gray-800" />
                <div className="text-xs">
                  <span className="text-gray-400">Remaining: </span>
                  <span className="font-bold text-amber-400">
                    {statusData.remaining_count}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold text-teal-400">
                  {statusData.progress_pct}%
                </span>
                {statusData.is_complete && (
                  <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Golden Set Complete!</span>
                  </span>
                )}
              </div>
            </div>

            {/* Glowing progress track */}
            <div className="relative w-full h-3 bg-gray-950 rounded-full overflow-hidden border border-gray-800">
              <div
                className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-300 rounded-full transition-all duration-500 shadow-md shadow-teal-500/50"
                style={{ width: `${Math.max(statusData.progress_pct, 1)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between text-red-400 text-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs underline hover:text-red-300">
            Dismiss
          </button>
        </div>
      )}

      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center space-x-2 text-emerald-300 text-xs font-semibold animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main Human Annotation Studio Workspace */}
      {currentItem && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Customer Tweet & AI Suggestion Reference (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Customer Tweet Card */}
            <div className="rounded-2xl bg-gray-900/90 border border-gray-800 p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-bold">
                      Sample #{currentItem.sample_order} of {statusData?.total_samples || 200}
                    </span>
                    <span className="text-xs font-mono text-gray-500">
                      ID: {currentItem.conversation_id}
                    </span>
                  </div>

                  {currentItem.is_annotated ? (
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
                      <Check className="w-3 h-3" />
                      <span>Labeled</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold">
                      <Clock className="w-3 h-3" />
                      <span>Pending</span>
                    </span>
                  )}
                </div>

                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Customer Tweet Text
                </label>

                <div className="relative p-4 rounded-xl bg-gray-950/80 border border-gray-800 text-gray-100 text-sm leading-relaxed min-h-[120px] font-sans selection:bg-teal-500/30">
                  {currentItem.customer_tweet}
                  
                  <button
                    onClick={handleCopyTweet}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-800 transition-all text-xs"
                    title="Copy tweet"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Spotify Agent Reply Accordion (Context) */}
                {currentItem.agent_reply && (
                  <div className="mt-4">
                    <button
                      onClick={() => setShowAgentReply(!showAgentReply)}
                      className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-gray-800/40 hover:bg-gray-800/70 border border-gray-800 text-xs text-gray-400 hover:text-gray-200 transition-all"
                    >
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                        <span>View Spotify Agent Reply (Thread Context)</span>
                      </div>
                      {showAgentReply ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {showAgentReply && (
                      <div className="mt-2 p-3 rounded-xl bg-gray-950/60 border border-gray-800/80 text-xs text-gray-300 leading-relaxed animate-fade-in">
                        <div className="font-semibold text-teal-400/90 mb-1 flex items-center space-x-1">
                          <span>@SpotifyCares Reply:</span>
                        </div>
                        {currentItem.agent_reply}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AI Suggested Intent (Secondary Reference) */}
              <div className="mt-6 pt-5 border-t border-gray-800">
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/30 via-indigo-950/20 to-purple-950/30 border border-blue-800/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-blue-300">
                        AI Suggestion (Secondary Reference Only)
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">Unsupervised Clustering</span>
                  </div>
                  
                  <div className="text-sm font-bold text-white mb-1.5 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>{currentItem.suggested_intent || 'Unassigned'}</span>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-normal">
                    This suggested label was derived via semantic clustering. Please review independently and assign the authoritative <strong>true_intent</strong> on the right.
                  </p>
                </div>
              </div>

            </div>

            {/* Keyboard Shortcuts Cheatsheet Card */}
            <div className="rounded-xl bg-gray-900/60 border border-gray-800/80 p-4 text-xs text-gray-400">
              <div className="flex items-center space-x-2 text-gray-300 font-semibold mb-2">
                <Zap className="w-3.5 h-3.5 text-teal-400" />
                <span>Rapid Annotation Shortcuts</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-200">1</kbd> to <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-200">8</kbd> : Select Intent</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-200">←</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-200">→</kbd> : Prev / Next</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-200">Enter</kbd> : Save & Next</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-200">Space</kbd> : Confirm</div>
              </div>
            </div>

          </div>

          {/* Right Column: 8 True Intent Selection Grid & Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
            
            <div className="rounded-2xl bg-gray-900/90 border border-gray-800 p-6 shadow-xl space-y-5">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-white flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    <span>Select Ground-Truth Intent (true_intent)</span>
                  </h2>
                  <p className="text-xs text-gray-400">
                    Click an intent or press keys <kbd className="px-1 py-0.2 bg-gray-800 rounded text-gray-300">1</kbd>–<kbd className="px-1 py-0.2 bg-gray-800 rounded text-gray-300">8</kbd>
                  </p>
                </div>

                {/* Auto Advance Toggle */}
                <label className="flex items-center space-x-2 text-xs font-semibold text-gray-300 cursor-pointer select-none bg-gray-950/60 px-3 py-1.5 rounded-xl border border-gray-800">
                  <input
                    type="checkbox"
                    checked={autoAdvance}
                    onChange={(e) => setAutoAdvance(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-teal-500 focus:ring-0 focus:ring-offset-0 bg-gray-900 border-gray-700"
                  />
                  <span>Auto-advance on click</span>
                </label>
              </div>

              {/* 8 Intent Selection Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {statusData?.available_intents.map((intent, idx) => {
                  const isSelected = selectedIntent === intent.intent_name;
                  const isSuggested = currentItem.suggested_intent === intent.intent_name;

                  return (
                    <button
                      key={intent.intent_id || idx}
                      onClick={() => handleSelectIntent(intent.intent_name)}
                      className={`relative text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between group ${
                        isSelected
                          ? 'bg-gradient-to-tr from-teal-950/40 via-emerald-950/30 to-teal-900/20 border-teal-500 shadow-lg shadow-teal-500/15 ring-1 ring-teal-500/50'
                          : 'bg-gray-950/60 border-gray-800/80 hover:border-gray-700 hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`flex items-center justify-center w-5 h-5 rounded-md text-[11px] font-mono font-bold ${
                              isSelected
                                ? 'bg-teal-500 text-gray-950'
                                : 'bg-gray-800 text-gray-400 group-hover:text-white'
                            }`}
                          >
                            {intent.hotkey || idx + 1}
                          </span>
                          <span
                            className={`text-xs font-bold leading-tight ${
                              isSelected ? 'text-teal-300' : 'text-gray-200 group-hover:text-white'
                            }`}
                          >
                            {intent.intent_name}
                          </span>
                        </div>

                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-teal-400 text-gray-950 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-gray-400 leading-snug line-clamp-2 mt-1">
                        {intent.description}
                      </p>

                      {/* Small badge if this matches AI suggested */}
                      {isSuggested && (
                        <div className="mt-2 flex items-center space-x-1 text-[10px] text-blue-400 font-medium">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>AI Suggestion match</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Bottom Navigation Toolbar: Previous, Save, Save & Next, Next */}
              <div className="pt-4 border-t border-gray-800 flex flex-wrap items-center justify-between gap-3">
                
                {/* Prev & Next navigation */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700/60 text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Previous Tweet (Left Arrow)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <button
                    onClick={() => setCurrentIndex(prev => Math.min((statusData?.items.length || 200) - 1, prev + 1))}
                    disabled={currentIndex === (statusData?.items.length || 200) - 1}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700/60 text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Next Tweet (Right Arrow)"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Save and Save & Next buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleSaveAnnotation(selectedIntent, false)}
                    disabled={saving || !selectedIntent}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white border border-gray-600 text-xs font-semibold transition-all disabled:opacity-40"
                  >
                    <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
                    <span>Save</span>
                  </button>

                  <button
                    onClick={() => handleSaveAnnotation(selectedIntent, true)}
                    disabled={saving || !selectedIntent}
                    className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-gray-950 font-bold text-xs hover:from-teal-400 hover:to-emerald-400 transition-all shadow-md shadow-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                  >
                    <span>Save & Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* 200-Sample Quick Jump Grid & Stepper Drawer */}
      <div className="rounded-2xl bg-gray-900/80 border border-gray-800 p-6 shadow-xl space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <h3 className="text-sm font-extrabold text-white">
              200-Sample Jump Grid
            </h3>
            <span className="text-xs text-gray-400">
              Click any pill (1–200) to jump directly to that conversation
            </span>
          </div>

          {/* Filter & Jump shortcuts */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-gray-950 p-1 rounded-xl border border-gray-800 text-xs">
              <button
                onClick={() => setFilterMode('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  filterMode === 'ALL'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                All (200)
              </button>
              <button
                onClick={() => setFilterMode('UNANNOTATED')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  filterMode === 'UNANNOTATED'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Pending ({statusData?.remaining_count || 0})
              </button>
              <button
                onClick={() => setFilterMode('ANNOTATED')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  filterMode === 'ANNOTATED'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Completed ({statusData?.annotated_count || 0})
              </button>
            </div>

            <button
              onClick={handleJumpNextUnannotated}
              className="px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-all"
            >
              Jump to Next Unannotated →
            </button>
          </div>
        </div>

        {/* Search inside sample grid */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tweet text or IDs within the 200 samples..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* 200 Pill Grid */}
        <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-10 sm:grid-cols-20 md:grid-cols-25 gap-1.5">
            {filteredIndices.map(({ item, idx }) => {
              const isCurrent = idx === currentIndex;
              const isAnnotated = item.is_annotated;

              return (
                <button
                  key={item.conversation_id || idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-8 rounded-lg text-xs font-mono font-bold transition-all relative flex items-center justify-center ${
                    isCurrent
                      ? 'bg-teal-500 text-gray-950 ring-2 ring-teal-400 ring-offset-2 ring-offset-gray-900 shadow-md shadow-teal-500/40 z-10'
                      : isAnnotated
                      ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-800/60'
                      : 'bg-gray-950 hover:bg-gray-800 text-gray-400 border border-gray-800/80'
                  }`}
                  title={`#${item.sample_order}: ${item.true_intent || 'Unlabeled'}\n${item.customer_tweet.substring(0, 60)}...`}
                >
                  {item.sample_order}
                  {isAnnotated && !isCurrent && (
                    <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
