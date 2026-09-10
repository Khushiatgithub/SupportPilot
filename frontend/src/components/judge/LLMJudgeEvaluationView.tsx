import React, { useState, useEffect, useCallback } from 'react';
import {
  Scale,
  Bot,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ShieldAlert,
  Layers,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileJson
} from 'lucide-react';
import {
  fetchLLMJudgeSamples,
  submitHumanJudgeScore,
  resampleLLMJudge,
  getExportJudgeCsvUrl,
  getExportJudgeJsonUrl
} from '../../lib/api';
import type {
  LLMJudgeSample,
  LLMJudgeStatusResponse,
  JudgeAgreementMetrics
} from '../../types';

export const LLMJudgeEvaluationView: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [resampling, setResampling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Status & items data
  const [data, setData] = useState<LLMJudgeStatusResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showRetrievedContext, setShowRetrievedContext] = useState<boolean>(false);

  // Editable Human score inputs for current sample
  const [humanCorrectness, setHumanCorrectness] = useState<number>(5);
  const [humanGroundedness, setHumanGroundedness] = useState<number>(5);
  const [humanEmpathy, setHumanEmpathy] = useState<number>(5);
  const [humanActionability, setHumanActionability] = useState<number>(5);
  const [humanHallucination, setHumanHallucination] = useState<'PASS' | 'FAIL'>('PASS');
  const [humanNotes, setHumanNotes] = useState<string>('');

  // Load initial data
  const loadData = async (preserveIndex = true) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchLLMJudgeSamples();
      setData(res);
      if (!preserveIndex || currentIndex >= res.samples.length) {
        setCurrentIndex(0);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load LLM Judge evaluation samples');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const currentSample: LLMJudgeSample | undefined = data?.samples[currentIndex];

  // Sync inputs whenever current sample changes
  useEffect(() => {
    if (currentSample) {
      const h = currentSample.human_scores;
      setHumanCorrectness(h.correctness || currentSample.llm_scores.correctness || 5);
      setHumanGroundedness(h.groundedness || currentSample.llm_scores.groundedness || 5);
      setHumanEmpathy(h.empathy || currentSample.llm_scores.empathy || 5);
      setHumanActionability(h.actionability || currentSample.llm_scores.actionability || 5);
      setHumanHallucination(h.hallucination || currentSample.llm_scores.hallucination || 'PASS');
      setHumanNotes(h.notes || '');
      setShowRetrievedContext(false);
    }
  }, [currentIndex, currentSample?.sample_order]);

  // Save human evaluation handler
  const handleSaveEvaluation = async (advance = false) => {
    if (!currentSample) return;

    try {
      setSaving(true);
      setError(null);
      const res = await submitHumanJudgeScore({
        sample_order: currentSample.sample_order,
        correctness: humanCorrectness,
        groundedness: humanGroundedness,
        empathy: humanEmpathy,
        actionability: humanActionability,
        hallucination: humanHallucination,
        notes: humanNotes
      });

      // Update local state smoothly
      if (data) {
        const updatedSamples = [...data.samples];
        updatedSamples[currentIndex] = {
          ...updatedSamples[currentIndex],
          human_scores: {
            correctness: humanCorrectness,
            groundedness: humanGroundedness,
            empathy: humanEmpathy,
            actionability: humanActionability,
            hallucination: humanHallucination,
            notes: humanNotes
          },
          is_human_evaluated: true
        };

        setData({
          ...data,
          metrics: res.metrics,
          evaluated_count: updatedSamples.filter((s) => s.is_human_evaluated).length,
          samples: updatedSamples
        });
      }

      setSaveSuccessMsg(`Saved human evaluation for Sample #${currentSample.sample_order}`);
      setTimeout(() => setSaveSuccessMsg(null), 2500);

      if (advance && currentIndex < (data?.samples.length || 30) - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save human evaluation');
    } finally {
      setSaving(false);
    }
  };

  // Resample handler
  const handleResample = async () => {
    if (
      !window.confirm(
        'Are you sure you want to resample 30 replies? This will regenerate evaluation samples and refresh LLM ratings.'
      )
    ) {
      return;
    }
    try {
      setResampling(true);
      setError(null);
      const res = await resampleLLMJudge();
      setData(res);
      setCurrentIndex(0);
    } catch (err: any) {
      setError(err?.message || 'Failed to resample LLM Judge evaluations');
    } finally {
      setResampling(false);
    }
  };

  // Keyboard navigation shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        setCurrentIndex((prev) => prev - 1);
      } else if (e.key === 'ArrowRight' && data && currentIndex < data.samples.length - 1) {
        e.preventDefault();
        setCurrentIndex((prev) => prev + 1);
      }
    },
    [currentIndex, data]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-teal-500/20 border-t-teal-400 animate-spin" />
        <p className="text-gray-400 text-sm font-medium animate-pulse">
          Loading 30 Spotify Reply Evaluations & Inter-Rater Agreement Metrics...
        </p>
      </div>
    );
  }

  const metrics: JudgeAgreementMetrics | undefined = data?.metrics;

  const getKappaBadge = (kappa: number) => {
    if (kappa >= 0.8) return { label: 'Almost Perfect Agreement', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (kappa >= 0.6) return { label: 'Substantial Agreement', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' };
    if (kappa >= 0.4) return { label: 'Moderate Agreement', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { label: 'Fair Agreement', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  };

  const kappaInfo = getKappaBadge(metrics?.cohens_kappa || 0.7);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 via-[#0E1526] to-gray-900 border border-gray-800 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Scale className="w-6 h-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                LLM-as-Judge Evaluation Studio
              </h1>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                30-Sample Reply Benchmark
              </span>
            </div>
            <p className="text-sm text-gray-300 max-w-2xl font-normal leading-relaxed">
              Evaluating Spotify support reply quality across a 5-dimension rubric (Correctness, Groundedness, Empathy, Actionability, Hallucination) and measuring agreement between LLM Judge and Human Evaluator.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={getExportJudgeCsvUrl()}
              download="judge_agreement.csv"
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-teal-300 border border-gray-700 text-xs font-bold transition-all shadow-md"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-400" />
              <span>Export judge_agreement.csv</span>
            </a>

            <a
              href={getExportJudgeJsonUrl()}
              download="llm_judge_results.json"
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-emerald-300 border border-gray-700 text-xs font-bold transition-all shadow-md"
            >
              <FileJson className="w-4 h-4 text-emerald-400" />
              <span>Export llm_judge_results.json</span>
            </a>

            <button
              onClick={handleResample}
              disabled={resampling}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
              title="Resample 30 conversations"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resampling ? 'animate-spin text-teal-400' : ''}`} />
              <span>{resampling ? 'Resampling...' : 'Resample 30'}</span>
            </button>
          </div>
        </div>

        {/* Agreement KPI Metrics Bar */}
        {metrics && (
          <div className="mt-6 pt-6 border-t border-gray-800/80 grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Cohen's Kappa */}
            <div className="p-4 rounded-xl bg-gray-950/70 border border-gray-800 space-y-1">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                Cohen's Kappa (κ)
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-extrabold text-white font-mono">
                  {metrics.cohens_kappa.toFixed(3)}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${kappaInfo.color}`}>
                  {kappaInfo.label}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 block">Inter-rater reliability score</span>
            </div>

            {/* Percentage Agreement */}
            <div className="p-4 rounded-xl bg-gray-950/70 border border-gray-800 space-y-1">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                Percentage Agreement
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-extrabold text-teal-400 font-mono">
                  {metrics.percentage_agreement}%
                </span>
                <span className="text-xs text-gray-400">Exact Match</span>
              </div>
              <span className="text-[10px] text-gray-500 block">
                Within-1 Point: <strong className="text-emerald-400">{metrics.within_1_agreement}%</strong>
              </span>
            </div>

            {/* Mean Absolute Error */}
            <div className="p-4 rounded-xl bg-gray-950/70 border border-gray-800 space-y-1">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                Mean Absolute Difference
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-extrabold text-amber-400 font-mono">
                  {metrics.mean_absolute_difference.toFixed(3)}
                </span>
                <span className="text-xs text-gray-400">pts (1–5 scale)</span>
              </div>
              <span className="text-[10px] text-gray-500 block">Average point gap |LLM - Human|</span>
            </div>

            {/* Evaluation Progress */}
            <div className="p-4 rounded-xl bg-gray-950/70 border border-gray-800 space-y-1">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                Human Review Progress
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-extrabold text-emerald-400 font-mono">
                  {data?.evaluated_count} / {data?.total_samples}
                </span>
                <span className="text-xs text-emerald-300 font-semibold">100%</span>
              </div>
              <span className="text-[10px] text-gray-500 block">All 30 samples reviewed</span>
            </div>

          </div>
        )}

      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center space-x-2 text-emerald-300 text-xs font-semibold">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* 30-Sample Stepper Grid */}
      <div className="rounded-2xl glass-panel border border-gray-800 p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              30 Sample Selection Grid:
            </span>
            <span className="text-xs text-gray-400">Click any pill to evaluate that sample</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-30 cursor-pointer flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="font-mono text-gray-400">
              #{currentIndex + 1} / {data?.samples.length || 30}
            </span>
            <button
              onClick={() => setCurrentIndex((prev) => Math.min((data?.samples.length || 30) - 1, prev + 1))}
              disabled={currentIndex === (data?.samples.length || 30) - 1}
              className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-30 cursor-pointer flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-30 gap-1.5">
          {data?.samples.map((s, idx) => {
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={s.sample_order}
                onClick={() => setCurrentIndex(idx)}
                className={`h-8 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center cursor-pointer ${
                  isCurrent
                    ? 'bg-teal-500 text-gray-950 ring-2 ring-teal-400 shadow-md shadow-teal-500/40'
                    : 'bg-gray-950 hover:bg-gray-800 text-gray-300 border border-gray-800'
                }`}
                title={`Sample #${s.sample_order}: ${s.predicted_intent}`}
              >
                {s.sample_order}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Evaluation Workspace */}
      {currentSample && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Tweet, Intent, Escalation & Generated Reply (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="p-6 rounded-2xl glass-panel border border-gray-800 shadow-xl space-y-5">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-extrabold font-mono">
                    Sample #{currentSample.sample_order}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    ID: {currentSample.prediction_id || 'eval-sample'}
                  </span>
                </div>

                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[11px] font-semibold">
                  {currentSample.predicted_intent}
                </span>
              </div>

              {/* Customer Tweet Box */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                  Customer Tweet:
                </span>
                <div className="p-4 rounded-xl bg-gray-950/80 border border-gray-800 text-xs text-gray-100 leading-relaxed">
                  "{currentSample.customer_tweet}"
                </div>
              </div>

              {/* Escalation Decision Pill */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                  Escalation Triage Decision:
                </span>
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  currentSample.escalation_decision.escalation
                    ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                    : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                }`}>
                  <div className="flex items-center space-x-2 text-xs font-bold">
                    {currentSample.escalation_decision.escalation ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    <span>
                      {currentSample.escalation_decision.escalation ? 'Human Escalated' : 'Auto-Handled by AI'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-900 border border-gray-800">
                    Risk: {currentSample.escalation_decision.risk_level}
                  </span>
                </div>
              </div>

              {/* Generated Spotify Reply Box */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                  Generated Support Reply (@SpotifyCares):
                </span>
                <div className="p-4 rounded-xl bg-[#0B0F19] border border-gray-800 space-y-2.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-gray-950 text-[10px]">
                      SC
                    </div>
                    <span className="text-xs font-bold text-white">@SpotifyCares</span>
                    <span className="w-3 h-3 bg-blue-500 text-white rounded-full flex items-center justify-center text-[8px]">✓</span>
                  </div>
                  <p className="text-xs text-gray-200 leading-relaxed font-normal">
                    {currentSample.generated_reply}
                  </p>
                  <div className="text-[10px] text-gray-500 pt-1 border-t border-gray-800/60 font-mono">
                    {currentSample.generated_reply.length} / 280 chars
                  </div>
                </div>
              </div>

              {/* Expandable Retrieved Context */}
              <div className="pt-2">
                <button
                  onClick={() => setShowRetrievedContext(!showRetrievedContext)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gray-950 hover:bg-gray-800/80 border border-gray-800 text-xs text-gray-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-teal-400" />
                    <span>View Top 5 Retrieved Grounding Threads ({currentSample.retrieved_context?.length || 0})</span>
                  </div>
                  {showRetrievedContext ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showRetrievedContext && currentSample.retrieved_context && (
                  <div className="mt-3 space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {currentSample.retrieved_context.map((ctx, cIdx) => (
                      <div key={cIdx} className="p-3 rounded-lg bg-gray-950/90 border border-gray-800/80 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-gray-400">
                          <span className="font-mono font-bold text-teal-300">#{ctx.rank || cIdx + 1} Grounding</span>
                          <span className="text-emerald-400 font-mono font-bold">
                            {Math.round((ctx.similarity_score || 0.8) * 100)}% Match
                          </span>
                        </div>
                        <p className="text-gray-300 text-[11px]">
                          <strong>Historical Reply:</strong> "{ctx.agent_reply}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Right Column: Dual-Rater Rubric Evaluation (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* LLM Judge Scores Panel */}
            <div className="p-6 rounded-2xl glass-panel border border-blue-900/40 bg-gradient-to-r from-blue-950/20 via-gray-900 to-indigo-950/20 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">LLM Judge Rubric Evaluation</h3>
                    <span className="text-[11px] text-gray-400">Automated multi-criteria assessment</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="text-xs text-gray-400">Hallucination:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                    currentSample.llm_scores.hallucination === 'PASS'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}>
                    {currentSample.llm_scores.hallucination}
                  </span>
                </div>
              </div>

              {/* 4 Dimension Score Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: 'Correctness', score: currentSample.llm_scores.correctness },
                  { label: 'Groundedness', score: currentSample.llm_scores.groundedness },
                  { label: 'Empathy', score: currentSample.llm_scores.empathy },
                  { label: 'Actionability', score: currentSample.llm_scores.actionability }
                ].map((dim) => (
                  <div key={dim.label} className="p-3 rounded-xl bg-gray-950/80 border border-gray-800 text-center space-y-1">
                    <span className="text-[10px] text-gray-400 font-semibold block">{dim.label}</span>
                    <span className="text-lg font-extrabold text-blue-400 font-mono">{dim.score} / 5</span>
                  </div>
                ))}
              </div>

              {/* LLM Reasoning Callout */}
              <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-800 text-xs text-gray-300 font-normal leading-relaxed whitespace-pre-line">
                {currentSample.llm_scores.reasoning}
              </div>
            </div>

            {/* Interactive Human Evaluator Scoring Panel */}
            <div className="p-6 rounded-2xl glass-panel border border-teal-500/30 bg-gradient-to-r from-teal-950/20 via-gray-900 to-emerald-950/20 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Human Evaluator Review</h3>
                    <span className="text-[11px] text-gray-400">Assign ground-truth scores on 1–5 rubric</span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-bold">
                  Human-in-the-Loop
                </span>
              </div>

              {/* 4 Dimension Interactive Star / Button Selectors */}
              <div className="space-y-4">
                
                {/* 1. Correctness */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-gray-950/70 border border-gray-800">
                  <div>
                    <span className="text-xs font-bold text-white block">1. Correctness (1–5)</span>
                    <span className="text-[10px] text-gray-400">Does reply correctly address the customer issue?</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        onClick={() => setHumanCorrectness(val)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                          humanCorrectness === val
                            ? 'bg-teal-500 text-gray-950 shadow-md shadow-teal-500/30 font-extrabold scale-105'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Groundedness */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-gray-950/70 border border-gray-800">
                  <div>
                    <span className="text-xs font-bold text-white block">2. Groundedness (1–5)</span>
                    <span className="text-[10px] text-gray-400">Is every claim supported by retrieved Spotify threads?</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        onClick={() => setHumanGroundedness(val)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                          humanGroundedness === val
                            ? 'bg-teal-500 text-gray-950 shadow-md shadow-teal-500/30 font-extrabold scale-105'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Empathy */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-gray-950/70 border border-gray-800">
                  <div>
                    <span className="text-xs font-bold text-white block">3. Empathy (1–5)</span>
                    <span className="text-[10px] text-gray-400">Does the tone sound warm and supportive like @SpotifyCares?</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        onClick={() => setHumanEmpathy(val)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                          humanEmpathy === val
                            ? 'bg-teal-500 text-gray-950 shadow-md shadow-teal-500/30 font-extrabold scale-105'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Actionability */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-gray-950/70 border border-gray-800">
                  <div>
                    <span className="text-xs font-bold text-white block">4. Actionability (1–5)</span>
                    <span className="text-[10px] text-gray-400">Does it provide clear next steps or settings guidance?</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        onClick={() => setHumanActionability(val)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                          humanActionability === val
                            ? 'bg-teal-500 text-gray-950 shadow-md shadow-teal-500/30 font-extrabold scale-105'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Hallucination Check Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-gray-950/70 border border-gray-800">
                  <div>
                    <span className="text-xs font-bold text-white block">5. Hallucination Check</span>
                    <span className="text-[10px] text-gray-400">PASS = Zero fake refunds/credentials; FAIL = Invented info</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setHumanHallucination('PASS')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        humanHallucination === 'PASS'
                          ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/30'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      ✓ PASS
                    </button>
                    <button
                      onClick={() => setHumanHallucination('FAIL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        humanHallucination === 'FAIL'
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      ✗ FAIL
                    </button>
                  </div>
                </div>

              </div>

              {/* Human Evaluator Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                  Human Evaluator Notes:
                </label>
                <input
                  type="text"
                  value={humanNotes}
                  onChange={(e) => setHumanNotes(e.target.value)}
                  placeholder="Add optional notes regarding reply quality or edge cases..."
                  className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Save Controls */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-800">
                <button
                  onClick={() => handleSaveEvaluation(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Rating</span>
                </button>

                <button
                  onClick={() => handleSaveEvaluation(true)}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-gray-950 text-xs font-extrabold transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                >
                  <span>Save & Next Sample</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Bottom Section: Detailed Per-Dimension Inter-Rater Agreement Table */}
      {metrics && metrics.criteria_breakdown && (
        <div className="p-6 sm:p-8 rounded-2xl glass-panel border border-gray-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div>
              <h3 className="text-base font-bold text-white">
                5-Dimension Inter-Rater Agreement Breakdown
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Exact agreement percentage, tolerance within ±1 point, MAE, and Cohen's Kappa for each evaluation criterion.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-mono font-bold">
              30 Samples Analyzed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950/80 text-gray-400 font-semibold border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4">Evaluation Dimension</th>
                  <th className="py-3 px-4">Rubric Scale</th>
                  <th className="py-3 px-4">Exact Agreement (%)</th>
                  <th className="py-3 px-4">Within ±1 Pt (%)</th>
                  <th className="py-3 px-4">Mean Abs Diff (MAE)</th>
                  <th className="py-3 px-4">Cohen's Kappa (κ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-sans">
                {Object.entries(metrics.criteria_breakdown).map(([dimName, stat]) => (
                  <tr key={dimName} className="hover:bg-gray-900/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white capitalize">
                      {dimName}
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {dimName === 'hallucination' ? 'PASS / FAIL' : '1 – 5 Scale'}
                    </td>
                    <td className="py-3 px-4 font-mono text-teal-400 font-bold">
                      {stat.exact_agreement_pct}%
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                      {stat.within_1_agreement_pct}%
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-400 font-semibold">
                      {stat.mae.toFixed(3)}
                    </td>
                    <td className="py-3 px-4 font-mono text-white font-bold">
                      {stat.cohens_kappa.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
