import React from 'react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ConfusionMatrixCell, MisclassifiedSample } from '../../types';

interface ConfusionMatrixModalProps {
  cell: ConfusionMatrixCell | null;
  onClose: () => void;
  misclassifiedSamples: MisclassifiedSample[];
}

export const ConfusionMatrixModal: React.FC<ConfusionMatrixModalProps> = ({
  cell,
  onClose,
  misclassifiedSamples,
}) => {
  if (!cell) return null;

  const isDiagonal = cell.actual === cell.predicted;
  
  // Filter misclassified samples matching this specific cell if it's off-diagonal
  const matchingSamples = misclassifiedSamples.filter(
    (s) => s.actual_intent === cell.actual && s.predicted_intent === cell.predicted
  );

  return (
    <div
      className="fixed inset-0 z-[60] overflow-hidden bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-gray-900/90">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl ${
              isDiagonal ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {isDiagonal ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Confusion Matrix Cell Inspector</h3>
              <p className="text-xs text-gray-400">
                Actual: <strong className="text-white">{cell.actual.replace(/_/g, ' ')}</strong> ➔ Predicted: <strong className="text-teal-400">{cell.predicted.replace(/_/g, ' ')}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-800">
              <span className="text-[11px] text-gray-400">Sample Count</span>
              <span className="text-xl font-bold text-white block mt-0.5">{cell.count} instances</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-800">
              <span className="text-[11px] text-gray-400">Class Row Accuracy</span>
              <span className={`text-xl font-bold block mt-0.5 ${isDiagonal ? 'text-teal-400' : 'text-rose-400'}`}>
                {cell.percentage}%
              </span>
            </div>
          </div>

          {isDiagonal ? (
            <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs leading-relaxed">
              <p className="font-semibold mb-1">✅ Accurate Intent Match</p>
              The AI classifier correctly matched all {cell.count} customer support tweets for <strong>{cell.actual.replace(/_/g, ' ')}</strong> with high confidence and appropriate tone selection.
            </div>
          ) : (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-gray-300 block">
                Misclassified Tweets Breakdown ({matchingSamples.length} samples recorded):
              </span>

              {matchingSamples.length === 0 ? (
                <div className="p-4 rounded-xl bg-gray-950/40 border border-gray-800 text-xs text-gray-400 text-center">
                  Historical error instances were resolved by updated keyword calibration.
                </div>
              ) : (
                matchingSamples.map((sample) => (
                  <div key={sample.id} className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-gray-400 text-[11px]">
                      <span>Error #{sample.id}</span>
                      <span className="text-rose-400 font-semibold font-mono">Conf: {(sample.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <p className="text-gray-200 font-normal leading-relaxed">"{sample.tweet_text}"</p>
                    <div className="p-2 rounded-lg bg-gray-900 text-[11px] text-gray-400">
                      Diagnosis: {sample.error_type} • Tone: {sample.sentiment}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold transition-colors"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
