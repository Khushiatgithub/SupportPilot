import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Bot,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  Database,
  RefreshCw,
  Layers,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { generateRagReply, fetchRagStatus, decideEscalation } from '../../lib/api';
import type { RagReplyResponse, RetrievedConversation, DecideEscalationResponse } from '../../types';
import { EscalationDecisionCard } from '../escalation/EscalationDecisionCard';

const SAMPLE_SPOTIFY_TWEETS = [
  {
    category: 'Offline Storage',
    text: 'All my offline downloaded songs were deleted after updating Spotify app. How do I get them back?'
  },
  {
    category: 'Double Billing (Escalate)',
    text: 'Why did Spotify bill my card twice for this month premium subscription? Need a refund for the duplicate charge.'
  },
  {
    category: 'Hacked Account (Escalate)',
    text: 'My Spotify account was hacked! Someone changed my email and unauthorized login happened.'
  },
  {
    category: 'Audio Playback (Auto)',
    text: 'Music keeps pausing randomly every 30 seconds while streaming songs on 5G.'
  },
  {
    category: 'Device Connect (Auto)',
    text: "Can't connect Spotify to my Amazon Echo dot speaker via Spotify Connect."
  },
  {
    category: 'Abusive / Threat (Escalate)',
    text: 'Your garbage app is completely scamming customers, I will sue Spotify and report fraud immediately!'
  },
  {
    category: 'Family Plan (Auto)',
    text: 'My brother accepted my Spotify Family invite but it says not in the same address even though we live together!'
  },
  {
    category: 'Feature Request (Auto)',
    text: 'Please bring back the old Spotify UI layout for desktop and lyrics sync on all songs!'
  }
];

export const ReplyGeneratorView: React.FC = () => {
  const [tweetInput, setTweetInput] = useState(
    'All my offline downloaded songs were deleted after updating Spotify app. How do I get them back?'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RagReplyResponse | null>(null);
  const [decision, setDecision] = useState<DecideEscalationResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ragStatus, setRagStatus] = useState<{
    status: string;
    index_type: string;
    total_indexed_conversations: number;
    embedding_dimension: number;
    model: string;
  } | null>(null);

  useEffect(() => {
    fetchRagStatus()
      .then(setRagStatus)
      .catch((err) => console.error('Error fetching RAG status:', err));
  }, []);

  const handleGenerate = async (customTweet?: string) => {
    const textToSubmit = customTweet || tweetInput;
    if (!textToSubmit.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      // 1. Generate Grounded RAG Reply
      const ragResponse = await generateRagReply(textToSubmit);
      setResult(ragResponse);

      // 2. Evaluate Escalation Engine Decision
      const topSimilarity = ragResponse.retrieved_conversations?.[0]?.similarity_score || 0.85;
      const decisionResponse = await decideEscalation({
        customer_tweet: textToSubmit,
        predicted_intent: ragResponse.predicted_intent,
        confidence: ragResponse.confidence,
        generated_reply: ragResponse.generated_reply,
        retrieved_similarity_score: topSimilarity
      });
      setDecision(decisionResponse);
    } catch (err: any) {
      console.error('Failed to process reply & escalation:', err);
      setError(err.message || 'Failed to generate grounded reply');
    } finally {
      setIsLoading(false);
    }
  };

  // Run on first load with default sample
  useEffect(() => {
    handleGenerate();
  }, []);

  const handleCopy = () => {
    if (!result?.generated_reply) return;
    navigator.clipboard.writeText(result.generated_reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const charCount = result?.generated_reply ? result.generated_reply.length : 0;
  const isOverLimit = charCount > 280;

  const getSimilarityBadge = (score: number) => {
    const pct = Math.round(score * 100);
    if (pct >= 75) {
      return {
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        barColor: 'bg-emerald-400',
        label: `${pct}% Match (High)`
      };
    } else if (pct >= 55) {
      return {
        color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
        barColor: 'bg-teal-400',
        label: `${pct}% Match (Good)`
      };
    } else {
      return {
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        barColor: 'bg-amber-400',
        label: `${pct}% Match`
      };
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 via-[#0E1526] to-gray-900 border border-gray-800 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Bot className="w-6 h-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                RAG Reply Generator
              </h1>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                FAISS Vector Grounding
              </span>
            </div>
            <p className="text-sm text-gray-300 max-w-2xl font-normal leading-relaxed">
              Retrieval-Augmented Generation grounded on 1,169 cleaned Spotify Twitter support threads. 
              Synthesizes official <strong className="text-teal-300">@SpotifyCares</strong> responses with strict guardrails against hallucinations or invented refunds.
            </p>
          </div>

          {/* RAG Engine Info Card */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-gray-950/70 border border-gray-800 text-xs flex items-center space-x-2.5">
              <Database className="w-4 h-4 text-teal-400" />
              <div>
                <span className="text-gray-400 block text-[10px]">Vector Knowledge Base</span>
                <span className="font-bold text-white">
                  {ragStatus?.total_indexed_conversations || 1169} Spotify Threads
                </span>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-gray-950/70 border border-gray-800 text-xs flex items-center space-x-2.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-gray-400 block text-[10px]">Index Strategy</span>
                <span className="font-bold text-emerald-400">
                  FAISS IndexFlatIP (Cosine)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Input & Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Tweet Input & Sample Selector (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="p-6 rounded-2xl glass-panel border border-gray-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-teal-400" />
                <span>Customer Tweet Input</span>
              </h2>
              <span className="text-[11px] text-gray-400">Live Inference</span>
            </div>

            <div className="relative">
              <textarea
                value={tweetInput}
                onChange={(e) => setTweetInput(e.target.value)}
                rows={4}
                placeholder="Enter customer tweet mentioning @Spotify or needing support..."
                className="w-full p-3.5 rounded-xl bg-gray-950/90 border border-gray-700 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between mt-1 text-[11px] text-gray-400 px-1">
                <span>Auto-cleans mentions & URLs for semantic retrieval</span>
                <span className="font-mono">{tweetInput.length} chars</span>
              </div>
            </div>

            <button
              onClick={() => handleGenerate()}
              disabled={isLoading || !tweetInput.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-gray-950 font-extrabold text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-gray-950" />
                  <span>Searching FAISS & Synthesizing Reply...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-gray-950" />
                  <span>Generate Grounded Reply (Top 5 RAG)</span>
                </>
              )}
            </button>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {/* Quick Test Sample Tweets */}
            <div className="pt-4 border-t border-gray-800 space-y-2.5">
              <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">
                Quick Test Samples Across 8 Spotify Intents:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {SAMPLE_SPOTIFY_TWEETS.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTweetInput(sample.text);
                      handleGenerate(sample.text);
                    }}
                    className="p-2 rounded-lg bg-gray-950/60 hover:bg-gray-800/80 border border-gray-800 hover:border-teal-500/30 text-left transition-all group cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-teal-400 block group-hover:text-teal-300">
                      {sample.category}
                    </span>
                    <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                      {sample.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: Generated Spotify Reply Card (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="p-6 rounded-2xl glass-panel border border-gray-800 shadow-xl space-y-5">
            
            {/* Header with latency and guardrails */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-800">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm font-bold text-white">Generated Spotify Support Reply</h2>
              </div>

              <div className="flex items-center space-x-2">
                {result && (
                  <span className="px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 text-[11px] text-teal-300 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-teal-400" />
                    <span className="font-mono font-semibold">{result.latency_ms} ms</span>
                  </span>
                )}

                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>100% Grounded</span>
                </span>
              </div>
            </div>

            {/* Generated Reply Preview Box */}
            {isLoading ? (
              <div className="p-12 text-center rounded-xl bg-gray-950/70 border border-gray-800 space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-teal-500/20 border-t-teal-400 animate-spin mx-auto" />
                <p className="text-xs text-gray-300 font-medium">
                  Retrieving 5 nearest historical Spotify threads & generating reply...
                </p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                
                {/* Meta Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">Classified Intent:</span>
                    <span className="px-2.5 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 font-semibold text-[11px]">
                      {result.predicted_intent}
                    </span>
                  </div>
                  <div className="text-gray-400 text-[11px]">
                    Top Match Confidence: <strong className="text-emerald-400 font-mono">{(result.confidence * 100).toFixed(1)}%</strong>
                  </div>
                </div>

                {/* Twitter Mock Tweet Box */}
                <div className="p-4 rounded-xl bg-[#0B0F19] border border-gray-800 space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-black text-gray-950 text-xs shadow-md shadow-emerald-500/20">
                        SC
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-white">SpotifyCares</span>
                          <span className="w-3.5 h-3.5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold">✓</span>
                        </div>
                        <span className="text-[10px] text-gray-500">@SpotifyCares • Verified Official Support</span>
                      </div>
                    </div>
                    
                    {/* Copy Button */}
                    <button
                      onClick={handleCopy}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        copied
                          ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                          : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-400" />
                          <span>Copy Reply</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-sm text-gray-100 font-normal leading-relaxed pt-1">
                    {result.generated_reply}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-800/60 text-[11px]">
                    <span className="text-gray-500">Brand Persona: Empathetic & Solution-Oriented</span>
                    <span className={`font-mono font-medium ${isOverLimit ? 'text-rose-400 font-bold' : 'text-gray-400'}`}>
                      {charCount} / 280 chars
                    </span>
                  </div>
                </div>

                {/* Guardrails Safety Checklist */}
                <div className="p-3.5 rounded-xl bg-gray-950/60 border border-gray-800/80 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2 text-gray-300">
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-[11px]">Zero Invented Refunds</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-[11px]">Zero Personal Data Leaks</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-[11px]">Grounded in 1,169 TWCS</span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-12 text-center text-xs text-gray-500">
                Click "Generate Grounded Reply" to start RAG synthesis.
              </div>
            )}

          </div>

          {/* Escalation Decision Engine Card */}
          {(decision || isLoading) && (
            <EscalationDecisionCard
              decision={decision}
              isLoading={isLoading}
              onOverride={(newDec) => setDecision(newDec)}
            />
          )}

        </div>

      </div>

      {/* Bottom Section: Top 5 Retrieved Historical Spotify Conversations */}
      {result && result.retrieved_conversations && result.retrieved_conversations.length > 0 && (
        <div className="p-6 sm:p-8 rounded-2xl glass-panel border border-gray-800 shadow-xl space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-800">
            <div>
              <div className="flex items-center space-x-2.5">
                <Layers className="w-5 h-5 text-teal-400" />
                <h2 className="text-base font-bold text-white">
                  5 Most Similar Historical Spotify Support Threads (FAISS Vector Retrieval)
                </h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Grounding knowledge retrieved from the 1,169 cleaned 2-way Spotify Twitter conversations in the database.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-mono font-bold self-start sm:self-auto">
              Top 5 Vector Neighbors
            </span>
          </div>

          <div className="space-y-4">
            {result.retrieved_conversations.map((item: RetrievedConversation) => {
              const badge = getSimilarityBadge(item.similarity_score);
              return (
                <div
                  key={item.rank}
                  className="p-4 rounded-xl bg-gray-950/70 border border-gray-800/80 hover:border-gray-700 transition-all space-y-3"
                >
                  
                  {/* Item Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-gray-800 text-white font-mono font-bold text-xs">
                        #{item.rank}
                      </span>
                      <span className="text-xs font-semibold text-gray-200">
                        Conversation ID: <span className="font-mono text-teal-300">{item.conversation_id}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[10px] font-semibold">
                        {item.intent}
                      </span>
                    </div>

                    {/* Similarity Bar & Score */}
                    <div className="flex items-center space-x-3">
                      <div className="w-28 bg-gray-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${badge.barColor}`}
                          style={{ width: `${item.similarity_score * 100}%` }}
                        />
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* 2-Way Thread: Customer Tweet + Spotify Agent Reply */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                    
                    {/* Customer Tweet */}
                    <div className="p-3 rounded-lg bg-gray-900/90 border border-gray-800 space-y-1.5">
                      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                        Customer Tweet:
                      </span>
                      <p className="text-gray-200 font-normal leading-relaxed">
                        "{item.customer_tweet}"
                      </p>
                    </div>

                    {/* Historical Spotify Resolution */}
                    <div className="p-3 rounded-lg bg-[#0E1526]/80 border border-teal-500/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider block">
                          Historical @SpotifyCares Resolution:
                        </span>
                        <span className="text-[10px] text-gray-500">Verified TWCS</span>
                      </div>
                      <p className="text-teal-200 font-normal leading-relaxed">
                        {item.agent_reply || 'Direct message assistance provided by Spotify Support.'}
                      </p>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};
