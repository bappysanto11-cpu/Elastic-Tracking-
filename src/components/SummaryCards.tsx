import React, { useState } from 'react';
import { SummaryStats } from '../types/calculator';
import { Language, translations } from '../utils/translations';
import { 
  Scale, 
  Ruler, 
  Compass, 
  Package, 
  Layers, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp,
  Boxes
} from 'lucide-react';

interface SummaryCardsProps {
  summary: SummaryStats;
  lang: Language;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  lang
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const t = translations[lang];

  // Helper to toggle summary cards collapse state
  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev);
  };

  const handleCopySummary = async () => {
    const text = `📋 PACKING SUMMARY
━━━━━━━━━━━━━━━━━━━━
📦 Total Cartons: ${summary.totalCtn} (${summary.activeNetCartonCount} Active)
⚖️ Total Net Wt: ${summary.totalNetWt.toFixed(2)} Kg (${summary.totalNetWtLbs.toFixed(2)} Lbs / ${summary.totalNetWtGm.toLocaleString()} gm)
📏 Total Length: ${summary.totalMtr.toLocaleString()} Mtr (${summary.totalYds.toLocaleString()} Yds)
📐 Total Gry: ${summary.totalGry.toFixed(2)} Gry
⚖️ Total Gross Wt: ${summary.totalGrossWt.toFixed(2)} Kg
📦 Total Tare Wt: ${summary.totalTareWt.toFixed(2)} Kg
━━━━━━━━━━━━━━━━━━━━`;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-neutral-200 shadow-xs mb-5 transition-all duration-300 text-neutral-900">
      {/* Clean Header Bar */}
      <div className="bg-neutral-50 px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-2 text-xs border-b border-neutral-200">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
            <Scale className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-neutral-900 text-xs sm:text-sm tracking-tight flex items-center gap-2">
            {lang === 'en' ? 'Packing Live Summary' : 'প্যাকিং সামারি'}
          </span>
          <span className="text-[10.5px] font-mono font-bold text-neutral-800 bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-300">
            {summary.totalCtn} CTN
          </span>
        </div>

        {/* Right side: Compact Copy Button & Hide/Expand Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-medium transition cursor-pointer shadow-xs shrink-0"
            title="Copy full summary"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-neutral-900" />
                <span className="text-neutral-900 font-bold">{lang === 'en' ? 'Copied' : 'কপি'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-neutral-600" />
                <span className="hidden sm:inline">{lang === 'en' ? 'Copy Summary' : 'কপি'}</span>
              </>
            )}
          </button>

          {/* Toggle Hide / Expand */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-medium transition cursor-pointer shadow-xs shrink-0"
            title={isCollapsed ? (lang === 'en' ? 'Expand summary cards' : 'সামারি কার্ড খুলুন') : (lang === 'en' ? 'Hide summary cards' : 'সামারি কার্ড লুকান')}
          >
            <span>{isCollapsed ? (lang === 'en' ? 'Expand' : 'খুলুন') : (lang === 'en' ? 'Hide' : 'লুকান')}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* CORE 4 STATS GRID: TOTAL NET WT • TOTAL MTR • TOTAL GRY • TOTAL CTN */}
      {!isCollapsed && (
        <div className="p-3 sm:p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 bg-white">
          {/* 1. TOTAL NET WEIGHT */}
          <div className="group relative overflow-hidden rounded-xl p-3.5 sm:p-4 bg-neutral-50/70 hover:bg-neutral-100/80 border border-neutral-200 transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="p-1 rounded-md bg-white border border-neutral-300 text-neutral-900">
                  <Scale className="w-3.5 h-3.5" />
                </span>
                {t.totalNetWt}
              </span>
              <span className="text-[10px] bg-white border border-neutral-300 text-neutral-800 px-2 py-0.5 rounded-full font-mono font-bold">
                Net
              </span>
            </div>
            
            <div className="flex items-baseline gap-1.5 my-1">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-neutral-900 tabular-nums tracking-tight">
                {summary.totalNetWt.toFixed(2)}
              </span>
              <span className="text-xs font-bold text-neutral-600 font-mono">Kg</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-600 font-mono font-medium pt-2.5 mt-1 border-t border-neutral-200">
              <span className="text-neutral-800 font-semibold">{summary.totalNetWtLbs.toFixed(1)} Lbs</span>
              <span className="text-neutral-500">{summary.totalNetWtGm.toLocaleString()} gm</span>
            </div>
          </div>

          {/* 2. TOTAL METERS */}
          <div className="group relative overflow-hidden rounded-xl p-3.5 sm:p-4 bg-neutral-50/70 hover:bg-neutral-100/80 border border-neutral-200 transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="p-1 rounded-md bg-white border border-neutral-300 text-neutral-900">
                  <Ruler className="w-3.5 h-3.5" />
                </span>
                {t.totalMtr}
              </span>
              <span className="text-[10px] bg-white border border-neutral-300 text-neutral-800 px-2 py-0.5 rounded-full font-mono font-bold">
                Mtr
              </span>
            </div>
            
            <div className="flex items-baseline gap-1.5 my-1">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-neutral-900 tabular-nums tracking-tight">
                {summary.totalMtr.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-neutral-600 font-mono">Mtr</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-600 font-mono font-medium pt-2.5 mt-1 border-t border-neutral-200">
              <span className="text-neutral-800 font-semibold">{summary.totalYds.toLocaleString()} Yds</span>
              <span className="text-neutral-500">{(summary.totalMtr / 1000).toFixed(2)} KM</span>
            </div>
          </div>

          {/* 3. TOTAL GRY */}
          <div className="group relative overflow-hidden rounded-xl p-3.5 sm:p-4 bg-neutral-50/70 hover:bg-neutral-100/80 border border-neutral-200 transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="p-1 rounded-md bg-white border border-neutral-300 text-neutral-900">
                  <Compass className="w-3.5 h-3.5" />
                </span>
                {t.totalGry}
              </span>
              <span className="text-[10px] bg-white border border-neutral-300 text-neutral-800 px-2 py-0.5 rounded-full font-mono font-bold">
                144 Yds
              </span>
            </div>
            
            <div className="flex items-baseline gap-1.5 my-1">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-neutral-900 tabular-nums tracking-tight">
                {summary.totalGry.toFixed(2)}
              </span>
              <span className="text-xs font-bold text-neutral-600 font-mono">Gry</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-600 font-mono font-medium pt-2.5 mt-1 border-t border-neutral-200">
              <span className="text-neutral-800 font-semibold">{summary.totalYds.toLocaleString()} Yds</span>
              <span className="text-neutral-500">Gross Yards</span>
            </div>
          </div>

          {/* 4. TOTAL CARTONS */}
          <div className="group relative overflow-hidden rounded-xl p-3.5 sm:p-4 bg-neutral-50/70 hover:bg-neutral-100/80 border border-neutral-200 transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="p-1 rounded-md bg-white border border-neutral-300 text-neutral-900">
                  <Package className="w-3.5 h-3.5" />
                </span>
                {t.totalCtn}
              </span>
              <span className="text-[10px] bg-white border border-neutral-300 text-neutral-800 px-2 py-0.5 rounded-full font-mono font-bold">
                CTN
              </span>
            </div>
            
            <div className="flex items-baseline gap-1.5 my-1">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-neutral-900 tabular-nums tracking-tight">
                {summary.totalCtn}
              </span>
              <span className="text-xs font-bold text-neutral-600 font-mono">CTN</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-600 font-mono font-medium pt-2.5 mt-1 border-t border-neutral-200">
              <span className="font-bold text-neutral-900">{summary.activeNetCartonCount} Active</span>
              <span className="text-neutral-500">Gross: {summary.totalGrossWt.toFixed(2)} Kg</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
