import React from 'react';
import { SummaryStats } from '../types/calculator';
import { ElasticDemand } from '../types/elasticDemand';
import { Language, translations } from '../utils/translations';
import { Package, Scale, Ruler, Compass, Target } from 'lucide-react';

interface SummaryCardsProps {
  summary: SummaryStats;
  lang: Language;
  matchingDemand?: ElasticDemand;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, lang, matchingDemand }) => {
  const t = translations[lang];

  // Calculate progress against demand if matched
  const progressPercent = matchingDemand?.requiredQtyMtr 
    ? Math.min(100, Math.round((summary.totalMtr / matchingDemand.requiredQtyMtr) * 100))
    : 0;

  const isFulfilled = matchingDemand && summary.totalMtr >= matchingDemand.requiredQtyMtr;

  return (
    <div className="mb-6 space-y-3">
      {/* Target Progress Bar */}
      {matchingDemand && (
        <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-4 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">
                {lang === 'en' ? 'Order Fulfillment Progress' : 'অর্ডার পূরণের অগ্রগতি'}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-500">
                {lang === 'en' ? 'Target:' : 'লক্ষ্যমাত্রা:'} <strong className="text-slate-900 font-mono text-sm">{matchingDemand.requiredQtyMtr.toLocaleString()}</strong> Mtr
              </span>
            </div>
          </div>
          
          <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200">
            <div 
              className={`h-full transition-all duration-500 ease-out flex items-center justify-end pr-2 text-[10px] font-bold text-white shadow-inner ${
                isFulfilled 
                  ? 'bg-emerald-500' 
                  : progressPercent > 75 
                    ? 'bg-indigo-500' 
                    : progressPercent > 25 
                      ? 'bg-amber-400' 
                      : 'bg-rose-400'
              }`}
              style={{ width: `${Math.max(5, progressPercent)}%` }}
            >
              {progressPercent}%
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="font-semibold text-slate-600">
              {lang === 'en' ? 'Current:' : 'বর্তমান:'} <strong className="text-indigo-700 font-mono">{summary.totalMtr.toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong> Mtr
            </span>
            <span className={`font-bold ${isFulfilled ? 'text-emerald-600' : 'text-slate-500'}`}>
              {isFulfilled 
                ? (lang === 'en' ? '✓ Target Reached' : '✓ লক্ষ্যমাত্রা অর্জিত')
                : (lang === 'en' ? `${(matchingDemand.requiredQtyMtr - summary.totalMtr).toLocaleString(undefined, { maximumFractionDigits: 1 })} Mtr remaining` : `${(matchingDemand.requiredQtyMtr - summary.totalMtr).toLocaleString(undefined, { maximumFractionDigits: 1 })} মিটার বাকি`)}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Net Wt */}
        <div className="bg-white rounded-xl border-2 border-emerald-500/80 bg-emerald-50/40 shadow-xs p-3.5 flex flex-col justify-between hover:border-emerald-600 transition">
          <div className="flex items-center justify-between text-emerald-900 text-xs font-bold mb-1">
            <span className="uppercase tracking-wide">{t.totalNetWt}</span>
            <Scale className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-950 tracking-tight font-mono">
              {summary.totalNetWt.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-emerald-700">Kg</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-emerald-800 font-mono font-bold mt-1 pt-0.5 border-t border-emerald-200">
            <span>{summary.totalNetWtLbs.toFixed(1)} Lbs</span>
            <span>{summary.totalNetWtGm.toLocaleString()} gm</span>
          </div>
        </div>

        {/* 2. Total Meters */}
        <div className="bg-white rounded-xl border border-indigo-200/80 bg-indigo-50/20 shadow-xs p-3.5 flex flex-col justify-between hover:border-indigo-300 transition">
          <div className="flex items-center justify-between text-indigo-800 text-xs font-semibold mb-1">
            <span>{t.totalMtr}</span>
            <Ruler className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-950 tracking-tight font-mono">
              {summary.totalMtr.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-indigo-700 uppercase">Mtr</span>
          </div>
          <p className="text-[10px] text-indigo-600/80 mt-1 font-mono">
            {summary.totalGry.toFixed(1)} Gry
          </p>
        </div>

        {/* 3. Total Cartons */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3.5 flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>{t.totalCtn}</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {summary.totalCtn}
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase">CTN</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {summary.activeNetCartonCount} Active / {summary.totalCtn} Total
          </p>
        </div>

        {/* 4. Total Gross Wt */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3.5 flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>{t.totalGrossWt}</span>
            <Scale className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {summary.totalGrossWt.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-slate-500">Kg</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">
            Tare: {summary.totalTareWt.toFixed(2)} Kg
          </p>
        </div>

        {/* 5. Total Gross Yards (Gry) */}
        <div className="bg-white rounded-xl border border-purple-200/80 bg-purple-50/20 shadow-xs p-3.5 flex flex-col justify-between hover:border-purple-300 transition">
          <div className="flex items-center justify-between text-purple-800 text-xs font-semibold mb-1">
            <span>{t.totalGry}</span>
            <Compass className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-purple-950 tracking-tight font-mono">
              {summary.totalGry.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-purple-700 uppercase">Gry</span>
          </div>
          <p className="text-[10px] text-purple-600/80 mt-1 font-mono">
            1 Gry = 144 Yds
          </p>
        </div>

        {/* 6. Total Yards */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3.5 flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>{t.totalYds}</span>
            <Ruler className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-800 tracking-tight font-mono">
              {summary.totalYds.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase">Yds</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">
            Yards Total
          </p>
        </div>
      </div>
    </div>
  );
};
