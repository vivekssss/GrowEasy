"use client";

import React, { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import Papa from "papaparse";
import { Sparkles, ShieldCheck, Check } from "lucide-react";
import { AnimatePresence } from "motion/react";

import ThemeToggle from "@/components/ThemeToggle";
import ApiKeyConfig from "@/components/ApiKeyConfig";
import CSVUploader from "@/components/CSVUploader";
import DataPreview from "@/components/DataPreview";
import ProcessingLog from "@/components/ProcessingLog";
import ResultsDashboard from "@/components/ResultsDashboard";

interface RawRecord {
  [key: string]: string;
}

interface CRMRecord {
  created_at: string;
  name: string | null;
  email: string | null;
  country_code: string | null;
  mobile_without_country_code: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lead_owner: string | null;
  crm_status: "GOOD_LEAD_FOLLOW_UP" | "DID_NOT_CONNECT" | "BAD_LEAD" | "SALE_DONE" | null;
  crm_note: string | null;
  data_source: "leads_on_demand" | "meridian_tower" | "eden_park" | "varah_swamy" | "sarjapur_plots" | null;
  possession_time: string | null;
  description: string | null;
}

interface ExtractedResult {
  originalIndex: number;
  isSkipped: boolean;
  skipReason: string | null;
  extracted: CRMRecord | null;
}

type StepType = "upload" | "preview" | "processing" | "results";

const BATCH_SIZE = 15;

export default function Home() {
  const [step, setStep] = useState<StepType>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawRecord[]>([]);

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [scrollTop, setScrollTop] = useState<number>(0);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const [provider, setProvider] = useState<"gemini" | "openai" | "anthropic">("gemini");
  const [customApiKey, setCustomApiKey] = useState<string>("");
  const [hasServerError, setHasServerError] = useState<boolean>(false);

  const [currentBatch, setCurrentBatch] = useState<number>(0);
  const [totalBatches, setTotalBatches] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const [mappedLeads, setMappedLeads] = useState<CRMRecord[]>([]);
  const [skippedLeads, setSkippedLeads] = useState<{ originalRow: RawRecord; reason: string; rowIndex: number }[]>([]);
  const [totalProcessedCount, setTotalProcessedCount] = useState<number>(0);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [ingestProgress, setIngestProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"mapped" | "skipped">("mapped");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = typeof localStorage !== "undefined" && localStorage.getItem ? localStorage.getItem("theme") as "light" | "dark" | null : null;
      const systemTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      const initialTheme = savedTheme || systemTheme;
      setTheme(initialTheme);
      if (initialTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = typeof localStorage !== "undefined" && localStorage.getItem ? localStorage.getItem(`groweasy_key_${provider}`) || "" : "";
      setCustomApiKey(savedKey);
    }
  }, [provider]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      if (typeof localStorage !== "undefined" && localStorage.setItem) {
        localStorage.setItem("theme", nextTheme);
      }
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("Invalid file format. Please upload a valid CSV file.");
      return;
    }

    setFileName(file.name);
    setIsIngesting(true);
    setIngestProgress(0);

    const interval = setInterval(() => {
      setIngestProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 50);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const headers = results.meta.fields || Object.keys(results.data[0] as object);
          setTimeout(() => {
            setRawHeaders(headers);
            setRawRows(results.data as RawRecord[]);
            setStep("preview");
            setIsIngesting(false);
            clearInterval(interval);
          }, 600);
        } else {
          alert("The uploaded CSV is empty or invalid.");
          setIsIngesting(false);
          clearInterval(interval);
        }
      },
      error: (err) => {
        alert("Failed to parse CSV: " + err.message);
        setIsIngesting(false);
        clearInterval(interval);
      }
    });
  };

  const startMapping = async (resumeFromBatch = 0) => {
    setIsProcessing(true);
    setProcessingError(null);
    setHasServerError(false);
    setStep("processing");

    const calculatedTotalBatches = Math.ceil(rawRows.length / BATCH_SIZE);
    setTotalBatches(calculatedTotalBatches);

    if (resumeFromBatch === 0) {
      setMappedLeads([]);
      setSkippedLeads([]);
      setTotalProcessedCount(0);
      setCurrentBatch(0);
    }

    let batchIdx = resumeFromBatch;

    try {
      while (batchIdx < calculatedTotalBatches) {
        setCurrentBatch(batchIdx);

        const startIdx = batchIdx * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, rawRows.length);
        const rawBatchSlice = rawRows.slice(startIdx, endIdx);

        const recordsToSend = rawBatchSlice.map((row, index) => ({
          originalIndex: startIdx + index,
          data: row
        }));

        const response = await fetch("/api/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            records: recordsToSend,
            originalHeaders: rawHeaders,
            provider,
            customApiKey
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.results && Array.isArray(data.results)) {
          const batchResults: ExtractedResult[] = data.results;
          const newMapped: CRMRecord[] = [];
          const newSkipped: { originalRow: RawRecord; reason: string; rowIndex: number }[] = [];

          batchResults.forEach((res) => {
            if (res.isSkipped || !res.extracted) {
              newSkipped.push({
                originalRow: rawRows[res.originalIndex],
                reason: res.skipReason || "Missing required email/phone fields.",
                rowIndex: res.originalIndex
              });
            } else {
              newMapped.push(res.extracted);
            }
          });

          setMappedLeads((prev) => [...prev, ...newMapped]);
          setSkippedLeads((prev) => [...prev, ...newSkipped]);
          setTotalProcessedCount((prev) => prev + rawBatchSlice.length);
        }

        batchIdx++;
        setCurrentBatch(batchIdx);
      }

      setIsProcessing(false);
      setStep("results");
      setActiveTab("mapped");
    } catch (err: any) {
      console.error("Mapping Batch Error:", err);
      setProcessingError(err.message || "An error occurred during AI extraction.");
      setHasServerError(true);
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setFileName("");
    setRawHeaders([]);
    setRawRows([]);
    setMappedLeads([]);
    setSkippedLeads([]);
    setTotalProcessedCount(0);
    setCurrentBatch(0);
    setProcessingError(null);
    setHasServerError(false);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const renderStatusBadge = (status: string | null) => {
    if (!status) return <span className="text-xs text-slate-400 font-mono">-</span>;
    switch (status) {
      case "GOOD_LEAD_FOLLOW_UP":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
            Follow Up
          </span>
        );
      case "DID_NOT_CONNECT":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/50">
            Did Not Connect
          </span>
        );
      case "BAD_LEAD":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50">
            Bad Lead
          </span>
        );
      case "SALE_DONE":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50">
            Sale Done
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 dark:bg-slate-805 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
            {status}
          </span>
        );
    }
  };

  const renderSourceBadge = (source: string | null) => {
    if (!source) return <span className="text-xs text-slate-400 font-mono">-</span>;
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono">
        {source}
      </span>
    );
  };

  const downloadMappedCSV = () => {
    if (mappedLeads.length === 0) return;

    const headers = [
      "created_at",
      "name",
      "email",
      "country_code",
      "mobile_without_country_code",
      "company",
      "city",
      "state",
      "country",
      "lead_owner",
      "crm_status",
      "crm_note",
      "data_source",
      "possession_time",
      "description"
    ];

    const rows = mappedLeads.map((lead) => [
      lead.created_at || "",
      lead.name || "",
      lead.email || "",
      lead.country_code || "",
      lead.mobile_without_country_code || "",
      lead.company || "",
      lead.city || "",
      lead.state || "",
      lead.country || "",
      lead.lead_owner || "",
      lead.crm_status || "",
      lead.crm_note ? `"${lead.crm_note.replace(/"/g, '""')}"` : "",
      lead.data_source || "",
      lead.possession_time || "",
      lead.description ? `"${lead.description.replace(/"/g, '""')}"` : ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Standardized_CRM_Leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadDemoCSV = () => {
    const headers = [
      "First Name",
      "Last Name",
      "Primary Contact",
      "Alternative Contact",
      "Email Id",
      "Alt Email",
      "Current Designation/Company",
      "Location City",
      "Location State",
      "Lead Status",
      "Source Campaign",
      "Property Possesion Timeframe",
      "Additional Comments & Remarks",
      "Date Added",
      "Assigned To"
    ];

    const rows = [
      ["John", "Doe", "+919876543210", "", "john.doe@example.com", "", "GrowEasy", "Mumbai", "Maharashtra", "Interested", "campaign_eden", "Within 3 months", "Client is asking to reschedule demo", "2026-05-13 14:20:48", "test@gmail.com"],
      ["Sarah", "Johnson", "+1 555-0199", "+1 555-0100", "sarah.j@outlook.com", "sarah.work@outlook.com", "Tech Solutions", "San Francisco", "California", "No response", "meridian_landing", "Ready to move", "Person was busy; will try again next week", "2026-05-13 14:25:30", "test@gmail.com"],
      ["Rajesh", "Patel", "9876543212", "", "rajesh.patel@example.com", "", "Startup Inc", "Delhi", "Delhi", "Junk", "", "", "Not interested in our services", "2026-05-13 14:30:15", "test@gmail.com"],
      ["Priya", "Singh", "+91 9876543213", "+919876543299", "priya.singh@example.com", "", "Enterprise Corp", "Pune", "Maharashtra", "Closed", "eden_park", "6 months", "Deal closed; onboarding in progress", "2026-05-13 14:35:22", "test@gmail.com"],
      ["David", "Miller", "", "", "david.miller@example.com", "", "Acme Corp", "Austin", "Texas", "Demo scheduled", "meridian_tower", "", "Highly interested in plots", "", "admin@groweasy.com"],
      ["Amit", "Sharma", "+91 99999 88888", "", "", "", "Self Employed", "Gurgaon", "Haryana", "Ringing", "varah_swamy", "1 year", "Enquired via web form", "2026-06-01", "sales@groweasy.com"],
      ["Mark", "Spencer", "", "", "", "", "Retail Plc", "London", "", "Interested", "sarjapur_plots", "", "This row should be skipped by AI since there is no contact info", "", ""],
      ["", "", "", "9999999999", "", "", "Only Phone Inc", "Chennai", "Tamil Nadu", "Interested", "meridian_tower", "", "Only phone, no email - should NOT be skipped", "", ""]
    ];

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map(val => {
        const escaped = String(val).replace(/"/g, '""');
        return escaped.includes(",") || escaped.includes("\n") || escaped.includes("\"") ? `"${escaped}"` : escaped;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "GrowEasy_Messy_Leads_Demo.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300" id="app_root">
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 py-4" id="app_header">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-slate-900 text-white p-2 rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-white">GrowEasy</h1>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono">CRM AI CSV Importer</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Secure Server-Side AI Mapping</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
        
        {step === "upload" && (
          <ApiKeyConfig
            provider={provider}
            setProvider={setProvider}
            customApiKey={customApiKey}
            setCustomApiKey={setCustomApiKey}
            hasServerError={hasServerError}
            serverErrorMessage={processingError}
          />
        )}

        <div className="block sm:hidden mb-6" id="mobile_stepper">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Step {step === "upload" ? "1" : step === "preview" ? "2" : step === "processing" ? "3" : "4"} of 4
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {step === "upload" && "Upload CSV"}
              {step === "preview" && "Preview Data"}
              {step === "processing" && "AI Extracting"}
              {step === "results" && "CRM Leads"}
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-2 overflow-hidden flex gap-1">
            <div className={`h-full flex-1 rounded-l-full transition-colors ${step === "upload" ? "bg-slate-900 dark:bg-slate-100" : "bg-emerald-500"}`} />
            <div className={`h-full flex-1 transition-colors ${
              step === "preview" ? "bg-slate-900 dark:bg-slate-100" :
              step === "processing" || step === "results" ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"
            }`} />
            <div className={`h-full flex-1 transition-colors ${
              step === "processing" ? "bg-slate-900 dark:bg-slate-100" :
              step === "results" ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"
            }`} />
            <div className={`h-full flex-1 rounded-r-full transition-colors ${step === "results" ? "bg-slate-900 dark:bg-slate-100" : "bg-slate-200 dark:bg-slate-800"}`} />
          </div>
        </div>

        <div className="hidden sm:block mb-10 max-w-2xl mx-auto" id="desktop_stepper">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-4 right-4 top-4 h-0.5 bg-slate-200 dark:bg-slate-800 z-0" />
            <div
              className="absolute left-4 top-4 h-0.5 bg-emerald-500 transition-all duration-500 z-0"
              style={{
                width:
                  step === "upload" ? "0%" :
                  step === "preview" ? "33%" :
                  step === "processing" ? "66%" : "100%"
              }}
            />

            <div className="flex flex-col items-center relative z-10">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-semibold text-xs transition-colors duration-300 relative z-10 ${
                step === "upload" ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" : "bg-emerald-500 text-white"
              }`}>
                {step !== "upload" ? <Check className="h-4 w-4" /> : "1"}
              </div>
              <span className="text-xs font-medium mt-2 text-slate-600 dark:text-slate-400">Upload CSV</span>
            </div>

            <div className="flex flex-col items-center relative z-10">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-semibold text-xs transition-colors duration-300 relative z-10 ${
                step === "preview" ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" :
                step === "processing" || step === "results" ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}>
                {step === "processing" || step === "results" ? <Check className="h-4 w-4" /> : "2"}
              </div>
              <span className="text-xs font-medium mt-2 text-slate-600 dark:text-slate-400">Preview Data</span>
            </div>

            <div className="flex flex-col items-center relative z-10">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-semibold text-xs transition-colors duration-300 relative z-10 ${
                step === "processing" ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" :
                step === "results" ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}>
                {step === "results" ? <Check className="h-4 w-4" /> : "3"}
              </div>
              <span className="text-xs font-medium mt-2 text-slate-600 dark:text-slate-400">AI Extracting</span>
            </div>

            <div className="flex flex-col items-center relative z-10">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-semibold text-xs transition-colors duration-300 relative z-10 ${
                step === "results" ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}>
                4
              </div>
              <span className="text-xs font-medium mt-2 text-slate-600 dark:text-slate-400">CRM Leads</span>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === "upload" && (
            <CSVUploader
              isDragging={isDragging}
              isIngesting={isIngesting}
              fileName={fileName}
              ingestProgress={ingestProgress}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleDrop={handleDrop}
              triggerFileSelect={triggerFileSelect}
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              downloadDemoCSV={downloadDemoCSV}
            />
          )}

          {step === "preview" && (
            <DataPreview
              fileName={fileName}
              rawRows={rawRows}
              rawHeaders={rawHeaders}
              handleReset={handleReset}
              startMapping={() => startMapping(0)}
            />
          )}

          {step === "processing" && (
            <ProcessingLog
              currentBatch={currentBatch}
              totalBatches={totalBatches}
              totalProcessedCount={totalProcessedCount}
              rawRowsCount={rawRows.length}
              isProcessing={isProcessing}
              processingError={processingError}
              startMapping={startMapping}
            />
          )}

          {step === "results" && (
            <ResultsDashboard
              rawRows={rawRows}
              mappedLeads={mappedLeads}
              skippedLeads={skippedLeads}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              scrollTop={scrollTop}
              handleScroll={handleScroll}
              tableContainerRef={tableContainerRef}
              handleReset={handleReset}
              downloadMappedCSV={downloadMappedCSV}
              renderStatusBadge={renderStatusBadge}
              renderSourceBadge={renderSourceBadge}
            />
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}
