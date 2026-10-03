import React from "react";
import { MdDownload } from "react-icons/md";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "sevenDays", label: "7 days" },
  { value: "thirtyDays", label: "30 days" },
  { value: "year", label: "This year" },
];

const AnalyticsToolbar = ({ preset, onPresetChange, range, validRange, rangeTooLarge, onDateChange, onExport, exporting }) => (
  <div className="sticky top-14 z-30 -mx-4 border-y border-admin-border bg-admin-canvas/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 md:top-0 xl:-mx-8 xl:px-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Analytics date range">
        {PRESETS.map(({ value, label }) => (
          <button key={value} type="button" aria-pressed={preset === value} onClick={() => onPresetChange(value)}
            className={`min-h-10 rounded-lg px-3 font-body text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${preset === value ? "bg-brand-900 text-white" : "text-admin-muted hover:bg-brand-50 hover:text-admin-ink"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex max-w-full flex-wrap items-center gap-1.5 rounded-lg border border-admin-border bg-white px-2 py-1">
          <label className="font-body text-xs text-admin-muted">From
            <input aria-label="From date (UTC)" type="date" value={range.from} onChange={(event) => onDateChange("from", event.target.value)} className="ml-1 max-w-[126px] bg-transparent font-body text-xs text-admin-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700" />
          </label>
          <span className="text-admin-muted" aria-hidden="true">–</span>
          <label className="font-body text-xs text-admin-muted">To
            <input aria-label="To date (UTC)" type="date" value={range.to} onChange={(event) => onDateChange("to", event.target.value)} className="ml-1 max-w-[126px] bg-transparent font-body text-xs text-admin-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700" />
          </label>
        </div>
        <button type="button" onClick={onExport} disabled={!validRange || exporting}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-admin-border bg-white px-3 font-body text-sm font-medium text-admin-ink transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
          <MdDownload aria-hidden="true" /> {exporting ? "Exporting…" : "Export delivered"}
        </button>
      </div>
    </div>
    <div className="mt-1 flex flex-wrap items-center justify-between gap-1 font-body text-xs text-admin-muted">
      <span>{validRange ? `${range.from} – ${range.to} · UTC` : rangeTooLarge ? "Select at most 366 UTC days." : "Choose a valid UTC date range."}</span>
      <span>Export uses delivery dates; charts use order creation dates.</span>
    </div>
  </div>
);

export default AnalyticsToolbar;
