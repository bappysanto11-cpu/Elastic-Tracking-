import React, { useState } from 'react';
import { SummaryStats } from '../types/calculator';
import { Language, translations } from '../utils/translations';
import { Calculator, X, ChevronUp } from 'lucide-react';

interface FloatingSummaryBadgeProps {
  summary: SummaryStats;
  lang: Language;
}

export function FloatingSummaryBadge({ summary, lang }: FloatingSummaryBadgeProps) {
  const t = translations[lang];
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-40 bg-white shadow-xl shadow-indigo-100/50 border border-slate-200 rounded-full p-3 print:hidden hover:shadow-2xl hover:bg-slate-50 transition-all duration-300 text-indigo-500 flex items-center justify-center group"
        title="Show Quick Stats"
      >
        <Calculator className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 bg-white shadow-xl shadow-indigo-100/50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 max-w-[220px] print:hidden hover:shadow-2xl transition-shadow duration-300">
      <div className="flex items-center justify-between text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-indigo-500" />
          Quick Stats
        </div>
        <button 
          onClick={() => setIsMinimized(true)}
          className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-1 rounded-md transition-colors"
          title="Hide Stats"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-[13px]">
        <div className="text-slate-500 font-medium">Cartons:</div>
        <div className="font-bold text-right text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
          {summary.totalCtn}
        </div>
        
        <div className="text-slate-500 font-medium">Avg Net Wt:</div>
        <div className="font-bold text-right text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
          {summary.avgNetWtPerCtn} <span className="text-[10px] font-semibold">kg</span>
        </div>
        
        <div className="text-slate-500 font-medium">Std Dev:</div>
        <div className="font-bold text-right text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
          ±{summary.stdDevNetWt} <span className="text-[10px] font-semibold">kg</span>
        </div>
      </div>
    </div>
  );
}
