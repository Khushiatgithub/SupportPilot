import React, { useState, useEffect } from 'react';
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
  Scale,
  Smile,
  Frown,
  Meh
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

  useEffect(() => {
    setReplyText(ticket.final_reply || ticket.drafted_reply || '');
    setSelectedTone(ticket.response_tone || 'Empathetic & Solution-Oriented');
    setAgentNotes(ticket.agent_notes || '');
  }, [ticket]);

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

  return (
    <div
      className="fixed inset-0 z-[60] overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-gray-900 border-l border-gray-800 h-full flex flex-col shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-gray-900/90 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl ${
              ticket.status === 'AUTO_HANDLED' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
              ticket.status === 'ESCALATED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
              ticket.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {ticket.status === 'AUTO_HANDLED' && <Bot className="w-5 h-5" />}
              {ticket.status === 'ESCALATED' && <ShieldAlert className="w-5 h-5" />}
              {ticket.status === 'RESOLVED' && <CheckCircle2 className="w-5 h-5" />}
              {ticket.status === 'PENDING_REVIEW' && <Clock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Ticket #{ticket.id}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  ticket.status === 'AUTO_HANDLED' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :
                  ticket.status === 'ESCALATED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                  ticket.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {(ticket.status || 'ACTIVE').replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Processed in {ticket.handling_time_ms || 120}ms • {formattedTime}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Customer Tweet Card */}
          <div className="p-4 rounded-xl bg-gray-950/80 border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center font-bold text-white text-xs">
                  {handleDisplay}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-semibold text-white">{ticket.tweet?.author_name || 'Customer'}</span>
                    {ticket.tweet?.is_verified && (
                      <span className="w-3.5 h-3.5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold">✓</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{ticket.tweet?.author_handle || '@spotify_user'} • {(ticket.tweet?.follower_count || 250).toLocaleString()} followers</span>
                </div>
              </div>
              <span className="text-[11px] text-gray-500">Twitter / X</span>
            </div>

            <p className="text-sm text-gray-200 leading-relaxed font-normal">
              {ticket.customer_tweet || ticket.tweet?.content}
            </p>
          </div>

          {/* AI Intent & Diagnostics Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            {/* Intent */}
            <div className="p-3 rounded-xl bg-gray-950/50 border border-gray-800">
              <span className="text-[11px] text-gray-400 block font-medium">Intent</span>
              <span className="text-xs font-bold text-teal-300 truncate block mt-0.5">
                {(ticket.intent || ticket.suggested_intent || 'General').replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] text-gray-500 block">
                {ticket.sub_intent || 'General'}
              </span>
            </div>

            {/* Confidence */}
            <div className="p-3 rounded-xl bg-gray-950/50 border border-gray-800">
              <span className="text-[11px] text-gray-400 block font-medium">Confidence</span>
              <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                {((ticket.intent_confidence ?? 0.94) * 100).toFixed(1)}%
              </span>
              <div className="w-full bg-gray-800 h-1.5 rounded-full mt-1 overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full"
                  style={{ width: `${(ticket.intent_confidence ?? 0.94) * 100}%` }}
                />
              </div>
            </div>

            {/* Sentiment */}
            <div className="p-3 rounded-xl bg-gray-950/50 border border-gray-800">
              <span className="text-[11px] text-gray-400 block font-medium">Sentiment</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                {getSentimentIcon()}
                <span className="text-xs font-bold text-gray-200">
                  {(ticket.sentiment_label || 'NEUTRAL').replace(/_/g, ' ')}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 block">
                Score: {ticket.sentiment_score ?? 0}
              </span>
            </div>

            {/* Urgency */}
            <div className="p-3 rounded-xl bg-gray-950/50 border border-gray-800">
              <span className="text-[11px] text-gray-400 block font-medium">Urgency</span>
              <div className="flex items-center space-x-1 mt-0.5">
                <Flame className={`w-3.5 h-3.5 ${(ticket.urgency_score ?? 5) >= 7 ? 'text-rose-500' : 'text-amber-400'}`} />
                <span className="text-xs font-bold text-white">
                  {ticket.urgency_score ?? 5} / 10
                </span>
              </div>
              <span className="text-[10px] text-gray-500 block">
                Risk: {((ticket.risk_score ?? 0.2) * 100).toFixed(0)}%
              </span>
            </div>

          </div>

          {/* Decision Engine Breakdown */}
          <div className="p-4 rounded-xl bg-gray-950/40 border border-gray-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 flex items-center space-x-1.5">
                <Scale className="w-4 h-4 text-teal-400" />
                <span>Decision Engine Triage Reasoning</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                ticket.is_escalated ? 'bg-rose-500/20 text-rose-300' : 'bg-teal-500/20 text-teal-300'
              }`}>
                {ticket.is_escalated ? 'ESCALATED TO AGENT' : 'SAFE TO AUTO-HANDLE'}
              </span>
            </div>

            <ul className="space-y-1.5 pt-1">
              {(ticket.escalation_reasons && ticket.escalation_reasons.length > 0
                ? ticket.escalation_reasons
                : ['Standard workflow evaluation complete', 'Sentiment and keyword analysis within normal thresholds']
              ).map((reason, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-xs text-gray-300">
                  {ticket.is_escalated ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 mt-0.5 flex-shrink-0" />
                  )}
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Historical Precedent (RAG Knowledge) */}
          {ticket.matched_precedents && ticket.matched_precedents.length > 0 && (
            <div className="p-4 rounded-xl bg-gray-950/40 border border-gray-800 space-y-2">
              <span className="text-xs font-semibold text-gray-300 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Historical Precedent Context (RAG)</span>
              </span>

              <div className="space-y-2 mt-2">
                {ticket.matched_precedents.slice(0, 1).map((prec, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-gray-900 border border-gray-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-gray-400 text-[11px]">
                      <span>Source: {prec.brand} ({prec.intent})</span>
                      <span className="text-indigo-400 font-semibold">{Math.round(prec.similarity_score * 100)}% Similarity Match</span>
                    </div>
                    <p className="text-gray-300 text-[11px]">"{prec.incoming_tweet}"</p>
                    <p className="text-indigo-300 text-[11px] font-medium">↳ Reply: {prec.agent_reply}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Reply Drafting & Brand Tone Editor */}
          <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center space-x-1.5">
                <Edit3 className="w-4 h-4 text-teal-400" />
                <span>Brand-Consistent Response Draft</span>
              </span>
              
              <div className="flex items-center space-x-1">
                {['Empathetic & Solution-Oriented', 'Professional & Concise', 'Casual & Friendly', 'Urgent & Apologetic'].map((tone) => (
                  <button
                    key={tone}
                    onClick={() => handleRegenerate(tone)}
                    disabled={isRegenerating}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                      selectedTone === tone
                        ? 'bg-teal-500 text-gray-950'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {tone.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                placeholder="Draft Twitter reply..."
                className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors resize-none"
              />
              <div className="flex items-center justify-between mt-1 text-[11px]">
                <span className="text-gray-500">Auto-tagged with {ticket.tweet?.author_handle || '@spotify_user'}</span>
                <span className={`font-mono font-medium ${isOverLimit ? 'text-rose-400 font-bold' : 'text-gray-400'}`}>
                  {charCount} / 280 chars
                </span>
              </div>
            </div>

            {/* Internal Agent Notes */}
            <div className="pt-2 border-t border-gray-800">
              <label className="text-[11px] text-gray-400 font-medium block mb-1">
                Internal Agent Notes (Optional)
              </label>
              <input
                type="text"
                value={agentNotes}
                onChange={(e) => setAgentNotes(e.target.value)}
                placeholder="e.g. Issued refund, waiting on logistics update..."
                className="w-full px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-gray-800 bg-gray-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {ticket.status !== 'RESOLVED' && (
              <button
                onClick={() => onUpdateStatus(ticket.id, 'RESOLVED')}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Mark Resolved
              </button>
            )}
            {ticket.status !== 'REJECTED' && (
              <button
                onClick={() => onUpdateStatus(ticket.id, 'REJECTED')}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Dismiss / Spam
              </button>
            )}
          </div>

          <button
            onClick={handleApprove}
            disabled={isSubmitting || isOverLimit}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-gray-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-gray-950" />
            <span>{isSubmitting ? 'Posting Tweet...' : 'Approve & Post Tweet'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
