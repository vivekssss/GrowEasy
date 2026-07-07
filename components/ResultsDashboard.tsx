import React from "react";
import { RotateCcw, FileDown, Table, CheckCircle2, AlertTriangle } from "lucide-react";

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

interface ResultsDashboardProps {
  rawRows: RawRecord[];
  mappedLeads: CRMRecord[];
  skippedLeads: { originalRow: RawRecord; reason: string; rowIndex: number }[];
  activeTab: "mapped" | "skipped";
  setActiveTab: (val: "mapped" | "skipped") => void;
  scrollTop: number;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  tableContainerRef: React.RefObject<HTMLDivElement | null>;
  handleReset: () => void;
  downloadMappedCSV: () => void;
  renderStatusBadge: (status: string | null) => React.ReactNode;
  renderSourceBadge: (source: string | null) => React.ReactNode;
}

export default function ResultsDashboard({
  rawRows,
  mappedLeads,
  skippedLeads,
  activeTab,
  setActiveTab,
  scrollTop,
  handleScroll,
  tableContainerRef,
  handleReset,
  downloadMappedCSV,
  renderStatusBadge,
  renderSourceBadge
}: ResultsDashboardProps) {
  return (
    <div className="space-y-8" id="results_stage">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Import Complete</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Raw CSV rows successfully parsed and standardized.
          </p>
        </div>

        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2.5 w-full sm:w-auto shrink-0">
          <button
            onClick={handleReset}
            className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium rounded-lg text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Import Another
          </button>
          <button
            onClick={downloadMappedCSV}
            disabled={mappedLeads.length === 0}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-xs sm:text-sm font-medium rounded-lg text-white dark:text-slate-950 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileDown className="h-3.5 w-3.5 mr-1.5" />
            Download Mapped CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Total Rows Processed</p>
          <div className="flex items-baseline space-x-1.5 mt-1 sm:mt-2">
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono">{rawRows.length}</p>
            <span className="text-xs text-slate-500 dark:text-slate-450">records</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-600">Successfully Imported</p>
          <div className="flex items-baseline space-x-1.5 mt-1 sm:mt-2">
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono">{mappedLeads.length}</p>
            <span className="text-xs text-emerald-600/90">leads</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-rose-600">Skipped Records</p>
          <div className="flex items-baseline space-x-1.5 mt-1 sm:mt-2">
            <p className="text-xl sm:text-2xl font-extrabold text-rose-600 font-mono">{skippedLeads.length}</p>
            <span className="text-xs text-rose-600/90">records</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-indigo-600">AI Match Success</p>
          <div className="flex items-baseline space-x-1.5 mt-1 sm:mt-2">
            <p className="text-xl sm:text-2xl font-extrabold text-indigo-600 font-mono">
              {rawRows.length > 0 ? `${Math.round((mappedLeads.length / rawRows.length) * 100)}%` : "0%"}
            </p>
            <span className="text-xs text-indigo-600/90">rate</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("mapped")}
              className={`py-3 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1.5 sm:space-x-2 transition-all cursor-pointer ${
                activeTab === "mapped"
                  ? "border-slate-900 dark:border-slate-100 text-slate-950 dark:text-white font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <span>Mapped Leads</span>
              <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
                activeTab === "mapped" ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}>{mappedLeads.length}</span>
            </button>

            <button
              onClick={() => setActiveTab("skipped")}
              className={`py-3 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1.5 sm:space-x-2 transition-all cursor-pointer ${
                activeTab === "skipped"
                  ? "border-slate-900 dark:border-slate-100 text-slate-950 dark:text-white font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <span>Skipped Records</span>
              <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
                activeTab === "skipped" ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}>{skippedLeads.length}</span>
            </button>
          </nav>
        </div>

        {activeTab === "mapped" && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm" id="mapped_leads_container">
            {mappedLeads.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Table className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-semibold text-slate-900 dark:text-white">No Mapped Leads</h4>
                <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                  All rows skipped or missing parameter mapping constraints.
                </p>
              </div>
            ) : (
              <>
                <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto" id="mapped_leads_mobile_list">
                  {mappedLeads.map((lead, index) => (
                    <div key={index} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400">#{index + 1}</span>
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm mt-0.5">{lead.name || <span className="text-slate-300 italic">No Name</span>}</h4>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {renderStatusBadge(lead.crm_status)}
                          <span className="text-[10px] font-mono text-slate-400">{lead.created_at || "-"}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Email</p>
                          <p className="text-slate-700 dark:text-slate-300 font-mono text-[11px] truncate mt-0.5" title={lead.email || ""}>
                            {lead.email || <span className="text-slate-400 dark:text-slate-600 italic">null</span>}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Phone</p>
                          <p className="text-slate-700 dark:text-slate-300 font-mono text-[11px] mt-0.5">
                            {lead.country_code && <span className="text-slate-400 mr-0.5">{lead.country_code}</span>}
                            {lead.mobile_without_country_code || <span className="text-slate-400 dark:text-slate-600 italic">null</span>}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Company & City</p>
                          <p className="text-slate-700 dark:text-slate-300 mt-0.5 truncate text-[11px]">
                            {lead.company || "-"} {[lead.city, lead.state].filter(Boolean).join(", ") ? `(${[lead.city, lead.state].filter(Boolean).join(", ")})` : ""}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Source</p>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {renderSourceBadge(lead.data_source)}
                          </div>
                        </div>
                      </div>

                      {lead.crm_note && (
                        <div className="bg-slate-50/70 dark:bg-slate-950/55 p-2 rounded border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-500">Note:</span> {lead.crm_note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

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

        {activeTab === "skipped" && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm" id="skipped_leads_container">
            {skippedLeads.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                <h4 className="text-base font-semibold text-slate-900 dark:text-white">Zero Skipped Records</h4>
                <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                  100% of raw rows contained mapping contact details.
                </p>
              </div>
            ) : (
              <>
                <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto" id="skipped_leads_mobile_list">
                  {skippedLeads.map((skipped, index) => (
                    <div key={index} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-slate-400 font-semibold">Row {skipped.rowIndex + 1}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50">
                          <AlertTriangle className="h-2.5 w-2.5 mr-1 text-rose-600 shrink-0" />
                          {skipped.reason}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 max-h-[150px] overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-sans text-xs">
                          {JSON.stringify(skipped.originalRow, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[600px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800">
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 w-16 text-center font-mono">Row #</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-350 w-1/4">Skip Reason</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-350">Raw Data Snippet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      {skippedLeads.map((skipped, index) => (
                        <tr key={index} className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors align-top">
                          <td className="px-4 py-4 text-xs font-mono text-slate-400 text-center bg-slate-50/20 dark:bg-slate-900/10 font-semibold">Row {skipped.rowIndex + 1}</td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50">
                              <AlertTriangle className="h-3 w-3 mr-1 text-rose-600" />
                              {skipped.reason}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-mono text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            <pre className="whitespace-pre-wrap font-sans text-xs bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 max-w-2xl overflow-x-auto">
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
    </div>
  );
}
