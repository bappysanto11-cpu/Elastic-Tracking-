import React, { useState } from 'react';
import { PackingSheetData } from '../types/calculator';
import { ElasticDemand } from '../types/elasticDemand';
import { Language, translations } from '../utils/translations';
import { 
  Building2, 
  Hash, 
  User, 
  Tag, 
  Maximize2, 
  Palette, 
  Box, 
  Scale, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  RefreshCw,
  SlidersHorizontal,
  Layers,
  ArrowRight,
  BookmarkCheck,
  Calendar
} from 'lucide-react';
import { AutocompleteInput } from './AutocompleteInput';

interface OrderHeaderFormProps {
  sheetData: PackingSheetData;
  onChange: (updated: Partial<PackingSheetData>) => void;
  onApplyDefaultWeights: () => void;
  lang: Language;
  demands?: ElasticDemand[];
  onSelectDemand?: (demand: ElasticDemand) => void;
  onOpenDemandsView?: () => void;
}

const COMMON_BUYERS = ['HCF', 'Sports Direct', 'H&M', 'Zara', 'M&S', 'Next', 'Decathlon', 'Primark', 'Target', 'Walmart', 'PVH'];
const COMMON_SIZES = ['5 MM', '6 MM', '7 MM', '8 MM', '10 MM', '12 MM', '15 MM', '20 MM', '25 MM', '30 MM', '32 MM', '38 MM', '40 MM', '50 MM', '61 MM'];
const COMMON_COLORS = ['WHITE', 'BLACK', 'NAVY', 'GREY', 'OPTICAL WHITE', 'OFF WHITE', 'ROYAL BLUE', 'RED'];

export const OrderHeaderForm: React.FC<OrderHeaderFormProps> = ({
  sheetData,
  onChange,
  onApplyDefaultWeights,
  lang,
  demands = [],
  onSelectDemand,
  onOpenDemandsView,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeChipTray, setActiveChipTray] = useState<'buyer' | 'size' | 'color' | 'none'>('buyer');
  const [copied, setCopied] = useState(false);
  const [syncApplied, setSyncApplied] = useState(false);
  const [isDemandPickerOpen, setIsDemandPickerOpen] = useState(false);

  const t = translations[lang];

  // Check if current sheet matches any demand
  const matchingDemand = demands.find(d => 
    sheetData.ref && d.ref && d.ref.trim().toLowerCase() === sheetData.ref.trim().toLowerCase()
  );

  const handleCopySpec = async () => {
    const specText = `📦 Order Spec: ${sheetData.ref || 'N/A'} | Buyer: ${sheetData.buyer || 'N/A'} | Cust: ${sheetData.customer || 'N/A'} | Size: ${sheetData.size || 'N/A'} | Color: ${sheetData.color || 'N/A'} | Unit Wt: ${sheetData.defaultWtPerUnit} gm/m | Tare: ${sheetData.defaultTare} Kg`;
    try {
      window.focus();
      await navigator.clipboard.writeText(specText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSyncClick = () => {
    onApplyDefaultWeights();
    setSyncApplied(true);
    setTimeout(() => setSyncApplied(false), 2000);
  };

  const handleChooseDemand = (demand: ElasticDemand) => {
    if (onSelectDemand) {
      onSelectDemand(demand);
    } else {
      onChange({
        buyer: demand.buyer,
        customer: demand.customer,
        ref: demand.ref,
        size: demand.size,
        color: demand.color,
        defaultWtPerUnit: demand.unitWeightGm || 8.0,
        defaultTare: demand.defaultTare || 0.5,
      });
    }
    setIsDemandPickerOpen(false);
  };

  const activeFieldsCount = [
    sheetData.companyName,
    sheetData.ref,
    sheetData.customer,
    sheetData.buyer,
    sheetData.size,
    sheetData.color,
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs mb-5 transition-all duration-200 hover:shadow-md overflow-hidden">
      {/* Top Smart Control Ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3 text-white">
        {/* Left: Section Title & Smart Badges */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h2 className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-1.5 truncate">
              {lang === 'en' ? 'Order & Item Specifications' : 'অর্ডার ও আইটেম স্পেসিফিকেশন'}
            </h2>
            
            {/* Active Spec Counter Pill */}
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {activeFieldsCount}/6 {lang === 'en' ? 'Active' : 'ফিল্ড পূরণ'}
            </span>

            {sheetData.ref && (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-slate-800/90 text-amber-300 border border-amber-500/30">
                {sheetData.ref}
              </span>
            )}

            {/* Matched Demand Live Pill */}
            {matchingDemand && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                <BookmarkCheck className="w-3 h-3 text-indigo-300" />
                <span>Demand: {matchingDemand.requiredQtyMtr.toLocaleString()} Mtr</span>
                {matchingDemand.deliveryDate && (
                  <span className="text-amber-300 font-mono text-[10px]">({matchingDemand.deliveryDate})</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Right: Quick Tools (Load from Demand, Copy Spec, Collapse) */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          {/* Quick Demand Picker Button */}
          {demands.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDemandPickerOpen(!isDemandPickerOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition cursor-pointer shadow-xs"
                title="Load specifications from saved Elastic Demands"
              >
                <Tag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lang === 'en' ? 'Pick Demand' : 'চাহিদা লোড'}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {/* Demand Picker Dropdown */}
              {isDemandPickerOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white text-slate-900 rounded-xl shadow-xl border border-slate-200 z-50 p-2 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
                    <span className="text-xs font-bold text-slate-800">
                      {lang === 'en' ? 'Select Active Demand' : 'ইলাস্টিক চাহিদা নির্বাচন করুন'}
                    </span>
                    {onOpenDemandsView && (
                      <button
                        onClick={() => {
                          setIsDemandPickerOpen(false);
                          onOpenDemandsView();
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        {lang === 'en' ? 'View All →' : 'সবগুলো দেখুন →'}
                      </button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1 mt-1">
                    {demands.slice(0, 8).map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleChooseDemand(d)}
                        className="w-full text-left p-2 rounded-lg hover:bg-indigo-50/80 transition flex items-center justify-between gap-2 border border-transparent hover:border-indigo-100 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-[11px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                              {d.buyer}
                            </span>
                            <span className="font-bold text-xs text-slate-800 font-mono truncate">
                              {d.size} · {d.ref}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-500 truncate mt-0.5">
                            {d.customer ? `Cust: ${d.customer} · ` : ''}Req: <strong className="text-indigo-700 font-mono">{d.requiredQtyMtr}m</strong> {d.color ? `· ${d.color}` : ''}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {d.demandDate}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleCopySpec}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700/80 transition cursor-pointer"
            title="Copy Order Specs to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">{lang === 'en' ? 'Copied' : 'কপি হয়েছে'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span>{lang === 'en' ? 'Copy Spec' : 'স্পেক কপি'}</span>
              </>
            )}
          </button>

          {/* Toggle Collapse */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700/80 transition cursor-pointer"
            title={isCollapsed ? 'Expand specifications' : 'Collapse specifications'}
          >
            <span className="hidden sm:inline">{isCollapsed ? (lang === 'en' ? 'Show' : 'দেখান') : (lang === 'en' ? 'Hide' : 'লুকান')}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Body */}
      {!isCollapsed ? (
        <div className="p-3.5 sm:p-4 bg-slate-50/50">
          {/* Smart Grid of 6 Core Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {/* 1. Company Name */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-indigo-200 transition">
              <AutocompleteInput
                category="companies"
                value={sheetData.companyName}
                onChange={val => onChange({ companyName: val })}
                placeholder="e.g. GOOD & FAST Pa. Co. Ltd"
                label={t.companyName}
                icon={<Building2 className="w-3.5 h-3.5 text-indigo-500" />}
                lang={lang}
              />
            </div>

            {/* 2. Reference / PO */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-amber-300 transition">
              <AutocompleteInput
                category="refs"
                value={sheetData.ref}
                onChange={val => onChange({ ref: val })}
                placeholder="e.g. LIZ-LO-ELS-26080193"
                label={t.ref}
                icon={<Hash className="w-3.5 h-3.5 text-amber-500" />}
                monoFont={true}
                bold={true}
                lang={lang}
              />
            </div>

            {/* 3. Customer */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-sky-200 transition">
              <AutocompleteInput
                category="customers"
                value={sheetData.customer}
                onChange={val => onChange({ customer: val })}
                placeholder="e.g. Liz"
                label={t.customer}
                icon={<User className="w-3.5 h-3.5 text-sky-500" />}
                lang={lang}
              />
            </div>

            {/* 4. Buyer */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-violet-200 transition">
              <AutocompleteInput
                category="buyers"
                value={sheetData.buyer}
                onChange={val => onChange({ buyer: val })}
                placeholder="e.g. Sports Direct"
                label={t.buyer}
                icon={<Tag className="w-3.5 h-3.5 text-violet-500" />}
                bold={true}
                lang={lang}
              />
            </div>

            {/* 5. Size */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-emerald-200 transition">
              <AutocompleteInput
                category="sizes"
                value={sheetData.size}
                onChange={val => onChange({ size: val })}
                placeholder="e.g. 61 MM"
                label={t.size}
                icon={<Maximize2 className="w-3.5 h-3.5 text-emerald-500" />}
                bold={true}
                uppercase={true}
                lang={lang}
              />
            </div>

            {/* 6. Color */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-rose-200 transition">
              <AutocompleteInput
                category="colors"
                value={sheetData.color}
                onChange={val => onChange({ color: val })}
                placeholder="e.g. WHITE"
                label={t.color}
                icon={<Palette className="w-3.5 h-3.5 text-rose-500" />}
                bold={true}
                uppercase={true}
                lang={lang}
              />
            </div>
          </div>

          {/* Quick-Select Smart Chip Bar */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
            {/* Category tabs */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                {lang === 'en' ? 'Quick Presets:' : 'দ্রুত নির্বাচন:'}
              </span>
              <button
                type="button"
                onClick={() => setActiveChipTray(activeChipTray === 'buyer' ? 'none' : 'buyer')}
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold transition cursor-pointer ${
                  activeChipTray === 'buyer' 
                    ? 'bg-violet-600 text-white shadow-2xs' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {t.buyer}
              </button>
              <button
                type="button"
                onClick={() => setActiveChipTray(activeChipTray === 'size' ? 'none' : 'size')}
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold transition cursor-pointer ${
                  activeChipTray === 'size' 
                    ? 'bg-emerald-600 text-white shadow-2xs' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {t.size}
              </button>
              <button
                type="button"
                onClick={() => setActiveChipTray(activeChipTray === 'color' ? 'none' : 'color')}
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold transition cursor-pointer ${
                  activeChipTray === 'color' 
                    ? 'bg-rose-600 text-white shadow-2xs' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {t.color}
              </button>
            </div>

            {/* Quick Chips Row */}
            {activeChipTray === 'buyer' && (
              <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in duration-150">
                {COMMON_BUYERS.map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => onChange({ buyer: b })}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                      sheetData.buyer === b
                        ? 'bg-violet-900 text-violet-100 ring-1 ring-violet-400'
                        : 'bg-white hover:bg-violet-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}

            {activeChipTray === 'size' && (
              <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in duration-150">
                {COMMON_SIZES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onChange({ size: s })}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition cursor-pointer ${
                      sheetData.size === s
                        ? 'bg-emerald-900 text-emerald-100 ring-1 ring-emerald-400'
                        : 'bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {activeChipTray === 'color' && (
              <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in duration-150">
                {COMMON_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChange({ color: c })}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                      sheetData.color === c
                        ? 'bg-rose-900 text-rose-100 ring-1 ring-rose-400'
                        : 'bg-white hover:bg-rose-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Slim Smart Parameter Ribbon: Default Tare & Default Unit Weight */}
          <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-gradient-to-r from-slate-100/90 via-indigo-50/40 to-slate-100/90 px-3.5 py-2 rounded-xl border">
            {/* Left: Constant Weight Controls */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-6">
              {/* Default Tare */}
              <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                <Box className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700">{t.defaultTare}:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sheetData.defaultTare}
                    onChange={e => onChange({ defaultTare: parseFloat(e.target.value) || 0 })}
                    className="w-16 px-1.5 py-0.5 text-xs font-bold font-mono text-center bg-amber-50/50 text-amber-900 border border-amber-200 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] font-semibold text-slate-500">Kg/CTN</span>
                </div>
              </div>

              {/* Default Unit Weight */}
              <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                <Scale className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700">{t.defaultWtPerUnit}:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={sheetData.defaultWtPerUnit}
                    onChange={e => onChange({ defaultWtPerUnit: parseFloat(e.target.value) || 0 })}
                    className="w-16 px-1.5 py-0.5 text-xs font-bold font-mono text-center bg-emerald-50/50 text-emerald-900 border border-emerald-200 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] font-semibold text-slate-500">gm/Mtr</span>
                </div>
              </div>

              {/* Subtle Math Formula Hint */}
              <span className="text-[10.5px] text-slate-500 hidden xl:inline-block">
                {t.autoCalculateNotice}
              </span>
            </div>

            {/* Right: Smart Sync Action Button */}
            <button
              type="button"
              onClick={handleSyncClick}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer ${
                syncApplied
                  ? 'bg-emerald-600 text-white shadow-emerald-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-200'
              }`}
              title="Apply current default tare & unit weight to all active cartons in the table"
            >
              {syncApplied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Applied to All!' : 'সব কার্টনে সিঙ্ক হয়েছে!'}</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Sync Weights to All Cartons' : 'সব কার্টনে আপডেট করুন'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Collapsed Summary Bar */
        <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between text-xs text-slate-600 gap-3">
          <div className="flex items-center gap-3 overflow-x-auto py-0.5">
            <span className="font-semibold text-slate-800">{sheetData.companyName || 'No Company'}</span>
            <span className="text-slate-300">|</span>
            <span className="font-mono font-bold text-amber-700">{sheetData.ref || 'No Ref'}</span>
            <span className="text-slate-300">|</span>
            <span>Buyer: <strong className="text-slate-800">{sheetData.buyer || '-'}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Size: <strong className="text-slate-800">{sheetData.size || '-'}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Color: <strong className="text-slate-800">{sheetData.color || '-'}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Tare: <strong>{sheetData.defaultTare} Kg</strong></span>
            <span className="text-slate-300">|</span>
            <span>Unit Wt: <strong className="text-emerald-700">{sheetData.defaultWtPerUnit} gm/m</strong></span>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 shrink-0 cursor-pointer"
          >
            {lang === 'en' ? 'Expand Form' : 'ফর্ম খুলুন'}
          </button>
        </div>
      )}
    </div>
  );
};
