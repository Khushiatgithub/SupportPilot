import React, { useState } from 'react';
import {
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Layers
} from 'lucide-react';
import type { EvaluationReport, ConfusionMatrixCell } from '../../types';
import { ConfusionMatrixModal } from './ConfusionMatrixModal';

interface EvaluationDashboardProps {
  report: EvaluationReport | null;
  onRunBenchmark: () => void;
  isRunningBenchmark: boolean;
}

const SHORT_LABELS: Record<string, string> = {
  BILLING_REFUND: 'Billing',
  TECHNICAL_ISSUE: 'Tech Issue',
  ACCOUNT_ACCESS: 'Account',
  ORDER_SHIPPING: 'Shipping',
  FEATURE_REQUEST: 'Feature',
  CANCELLATION_CHURN: 'Cancel',
  ESCALATION_COMPLAINT: 'Complaint',
  GENERAL_INQUIRY: 'General'
};

export const EvaluationDashboard: React.FC<EvaluationDashboardProps> = ({
  report,
  onRunBenchmark,
  isRunningBenchmark,
}) => {
  const [selectedCell, setSelectedCell] = useState<ConfusionMatrixCell | null>(null);

  if (!report) {
    return (
      <div className="p-12 text-center rounded-2xl glass-panel border border-gray-800 space-y-3">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-400">Loading benchmark evaluation metrics...</p>
      </div>
    );
  }

  const { labels, matrix, cell_details } = report.confusion_matrix;

  const getCellColor = (actual: string, predicted: string, count: number, maxRow: number) => {
    if (count === 0) return 'bg-gray-950/40 text-gray-600 border-gray-900';
    if (actual === predicted) {
      const ratio = count / Math.max(1, maxRow);
      if (ratio > 0.8) return 'bg-teal-500/80 text-gray-950 font-bold border-teal-400 shadow-sm shadow-teal-500/30';
      if (ratio > 0.5) return 'bg-teal-600/50 text-teal-100 font-semibold border-teal-500/50';
      return 'bg-teal-800/40 text-teal-200 border-teal-700/50';
    } else {
      return 'bg-rose-500/30 text-rose-200 font-semibold border-rose-500/40 hover:bg-rose-500/50';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Benchmark Header Banner */}
      <div className="p-6 rounded-2xl glass-panel border border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Model Evaluation & Confusion Matrix</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Standard test benchmark on <strong>{report.sample_size} labeled customer support tweets</strong> across 8 multi-class categories.
          </p>
        </div>

        <button
          onClick={onRunBenchmark}
          disabled={isRunningBenchmark}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-gray-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRunningBenchmark ? 'animate-spin' : ''}`} />
          <span>{isRunningBenchmark ? 'Benchmarking Classifier...' : 'Re-Run Evaluation Test'}</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        
        <div className="p-4 rounded-2xl glass-panel border border-gray-800">
          <span className="text-[11px] font-semibold text-gray-400">Classification Accuracy</span>
          <div className="mt-1.5 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-emerald-400">{(report.accuracy * 100).toFixed(1)}%</span>
          </div>
          <span className="text-[10px] text-gray-500 block mt-0.5">Overall Multiclass</span>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-gray-800">
          <span className="text-[11px] font-semibold text-gray-400">Macro F1-Score</span>
          <div className="mt-1.5 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-teal-300">{(report.f1_macro * 100).toFixed(1)}%</span>
          </div>
          <span className="text-[10px] text-gray-500 block mt-0.5">Balanced Across Classes</span>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-gray-800">
          <span className="text-[11px] font-semibold text-gray-400">Auto-Handle Rate</span>
          <div className="mt-1.5 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-teal-400">{(report.auto_handle_rate * 100).toFixed(1)}%</span>
          </div>
          <span className="text-[10px] text-teal-500 block mt-0.5">Autonomous Support</span>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-gray-800">
          <span className="text-[11px] font-semibold text-gray-400">Escalation Precision</span>
          <div className="mt-1.5 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-rose-400">{(report.escalation_precision * 100).toFixed(1)}%</span>
          </div>
          <span className="text-[10px] text-rose-500 block mt-0.5">Risk Flag Accuracy</span>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-gray-800">
          <span className="text-[11px] font-semibold text-gray-400">Inference Latency</span>
          <div className="mt-1.5 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-white font-mono">{report.avg_latency_ms} ms</span>
          </div>
          <span className="text-[10px] text-gray-500 block mt-0.5">Sub-millisecond Triage</span>
        </div>

      </div>

      {/* Interactive Confusion Matrix Section */}
      <div className="p-6 rounded-2xl glass-panel border border-gray-800 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-teal-400" />
              <span>Interactive Confusion Matrix (8x8 Intents)</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Rows represent <strong>Ground Truth Actual Intent</strong>; Columns represent <strong>AI Predicted Intent</strong>. Click any cell to inspect individual tweets.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-[11px] text-gray-400">
            <div className="flex items-center space-x-1.5">
              <div className="w-3 h-3 bg-teal-500 rounded" />
              <span>Accurate Match (Diagonal)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-3 h-3 bg-rose-500/40 rounded" />
              <span>Misclassification</span>
            </div>
          </div>
        </div>

        {/* Heatmap Grid Table */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[700px]">
            
            {/* Column Headers (Predicted) */}
            <div className="grid grid-cols-9 gap-1 text-[11px] font-bold text-gray-300 mb-1 text-center items-center">
              <div className="text-left text-gray-500 text-[10px] uppercase font-bold pl-1">Actual ↓ / Pred ➔</div>
              {labels.map((col) => (
                <div key={col} className="p-1 rounded bg-gray-900/80 text-teal-400 truncate text-[11px]" title={col}>
                  {SHORT_LABELS[col] || col}
                </div>
              ))}
            </div>

            {/* Rows (Actual) */}
            <div className="space-y-1">
              {labels.map((actualLabel, rowIdx) => {
                const rowSum = matrix[rowIdx] ? matrix[rowIdx].reduce((a, b) => a + b, 0) : 1;
                return (
                  <div key={actualLabel} className="grid grid-cols-9 gap-1 text-center items-center">
                    
                    {/* Row Header */}
                    <div className="text-left text-xs font-semibold text-gray-300 truncate pr-2" title={actualLabel}>
                      {SHORT_LABELS[actualLabel] || actualLabel}
                    </div>

                    {/* Matrix Cells */}
                    {labels.map((predLabel, colIdx) => {
                      const count = matrix[rowIdx] ? matrix[rowIdx][colIdx] : 0;
                      const cellDetail = cell_details.find(
                        (c) => c.actual === actualLabel && c.predicted === predLabel
                      ) || { actual: actualLabel, predicted: predLabel, count, percentage: Math.round((count / rowSum) * 100) };

                      return (
                        <button
                          key={predLabel}
                          onClick={() => setSelectedCell(cellDetail)}
                          className={`p-2 rounded-lg border text-xs transition-transform hover:scale-105 cursor-pointer ${getCellColor(
                            actualLabel,
                            predLabel,
                            count,
                            rowSum
                          )}`}
                          title={`Actual: ${actualLabel}\nPredicted: ${predLabel}\nCount: ${count} (${cellDetail.percentage}%)`}
                        >
                          <span className="block font-mono text-xs">{count}</span>
                        </button>
                      );
                    })}

                  </div>
                );
              })}
            </div>

          </div>
        </div>

      </div>

      {/* Per-Class Detailed Performance Table */}
      <div className="p-6 rounded-2xl glass-panel border border-gray-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-teal-400" />
          <span>Class-Level Precision, Recall & F1 Breakdown</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-gray-900/80 text-gray-400 uppercase text-[10px] font-bold border-b border-gray-800">
              <tr>
                <th className="py-2.5 px-3">Intent Class</th>
                <th className="py-2.5 px-3">Precision</th>
                <th className="py-2.5 px-3">Recall</th>
                <th className="py-2.5 px-3">F1-Score</th>
                <th className="py-2.5 px-3 text-right">Support Samples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-medium">
              {report.per_class_metrics.map((m) => (
                <tr key={m.intent} className="hover:bg-gray-900/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-white">
                    {m.intent.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2.5 px-3 text-teal-400 font-mono">
                    {(m.precision * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-teal-400 font-mono">
                    {(m.recall * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                      {(m.f1_score * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-400 font-mono">
                    {m.support}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Misclassified Samples Deep Dive */}
      {report.misclassified_samples && report.misclassified_samples.length > 0 && (
        <div className="p-6 rounded-2xl glass-panel border border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Misclassified Samples & Root-Cause Error Log ({report.misclassified_samples.length})</span>
            </h3>
            <span className="text-[11px] text-gray-400">Used for continuous fine-tuning feedback</span>
          </div>

          <div className="space-y-2.5">
            {report.misclassified_samples.map((sample) => (
              <div key={sample.id} className="p-3.5 rounded-xl bg-gray-950/70 border border-gray-800 text-xs space-y-2">
                <div className="flex items-center justify-between text-gray-400 text-[11px]">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">#{sample.id}</span>
                    <span>Actual: <strong className="text-white">{sample.actual_intent}</strong></span>
                    <span>➔ Predicted: <strong className="text-rose-400">{sample.predicted_intent}</strong></span>
                  </div>
                  <span className="text-teal-400 font-mono">Conf: {(sample.confidence * 100).toFixed(1)}%</span>
                </div>

                <p className="text-gray-200 font-normal leading-relaxed">
                  "{sample.tweet_text}"
                </p>

                <div className="text-[11px] text-gray-500">
                  Diagnosis: {sample.error_type} • Sentiment Tone: {sample.sentiment}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Inspector on Cell Click */}
      <ConfusionMatrixModal
        cell={selectedCell}
        onClose={() => setSelectedCell(null)}
        misclassifiedSamples={report.misclassified_samples || []}
      />

    </div>
  );
};
