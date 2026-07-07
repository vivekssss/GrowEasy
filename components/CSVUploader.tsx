import React from "react";
import { Upload, FileSpreadsheet, Loader2, Sparkles, Download, Info } from "lucide-react";
import { motion } from "motion/react";

interface CSVUploaderProps {
  isDragging: boolean;
  isIngesting: boolean;
  fileName: string;
  ingestProgress: number;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  triggerFileSelect: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  downloadDemoCSV: () => void;
}

export default function CSVUploader({
  isDragging,
  isIngesting,
  fileName,
  ingestProgress,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  triggerFileSelect,
  fileInputRef,
  handleFileChange,
  downloadDemoCSV
}: CSVUploaderProps) {
  return (
    <div className="max-w-2xl mx-auto" id="upload_stage">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Intelligent CRM Onboarding</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Onboard custom spreadsheets or CSV exports from Facebook, Google Ads, or marketing agencies. Our engine translates raw headers and inconsistent rows into uniform GrowEasy leads.
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={isIngesting ? undefined : triggerFileSelect}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 relative overflow-hidden ${
          isDragging
            ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 scale-[1.02] shadow-md shadow-indigo-100/50"
            : isIngesting
            ? "border-emerald-500 bg-emerald-50/20 cursor-default"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-700 hover:shadow-sm cursor-pointer"
        }`}
        id="drag_drop_zone"
      >
        {isIngesting ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-6"
            id="ingest_loader"
          >
            <motion.div
              animate={{
                y: [0, -12, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.2,
                ease: "easeInOut",
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500 text-white rounded-2xl border border-emerald-400 flex items-center justify-center mb-6 shadow-lg shadow-emerald-200"
            >
              <FileSpreadsheet className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </motion.div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Loader2 className="h-4.5 w-4.5 animate-spin text-emerald-600" />
              Ingesting {fileName}...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              Extracting structural rows and columns
            </p>

            <div className="w-48 sm:w-64 bg-slate-150 dark:bg-slate-800 h-2 rounded-full mt-6 overflow-hidden border border-slate-200 dark:border-slate-700">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-100"
                style={{ width: `${ingestProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono text-emerald-600 font-semibold mt-2">{ingestProgress}%</span>
          </motion.div>
        ) : (
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />

            <motion.div
              animate={isDragging ? { y: [0, -8, 0] } : {}}
              transition={isDragging ? { repeat: Infinity, duration: 1, ease: "easeInOut" } : {}}
              className={`mx-auto w-16 h-16 rounded-2xl border flex items-center justify-center mb-4 shadow-sm transition-all duration-300 ${
                isDragging
                  ? "bg-indigo-600 border-indigo-500 text-white scale-110 shadow-indigo-200"
                  : "bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-800 text-slate-450 dark:text-slate-500"
              }`}
            >
              <Upload className={`h-8 w-8 transition-colors ${isDragging ? "text-white" : "text-slate-600 dark:text-slate-400"}`} />
            </motion.div>

            <h3 className={`text-lg font-semibold transition-colors duration-300 ${isDragging ? "text-indigo-900 font-bold" : "text-slate-900 dark:text-white"}`}>
              {isDragging ? "Drop your CSV here!" : "Upload your raw CSV"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
              {isDragging ? "Release your file to begin instant ingestion" : "Drag and drop your spreadsheet file here, or click to browse directories."}
            </p>
            <div className={`mt-6 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all duration-300 ${
              isDragging ? "bg-indigo-100 text-indigo-700 font-semibold scale-105" : "bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-305"
            }`}>
              <span>Accepted file format: .csv</span>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 bg-slate-900 dark:bg-slate-900/60 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" id="demo_csv_download_callout">
        <div className="space-y-1">
          <h4 className="font-semibold text-sm flex items-center gap-1.5 text-indigo-300">
            <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
            No test file?
          </h4>
          <p className="text-xs text-slate-350 max-w-md leading-relaxed">
            Download our custom **Mock Leads Template**. It has complex structures, missing fields, and multiple contacts designed to showcase AI parsing capabilities.
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadDemoCSV();
          }}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm shrink-0 transition-colors cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Get Mock CSV</span>
        </button>
      </div>

      <div className="mt-6 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4 flex items-start space-x-3 text-sm text-blue-800 dark:text-blue-200">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold">Local Parsing Flow</h4>
          <p className="mt-1 text-blue-700/95 dark:text-blue-300 leading-relaxed">
            CSV data is parsed instantly inside your browser. No contents are processed on the server until you verify and initiate the AI Import.
          </p>
        </div>
      </div>
    </div>
  );
}
