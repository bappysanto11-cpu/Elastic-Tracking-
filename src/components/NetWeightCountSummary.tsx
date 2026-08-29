import React, { useState } from 'react';
import { SummaryStats, PackingSheetData } from '../types/calculator';
import { Language } from '../utils/translations';
import { 
  Scale, 
  PackageCheck, 
  TrendingUp, 
  Copy, 
  Check, 
  Info,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Percent
} from 'lucide-react';

interface NetWeightCountSummaryProps {
  summary: SummaryStats;
  sheetData: PackingSheetData;
  lang: Language;
}

export const NetWeightCountSummary: React.FC<NetWeightCountSummaryProps> = ({
  summary,
  sheetData,
  lang,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `⚖️ [TOTAL NET WEIGHT SUMMARY]
Ref/PO: ${sheetData.ref || 'N/A'} | Buyer: ${sheetData.buyer || 'N/A'}
Active Cartons Count: ${summary.activeNetCartonCount} CTN (out of ${summary.totalCtn} total)
Total Net Weight: ${summary.totalNetWt.toFixed(2)} Kg (${summary.totalNetWtLbs.toFixed(2)} Lbs / ${summary.totalNetWtGm.toLocaleString()} gm)
Total Net Wt / Carton: ${summary.totalNetWt.toFixed(2)} Kg / ${summary.totalCtn} CTN
Min / Max Net Wt: ${summary.minNetWt.toFixed(2)} Kg / ${summary.maxNetWt.toFixed(2)} Kg
Total Gross Wt: ${summary.totalGrossWt.toFixed(2)} Kg | Total Tare Wt: ${summary.totalTareWt.toFixed(2)} Kg
Net-to-Gross Ratio: ${summary.netGrossRatio}%
Total Length: ${summary.totalMtr.toFixed(1)} Mtr (${summary.totalGry.toFixed(2)} Gry)`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white rounded-2xl border border-emerald-800/40 p-4 sm:p-5 shadow-lg relative overflow-hidden mb-6">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -mb-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800/80 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Scale className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black tracking-wide text-white flex items-center gap-2">
              <span>{lang === 'en' ? 'TOTAL NET WEIGHT COUNT & SUMMARY' : 'সর্বমোট নেট ওজন (Net Wt) গণনা সামারি'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                Live Stats
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {lang === 'en' 
                ? 'Precision net weight verification, carton count, and unit weight breakdown' 
                : 'সঠিক নেট ওজন যাচাই, সক্রিয় কার্টন সংখ্যা ও প্রতি কার্টনের গড় ওজন'}
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition shadow-xs cursor-pointer"
          title="Copy Net Weight count summary"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">{lang === 'en' ? 'Copied to Clipboard' : 'কপি হয়েছে!'}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>{lang === 'en' ? 'Copy Net Summary' : 'নেট সামারি কপি'}</span>
            </>
          )}
        </button>
      </div>

      {/* Main Metrics Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 relative z-10">
        {/* 1. Primary Highlight: Total Net Weight */}
        <div className="col-span-2 sm:col-span-1 lg:col-span-2 bg-emerald-900/40 border border-emerald-600/50 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-bold mb-1">
            <span>{lang === 'en' ? '1. TOTAL NET WEIGHT' : '১. সর্বমোট নেট ওজন'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-mono">
              Net = Gross - Tare
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {summary.totalNetWt.toFixed(2)}
            </span>
            <span className="text-sm font-bold text-emerald-400 uppercase">Kg</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-emerald-200/90 font-mono pt-1 border-t border-emerald-700/40">
            <span>= {summary.totalNetWtLbs.toFixed(2)} Lbs</span>
            <span>•</span>
            <span>{summary.totalNetWtGm.toLocaleString()} gm</span>
          </div>
        </div>

        {/* 2. Total Meters (Length) */}
        <div className="bg-slate-800/60 border border-indigo-500/40 rounded-xl p-3 flex flex-col justify-between hover:border-indigo-400 transition">
          <div className="flex items-center justify-between text-indigo-300 text-xs font-semibold mb-1">
            <span>{lang === 'en' ? '2. Total Meters' : '২. মোট মিটার'}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-200">
              Length
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-2xl font-black text-white font-mono">
              {summary.totalMtr.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-indigo-400 uppercase">Mtr</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono truncate">
            {summary.totalGry.toFixed(2)} Gry • {summary.totalYds.toFixed(1)} Yds
          </p>
        </div>

        {/* 3. Total Cartons (Count) */}
        <div className="bg-slate-800/60 border border-sky-500/40 rounded-xl p-3 flex flex-col justify-between hover:border-sky-400 transition">
          <div className="flex items-center justify-between text-sky-300 text-xs font-semibold mb-1">
            <span>{lang === 'en' ? '3. Total Cartons' : '৩. মোট কার্টন'}</span>
            <PackageCheck className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-2xl font-black text-white font-mono">
              {summary.totalCtn}
            </span>
            <span className="text-xs font-bold text-sky-400 uppercase">CTN</span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">
            {summary.activeNetCartonCount} Active / {summary.totalCtn} Total Slots
          </p>
        </div>

        {/* 4. Total Net Weight / Carton */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between hover:border-slate-600 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>{lang === 'en' ? 'Net Wt / Carton' : 'নেট ওজন / কার্টন'}</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-2xl font-black text-amber-300 font-mono">
              {summary.totalNetWt.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-slate-400">Kg/{summary.totalCtn}C</span>
          </div>
          <p className="text-[10px] text-slate-400">
            {summary.activeNetCartonCount > 0 
              ? `${summary.activeNetCartonCount} Active • ${summary.totalNetWtLbs.toFixed(1)} Lbs`
              : '0.00 Kg'}
          </p>
        </div>

        {/* 5. Net to Gross Ratio & Tare */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between hover:border-slate-600 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>{lang === 'en' ? 'Net/Gross Ratio' : 'নেট অনুপাত'}</span>
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {summary.netGrossRatio}%
            </span>
            <span className="text-[10px] text-slate-400 font-bold">Yield</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            Gross: {summary.totalGrossWt.toFixed(2)} Kg
          </p>
        </div>
      </div>
    </div>
  );
};
