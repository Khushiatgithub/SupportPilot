import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRightLeft,
  Scale
} from 'lucide-react';
import type { DecideEscalationResponse } from '../../types';

interface EscalationDecisionCardProps {
  decision: DecideEscalationResponse | null;
  isLoading?: boolean;
  onOverride?: (newDecision: DecideEscalationResponse) => void;
}

export const EscalationDecisionCard: React.FC<EscalationDecisionCardProps> = ({
  decision,
  isLoading = false,
  onOverride,
}) => {
  const [localDecision, setLocalDecision] = useState<DecideEscalationResponse | null>(decision);
  const [isOverridden, setIsOverridden] = useState(false);

  useEffect(() => {
    setLocalDecision(decision);
    setIsOverridden(false);
  }, [decision]);

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl glass-panel border border-gray-800 shadow-xl animate-pulse space-y-4">
        <div className="h-5 w-48 bg-gray-800 rounded-lg" />
        <div className="h-20 bg-gray-900/60 rounded-xl" />
        <div className="h-10 bg-gray-800/40 rounded-lg" />
      </div>
    );
  }

  if (!localDecision) return null;

  const isEscalated = localDecision.escalation;
  const riskLevel = localDecision.risk_level || 'LOW';

  const handleToggleOverride = () => {
    const nextEscalated = !isEscalated;
    const nextAutoHandle = !nextEscalated;
    const nextRisk = nextEscalated ? 'HIGH' : 'LOW';
    const nextReason = nextEscalated
      ? 'Manual Override: Support agent escalated this ticket for high-touch human handling.'
      : 'Manual Override: Support agent designated this ticket safe for autonomous resolution.';

    const updated: DecideEscalationResponse = {
      ...localDecision,
      escalation: nextEscalated,
      auto_handle: nextAutoHandle,
      risk_level: nextRisk,
      escalation_reason: nextReason
    };

    setLocalDecision(updated);
    setIsOverridden(true);
    if (onOverride) {
      onOverride(updated);
    }
  };

  const getRiskBadge = () => {
    if (riskLevel === 'HIGH') {
      return (
        <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-xs flex items-center space-x-1">
          <Flame className="w-3.5 h-3.5 text-rose-400" />
          <span>High Risk</span>
        </span>
      );
    } else if (riskLevel === 'MEDIUM') {
      return (
        <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-xs flex items-center space-x-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Medium Risk</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs flex items-center space-x-1">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span>Low Risk</span>
      </span>
    );
  };

  const confPct = Math.round((localDecision.confidence || 0.9) * 100);

  return (
    <div className="p-5 sm:p-6 rounded-2xl glass-panel border border-gray-800 shadow-xl space-y-4">
      
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-800">
        <div className="flex items-center space-x-2.5">
          <div className={`p-2 rounded-xl ${
            isEscalated
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
          }`}>
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Escalation Decision Engine</span>
              {isOverridden && (
                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold">
                  Manual Override Active
                </span>
              )}
            </h3>
            <span className="text-[11px] text-gray-400">Automated Triage Evaluation</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {getRiskBadge()}
        </div>
      </div>

      {/* Decision Status Banner */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isEscalated
          ? 'bg-gradient-to-r from-rose-950/40 via-gray-900 to-rose-950/20 border-rose-500/30'
          : 'bg-gradient-to-r from-emerald-950/40 via-gray-900 to-teal-950/20 border-teal-500/30'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-lg ${
            isEscalated
              ? 'bg-rose-500 text-gray-950 shadow-rose-500/20'
              : 'bg-gradient-to-tr from-teal-500 to-emerald-400 text-gray-950 shadow-teal-500/20'
          }`}>
            {isEscalated ? <ShieldAlert className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-extrabold tracking-tight ${
                isEscalated ? 'text-rose-300' : 'text-emerald-300'
              }`}>
                {isEscalated ? 'Human Escalation Required' : 'Auto-Handled by AI'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isEscalated ? 'bg-rose-500/20 text-rose-300' : 'bg-teal-500/20 text-teal-300'
              }`}>
                {isEscalated ? 'Manual Review' : 'Autonomous Safe'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEscalated
                ? 'High-risk trigger or low confidence; routed to Spotify human tier.'
                : 'Meets safety thresholds; grounded response ready for autonomous dispatch.'}
            </p>
          </div>
        </div>

        {/* One-Click Override Button */}
        <button
          onClick={handleToggleOverride}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer ${
            isEscalated
              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
          }`}
          title="Click to manually override this decision"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>{isEscalated ? 'Override to Auto-Handle' : 'Override to Human'}</span>
        </button>
      </div>

      {/* Decision Details & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        
        {/* Triggered Reason (8 cols) */}
        <div className="md:col-span-8 p-3.5 rounded-xl bg-gray-950/70 border border-gray-800 space-y-1">
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
            Escalation Rule Reasoning:
          </span>
          <p className="text-xs text-gray-200 font-normal leading-relaxed">
            {localDecision.escalation_reason}
          </p>
        </div>

        {/* Confidence Progress (4 cols) */}
        <div className="md:col-span-4 p-3.5 rounded-xl bg-gray-950/70 border border-gray-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              Classifier Confidence:
            </span>
            <span className={`font-mono font-bold ${
              confPct >= 85 ? 'text-emerald-400' : confPct >= 70 ? 'text-teal-400' : 'text-rose-400'
            }`}>
              {confPct}%
            </span>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                confPct >= 85 ? 'bg-emerald-400' : confPct >= 70 ? 'bg-teal-400' : 'bg-rose-400'
              }`}
              style={{ width: `${confPct}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500 block">
            Safety Gate: ≥ 70% required
          </span>
        </div>

      </div>

    </div>
  );
};
