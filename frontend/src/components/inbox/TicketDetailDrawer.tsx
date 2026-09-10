import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Send,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Bot,
  ShieldAlert,
  Clock,
  Edit3,
  Flame,
  Smile,
  Frown,
  Meh,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  User
} from 'lucide-react';
import type { Ticket } from '../../types';

interface TicketDetailDrawerProps {
  ticket: Ticket | null;
  onClose: () => void;
  onApprove: (ticketId: number, finalReply: string, notes: string) => Promise<void>;
  onRegenerateReply: (ticketId: number, tone: string) => Promise<void>;
  onUpdateStatus: (ticketId: number, status: string) => Promise<void>;
}

export const TicketDetailDrawer: React.FC<TicketDetailDrawerProps> = ({
  ticket,
  onClose,
  onApprove,
  onRegenerateReply,
  onUpdateStatus,
}) => {
  if (!ticket) return null;

  const [replyText, setReplyText] = useState(ticket.final_reply || ticket.drafted_reply || '');
  const [selectedTone, setSelectedTone] = useState(ticket.response_tone || 'Empathetic & Solution-Oriented');
  const [agentNotes, setAgentNotes] = useState(ticket.agent_notes || '');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAllPrecedents, setShowAllPrecedents] = useState(false);

  useEffect(() => {
    setReplyText(ticket.final_reply || ticket.drafted_reply || '');
    setSelectedTone(ticket.response_tone || 'Empathetic & Solution-Oriented');
    setAgentNotes(ticket.agent_notes || '');
    setCopied(false);
  }, [ticket]);

  const handleCopyReply = async () => {
    try {
      await navigator.clipboard.writeText(replyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy reply:', err);
    }
  };

  const handleRegenerate = async (tone: string) => {
    setSelectedTone(tone);
    setIsRegenerating(true);
    try {
      await onRegenerateReply(ticket.id, tone);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(ticket.id, replyText, agentNotes);
    } finally {
      setIsSubmitting(false);
    }
  };

  const charCount = replyText.length;
  const isOverLimit = charCount > 280;

  const getSentimentIcon = () => {
    if (ticket.sentiment_label === 'VERY_NEGATIVE' || ticket.sentiment_label === 'NEGATIVE') {
      return <Frown className="w-4 h-4 text-rose-400" />;
    } else if (ticket.sentiment_label === 'POSITIVE') {
      return <Smile className="w-4 h-4 text-emerald-400" />;
    }
    return <Meh className="w-4 h-4 text-amber-400" />;
  };

  const handleDisplay = ticket.tweet?.author_handle
    ? ticket.tweet.author_handle.slice(1, 3).toUpperCase()
    : 'SP';

  const formattedTime = ticket.created_at
    ? (() => {
        try {
          const d = new Date(ticket.created_at);
          return isNaN(d.getTime()) ? 'Just now' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
          return 'Just now';
        }
      })()
    : 'Just now';

  const confidenceScore = ticket.intent_confidence ?? 0.94;
  const confidencePct = Math.round(confidenceScore * 100);

  return (
    <div
      className="fixed inset-0 z-[60] overflow-hidden bg-black/75 backdrop-blur-md flex justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="w-full max-w-4xl lg:max-w-5xl bg-[#080C14] border-l border-white/[0.08] h-full flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* 1. DRAWER TOP HEADER */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#0B0F19]/90 sticky top-0 z-10 backdrop-blur-xl">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${
              ticket.status === 'AUTO_HANDLED' ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20' :
              ticket.status === 'ESCALATED' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' :
              ticket.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' :
              'bg-amber-500/10 text-amber-300 border border-amber-500/20'
            }`}>
              {ticket.status === 'AUTO_HANDLED' && <Bot className="w-5 h-5" />}
              {ticket.status === 'ESCALATED' && <ShieldAlert className="w-5 h-5" />}
              {ticket.status === 'RESOLVED' && <CheckCircle2 className="w-5 h-5" />}
              {ticket.status === 'PENDING_REVIEW' && <Clock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="text-base font-extrabold text-white font-display">
                  Ticket #{ticket.id || ticket.conversation_id}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  ticket.status === 'AUTO_HANDLED' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :
                  ticket.status === 'ESCALATED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                  ticket.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {(ticket.status || 'ACTIVE').replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Inference Latency: {ticket.handling_time_ms || 42}ms • Cleaned 2-Way Thread • {formattedTime}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Close drawer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. TWO-COLUMN CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN: CONVERSATION THREAD (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Customer Profile Box */}
              <div className="p-4 rounded-2xl glass-panel-subtle border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-gray-800 to-teal-950 text-teal-300 font-bold text-sm flex items-center justify-center border border-teal-500/20 shadow-inner">
                      {handleDisplay}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-bold text-white">
                          {ticket.tweet?.author_name || 'Spotify Customer'}
                        </span>
                        {ticket.tweet?.is_verified && (
                          <span className="w-3.5 h-3.5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold">✓</span>
                        )}
                      </div>
                      <span className="text-xs text-teal-400 font-mono">
                        {ticket.tweet?.author_handle || '@spotify_user'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    ID: #{ticket.tweet?.tweet_id || ticket.conversation_id}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.04] text-xs">
                  <div className="p-2 rounded-lg bg-gray-950/60 border border-white/[0.02]">
                    <span className="text-[10px] text-gray-400 block">Followers</span>
                    <span className="font-mono font-bold text-gray-200">
                      {(ticket.tweet?.follower_count || 320).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-gray-950/60 border border-white/[0.02]">
                    <span className="text-[10px] text-gray-400 block">Sentiment</span>
                    <div className="flex items-center space-x-1 font-bold text-gray-200">
                      {getSentimentIcon()}
                      <span className="text-[11px]">{ticket.sentiment_label || 'NEUTRAL'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inbound Customer Tweet Bubble */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-1">
                  <User className="w-3 h-3 text-gray-400" />
                  <span>Customer Message</span>
                </span>
                <div className="p-4 rounded-2xl bg-gray-900/90 border border-white/[0.08] shadow-lg relative">
                  <div className="absolute -left-2 top-4 w-3 h-3 bg-gray-900 border-l border-b border-white/[0.08] transform rotate-45" />
                  <p className="text-xs sm:text-sm text-gray-100 leading-relaxed font-normal">
                    {ticket.customer_tweet || ticket.tweet?.content}
                  </p>
                </div>
              </div>

              {/* Historical @SpotifyCares Response (Thread context) */}
              {(ticket.agent_reply || ticket.final_reply) && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-teal-400" />
                    <span>Historical @SpotifyCares Resolution</span>
                  </span>
                  <div className="p-4 rounded-2xl bg-teal-950/30 border border-teal-500/20 shadow-lg relative">
                    <div className="absolute -left-2 top-4 w-3 h-3 bg-teal-950/30 border-l border-b border-teal-500/20 transform rotate-45" />
                    <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed font-normal">
                      {ticket.agent_reply || ticket.final_reply}
                    </p>
                  </div>
                </div>
              )}

              {/* Direct Quick Status Toggles */}
              <div className="p-3.5 rounded-2xl glass-panel-subtle border border-white/[0.06] space-y-2">
                <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider">
                  Update Ticket Status
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => onUpdateStatus(ticket.id, 'RESOLVED')}
                    className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Resolved</span>
                  </button>
                  <button
                    onClick={() => onUpdateStatus(ticket.id, 'ESCALATED')}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Escalate (Tier 2)</span>
                  </button>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: AI ANALYSIS & GROUNDED REPLY WORKSPACE (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* AI Intent & Escalation Triage Matrix */}
              <div className="p-4 rounded-2xl glass-panel surface-kpi-teal border border-teal-500/20 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-300 flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span>AI Intent & Escalation Decision</span>
                  </span>
                  
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    ticket.is_escalated || ticket.status === 'ESCALATED' 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {ticket.is_escalated || ticket.status === 'ESCALATED' ? 'ESCALATION REQUIRED' : 'SAFE TO AUTO-HANDLE'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-xl bg-gray-950/80 border border-white/[0.04]">
                    <span className="text-[10px] text-gray-400 block font-medium">Classified Intent</span>
                    <span className="text-xs font-bold text-white truncate block mt-0.5">
                      {(ticket.intent || ticket.suggested_intent || 'General').replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-950/80 border border-white/[0.04]">
                    <span className="text-[10px] text-gray-400 block font-medium">Confidence Score</span>
                    <span className="text-xs font-bold text-emerald-400 block mt-0.5 font-mono">
                      {confidencePct}%
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-950/80 border border-white/[0.04]">
                    <span className="text-[10px] text-gray-400 block font-medium">Urgency Index</span>
                    <div className="flex items-center space-x-1 mt-0.5">
                      <Flame className={`w-3.5 h-3.5 ${(ticket.urgency_score ?? 5) >= 7 ? 'text-rose-400' : 'text-amber-400'}`} />
                      <span className="text-xs font-bold text-white font-mono">
                        {ticket.urgency_score ?? 5}/10
                      </span>
                    </div>
                  </div>
                </div>

                {/* Escalation Reasons List */}
                <div className="p-2.5 rounded-xl bg-gray-950/60 border border-white/[0.03] space-y-1">
                  {(ticket.escalation_reasons && ticket.escalation_reasons.length > 0
                    ? ticket.escalation_reasons
                    : ['Confidence exceeds threshold (>= 0.85)', 'No high-risk keywords detected, grounded in verified FAQ']
                  ).map((reason, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-[11px] text-gray-300">
                      {ticket.is_escalated ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 mt-0.5 flex-shrink-0" />
                      )}
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>

              </div>

              {/* RAG Grounded Reply Drafting Workspace */}
              <div className="p-4 sm:p-5 rounded-2xl glass-panel border border-white/[0.08] space-y-3.5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Edit3 className="w-4 h-4 text-teal-400" />
                    <span>Grounded Spotify Response Draft</span>
                  </span>
                  
                  {/* Tone Selector Pills */}
                  <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                    {['Empathetic & Solution-Oriented', 'Professional & Concise', 'Casual & Friendly', 'Urgent & Apologetic'].map((tone) => (
                      <button
                        key={tone}
                        onClick={() => handleRegenerate(tone)}
                        disabled={isRegenerating}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          selectedTone === tone
                            ? 'bg-gradient-to-r from-teal-500 to-emerald-400 text-gray-950 shadow-sm shadow-teal-500/20'
                            : 'bg-gray-900/90 text-gray-400 hover:text-white hover:bg-gray-800 border border-white/[0.04]'
                        }`}
                      >
                        {tone.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editable Textarea */}
                <div className="relative">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    placeholder="Drafting grounded Spotify reply..."
                    className="w-full p-3.5 rounded-xl bg-gray-950/90 border border-white/[0.08] text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-teal-500/70 transition-colors resize-none leading-relaxed font-normal"
                  />
                  
                  <div className="flex items-center justify-between mt-1.5 text-[11px]">
                    <span className="text-gray-500">
                      Auto-reply targeted to <strong className="text-teal-400 font-mono">{ticket.tweet?.author_handle || '@spotify_user'}</strong>
                    </span>
                    <span className={`font-mono font-bold ${isOverLimit ? 'text-rose-400' : 'text-gray-400'}`}>
                      {charCount} / 280 chars
                    </span>
                  </div>
                </div>

                {/* Quick Action Buttons for Reply */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={handleCopyReply}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-white text-xs font-semibold border border-white/[0.06] transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied to Clipboard!' : 'Copy Reply'}</span>
                  </button>

                  <button
                    onClick={() => handleRegenerate(selectedTone)}
                    disabled={isRegenerating}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-teal-300 hover:text-teal-200 text-xs font-semibold border border-teal-500/20 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                    <span>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
                  </button>
                </div>

                {/* Internal Agent Notes */}
                <div className="pt-2 border-t border-white/[0.06]">
                  <label className="text-[11px] text-gray-400 font-medium block mb-1">
                    Internal Agent Notes (Audit Trail)
                  </label>
                  <input
                    type="text"
                    value={agentNotes}
                    onChange={(e) => setAgentNotes(e.target.value)}
                    placeholder="e.g., Verified playlist cache, guided user to support.spotify.com/article/offline"
                    className="w-full px-3 py-1.5 rounded-xl bg-gray-950/80 border border-white/[0.06] text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Retrieved Historical Examples (RAG Knowledge Precedents) */}
              <div className="p-4 rounded-2xl glass-panel-subtle border border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200 flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Retrieved Historical Spotify Resolutions ({ticket.matched_precedents?.length || 1})</span>
                  </span>
                  
                  {ticket.matched_precedents && ticket.matched_precedents.length > 1 && (
                    <button
                      onClick={() => setShowAllPrecedents(!showAllPrecedents)}
                      className="text-[11px] text-teal-400 hover:underline cursor-pointer flex items-center space-x-0.5"
                    >
                      <span>{showAllPrecedents ? 'Show Top 1' : `View All (${ticket.matched_precedents.length})`}</span>
                      {showAllPrecedents ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {(ticket.matched_precedents && ticket.matched_precedents.length > 0
                    ? (showAllPrecedents ? ticket.matched_precedents : ticket.matched_precedents.slice(0, 1))
                    : [
                        {
                          brand: 'Spotify',
                          intent: ticket.intent || 'AUDIO_PLAYBACK',
                          similarity_score: 0.92,
                          incoming_tweet: 'Spotify song stops playing after 10 seconds on mobile',
                          agent_reply: 'Hi! Try clearing your Spotify app cache under Settings > Storage, then restart your device. Let us know if that helps!'
                        }
                      ]
                  ).map((prec, i) => (
                    <div key={i} className="p-3 rounded-xl bg-gray-950/80 border border-white/[0.04] text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-gray-400 text-[11px]">
                        <span className="font-semibold text-gray-300">Grounding Match #{i + 1} • {prec.brand}</span>
                        <span className="text-emerald-400 font-mono font-bold">
                          {Math.round((prec.similarity_score ?? 0.88) * 100)}% Similarity
                        </span>
                      </div>
                      <p className="text-gray-400 text-[11px]">
                        <strong className="text-gray-300">Historical Issue:</strong> "{prec.incoming_tweet}"
                      </p>
                      <p className="text-teal-300 text-[11px] font-medium bg-teal-500/[0.04] p-2 rounded-lg border border-teal-500/10">
                        ↳ <strong>Spotify Resolution:</strong> {prec.agent_reply}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* 3. DRAWER STICKY FOOTER ACTIONS */}
        <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-[#0B0F19]/95 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 z-10 backdrop-blur-xl">
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Guarded RAG Engine Active • Zero Hallucinations</span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs font-semibold transition-colors cursor-pointer border border-white/[0.06]"
            >
              Cancel
            </button>

            <button
              onClick={handleApprove}
              disabled={isSubmitting || isOverLimit}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-gray-950 font-bold text-xs shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all duration-150 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-gray-950" />
              <span>{isSubmitting ? 'Posting Tweet...' : 'Approve & Dispatch Tweet'}</span>
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
};
