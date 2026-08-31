import React, { useState } from 'react';
import { SummaryStats, PackingSheetData } from '../types/calculator';
import { Language, translations } from '../utils/translations';
import { Scale, Ruler, Compass, Package, Tag, Maximize2, Palette, Hash, Copy, Check } from 'lucide-react';

interface SummaryCardsProps {
  summary: SummaryStats;
  lang: Language;
  sheetData?: PackingSheetData;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, lang, sheetData }) => {
  const t = translations[lang];
  const [copied, setCopied] = useState(false);

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
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden mb-3">
      {/* 1ST MENTION: BUYER • SIZE • COLOUR • REF Inside Compact Header Bar */}
      <div className="bg-slate-900 text-white px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-1.5 text-xs">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap min-w-0">
          {/* BUYER */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700/80 px-2 py-0.5 rounded-md">
            <Tag className="w-2.5 h-2.5 text-violet-400 shrink-0" />
            <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-tight">
              {lang === 'en' ? 'Buyer' : 'বায়ার'}:
            </span>
            <span className="text-[11px] font-bold text-white truncate max-w-[110px] sm:max-w-[150px]">
              {buyer}
            </span>
          </div>

          {/* SIZE */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700/80 px-2 py-0.5 rounded-md">
            <Maximize2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
            <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-tight">
              {lang === 'en' ? 'Size' : 'সাইজ'}:
            </span>
            <span className="text-[11px] font-bold font-mono text-emerald-300 truncate">
              {size}
            </span>
          </div>

          {/* COLOUR */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700/80 px-2 py-0.5 rounded-md">
            <Palette className="w-2.5 h-2.5 text-rose-400 shrink-0" />
            <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-tight">
              {lang === 'en' ? 'Colour' : 'রঙ'}:
            </span>
            <span className="text-[11px] font-bold text-rose-300 truncate max-w-[90px]">
              {color}
            </span>
          </div>

          {/* REF */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700/80 px-2 py-0.5 rounded-md">
            <Hash className="w-2.5 h-2.5 text-amber-400 shrink-0" />
            <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-tight">
              {lang === 'en' ? 'Ref' : 'রেফারেন্স'}:
            </span>
            <span className="text-[11px] font-bold font-mono text-amber-300 truncate max-w-[130px] sm:max-w-[180px]">
              {ref}
            </span>
          </div>
        </div>

        {/* Right side: Compact Copy Button */}
        <button
          type="button"
          onClick={handleCopySummary}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium border border-slate-700 transition cursor-pointer shrink-0"
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
      </div>

      {/* COMPACT CORE 4 STATS GRID: TOTAL NET WT • TOTAL MTR • TOTAL GRY • TOTAL CTN */}
      <div className="p-1.5 sm:p-2 bg-slate-50/50 grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2">
        {/* 1. TOTAL NET WEIGHT */}
        <div className="bg-white rounded-lg border border-emerald-200/90 p-2 shadow-2xs hover:border-emerald-400 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-900 text-[11px] font-bold mb-0.5">
            <span className="uppercase tracking-tight flex items-center gap-1">
              <Scale className="w-3 h-3 text-emerald-600 shrink-0" />
              {t.totalNetWt}
            </span>
            <span className="text-[9.5px] bg-emerald-100/90 text-emerald-800 px-1 py-0.2 rounded font-mono font-bold">Net</span>
          </div>
          
          <div className="flex items-baseline gap-1 my-0.5">
            <span className="text-lg sm:text-xl font-black text-emerald-950 tracking-tight font-mono">
              {summary.totalNetWt.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-emerald-700">Kg</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-emerald-800/90 font-mono font-medium pt-1 border-t border-emerald-100">
            <span>{summary.totalNetWtLbs.toFixed(1)} Lbs</span>
            <span>{summary.totalNetWtGm.toLocaleString()} gm</span>
          </div>
        </div>

        {/* 2. TOTAL METERS */}
        <div className="bg-white rounded-lg border border-indigo-200/90 p-2 shadow-2xs hover:border-indigo-400 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-900 text-[11px] font-bold mb-0.5">
            <span className="uppercase tracking-tight flex items-center gap-1">
              <Ruler className="w-3 h-3 text-indigo-600 shrink-0" />
              {t.totalMtr}
            </span>
            <span className="text-[9.5px] bg-indigo-100/90 text-indigo-800 px-1 py-0.2 rounded font-mono font-bold">Mtr</span>
          </div>
          
          <div className="flex items-baseline gap-1 my-0.5">
            <span className="text-lg sm:text-xl font-black text-indigo-950 tracking-tight font-mono">
              {summary.totalMtr.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-indigo-700">Mtr</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-indigo-800/90 font-mono font-medium pt-1 border-t border-indigo-100">
            <span>{summary.totalYds.toLocaleString()} Yds</span>
            <span>{(summary.totalMtr / 1000).toFixed(2)} KM</span>
          </div>
        </div>

        {/* 3. TOTAL GRY */}
        <div className="bg-white rounded-lg border border-purple-200/90 p-2 shadow-2xs hover:border-purple-400 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-900 text-[11px] font-bold mb-0.5">
            <span className="uppercase tracking-tight flex items-center gap-1">
              <Compass className="w-3 h-3 text-purple-600 shrink-0" />
              {t.totalGry}
            </span>
            <span className="text-[9.5px] bg-purple-100/90 text-purple-800 px-1 py-0.2 rounded font-mono font-bold">144 Yds</span>
          </div>
          
          <div className="flex items-baseline gap-1 my-0.5">
            <span className="text-lg sm:text-xl font-black text-purple-950 tracking-tight font-mono">
              {summary.totalGry.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-purple-700">Gry</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-purple-800/90 font-mono font-medium pt-1 border-t border-purple-100">
            <span>{summary.totalYds.toLocaleString()} Yds</span>
            <span>Gross Yards</span>
          </div>
        </div>

        {/* 4. TOTAL CARTONS */}
        <div className="bg-white rounded-lg border border-blue-200/90 p-2 shadow-2xs hover:border-blue-400 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-900 text-[11px] font-bold mb-0.5">
            <span className="uppercase tracking-tight flex items-center gap-1">
              <Package className="w-3 h-3 text-blue-600 shrink-0" />
              {t.totalCtn}
            </span>
            <span className="text-[9.5px] bg-blue-100/90 text-blue-800 px-1 py-0.2 rounded font-mono font-bold">CTN</span>
          </div>
          
          <div className="flex items-baseline gap-1 my-0.5">
            <span className="text-lg sm:text-xl font-black text-blue-950 tracking-tight font-mono">
              {summary.totalCtn}
            </span>
            <span className="text-xs font-bold text-blue-700">CTN</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-blue-800/90 font-medium pt-1 border-t border-blue-100">
            <span className="font-bold text-emerald-700 font-mono">{summary.activeNetCartonCount} Active</span>
            <span className="text-slate-500 font-mono">Gross: {summary.totalGrossWt.toFixed(2)} Kg</span>
          </div>
        </div>
      </div>
    </div>
  );
};
