import React, { useState } from 'react';
import { SummaryStats, PackingSheetData } from '../types/calculator';
import { Language, translations } from '../utils/translations';
import { Scale, Ruler, Compass, Package, Tag, Maximize2, Palette, Hash, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface SummaryCardsProps {
  summary: SummaryStats;
  lang: Language;
  sheetData?: PackingSheetData;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, lang, sheetData }) => {
  const t = translations[lang];
  const [copied, setCopied] = useState(false);

  // Collapse / Hide state for summary cards
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('garment_summary_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('garment_summary_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const buyer = sheetData?.buyer || '-';
  const size = sheetData?.size || '-';
  const color = sheetData?.color || '-';
  const ref = sheetData?.ref || '-';

  const handleCopySummary = async () => {
    const summaryText = `📋 PACKING SUMMARY\n• Buyer: ${buyer} | Size: ${size} | Colour: ${color} | Ref: ${ref}\n• Total Net Wt: ${summary.totalNetWt.toFixed(2)} Kg (${summary.totalNetWtLbs.toFixed(1)} Lbs)\n• Total Meters: ${summary.totalMtr.toLocaleString()} Mtr (${summary.totalYds.toLocaleString()} Yds)\n• Total GRY: ${summary.totalGry.toFixed(2)} Gry\n• Total Cartons: ${summary.totalCtn} CTN (${summary.activeNetCartonCount} Active)\n• Gross Wt: ${summary.totalGrossWt.toFixed(2)} Kg (Tare: ${summary.totalTareWt.toFixed(2)} Kg)`;
    try {
      window.focus();
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] ring-1 ring-white/[0.05] mb-5 transition-all duration-300">
      {/* Ambient background glow inside the summary container */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Clean Glass Header Bar */}
      <div className="relative z-10 bg-slate-950/50 backdrop-blur-md px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-2 text-xs border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            <Scale className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-white text-xs sm:text-sm tracking-tight flex items-center gap-2">
            {lang === 'en' ? 'Packing Live Summary' : 'প্যাকিং সামারি'}
          </span>
          <span className="text-[10.5px] font-mono font-bold text-emerald-300 bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
            {summary.totalCtn} CTN
          </span>
        </div>

        {/* Right side: Compact Copy Button & Hide/Expand Toggle with translucent glass style */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white text-xs font-medium backdrop-blur-md transition-all duration-200 cursor-pointer shadow-xs hover:shadow-[0_0_12px_rgba(255,255,255,0.06)] shrink-0"
            title="Copy full summary"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">{lang === 'en' ? 'Copied' : 'কপি'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span className="hidden sm:inline">{lang === 'en' ? 'Copy Summary' : 'কপি'}</span>
              </>
            )}
          </button>

          {/* Toggle Hide / Expand */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white text-xs font-medium backdrop-blur-md transition-all duration-200 cursor-pointer shadow-xs hover:shadow-[0_0_12px_rgba(255,255,255,0.06)] shrink-0"
            title={isCollapsed ? (lang === 'en' ? 'Expand summary cards' : 'সামারি কার্ড খুলুন') : (lang === 'en' ? 'Hide summary cards' : 'সামারি কার্ড লুকান')}
          >
            <span>{isCollapsed ? (lang === 'en' ? 'Expand' : 'খুলুন') : (lang === 'en' ? 'Hide' : 'লুকান')}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* COMPACT CORE 4 STATS GRID: TOTAL NET WT • TOTAL MTR • TOTAL GRY • TOTAL CTN */}
      {!isCollapsed && (
        <div className="relative z-10 p-3 sm:p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 bg-slate-950/20 backdrop-blur-md">
          {/* 1. TOTAL NET WEIGHT */}
          <div className="group relative overflow-hidden rounded-xl p-3.5 sm:p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-emerald-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_0_25px_rgba(16,185,129,0.18)] backdrop-blur-xl transition-all duration-300 flex flex-col justify-between">
            {/* Top-right corner ambient flare */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

            <div className="relative z-10 flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="p-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  <Scale className="w-3.5 h-3.5" />
                </span>
                {t.totalNetWt}
              </span>
              <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                Net
              </span>
            </div>
            
            <div className="relative z-10 flex items-baseline gap-1.5 my-1">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white tabular-nums tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                {summary.totalNetWt.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-emerald-400/80 font-mono">Kg</span>
            </div>

            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 font-mono font-medium pt-2.5 mt-1 border-t border-white/[0.06]">
              <span className="text-slate-300 font-semibold">{summary.totalNetWtLbs.toFixed(1)} Lbs</span>
              <span className="text-slate-400">{summary.totalNetWtGm.toLocaleString()} gm</span>
            </div>
          </div>

          {/* 2. TOTAL METERS */}
          <div className="group relative overflow-hidden rounded-xl p-3.5 sm:p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-blue-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_0_25px_rgba(59,130,246,0.18)] backdrop-blur-xl transition-all duration-300 flex flex-col justify-between">
            {/* Top-right corner ambient flare */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

            <div className="relative z-10 flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="p-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                  <Ruler className="w-3.5 h-3.5" />
                </span>
                {t.totalMtr}
              </span>
              <span className="text-[10px] bg-blue-500/15 border border-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full font-mono font-bold shadow-[0_0_8px_rgba(59,130,246,0.15)]">
                Mtr
              </span>
            </div>
            
            <div className="relative z-10 flex items-baseline gap-1.5 my-1">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white tabular-nums tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                {summary.totalMtr.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-blue-400/80 font-mono">Mtr</span>
            </div>

            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 font-mono font-medium pt-2.5 mt-1 border-t border-white/[0.06]">
              <span className="text-slate-300 font-semibold">{summary.totalYds.toLocaleString()} Yds</span>
              <span className="text-slate-400">{(summary.totalMtr / 1000).toFixed(2)} KM</span>
            </div>
          </div>

          {/* 3. TOTAL GRY */}
          <div className="group relative overflow-hidden rounded-xl p-3.5 sm:p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-indigo-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_0_25px_rgba(99,102,241,0.18)] backdrop-blur-xl transition-all duration-300 flex flex-col justify-between">
            {/* Top-right corner ambient flare */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

            <div className="relative z-10 flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="p-1 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                  <Compass className="w-3.5 h-3.5" />
                </span>
                {t.totalGry}
              </span>
              <span className="text-[10px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full font-mono font-bold shadow-[0_0_8px_rgba(99,102,241,0.15)]">
                144 Yds
              </span>
            </div>
            
            <div className="relative z-10 flex items-baseline gap-1.5 my-1">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white tabular-nums tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                {summary.totalGry.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-indigo-400/80 font-mono">Gry</span>
            </div>

            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 font-mono font-medium pt-2.5 mt-1 border-t border-white/[0.06]">
              <span className="text-slate-300 font-semibold">{summary.totalYds.toLocaleString()} Yds</span>
              <span className="text-slate-400">Gross Yards</span>
            </div>
          </div>

          {/* 4. TOTAL CARTONS */}
          <div className="group relative overflow-hidden rounded-xl p-3.5 sm:p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-sky-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_0_25px_rgba(14,165,233,0.18)] backdrop-blur-xl transition-all duration-300 flex flex-col justify-between">
            {/* Top-right corner ambient flare */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-sky-500/10 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

            <div className="relative z-10 flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="p-1 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.2)]">
                  <Package className="w-3.5 h-3.5" />
                </span>
                {t.totalCtn}
              </span>
              <span className="text-[10px] bg-sky-500/15 border border-sky-500/30 text-sky-300 px-2 py-0.5 rounded-full font-mono font-bold shadow-[0_0_8px_rgba(14,165,233,0.15)]">
                CTN
              </span>
            </div>
            
            <div className="relative z-10 flex items-baseline gap-1.5 my-1">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white tabular-nums tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                {summary.totalCtn}
              </span>
              <span className="text-xs font-semibold text-sky-400/80 font-mono">CTN</span>
            </div>

            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 font-mono font-medium pt-2.5 mt-1 border-t border-white/[0.06]">
              <span className="font-bold text-emerald-400">{summary.activeNetCartonCount} Active</span>
              <span className="text-slate-400">Gross: {summary.totalGrossWt.toFixed(2)} Kg</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
