import React, { useState } from "react";
import { Key, Check, AlertCircle, ChevronDown } from "lucide-react";

interface ApiKeyConfigProps {
  provider: "gemini" | "openai" | "anthropic";
  setProvider: (val: "gemini" | "openai" | "anthropic") => void;
  customApiKey: string;
  setCustomApiKey: (val: string) => void;
  hasServerError: boolean;
  serverErrorMessage?: string | null;
}

export default function ApiKeyConfig({
  provider,
  setProvider,
  customApiKey,
  setCustomApiKey,
  hasServerError,
  serverErrorMessage
}: ApiKeyConfigProps) {
  const [isOpen, setIsOpen] = useState(hasServerError);
  const [tempKey, setTempKey] = useState(customApiKey);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = () => {
    if (!tempKey.trim()) {
      setErrorMsg("API Key cannot be empty. Please enter your key.");
      return;
    }
    setErrorMsg(null);
    setCustomApiKey(tempKey);
    localStorage.setItem(`groweasy_key_${provider}`, tempKey);
    alert("API Key saved successfully!");
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Key className="h-4 w-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">AI Engine Configuration</h3>
        </div>
        
        <div className="relative group">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <span>{isOpen ? "Hide Settings" : "Configure AI & Keys"}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-slate-500 dark:text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : "group-hover:translate-y-0.5"}`} />
          </button>
          
          <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block bg-slate-900 dark:bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap z-[11] border border-slate-800 dark:border-slate-700 pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-150">
            {isOpen ? "Collapse settings drawer" : "Select AI model (Gemini/OpenAI/Claude) & set custom keys"}
          </div>
        </div>
      </div>

      {hasServerError && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-rose-800 dark:text-rose-200">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Error Triggered:</span> {serverErrorMessage || "AI processing failed. Please configure a custom key below."}
          </div>
        </div>
      )}

      {isOpen && (
        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">AI Model Provider</label>
            <div className="grid grid-cols-3 gap-2">
              {(["gemini", "openai", "anthropic"] as const).map((prov) => (
                <button
                  key={prov}
                  type="button"
                  onClick={() => {
                    setProvider(prov);
                    const saved = localStorage.getItem(`groweasy_key_${prov}`) || "";
                    setTempKey(saved);
                    setErrorMsg(null);
                  }}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium capitalize transition-all cursor-pointer ${
                    provider === prov
                      ? "bg-slate-900 border-slate-900 dark:bg-slate-100 dark:border-slate-100 text-white dark:text-slate-950 shadow-sm"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {prov === "gemini" ? "Gemini" : prov === "openai" ? "OpenAI" : "Claude"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Provide API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={tempKey}
                onChange={(e) => {
                  setTempKey(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder={`Enter custom ${provider === "gemini" ? "Gemini" : provider === "openai" ? "OpenAI" : "Claude"} key`}
                className={`flex-1 px-3 py-2 rounded-lg border bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none font-mono ${
                  errorMsg
                    ? "border-rose-500 focus:border-rose-500 dark:border-rose-500"
                    : "border-slate-200 dark:border-slate-800 focus:border-slate-400 dark:focus:border-slate-600"
                }`}
              />
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                Save
              </button>
            </div>
            {errorMsg && (
              <p className="text-[11px] text-rose-600 dark:text-rose-500 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-rose-600 shrink-0" />
                {errorMsg}
              </p>
            )}
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Saved keys persist in your local browser cache. Leave blank to default back to the global server configurations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
