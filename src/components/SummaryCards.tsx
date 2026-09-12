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
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4 shadow-sm transition-all duration-300">
      {/* Clean Compact Header Bar without duplicate tags */}
      <div className="bg-slate-900 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 text-xs border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Scale className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-white text-xs sm:text-sm tracking-tight">
            {lang === 'en' ? 'Packing Live Summary' : 'প্যাকিং সামারি'}
          </span>
          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
            {summary.totalCtn} CTN
          </span>
        </div>

        {/* Right side: Compact Copy Button & Hide/Expand Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer shrink-0"
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
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer shrink-0"
            title={isCollapsed ? (lang === 'en' ? 'Expand summary cards' : 'সামারি কার্ড খুলুন') : (lang === 'en' ? 'Hide summary cards' : 'সামারি কার্ড লুকান')}
          >
            <span>{isCollapsed ? (lang === 'en' ? 'Expand' : 'খুলুন') : (lang === 'en' ? 'Hide' : 'লুকান')}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* COMPACT CORE 4 STATS GRID: TOTAL NET WT • TOTAL MTR • TOTAL GRY • TOTAL CTN */}
      {!isCollapsed && (
        <div className="p-2.5 sm:p-3.5 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50/60">
        {/* 1. TOTAL NET WEIGHT */}
        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              {t.totalNetWt}
            </span>
            <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded font-mono font-bold">
              Net
            </span>
          </div>
          
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums tracking-tight">
              {summary.totalNetWt.toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-slate-500">Kg</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono font-medium pt-2 border-t border-slate-100">
            <span className="text-slate-700">{summary.totalNetWtLbs.toFixed(1)} Lbs</span>
            <span>{summary.totalNetWtGm.toLocaleString()} gm</span>
          </div>
        </div>

        {/* 2. TOTAL METERS */}
        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              {t.totalMtr}
            </span>
            <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold">
              Mtr
            </span>
          </div>
          
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums tracking-tight">
              {summary.totalMtr.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-500">Mtr</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono font-medium pt-2 border-t border-slate-100">
            <span className="text-slate-700">{summary.totalYds.toLocaleString()} Yds</span>
            <span>{(summary.totalMtr / 1000).toFixed(2)} KM</span>
          </div>
        </div>

        {/* 3. TOTAL GRY */}
        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              {t.totalGry}
            </span>
            <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold">
              144 Yds
            </span>
          </div>
          
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums tracking-tight">
              {summary.totalGry.toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-slate-500">Gry</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono font-medium pt-2 border-t border-slate-100">
            <span className="text-slate-700">{summary.totalYds.toLocaleString()} Yds</span>
            <span>Gross Yards</span>
          </div>
        </div>

        {/* 4. TOTAL CARTONS */}
        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              {t.totalCtn}
            </span>
            <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
              CTN
            </span>
          </div>
          
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums tracking-tight">
              {summary.totalCtn}
            </span>
            <span className="text-xs font-semibold text-slate-500">CTN</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-100">
            <span className="font-bold text-emerald-700 font-mono">{summary.activeNetCartonCount} Active</span>
            <span className="text-slate-500 font-mono">Gross: {summary.totalGrossWt.toFixed(2)} Kg</span>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
