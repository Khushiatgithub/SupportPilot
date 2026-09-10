import React, { useState, useEffect } from 'react';
import {
  Zap,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Clock,
  Send,
  Layers,
  Activity,
  Award,
  Database
} from 'lucide-react';
import type {
  PredictIntentResponse,
  ClassifierEvaluationReport,
  SavedPrediction
} from '../../types';
import {
  predictIntent,
  fetchClassifierEvaluation,
  retrainClassifier,
  fetchRecentPredictions
} from '../../lib/api';

const SAMPLE_PROMPTS = [
  {
    label: "Billing / Card Issue",
    icon: "💳",
    text: "@SpotifyCares Payment failed when renewing with Visa debit card. Bank says transaction was blocked by merchant."
  },
  {
    label: "App Crash / Freeze",
    icon: "📱",
    text: "@SpotifyCares App crashes immediately upon tapping the 'Your Library' tab on iOS 17. Crash log generated."
  },
  {
    label: "Smart Speaker Connect",
    icon: "🔊",
    text: "@SpotifyCares My Sonos speakers can no longer find Spotify Connect after the latest firmware update."
  },
  {
    label: "Student Verification",
    icon: "🎓",
    text: "@SpotifyCares Having trouble renewing my Student Discount verification with SheerID. Says university email invalid."
  },
  {
    label: "Password & 2FA Reset",
    icon: "🔐",
    text: "@SpotifyCares Can't log into my account. Password reset email is not arriving in my inbox or spam folder."
  },
  {
    label: "Offline Sync / Airplane",
    icon: "✈️",
    text: "@SpotifyCares Downloaded songs are greyed out and unplayable in offline mode on airplane flight."
  },
  {
    label: "Feature Request",
    icon: "✨",
    text: "@SpotifyCares Feature request: Please allow uploading custom playlist cover art images directly from mobile phone!"
  },
  {
    label: "Audio Quality Glitch",
    icon: "🎧",
    text: "@SpotifyCares Audio crackling and popping sound distortion on high volume through wired headphones."
  }
];

const INTENT_BADGE_STYLES: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', bar: 'bg-purple-500' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', bar: 'bg-cyan-500' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', bar: 'bg-rose-500' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', bar: 'bg-emerald-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', bar: 'bg-amber-500' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', bar: 'bg-blue-500' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/30', bar: 'bg-teal-500' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30', bar: 'bg-indigo-500' }
};

export const TestClassifierView: React.FC = () => {
  const [tweetInput, setTweetInput] = useState<string>('');
  const [prediction, setPrediction] = useState<PredictIntentResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Evaluation & History State
  const [evalReport, setEvalReport] = useState<ClassifierEvaluationReport | null>(null);
  const [isLoadingEval, setIsLoadingEval] = useState<boolean>(false);
  const [isRetraining, setIsRetraining] = useState<boolean>(false);
  const [recentPredictions, setRecentPredictions] = useState<SavedPrediction[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'tester' | 'evaluation' | 'history'>('tester');

  // Load evaluation metrics and recent predictions on mount
  useEffect(() => {
    loadEvaluation();
    loadPredictions();
  }, []);

  const loadEvaluation = async () => {
    setIsLoadingEval(true);
    try {
      const data = await fetchClassifierEvaluation();
      setEvalReport(data);
    } catch (err) {
      console.error('Failed to load classifier evaluation:', err);
    } finally {
      setIsLoadingEval(false);
    }
  };

  const loadPredictions = async () => {
    try {
      const res = await fetchRecentPredictions(15, 0);
      setRecentPredictions(res.predictions);
    } catch (err) {
      console.error('Failed to load recent predictions:', err);
    }
  };

  const handlePredict = async () => {
    if (!tweetInput.trim()) {
      setErrorMsg('Please enter a customer tweet to classify.');
      return;
    }

    setErrorMsg(null);
    setIsPredicting(true);
    try {
      const res = await predictIntent({ customer_tweet: tweetInput.trim() });
      setPrediction(res);
      await loadPredictions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Classification request failed');
    } finally {
      setIsPredicting(false);
    }
  };

  const handleRetrain = async () => {
    setIsRetraining(true);
    try {
      const data = await retrainClassifier();
      setEvalReport(data);
    } catch (err) {
      console.error('Failed to retrain classifier:', err);
    } finally {
      setIsRetraining(false);
    }
  };

  const getStyleForColor = (colorName?: string) => {
    return INTENT_BADGE_STYLES[colorName || 'teal'] || INTENT_BADGE_STYLES.teal;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Production Intent Classifier
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  Sentence Embeddings + Nearest Centroid
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Real-time Spotify intent classification with cosine similarity centroids, calibrated confidence & top-3 ranking.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center space-x-2 bg-gray-900 p-1 rounded-xl border border-gray-800">
          <button
            onClick={() => setActiveSubTab('tester')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'tester'
                ? 'bg-teal-500 text-gray-950 shadow-md shadow-teal-500/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Live Tester
          </button>
          <button
            onClick={() => setActiveSubTab('evaluation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'evaluation'
                ? 'bg-teal-500 text-gray-950 shadow-md shadow-teal-500/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Evaluation & Matrix
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'history'
                ? 'bg-teal-500 text-gray-950 shadow-md shadow-teal-500/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Prediction History
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: LIVE TESTER */}
      {/* ========================================================================= */}
      {activeSubTab === 'tester' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input Panel & Prompt Chips (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 rounded-2xl bg-[#0F1420] border border-gray-800 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  Customer Tweet Text
                </label>
                <span className="text-xs text-gray-500">{tweetInput.length} chars</span>
              </div>

              <textarea
                value={tweetInput}
                onChange={(e) => setTweetInput(e.target.value)}
                placeholder="Paste or type a Spotify customer tweet inquiry here (e.g. '@SpotifyCares my card was billed twice for family plan...')..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-gray-900/90 border border-gray-800 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all resize-none font-sans"
              />

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Predict Button */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-gray-500">
                  Endpoint: <code className="text-teal-400 font-mono">POST /predict-intent</code>
                </span>
                <button
                  onClick={handlePredict}
                  disabled={isPredicting || !tweetInput.trim()}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-gray-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
                >
                  {isPredicting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-gray-950" />
                      <span>Classifying Tweet...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-gray-950" />
                      <span>Predict Intent</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Test Prompt Chips */}
            <div className="p-5 rounded-2xl bg-[#0F1420]/80 border border-gray-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-teal-400" />
                  Quick Test Scenarios (8 Spotify Intents)
                </span>
                <span className="text-[11px] text-gray-500">Click to fill</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SAMPLE_PROMPTS.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTweetInput(sample.text);
                      setErrorMsg(null);
                    }}
                    className="p-2 rounded-xl bg-gray-900 border border-gray-800 hover:border-teal-500/40 hover:bg-gray-800/60 text-left transition-all group"
                  >
                    <div className="text-base mb-1">{sample.icon}</div>
                    <div className="text-[11px] font-semibold text-gray-300 group-hover:text-teal-300 line-clamp-1">
                      {sample.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Prediction Results Card (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {prediction ? (
              <div className="p-6 rounded-2xl bg-[#0F1420] border border-teal-500/30 shadow-xl shadow-teal-950/20 space-y-6 animate-fadeIn">
                {/* Latency & Status header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-gray-300">Predicted Intent</span>
                  </div>
                  <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-xs font-bold">
                    <Clock className="w-3 h-3" />
                    <span>{prediction.latency_ms.toFixed(1)} ms</span>
                  </div>
                </div>

                {/* Main Predicted Intent Badge */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                      {prediction.intent_code}
                    </span>
                    <span className="text-xs text-gray-500">Rank #1</span>
                  </div>
                  <h2 className="text-lg font-black text-white leading-snug">
                    {prediction.predicted_intent}
                  </h2>
                  {prediction.description && (
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {prediction.description}
                    </p>
                  )}
                </div>

                {/* Confidence Progress Bar */}
                <div className="space-y-2 p-4 rounded-xl bg-gray-900/90 border border-gray-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-teal-400" />
                      Prediction Confidence
                    </span>
                    <span className="font-mono font-black text-teal-300 text-sm">
                      {(prediction.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-300 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, prediction.confidence * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Top 3 Intents Breakdown */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-teal-400" />
                    Top 3 Ranked Intent Probabilities
                  </h3>

                  <div className="space-y-2">
                    {prediction.top_3_intents.map((item, idx) => {
                      const style = getStyleForColor(item.badge_color);
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center space-x-2 min-w-0 pr-2">
                            <span className="font-mono text-gray-500 font-bold shrink-0">#{idx + 1}</span>
                            <span className="text-gray-200 font-medium truncate">{item.intent}</span>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className={`h-full ${style.bar}`}
                                style={{ width: `${Math.min(100, item.confidence * 100)}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-teal-400 text-xs">
                              {(item.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-gray-500 flex items-center justify-between border-t border-gray-800/80">
                  <span>Saved to <code className="text-gray-400 font-mono">predictions</code> table</span>
                  <span className="text-emerald-400 font-medium">true_intent preserved</span>
                </div>
              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-[#0F1420] border border-gray-800 flex flex-col items-center justify-center text-center space-y-3 text-gray-500">
                <div className="p-3 rounded-2xl bg-gray-900 border border-gray-800 text-gray-600">
                  <Zap className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-gray-300">Ready to Classify</h3>
                <p className="text-xs text-gray-500 max-w-xs">
                  Enter a customer tweet on the left or select one of the quick test scenarios to predict intent.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: EVALUATION & CONFUSION MATRIX */}
      {/* ========================================================================= */}
      {activeSubTab === 'evaluation' && (
        isLoadingEval ? (
          <div className="p-16 rounded-2xl bg-[#0F1420] border border-gray-800 flex flex-col items-center justify-center text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
            <span className="text-sm font-bold text-gray-300">Computing 80/20 Stratified Evaluation Benchmark...</span>
            <p className="text-xs text-gray-500">Evaluating Baseline and Final Nearest Centroid models on test dataset.</p>
          </div>
        ) : (
        <div className="space-y-6">
          {/* Top KPI Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Final Model Accuracy */}
            <div className="p-5 rounded-2xl bg-[#0F1420] border border-teal-500/30 space-y-1">
              <span className="text-xs text-gray-400 font-medium">Final Model Accuracy</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-white">
                  {evalReport ? `${(evalReport.final_model.accuracy * 100).toFixed(2)}%` : '--'}
                </span>
                <span className="text-xs font-semibold text-emerald-400">Nearest Centroid</span>
              </div>
              <span className="text-[11px] text-gray-500 block">Baseline: {evalReport ? `${(evalReport.baseline_model.accuracy * 100).toFixed(2)}%` : '--'}</span>
            </div>

            {/* Macro Precision */}
            <div className="p-5 rounded-2xl bg-[#0F1420] border border-gray-800 space-y-1">
              <span className="text-xs text-gray-400 font-medium">Macro Precision</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-teal-300">
                  {evalReport ? `${(evalReport.final_model.macro_precision * 100).toFixed(2)}%` : '--'}
                </span>
              </div>
              <span className="text-[11px] text-gray-500 block">Balanced across all 8 classes</span>
            </div>

            {/* Macro Recall */}
            <div className="p-5 rounded-2xl bg-[#0F1420] border border-gray-800 space-y-1">
              <span className="text-xs text-gray-400 font-medium">Macro Recall</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-teal-300">
                  {evalReport ? `${(evalReport.final_model.macro_recall * 100).toFixed(2)}%` : '--'}
                </span>
              </div>
              <span className="text-[11px] text-gray-500 block">80/20 Stratified Test Set</span>
            </div>

            {/* Macro F1 Score */}
            <div className="p-5 rounded-2xl bg-[#0F1420] border border-teal-500/30 space-y-1">
              <span className="text-xs text-gray-400 font-medium">Macro F1 Score</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-emerald-400">
                  {evalReport ? `${(evalReport.final_model.macro_f1 * 100).toFixed(2)}%` : '--'}
                </span>
                <span className="text-xs font-semibold text-teal-400">Production</span>
              </div>
              <span className="text-[11px] text-gray-500 block">Baseline F1: {evalReport ? `${(evalReport.baseline_model.macro_f1 * 100).toFixed(2)}%` : '--'}</span>
            </div>
          </div>

          {/* Model Comparison Table */}
          {evalReport && (
            <div className="p-6 rounded-2xl bg-[#0F1420] border border-gray-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-teal-400" />
                    Model Comparison: Baseline vs Final Model
                  </h3>
                  <p className="text-xs text-gray-400">
                    Evaluated on {evalReport.dataset_info.test_samples} test conversations ({evalReport.dataset_info.split_ratio})
                  </p>
                </div>

                <button
                  onClick={handleRetrain}
                  disabled={isRetraining}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetraining ? 'animate-spin text-teal-400' : ''}`} />
                  <span>{isRetraining ? 'Retraining...' : 'Re-train & Evaluate'}</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-gray-900 border-b border-gray-800 text-[11px] font-bold text-gray-400 uppercase">
                    <tr>
                      <th className="py-3 px-4">Model Architecture</th>
                      <th className="py-3 px-4">Accuracy</th>
                      <th className="py-3 px-4">Macro Precision</th>
                      <th className="py-3 px-4">Macro Recall</th>
                      <th className="py-3 px-4">Macro F1</th>
                      <th className="py-3 px-4">Deployment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    <tr className="hover:bg-gray-900/40">
                      <td className="py-3 px-4 font-semibold text-gray-200">
                        {evalReport.baseline_model.model_name}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-teal-300">
                        {(evalReport.baseline_model.accuracy * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-300">
                        {(evalReport.baseline_model.macro_precision * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-300">
                        {(evalReport.baseline_model.macro_recall * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {(evalReport.baseline_model.macro_f1 * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-400">
                          Baseline Reference
                        </span>
                      </td>
                    </tr>
                    <tr className="bg-teal-500/5 hover:bg-teal-500/10">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-400" />
                        {evalReport.final_model.model_name}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-emerald-400">
                        {(evalReport.final_model.accuracy * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 font-mono text-teal-300 font-bold">
                        {(evalReport.final_model.macro_precision * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 font-mono text-teal-300 font-bold">
                        {(evalReport.final_model.macro_recall * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-emerald-400">
                        {(evalReport.final_model.macro_f1 * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Production Active
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Per-Intent F1 Classification Report Table */}
          {evalReport && (
            <div className="p-6 rounded-2xl bg-[#0F1420] border border-gray-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-400" />
                  Per-Intent Classification Report Table (Final Model)
                </h3>
                <p className="text-xs text-gray-400">
                  Precision, Recall, F1-Score and Test Support across all 8 Spotify customer support intents.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-gray-900 border-b border-gray-800 text-[11px] font-bold text-gray-400 uppercase">
                    <tr>
                      <th className="py-3 px-4">Intent Name & Code</th>
                      <th className="py-3 px-4">Precision</th>
                      <th className="py-3 px-4">Recall</th>
                      <th className="py-3 px-4">F1-Score</th>
                      <th className="py-3 px-4">Test Support</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {evalReport.final_model.per_intent_table.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-900/40">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-100">{row.intent_name}</div>
                          <div className="text-[10px] font-mono text-teal-400">{row.intent_code}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-300">
                          {(row.precision * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-300">
                          {(row.recall * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {(row.f1_score * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-400">
                          {row.support} samples
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 8x8 Confusion Matrix Heatmap */}
          {evalReport && (
            <div className="p-6 rounded-2xl bg-[#0F1420] border border-gray-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-400" />
                  8 × 8 Intent Confusion Matrix
                </h3>
                <p className="text-xs text-gray-400">
                  Rows represent Actual Intent classes, columns represent Predicted Intent classes.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="text-center text-[10px] font-mono border border-gray-800 w-full">
                  <thead>
                    <tr className="bg-gray-900 text-gray-400">
                      <th className="p-2 text-left text-[11px] uppercase font-sans">Actual \ Predicted</th>
                      {evalReport.final_model.labels.map((lbl, idx) => (
                        <th key={idx} className="p-2 truncate max-w-[100px]" title={lbl}>
                          #{idx + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {evalReport.final_model.confusion_matrix.map((row, rIdx) => {
                      const rowLabel = evalReport.final_model.labels[rIdx];
                      return (
                        <tr key={rIdx} className="border-t border-gray-800/80">
                          <td className="p-2 text-left text-gray-300 font-sans font-semibold truncate max-w-[200px]" title={rowLabel}>
                            #{rIdx + 1} {rowLabel}
                          </td>
                          {row.map((val, cIdx) => {
                            const isDiagonal = rIdx === cIdx;
                            const cellBg = isDiagonal
                              ? val > 0
                                ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30'
                                : 'bg-gray-900/40 text-gray-600'
                              : val > 0
                              ? 'bg-rose-500/20 text-rose-300 font-bold'
                              : 'text-gray-600';
                            return (
                              <td key={cIdx} className={`p-2 ${cellBg}`}>
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        )
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: PREDICTION HISTORY */}
      {/* ========================================================================= */}
      {activeSubTab === 'history' && (
        <div className="p-6 rounded-2xl bg-[#0F1420] border border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-400" />
                Live Predictions Log (<code className="text-teal-400 font-mono text-xs">predictions</code> table)
              </h3>
              <p className="text-xs text-gray-400">
                Audit log of all queries classified by the production engine.
              </p>
            </div>
            <button
              onClick={loadPredictions}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-900 border-b border-gray-800 text-[11px] font-bold text-gray-400 uppercase">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4 w-1/2">Customer Tweet</th>
                  <th className="py-3 px-4">Predicted Intent</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {recentPredictions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No predictions logged yet. Test a tweet in the Live Tester tab!
                    </td>
                  </tr>
                ) : (
                  recentPredictions.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-900/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-gray-500">#{p.id}</td>
                      <td className="py-3 px-4 text-gray-100 font-sans">{p.customer_tweet}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                          {p.predicted_intent}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                        {(p.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-400 text-[11px]">
                        {p.latency_ms.toFixed(1)} ms
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-[11px] whitespace-nowrap">
                        {p.created_at ? new Date(p.created_at).toLocaleTimeString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
