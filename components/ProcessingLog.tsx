import React from "react";
import { Loader2, AlertTriangle, Play } from "lucide-react";

interface ProcessingLogProps {
  currentBatch: number;
  totalBatches: number;
  totalProcessedCount: number;
  rawRowsCount: number;
  isProcessing: boolean;
  processingError: string | null;
  startMapping: (resumeFromBatch: number) => void;
}

export default function ProcessingLog({
  currentBatch,
  totalBatches,
  totalProcessedCount,
  rawRowsCount,
  isProcessing,
  processingError,
  startMapping
}: ProcessingLogProps) {
  const percentComplete = totalBatches > 0 ? Math.round((currentBatch / totalBatches) * 100) : 0;

  return (
    <div className="max-w-xl mx-auto py-12" id="processing_stage">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-slate-100 dark:bg-slate-850 animate-ping opacity-75" />
            <div className="relative w-16 h-16 bg-slate-900 dark:bg-slate-100 rounded-full flex items-center justify-center text-white dark:text-slate-900">
              <Loader2 className="h-8 w-8 text-indigo-400 dark:text-indigo-600 animate-spin" />
            </div>
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-900 dark:text-white">AI Engine Processing</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm leading-relaxed">
          Mapping raw CSV records in batches. This maps custom headers, normalizes dates, filters contacts, and standardizes lead profiles.
        </p>

        <div className="mt-8 space-y-2">
          <div className="flex justify-between text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
            <span>Mapping Progress</span>
            <span>Batch {currentBatch} of {totalBatches} ({percentComplete}%)</span>
          </div>
          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-900 dark:bg-indigo-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono mt-1">
            Processed {totalProcessedCount} of {rawRowsCount} rows
          </p>
        </div>

        <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-left">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 font-mono">Live Operations</h4>
          <div className="text-xs font-mono space-y-1.5 text-slate-650 dark:text-slate-400">
            <div className="flex justify-between">
              <span>CSV Ingestion:</span>
              <span className="text-emerald-600 dark:text-emerald-450 font-semibold">Active</span>
            </div>
            <div className="flex justify-between">
              <span>Format validation:</span>
              <span>Enforcing target constraints</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1.5">
              <span>Status:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse">
                {isProcessing ? "Processing batch payload..." : "Interrupted"}
              </span>
            </div>
          </div>
        </div>

        {processingError && (
          <div className="mt-6 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-xl p-4 text-left">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-rose-800 dark:text-rose-250">Processing Interrupted</h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{processingError}</p>
                <button
                  onClick={() => startMapping(currentBatch)}
                  className="mt-3 inline-flex items-center px-3 py-1.5 bg-rose-100 dark:bg-rose-900/50 hover:bg-rose-200 dark:hover:bg-rose-800 text-rose-800 dark:text-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Resume from batch {currentBatch + 1}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
