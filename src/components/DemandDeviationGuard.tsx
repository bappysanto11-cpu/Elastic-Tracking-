import React, { useState } from 'react';
import { ElasticDemand } from '../types/elasticDemand';
import { PackingSheetData, CartonRow } from '../types/calculator';
import { DemandComplianceReport, CartonDeviation } from '../utils/deviationDetector';
import { Language, translations } from '../utils/translations';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  Sliders, 
  Filter, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Info,
  Scale,
  Hash,
  RotateCcw,
  Tag,
  BookmarkCheck,
  Check
} from 'lucide-react';

interface DemandDeviationGuardProps {
  sheetData: PackingSheetData;
  demands: ElasticDemand[];
  selectedDemand: ElasticDemand | null;
  onSelectDemand: (demand: ElasticDemand | null) => void;
  report: DemandComplianceReport;
  filterOnlyDeviations: boolean;
  onToggleFilterDeviations: () => void;
  onAutoFixAllDeviations: () => void;
  tolerancePercent: number;
  onChangeTolerance: (tol: number) => void;
  lang: Language;
}

export const DemandDeviationGuard: React.FC<DemandDeviationGuardProps> = ({
  sheetData,
  demands,
  selectedDemand,
  onSelectDemand,
  report,
  filterOnlyDeviations,
  onToggleFilterDeviations,
  onAutoFixAllDeviations,
  tolerancePercent,
  onChangeTolerance,
  lang,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);
  const [justFixed, setJustFixed] = useState<boolean>(false);

  const t = translations[lang];

  const handleFix = () => {
    onAutoFixAllDeviations();
    setJustFixed(true);
    setTimeout(() => setJustFixed(false), 2500);
  };

  const hasCritical = report.criticalCount > 0;
  const hasWarnings = report.warningCount > 0;
  const totalIssues = report.allDeviations.length;

  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden mb-3.5 print:hidden ${
      hasCritical
        ? 'bg-gradient-to-r from-red-950/90 via-slate-900 to-red-950/90 border-red-600/70 shadow-md text-white'
        : hasWarnings
        ? 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-amber-500/70 shadow-sm text-white'
        : selectedDemand
        ? 'bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border-emerald-600/50 shadow-xs text-white'
        : 'bg-slate-900 border-slate-800 text-slate-200'
    }`}>
      {/* Header Bar */}
      <div className="p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Status Badge & Demand Context */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg shrink-0 flex items-center justify-center ${
            hasCritical
              ? 'bg-red-600/20 text-red-400 border border-red-500/40 animate-pulse'
              : hasWarnings
              ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40'
              : selectedDemand
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            {hasCritical ? (
              <ShieldAlert className="w-5 h-5 text-red-400" />
            ) : hasWarnings ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                {lang === 'en' ? 'Elastic Demand Quality Guard' : 'ইলাস্টিক চাহিদা ও কোয়ালিটি গার্ড'}
              </span>

              {/* Status Pill */}
              {selectedDemand ? (
                hasCritical ? (
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-red-600 text-white shadow-xs animate-bounce">
                    {lang === 'en' ? `${report.criticalCount} Critical Errors!` : `${report.criticalCount}টি গুরুতর প্যাকিং ত্রুটি!`}
                  </span>
                ) : hasWarnings ? (
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500 text-slate-950">
                    {lang === 'en' ? `${report.warningCount} Spec Warnings` : `${report.warningCount}টি স্পেক সতর্কতা`}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{lang === 'en' ? '100% Demand Compliant' : '১০০% চাহিদা সঠিক'}</span>
                  </span>
                )
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                  {lang === 'en' ? 'No Demand Attached' : 'কোনো চাহিদা যুক্ত নেই'}
                </span>
              )}
            </div>

            {/* Subtitle / Active Buyer Specs */}
            <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5 flex-wrap">
              {selectedDemand ? (
                <>
                  <span className="font-bold text-amber-300">
                    {selectedDemand.buyer} {selectedDemand.customer ? `(${selectedDemand.customer})` : ''}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="font-mono text-slate-200">{selectedDemand.ref}</span>
                  <span className="text-slate-500">•</span>
                  <span className="bg-slate-800 px-1.5 py-0.2 rounded font-mono text-[11px] text-slate-200">
                    {selectedDemand.size} · {selectedDemand.color || 'STANDARD'}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-indigo-300 font-mono text-[11px]">
                    Target: <strong>{selectedDemand.unitWeightGm} gm/m</strong> | Tare: <strong>{selectedDemand.defaultTare || 0.5} kg</strong>
                  </span>
                </>
              ) : (
                <span className="text-slate-400 text-xs">
                  {lang === 'en' 
                    ? 'Attach a buyer demand to automatically detect unit weight errors, tare variances, and overpacking.'
                    : 'বায়ারের চাহিদা নির্বাচন করে ওজন ত্রুটি, ট্যার সমস্যা ও অতিরিক্ত প্যাকিং শনাক্ত করুন।'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Tools & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Demand Benchmark Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSelectorOpen(!isSelectorOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">
                {selectedDemand ? `${selectedDemand.buyer} (${selectedDemand.size})` : (lang === 'en' ? 'Select Buyer Demand' : 'চাহিদা যুক্ত করুন')}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isSelectorOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 px-1">
                  <span className="font-bold text-slate-300">
                    {lang === 'en' ? 'Select Benchmark Demand' : 'বেঞ্চমার্ক চাহিদা নির্বাচন করুন'}
                  </span>
                  {selectedDemand && (
                    <button
                      onClick={() => {
                        onSelectDemand(null);
                        setIsSelectorOpen(false);
                      }}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      {lang === 'en' ? 'Detach' : 'মুছে দিন'}
                    </button>
                  )}
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1 mt-1">
                  {demands.length === 0 ? (
                    <div className="p-3 text-center text-slate-500 text-[11px]">
                      {lang === 'en' ? 'No demands found in database' : 'ডাটাবেজে কোনো চাহিদা নেই'}
                    </div>
                  ) : (
                    demands.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          onSelectDemand(d);
                          setIsSelectorOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg transition flex items-center justify-between gap-2 cursor-pointer ${
                          selectedDemand?.id === d.id
                            ? 'bg-indigo-600/30 text-white border border-indigo-500/50'
                            : 'hover:bg-slate-800 text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300">
                              {d.buyer}
                            </span>
                            <span className="font-bold text-slate-200 font-mono truncate">{d.ref}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                            {d.size} · {d.unitWeightGm} gm/m · Req: {d.requiredQtyMtr.toLocaleString()}m
                          </p>
                        </div>
                        {selectedDemand?.id === d.id && (
                          <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Auto-Fix Button (When issues exist and a demand is active) */}
          {selectedDemand && totalIssues > 0 && (
            <button
              type="button"
              onClick={handleFix}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                justFixed
                  ? 'bg-emerald-600 text-white'
                  : hasCritical
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
              title="Apply Demand standard unit weight & tare to all deviating cartons"
            >
              {justFixed ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Standards Applied!' : 'সঠিক করা হয়েছে!'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{lang === 'en' ? 'Fix All to Demand Specs' : 'চাহিদা অনুযায়ী অটো-ঠিক করুন'}</span>
                </>
              )}
            </button>
          )}

          {/* Filter Flagged Cartons Toggle */}
          {totalIssues > 0 && (
            <button
              type="button"
              onClick={onToggleFilterDeviations}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                filterOnlyDeviations
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
              }`}
              title="Toggle filter to only view cartons with deviations"
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {filterOnlyDeviations 
                  ? (lang === 'en' ? 'Showing Errors Only' : 'শুধু ত্রুটিগুলো দেখছি') 
                  : (lang === 'en' ? `Show Errors (${totalIssues})` : `ত্রুটি দেখান (${totalIssues})`)}
              </span>
            </button>
          )}

          {/* Expand Details Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title={isExpanded ? 'Collapse Quality Details' : 'Expand Quality Details'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Details Drawer */}
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-800/80 bg-slate-950/60 space-y-3 animate-in fade-in">
          
          {/* Progress & Summary Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            
            {/* 1. Demand Fulfillment */}
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                {lang === 'en' ? 'Order Fulfillment' : 'অর্ডার অগ্রগতি'}
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-black font-mono text-emerald-400">
                  {report.totalPackedMtr.toFixed(1)}m
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  / {report.requiredMtr > 0 ? `${report.requiredMtr.toLocaleString()}m` : 'N/A'}
                </span>
              </div>
              {report.requiredMtr > 0 && (
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      report.fulfillmentPercent > 105 ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(report.fulfillmentPercent, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* 2. Compliant vs Deviating Cartons */}
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                {lang === 'en' ? 'Carton Quality Check' : 'কার্টন কোয়ালিটি স্ট্যাটাস'}
              </span>
              <div className="flex items-center gap-2 text-xs font-bold font-mono">
                <span className="text-emerald-400">🟢 {report.compliantCount} OK</span>
                <span className="text-amber-400">🟡 {report.warningCount} Warn</span>
                <span className="text-red-400">🔴 {report.criticalCount} Err</span>
              </div>
            </div>

            {/* 3. Expected Unit Weight Range */}
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                {lang === 'en' ? 'Tolerance Setting' : 'সহনশীলতার মাত্রা (Tolerance)'}
              </span>
              <div className="flex items-center gap-1.5">
                {[2, 5, 10].map(tol => (
                  <button
                    key={tol}
                    type="button"
                    onClick={() => onChangeTolerance(tol)}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-bold transition cursor-pointer ${
                      tolerancePercent === tol
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    ±{tol}%
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Overpack / Remaining Balance */}
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                {report.overpackMeters > 0 
                  ? (lang === 'en' ? 'Overpack Excess' : 'অতিরিক্ত প্যাকিং') 
                  : (lang === 'en' ? 'Remaining Demand' : 'বাকি চাহিদা')}
              </span>
              <span className={`text-sm font-black font-mono ${
                report.overpackMeters > 0 ? 'text-amber-400' : 'text-slate-200'
              }`}>
                {report.overpackMeters > 0 
                  ? `+${report.overpackMeters.toFixed(1)} Mtr`
                  : `${Math.max(0, report.requiredMtr - report.totalPackedMtr).toFixed(1)} Mtr`}
              </span>
            </div>
          </div>

          {/* Detected Deviations List */}
          {report.allDeviations.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'en' ? 'Identified Deviations in Active Cartons:' : 'চিহ্নিত প্যাকিং বিচ্যুতি ও ত্রুটিসমূহ:'}</span>
              </span>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {report.allDeviations.map((dev, idx) => (
                  <div
                    key={`${dev.cartonId}-${dev.type}-${idx}`}
                    className={`p-2 rounded-lg text-xs flex items-center justify-between gap-3 border ${
                      dev.severity === 'critical'
                        ? 'bg-red-950/80 border-red-700/80 text-red-200'
                        : 'bg-amber-950/70 border-amber-700/70 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-1.5 py-0.2 rounded font-mono font-black text-[10.5px] ${
                        dev.severity === 'critical' ? 'bg-red-800 text-white' : 'bg-amber-800 text-amber-100'
                      }`}>
                        CTN #{dev.cartonNo}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold block truncate">{dev.title}</span>
                        <p className="text-[11px] opacity-80 truncate">{dev.message}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono opacity-70 block">
                        Exp: {dev.expectedValue}
                      </span>
                      <span className="text-[11px] font-mono font-bold">
                        Act: {dev.actualValue}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
