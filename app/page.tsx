"use client";

import React, { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import Papa from "papaparse";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Play, 
  RotateCcw, 
  Download, 
  Sparkles, 
  Table, 
  ChevronRight, 
  Info, 
  Check,
  ShieldCheck,
  FileDown,
  Sun,
  Moon
} from "lucide-react";


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
          alert("The uploaded CSV is empty or has an invalid structure.");
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
            originalHeaders: rawHeaders
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
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
                reason: res.skipReason || "Missing required fields (email/mobile).",
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
      setProcessingError(err.message || "An error occurred during AI parsing. You can resume processing.");
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
  };

  
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  
  const renderStatusBadge = (status: string | null) => {
    if (!status) return <span className="text-xs text-slate-400 font-mono">-</span>;
    
    switch (status) {
      case "GOOD_LEAD_FOLLOW_UP":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
            Follow Up
          </span>
        );
      case "DID_NOT_CONNECT":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
            Did Not Connect
          </span>
        );
      case "BAD_LEAD":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100">
            Bad Lead
          </span>
        );
      case "SALE_DONE":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
            Sale Done
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-100">
            {status}
          </span>
        );
    }
  };

  
  const renderSourceBadge = (source: string | null) => {
    if (!source) return <span className="text-xs text-slate-400 font-mono">-</span>;
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 font-mono">
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
    link.setAttribute("download", `Mapped_GrowEasy_CRM_Leads_${new Date().toISOString().slice(0,10)}.csv`);
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
      {}
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
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 transition-colors focus:outline-none cursor-pointer"
              aria-label="Toggle dark mode"
            >
              {theme === "light" ? <Moon className="h-4 w-4 text-slate-600" /> : <Sun className="h-4 w-4 text-amber-400" />}
            </button>
            <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Secure Server-Side AI Mapping</span>
            </div>
          </div>
        </div>
      </header>

      {}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        
        {}
        <div className="block sm:hidden mb-6" id="mobile_stepper">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Step {step === "upload" ? "1" : step === "preview" ? "2" : step === "processing" ? "3" : "4"} of 4
            </span>
            <span className="text-sm font-semibold text-slate-900">
              {step === "upload" && "Upload CSV"}
              {step === "preview" && "Preview Data"}
              {step === "processing" && "AI Extracting"}
              {step === "results" && "CRM Leads"}
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden flex gap-1">
            <div className={`h-full flex-1 rounded-l-full transition-colors ${step === "upload" ? "bg-slate-900" : "bg-emerald-500"}`} />
            <div className={`h-full flex-1 transition-colors ${
              step === "preview" ? "bg-slate-900" : 
              step === "processing" || step === "results" ? "bg-emerald-500" : "bg-slate-200"
            }`} />
            <div className={`h-full flex-1 transition-colors ${
              step === "processing" ? "bg-slate-900" : 
              step === "results" ? "bg-emerald-500" : "bg-slate-200"
            }`} />
            <div className={`h-full flex-1 rounded-r-full transition-colors ${step === "results" ? "bg-slate-900" : "bg-slate-200"}`} />
          </div>
        </div>

        {}
        <div className="hidden sm:block mb-10 max-w-2xl mx-auto" id="desktop_stepper">
          <div className="flex items-center justify-between relative">
            {}
            <div className="absolute left-4 right-4 top-4 h-0.5 bg-slate-200 -z-10" />
            {}
            <div 
              className="absolute left-4 top-4 h-0.5 bg-emerald-500 transition-all duration-500 -z-10" 
              style={{ 
                width: 
                  step === "upload" ? "0%" : 
                  step === "preview" ? "33%" : 
                  step === "processing" ? "66%" : "100%" 
              }} 
            />
            
            <div className="flex flex-col items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-semibold text-xs transition-colors duration-300 ${
                step === "upload" ? "bg-slate-900 text-white" : "bg-emerald-500 text-white"
              }`}>
                {step !== "upload" ? <Check className="h-4 w-4" /> : "1"}
              </div>
              <span className="text-xs font-medium mt-2 text-slate-600">Upload CSV</span>
            </div>

            <div className="flex flex-col items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-semibold text-xs transition-colors duration-300 ${
                step === "preview" ? "bg-slate-900 text-white" : 
                step === "processing" || step === "results" ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
              }`}>
                {step === "processing" || step === "results" ? <Check className="h-4 w-4" /> : "2"}
              </div>
              <span className="text-xs font-medium mt-2 text-slate-600">Preview Data</span>
            </div>

            <div className="flex flex-col items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-semibold text-xs transition-colors duration-300 ${
                step === "processing" ? "bg-slate-900 text-white" : 
                step === "results" ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
              }`}>
                {step === "results" ? <Check className="h-4 w-4" /> : "3"}
              </div>
              <span className="text-xs font-medium mt-2 text-slate-600">AI Extracting</span>
            </div>

            <div className="flex flex-col items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-semibold text-xs transition-colors duration-300 ${
                step === "results" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
              }`}>
                4
              </div>
              <span className="text-xs font-medium mt-2 text-slate-600">CRM Leads</span>
            </div>
          </div>
        </div>

        {}
        <AnimatePresence mode="wait">
          
          {}
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
              id="upload_stage"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Intelligent CRM Onboarding</h2>
                <p className="text-slate-500 mt-2">
                  Have a custom spreadsheet or CRM export from Facebook, Google, or agencies? 
                  Our advanced AI engine automatically converts inconsistent formats into clean, structured GrowEasy leads.
                </p>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={isIngesting ? undefined : triggerFileSelect}
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 relative overflow-hidden ${
                  isDragging 
                    ? "border-indigo-500 bg-indigo-50/40 scale-[1.02] shadow-md shadow-indigo-100/50" 
                    : isIngesting 
                    ? "border-emerald-500 bg-emerald-50/20 cursor-default"
                    : "border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm cursor-pointer"
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
                        ease: "easeInOut" 
                      }}
                      className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500 text-white rounded-2xl border border-emerald-400 flex items-center justify-center mb-6 shadow-lg shadow-emerald-200"
                    >
                      <FileSpreadsheet className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </motion.div>
                    
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Loader2 className="h-4.5 w-4.5 animate-spin text-emerald-600" />
                      Ingesting {fileName}...
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      Parsing spreadsheet headers and raw rows
                    </p>

                    {}
                    <div className="w-48 sm:w-64 bg-slate-150 h-2 rounded-full mt-6 overflow-hidden border border-slate-200">
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
                          : "bg-slate-50 border-slate-100 text-slate-400"
                      }`}
                    >
                      <Upload className={`h-8 w-8 transition-colors ${isDragging ? "text-white" : "text-slate-600"}`} />
                    </motion.div>
                    
                    <h3 className={`text-lg font-semibold transition-colors duration-300 ${isDragging ? "text-indigo-900 font-bold" : "text-slate-900"}`}>
                      {isDragging ? "Drop your CSV here!" : "Upload your raw CSV"}
                    </h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                      {isDragging ? "Release your file to begin instant onboarding" : "Drag and drop your spreadsheet here, or click to browse files from your computer."}
                    </p>
                    <div className={`mt-6 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all duration-300 ${
                      isDragging ? "bg-indigo-100 text-indigo-700 font-semibold scale-105" : "bg-slate-100 text-slate-600"
                    }`}>
                      <span>Supported format: .csv</span>
                    </div>
                  </>
                )}
              </div>

              {}
              <div className="mt-6 bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" id="demo_csv_download_callout">
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5 text-indigo-300">
                    <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
                    Need a test file?
                  </h4>
                  <p className="text-xs text-slate-300 max-w-md leading-relaxed">
                    Download our carefully structured **Messy Leads Template**. It contains split names, multiple contacts, ambiguous statuses, campaign names, and skip-condition rows to showcase raw AI mapping capabilities.
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
                  <span>Download Demo CSV</span>
                </button>
              </div>

              <div className="mt-6 bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-start space-x-3 text-sm text-blue-800">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Stateless Parsing Safeguards</h4>
                  <p className="mt-1 text-blue-700/95 leading-relaxed">
                    Uploaded files are parsed immediately in your browser. Raw records are sent in smaller batches securely to our server-side API for Gemini matching and rule verification, keeping your infrastructure lightweight and compliant.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {}
          {step === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
              id="preview_stage"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-5 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="h-5 w-5 text-indigo-500 shrink-0" />
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 break-all">{fileName}</h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Loaded <span className="font-semibold text-slate-800">{rawRows.length} rows</span>. No AI mapping has run yet. Confirm to start.
                  </p>
                </div>
                
                <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleReset}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-3.5 py-2 border border-slate-200 text-xs sm:text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Reset
                  </button>
                  <button
                    onClick={() => startMapping(0)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-xs sm:text-sm font-medium rounded-lg text-white shadow-sm transition-colors cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    Confirm & Map
                  </button>
                </div>
              </div>

              {}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm" id="preview_table_container">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center">
                    <Table className="h-4 w-4 mr-1.5 shrink-0" /> Raw CSV Preview (Showing first 15 rows)
                  </h3>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-xs text-slate-400 font-mono">Original Headers: {rawHeaders.length}</span>
                    <span className="inline-flex sm:hidden text-[10px] bg-slate-150 text-slate-600 px-2 py-0.5 rounded-full font-mono font-semibold animate-pulse">
                      Swipe Horizontal ↔
                    </span>
                  </div>
                </div>
                
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white shadow-[0_1px_0_0_rgba(226,232,240,1)] z-[1]">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 bg-slate-50 border-r border-slate-100 text-center w-12 font-mono">#</th>
                        {rawHeaders.map((header) => (
                          <th key={header} className="px-4 py-3 text-xs font-semibold text-slate-700 bg-slate-50 capitalize truncate max-w-xs border-r border-slate-100 last:border-r-0">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rawRows.slice(0, 15).map((row, index) => (
                        <tr key={index} className="hover:bg-slate-50/75 transition-colors">
                          <td className="px-4 py-3 text-xs font-mono text-slate-400 border-r border-slate-100 text-center bg-slate-50/30">{index + 1}</td>
                          {rawHeaders.map((header) => (
                            <td key={header} className="px-4 py-3 text-sm text-slate-600 truncate max-w-xs border-r border-slate-100 last:border-r-0 font-mono text-xs">
                              {row[header] || <span className="text-slate-300 italic">null</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rawRows.length > 15 && (
                  <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center text-xs text-slate-500">
                    Showing first 15 records of {rawRows.length} total rows. Confirm import to map the full file.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {}
          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-xl mx-auto py-12"
              id="processing_stage"
            >
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-slate-100 animate-ping opacity-75" />
                    <div className="relative w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-white">
                      <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900">AI mapping engine running</h3>
                <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                  We are intelligently parsing, clean-mapping, and validating your raw rows in batches. 
                  This matches custom headers, applies strict status boundaries, and handles multiple emails and numbers.
                </p>

                {}
                <div className="mt-8 space-y-2">
                  <div className="flex justify-between text-xs font-mono font-medium text-slate-500">
                    <span>Mapping Progress</span>
                    <span>Batch {currentBatch} of {totalBatches} ({Math.round((currentBatch / totalBatches) * 100)}%)</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-900 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${(currentBatch / totalBatches) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-indigo-600 font-mono mt-1">
                    Processed {totalProcessedCount} of {rawRows.length} rows
                  </p>
                </div>

                {}
                <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100 text-left">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 font-mono">Operations Log</h4>
                  <div className="text-xs font-mono space-y-1.5 text-slate-600">
                    <div className="flex justify-between">
                      <span>File parsing:</span>
                      <span className="text-emerald-600 font-semibold">Ready</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Batch size:</span>
                      <span>{BATCH_SIZE} records / batch</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Server validation:</span>
                      <span>Enforcing GrowEasy schemas</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5 mt-1.5">
                      <span>Status:</span>
                      <span className="text-indigo-600 font-semibold animate-pulse">
                        {isProcessing ? "Sending batch to Gemini..." : "Waiting..."}
                      </span>
                    </div>
                  </div>
                </div>

                {}
                {processingError && (
                  <div className="mt-6 bg-rose-50 border border-rose-100 rounded-xl p-4 text-left">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-rose-800">Batch Processing Interrupted</h4>
                        <p className="text-xs text-rose-700 mt-1">{processingError}</p>
                        <button
                          onClick={() => startMapping(currentBatch)}
                          className="mt-3 inline-flex items-center px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Play className="h-3.5 w-3.5 mr-1.5" />
                          Resume from batch {currentBatch + 1}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {}
          {step === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
              id="results_stage"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Import Complete</h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    AI matching has parsed and converted your CSV leads into GrowEasy CRM records.
                  </p>
                </div>
                
                <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2.5 w-full sm:w-auto shrink-0">
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 text-xs sm:text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Import Another
                  </button>
                  <button
                    onClick={downloadMappedCSV}
                    disabled={mappedLeads.length === 0}
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-xs sm:text-sm font-medium rounded-lg text-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <FileDown className="h-3.5 w-3.5 mr-1.5" />
                    Download Mapped CSV
                  </button>
                </div>
              </div>

              {}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Total Rows Processed</p>
                  <div className="flex items-baseline space-x-1.5 mt-1 sm:mt-2">
                    <p className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">{rawRows.length}</p>
                    <span className="text-xs text-slate-500">records</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-2">Parsed from original file</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-600">Successfully Imported</p>
                  <div className="flex items-baseline space-x-1.5 mt-1 sm:mt-2">
                    <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono">{mappedLeads.length}</p>
                    <span className="text-xs text-emerald-600/90">leads</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-2">Mapped cleanly to GrowEasy CRM</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-rose-600">Skipped Records</p>
                  <div className="flex items-baseline space-x-1.5 mt-1 sm:mt-2">
                    <p className="text-xl sm:text-2xl font-extrabold text-rose-600 font-mono">{skippedLeads.length}</p>
                    <span className="text-xs text-rose-600/90">records</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-2">No email or mobile found</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-indigo-600">AI Accuracy Rating</p>
                  <div className="flex items-baseline space-x-1.5 mt-1 sm:mt-2">
                    <p className="text-xl sm:text-2xl font-extrabold text-indigo-600 font-mono">
                      {rawRows.length > 0 ? `${Math.round((mappedLeads.length / rawRows.length) * 100)}%` : "0%"}
                    </p>
                    <span className="text-xs text-indigo-600/90">success</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-2">Intelligent mapping efficiency</p>
                </div>
              </div>

              {}
              <div className="space-y-4">
                <div className="border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <nav className="-mb-px flex space-x-4 sm:space-x-8 w-full sm:w-auto">
                    <button
                      onClick={() => setActiveTab("mapped")}
                      className={`py-3 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1.5 sm:space-x-2 transition-all cursor-pointer ${
                        activeTab === "mapped"
                          ? "border-slate-900 text-slate-950 font-semibold"
                          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <span>Mapped Leads</span>
                      <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
                        activeTab === "mapped" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                      }`}>{mappedLeads.length}</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab("skipped")}
                      className={`py-3 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1.5 sm:space-x-2 transition-all cursor-pointer ${
                        activeTab === "skipped"
                          ? "border-slate-900 text-slate-950 font-semibold"
                          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <span>Skipped Records</span>
                      <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
                        activeTab === "skipped" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                      }`}>{skippedLeads.length}</span>
                    </button>
                  </nav>

                  <span className="text-[10px] sm:text-xs font-mono text-slate-400">Enforcing strict CRM rules</span>
                </div>

                {}
                {activeTab === "mapped" && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm" id="mapped_leads_container">
                    {mappedLeads.length === 0 ? (
                      <div className="p-12 text-center text-slate-500">
                        <Table className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <h4 className="text-base font-semibold text-slate-900">No Mapped Leads</h4>
                        <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                          All records were skipped, or no valid leads could be processed from this file.
                        </p>
                      </div>
                    ) : (
                      <>
                        {}
                        <div className="block md:hidden divide-y divide-slate-100 max-h-[600px] overflow-y-auto" id="mapped_leads_mobile_list">
                          {mappedLeads.map((lead, index) => (
                            <div key={index} className="p-4 hover:bg-slate-50/50 transition-colors space-y-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-mono text-slate-400">#{index + 1}</span>
                                  <h4 className="font-semibold text-slate-900 text-sm mt-0.5">{lead.name || <span className="text-slate-300 italic">No Name</span>}</h4>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  {renderStatusBadge(lead.crm_status)}
                                  <span className="text-[10px] font-mono text-slate-400">{lead.created_at || "-"}</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                                <div>
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Email</p>
                                  <p className="text-slate-700 font-mono text-[11px] truncate mt-0.5" title={lead.email || ""}>
                                    {lead.email || <span className="text-slate-300 italic">null</span>}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Phone</p>
                                  <p className="text-slate-700 font-mono text-[11px] mt-0.5">
                                    {lead.country_code && <span className="text-slate-400 mr-0.5">{lead.country_code}</span>}
                                    {lead.mobile_without_country_code || <span className="text-slate-300 italic">null</span>}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Company & City</p>
                                  <p className="text-slate-700 mt-0.5 truncate text-[11px]">
                                    {lead.company || "-"} {[lead.city, lead.state].filter(Boolean).join(", ") ? `(${[lead.city, lead.state].filter(Boolean).join(", ")})` : ""}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Source & Possession</p>
                                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                    {renderSourceBadge(lead.data_source)}
                                    {lead.possession_time && (
                                      <span className="text-[9px] text-slate-500 font-mono bg-slate-100 px-1 py-0.5 rounded leading-none">
                                        {lead.possession_time}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {lead.crm_note && (
                                <div className="bg-slate-50/70 p-2 rounded border border-slate-100 text-[11px] text-slate-600">
                                  <span className="font-semibold text-slate-500">Note:</span> {lead.crm_note}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {}
                        {(() => {
                          const rowHeight = 57; 
                          const viewportHeight = 500; 
                          const buffer = 5; 

                          const totalItems = mappedLeads.length;
                          const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
                          const endIndex = Math.min(totalItems, Math.ceil((scrollTop + viewportHeight) / rowHeight) + buffer);

                          const visibleLeads = mappedLeads.slice(startIndex, endIndex);

                          const topSpacerHeight = startIndex * rowHeight;
                          const bottomSpacerHeight = Math.max(0, (totalItems - endIndex) * rowHeight);

                          return (
                            <div 
                              ref={tableContainerRef}
                              onScroll={handleScroll}
                              className="hidden md:block overflow-x-auto overflow-y-auto max-h-[500px] relative"
                            >
                              <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white dark:bg-slate-900 shadow-[0_1px_0_0_rgba(226,232,240,1)] dark:shadow-[0_1px_0_0_rgba(30,41,59,1)] z-[1]">
                                  <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800">
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 w-12 text-center font-mono">#</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-350">Created At</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-350">Name</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-350">Email</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-350">Phone</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-350">Company</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-350">Location</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-350">Owner</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-350">Status</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-350">Source</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-350">Possession</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-350">Note</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                  {topSpacerHeight > 0 && (
                                    <tr style={{ height: `${topSpacerHeight}px` }}>
                                      <td colSpan={12} className="p-0 border-0" />
                                    </tr>
                                  )}
                                  {visibleLeads.map((lead, idx) => {
                                    const index = startIndex + idx;
                                    return (
                                      <tr key={index} className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-3.5 text-xs font-mono text-slate-400 text-center bg-slate-50/20 dark:bg-slate-900/10 font-semibold">{index + 1}</td>
                                        <td className="px-4 py-3.5 text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">{lead.created_at || "-"}</td>
                                        <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-white whitespace-nowrap">{lead.name || <span className="text-slate-300 dark:text-slate-600 italic">null</span>}</td>
                                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{lead.email || <span className="text-slate-300 dark:text-slate-600 italic">null</span>}</td>
                                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                          {lead.country_code && <span className="text-slate-400 dark:text-slate-500 mr-1">{lead.country_code}</span>}
                                          {lead.mobile_without_country_code || <span className="text-slate-300 dark:text-slate-600 italic">null</span>}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{lead.company || "-"}</td>
                                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap truncate max-w-[150px]" title={[lead.city, lead.state, lead.country].filter(Boolean).join(", ")}>
                                          {[lead.city, lead.state, lead.country].filter(Boolean).join(", ") || "-"}
                                        </td>
                                        <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap truncate max-w-[120px]" title={lead.lead_owner || ""}>{lead.lead_owner || "-"}</td>
                                        <td className="px-4 py-3.5 whitespace-nowrap">{renderStatusBadge(lead.crm_status)}</td>
                                        <td className="px-4 py-3.5 whitespace-nowrap">{renderSourceBadge(lead.data_source)}</td>
                                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{lead.possession_time || "-"}</td>
                                        <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate" title={lead.crm_note || ""}>
                                          {lead.crm_note || "-"}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {bottomSpacerHeight > 0 && (
                                    <tr style={{ height: `${bottomSpacerHeight}px` }}>
                                      <td colSpan={12} className="p-0 border-0" />
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}

                {}
                {activeTab === "skipped" && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm" id="skipped_leads_container">
                    {skippedLeads.length === 0 ? (
                      <div className="p-12 text-center text-slate-500">
                        <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                        <h4 className="text-base font-semibold text-slate-900">Zero Skipped Records</h4>
                        <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                          Excellent! 100% of the raw spreadsheet rows had valid contact parameters (email or mobile) and were processed successfully.
                        </p>
                      </div>
                    ) : (
                      <>
                        {}
                        <div className="block md:hidden divide-y divide-slate-100 max-h-[600px] overflow-y-auto" id="skipped_leads_mobile_list">
                          {skippedLeads.map((skipped, index) => (
                            <div key={index} className="p-4 hover:bg-slate-50/50 transition-colors space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-mono text-slate-400 font-semibold">Row {skipped.rowIndex + 1}</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-100">
                                  <AlertTriangle className="h-2.5 w-2.5 mr-1 text-rose-600 shrink-0" />
                                  {skipped.reason}
                                </span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 max-h-[150px] overflow-y-auto">
                                <pre className="whitespace-pre-wrap font-sans text-xs">
                                  {JSON.stringify(skipped.originalRow, null, 2)}
                                </pre>
                              </div>
                            </div>
                          ))}
                        </div>

                        {}
                        <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[600px]">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 w-16 text-center font-mono">Row #</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-700 w-1/4">Skip Reason</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-700">Raw Data Snippet</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                              {skippedLeads.map((skipped, index) => (
                                <tr key={index} className="hover:bg-slate-50/75 transition-colors align-top">
                                  <td className="px-4 py-4 text-xs font-mono text-slate-400 text-center bg-slate-50/20 font-semibold">Row {skipped.rowIndex + 1}</td>
                                  <td className="px-4 py-4">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-100">
                                      <AlertTriangle className="h-3 w-3 mr-1 text-rose-600" />
                                      {skipped.reason}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 font-mono text-xs text-slate-500 leading-relaxed">
                                    <pre className="whitespace-pre-wrap font-sans text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 max-w-2xl overflow-x-auto">
                                      {JSON.stringify(skipped.originalRow, null, 2)}
                                    </pre>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </div>
    </main>
  );
}
