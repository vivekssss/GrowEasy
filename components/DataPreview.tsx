import React from "react";
import { FileSpreadsheet, RotateCcw, Play, Table } from "lucide-react";

interface RawRecord {
  [key: string]: string;
}

interface DataPreviewProps {
  fileName: string;
  rawRows: RawRecord[];
  rawHeaders: string[];
  handleReset: () => void;
  startMapping: () => void;
}

export default function DataPreview({
  fileName,
  rawRows,
  rawHeaders,
  handleReset,
  startMapping
}: DataPreviewProps) {
  return (
    <div className="space-y-6" id="preview_stage">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5 text-indigo-500 shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white break-all">{fileName}</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Loaded <span className="font-semibold text-slate-800 dark:text-slate-200">{rawRows.length} rows</span>. Ready for AI processing.
          </p>
        </div>

        <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleReset}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3.5 py-2 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset
          </button>
          <button
            onClick={startMapping}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-xs sm:text-sm font-medium rounded-lg text-white dark:text-slate-950 shadow-sm transition-colors cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Confirm & Map
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm" id="preview_table_container">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-450 flex items-center">
            <Table className="h-4 w-4 mr-1.5 shrink-0" /> Raw CSV Preview (Showing first 15 rows)
          </h3>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">Headers found: {rawHeaders.length}</span>
            <span className="inline-flex sm:hidden text-[10px] bg-slate-150 dark:bg-slate-800 text-slate-600 dark:text-slate-350 px-2 py-0.5 rounded-full font-mono font-semibold animate-pulse">
              Swipe Horizontal ↔
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white dark:bg-slate-900 shadow-[0_1px_0_0_rgba(226,232,240,1)] dark:shadow-[0_1px_0_0_rgba(30,41,59,1)] z-[1]">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-450 bg-slate-50 dark:bg-slate-900/80 border-r border-slate-100 dark:border-slate-800 text-center w-12 font-mono">#</th>
                {rawHeaders.map((header) => (
                  <th key={header} className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/80 capitalize truncate max-w-xs border-r border-slate-100 dark:border-slate-800 last:border-r-0">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rawRows.slice(0, 15).map((row, index) => (
                <tr key={index} className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-slate-400 dark:text-slate-500 border-r border-slate-100 dark:border-slate-800 text-center bg-slate-50/30 dark:bg-slate-900/10">{index + 1}</td>
                  {rawHeaders.map((header) => (
                    <td key={header} className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 truncate max-w-xs border-r border-slate-100 dark:border-slate-800 last:border-r-0 font-mono text-xs">
                      {row[header] || <span className="text-slate-300 dark:text-slate-600 italic">null</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rawRows.length > 15 && (
          <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500">
            Showing first 15 records of {rawRows.length} total rows. Confirm import to map the full file.
          </div>
        )}
      </div>
    </div>
  );
}
