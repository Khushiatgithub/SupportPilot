import React, { useState } from 'react';
import {
  Zap,
  Sparkles,
  Bot,
  ShieldAlert,
  Copy,
  Check,
  CheckCircle2
} from 'lucide-react';
import type { ClassifyResponse } from '../../types';
import { classifyTweetSandbox } from '../../lib/api';

const PRESET_TWEETS = [
  {
    title: '🚨 Double Billing Dispute ($150)',
    handle: '@emily_b2b',
    followers: 450,
    verified: false,
    text: 'I was charged $150 twice on invoice #INV-99381 today! Please reverse this charge immediately.',
    tone: 'Empathetic & Solution-Oriented'
  },
  {
    title: '💥 500 Outage Critical Alert',
    handle: '@dev_lead',
    followers: 1200,
    verified: false,
    text: 'Getting a 500 internal server error across our entire shared mailbox workspace. Is the server down?',
    tone: 'Professional & Concise'
  },
  {
    title: '👑 VIP Influencer Support Request',
    handle: '@techcrunch',
    followers: 10450000,
    verified: true,
    text: 'Hearing reports of a widespread email sync outage on @HiverHQ for European enterprises. Any official comment from your team?',
    tone: 'Professional & Concise'
  },
  {
    title: '⚖️ Lawsuit & Manager Threat',
    handle: '@angry_user',
    followers: 210,
    verified: false,
    text: 'Your support is a COMPLETE SCAM. I demand to speak to a senior manager or I am hiring a lawyer to sue your company!',
    tone: 'Urgent & Apologetic'
  },
  {
    title: '✨ Dark Mode Feature Request',
    handle: '@alex_coder',
    followers: 1900,
    verified: false,
    text: 'Loving the shared inbox UI! Would be awesome if you guys could add dark mode and Vim keybindings.',
    tone: 'Casual & Friendly'
  },
  {
    title: '🔒 Lost 2FA Locked Account',
    handle: '@sam_login',
    followers: 150,
    verified: false,
    text: 'Lost access to my 2FA authenticator app and cannot login to our admin portal. Need urgent recovery assistance.',
    tone: 'Empathetic & Solution-Oriented'
  },
  {
    title: '📦 Damaged Item Shipment',
    handle: '@buyer_dave',
    followers: 320,
    verified: false,
    text: 'Where is my hardware security key order? Tracking number #TRK-49102 arrived completely crushed and broken.',
    tone: 'Empathetic & Solution-Oriented'
  },
  {
    title: '👋 Cancel & Switch to Competitor',
    handle: '@startup_cfo',
    followers: 5200,
    verified: false,
    text: 'We are switching to Zendesk next month because your tool lacks enterprise reporting. Please cancel our auto-renewal.',
    tone: 'Empathetic & Solution-Oriented'
  }
];

export const TweetSandbox: React.FC = () => {
  const [tweetText, setTweetText] = useState(PRESET_TWEETS[0].text);
  const [handle, setHandle] = useState(PRESET_TWEETS[0].handle);
  const [followers, setFollowers] = useState(PRESET_TWEETS[0].followers);
  const [verified, setVerified] = useState(PRESET_TWEETS[0].verified);
  const [customTone, setCustomTone] = useState(PRESET_TWEETS[0].tone);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ClassifyResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSelectPreset = (p: typeof PRESET_TWEETS[0]) => {
    setTweetText(p.text);
    setHandle(p.handle);
    setFollowers(p.followers);
    setVerified(p.verified);
    setCustomTone(p.tone);
    setResult(null);
  };

  const handleRunAnalysis = async () => {
    if (!tweetText.trim()) return;
    setIsLoading(true);
    try {
      const res = await classifyTweetSandbox({
        tweet_text: tweetText,
        author_handle: handle,
        follower_count: followers,
        is_verified: verified,
        custom_tone: customTone
      });
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyReply = () => {
    if (result?.draft_reply) {
      navigator.clipboard.writeText(result.draft_reply);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="p-6 rounded-2xl glass-panel border border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">AI Tweet Sandbox & Decision Simulator</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Test incoming customer support tweets in real-time to inspect intent classification, risk evaluation, RAG retrieval, and brand-consistent reply generation.
            </p>
          </div>
        </div>

        {/* Preset Selector Badges */}
        <div className="mt-4 pt-4 border-t border-gray-800/80">
          <span className="text-[11px] font-semibold text-gray-400 block mb-2">
            Try Pre-loaded Scenario Presets:
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_TWEETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPreset(p)}
                className="px-2.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-700/80 hover:border-teal-500/50 text-xs text-gray-300 font-medium transition-all text-left"
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form: Input Tweet & Settings */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl glass-panel border border-gray-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Incoming Tweet Simulation</span>
            </h3>

            {/* Author Handle & Followers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-400 font-medium block mb-1">Author Handle</label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@customer"
                  className="w-full px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-medium block mb-1">Followers Count</label>
                <input
                  type="number"
                  value={followers}
                  onChange={(e) => setFollowers(Number(e.target.value))}
                  placeholder="500"
                  className="w-full px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Verified & Tone */}
            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="verified"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                  className="rounded border-gray-700 text-teal-500 focus:ring-teal-400 bg-gray-900"
                />
                <label htmlFor="verified" className="text-xs text-gray-300 font-medium cursor-pointer">
                  Verified Account (Blue Check)
                </label>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-medium block mb-1">Response Tone</label>
                <select
                  value={customTone}
                  onChange={(e) => setCustomTone(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-300 focus:outline-none focus:border-teal-500"
                >
                  <option value="Empathetic & Solution-Oriented">Empathetic</option>
                  <option value="Professional & Concise">Professional</option>
                  <option value="Casual & Friendly">Casual</option>
                  <option value="Urgent & Apologetic">Urgent & Apologetic</option>
                </select>
              </div>
            </div>

            {/* Tweet Content */}
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1">
                Tweet Content (Customer Message)
              </label>
              <textarea
                rows={4}
                value={tweetText}
                onChange={(e) => setTweetText(e.target.value)}
                placeholder="Type any tweet or support question..."
                className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-teal-500 resize-none font-normal"
              />
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunAnalysis}
              disabled={isLoading || !tweetText.trim()}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-gray-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 text-gray-950 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Executing AI Pipeline...' : 'Run Real-time AI Triage & Reply'}</span>
            </button>
          </div>
        </div>

        {/* Right Panel: Pipeline Execution Trace & Results */}
        <div className="lg:col-span-7 space-y-4">
          {!result && !isLoading && (
            <div className="p-12 text-center rounded-2xl glass-panel border border-gray-800">
              <Sparkles className="w-10 h-10 text-teal-500/40 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-300">Sandbox Ready</h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                Select a preset on the left or enter a custom customer tweet, then click <strong>"Run Real-time AI Triage & Reply"</strong> to see live step-by-step reasoning.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="p-12 text-center rounded-2xl glass-panel border border-gray-800 space-y-3">
              <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-teal-400">Classifying intent & evaluating escalation rules...</p>
            </div>
          )}

          {result && !isLoading && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Decision Outcome Banner */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                result.decision === 'AUTO_HANDLE'
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl ${
                    result.decision === 'AUTO_HANDLE' ? 'bg-teal-500/20 text-teal-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {result.decision === 'AUTO_HANDLE' ? <Bot className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                  </div>
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider block">Decision Engine Verdict</span>
                    <span className="text-base font-extrabold">
                      {result.decision === 'AUTO_HANDLE' ? '✅ Safe for Autonomous AI Response' : '🚨 Escalated to Human Agent'}
                    </span>
                  </div>
                </div>
                
                <span className="text-xs font-mono font-bold bg-black/30 px-3 py-1 rounded-lg border border-white/10">
                  {result.handling_time_ms} ms Latency
                </span>
              </div>

              {/* Generated Reply Card */}
              <div className="p-4 rounded-2xl glass-panel border border-gray-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span>Brand-Aligned Reply (Twitter/X Format)</span>
                  </span>

                  <button
                    onClick={copyReply}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-950/80 border border-gray-800 text-xs text-gray-100 font-normal leading-relaxed">
                  {result.draft_reply}
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>Tone: {customTone}</span>
                  <span className="font-mono text-teal-400 font-semibold">{result.draft_reply.length} / 280 chars</span>
                </div>
              </div>

              {/* Intent Probability Distribution */}
              <div className="p-4 rounded-2xl glass-panel border border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Class Probability Distribution (8 Intents)</span>
                  <span className="text-xs text-teal-400 font-semibold font-mono">
                    Top: {result.intent.replace(/_/g, ' ')} ({(result.intent_confidence * 100).toFixed(1)}%)
                  </span>
                </div>

                <div className="space-y-1.5">
                  {Object.entries(result.all_intent_probabilities).map(([intentKey, prob]) => (
                    <div key={intentKey} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`font-medium ${intentKey === result.intent ? 'text-teal-300 font-bold' : 'text-gray-400'}`}>
                          {intentKey.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono text-gray-400">{(prob * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            intentKey === result.intent ? 'bg-teal-400' : 'bg-gray-600'
                          }`}
                          style={{ width: `${Math.max(2, prob * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step-by-Step Execution Trace */}
              <div className="p-4 rounded-2xl glass-panel border border-gray-800 space-y-3">
                <span className="text-xs font-bold text-white block">Pipeline Execution Traces</span>
                
                <div className="space-y-2">
                  {result.execution_trace.map((trace, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-gray-950/60 border border-gray-800/80 text-xs space-y-1">
                      <div className="flex items-center justify-between text-gray-400">
                        <span className="font-semibold text-gray-200 flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                          <span>{idx + 1}. {trace.step_name}</span>
                        </span>
                        <span className="font-mono text-[10px] text-gray-500">{trace.duration_ms} ms</span>
                      </div>
                      <p className="text-[11px] text-gray-400 pl-5">{trace.output_summary}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
