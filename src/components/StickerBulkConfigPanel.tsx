import React from 'react';
import { 
  StickerBulkConfig, 
  StickerPaperSize, 
  STICKER_PAPER_SIZES, 
  DEFAULT_BULK_CONFIG 
} from '../types/stickerSettings';
import { 
  SlidersHorizontal, 
  FileText, 
  Maximize2, 
  Type, 
  RotateCcw, 
  Sparkles, 
  Check, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Printer,
  Scissors
} from 'lucide-react';

interface StickerBulkConfigPanelProps {
  bulkConfig: StickerBulkConfig;
  onUpdateBulkConfig: (config: StickerBulkConfig) => void;
  lang: 'en' | 'bn';
  isOpen: boolean;
  onToggleOpen: () => void;
  hasOverflowWarning?: boolean;
  totalLabelsCount: number;
}

export const StickerBulkConfigPanel: React.FC<StickerBulkConfigPanelProps> = ({
  bulkConfig,
  onUpdateBulkConfig,
  lang,
  isOpen,
  onToggleOpen,
  hasOverflowWarning = false,
  totalLabelsCount,
}) => {
  const currentPaper = STICKER_PAPER_SIZES[bulkConfig.paperSize] || STICKER_PAPER_SIZES['a4-grid-4'];

  const handlePaperSizeChange = (paperSize: StickerPaperSize) => {
    const target = STICKER_PAPER_SIZES[paperSize];
    const isRoll = target.category === 'roll';
    
    onUpdateBulkConfig({
      ...bulkConfig,
      paperSize,
      uniformPadding: target.recommendedPadding,
      fontScale: target.recommendedFontScale,
      forcePageBreakPerLabel: isRoll,
      pageBreakAfterN: target.labelsPerPage,
    });
  };

  const handleResetDefaults = () => {
    onUpdateBulkConfig({ ...DEFAULT_BULK_CONFIG });
  };

  const handleOptimizeForCurrentPaper = () => {
    onUpdateBulkConfig({
      ...bulkConfig,
      uniformPadding: currentPaper.recommendedPadding,
      fontScale: currentPaper.recommendedFontScale,
      forcePageBreakPerLabel: currentPaper.category === 'roll',
      pageBreakAfterN: currentPaper.labelsPerPage,
    });
  };

  // Calculate estimated total pages
  const calculatedPages = currentPaper.labelsPerPage > 0 
    ? Math.ceil(totalLabelsCount / currentPaper.labelsPerPage)
    : 1;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all print:hidden">
      {/* Header bar / Quick Toggle summary */}
      <div 
        onClick={onToggleOpen}
        className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/80 hover:bg-slate-100/80 cursor-pointer transition border-b border-slate-200/80 select-none"
      >
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-800">
                {lang === 'en' ? 'Bulk Sticker Configuration & Page Break Controls' : 'বাল্ক স্টিকার কনফিগারেশন ও পেজ ব্রেক কন্ট্রোল'}
              </span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.2 rounded-full font-mono border border-indigo-200">
                {currentPaper.name}
              </span>
              <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-1.5 py-0.2 rounded font-mono">
                Pad: {bulkConfig.uniformPadding}px
              </span>
              <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-1.5 py-0.2 rounded font-mono">
                Font: {Math.round(bulkConfig.fontScale * 100)}%
              </span>
              {bulkConfig.showCropMarks && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold px-1.5 py-0.2 rounded flex items-center gap-1">
                  <Scissors className="w-2.5 h-2.5 text-emerald-700" />
                  <span>{lang === 'en' ? 'Crop Marks' : 'কাটিং মার্ক'}</span>
                </span>
              )}
              {currentPaper.category === 'roll' ? (
                <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 font-semibold px-1.5 py-0.2 rounded">
                  1 Label / Page Break
                </span>
              ) : (
                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold px-1.5 py-0.2 rounded">
                  {currentPaper.labelsPerPage > 0 ? `${currentPaper.labelsPerPage} Labels / Page` : 'Auto Flow'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              {lang === 'en'
                ? `Format: ${currentPaper.description} · Est. ${calculatedPages} printable page(s)`
                : `ফরমেট: ${currentPaper.nameBn} · আনুমানিক ${calculatedPages}টি প্রিন্ট পেজ`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasOverflowWarning && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full animate-pulse">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span className="hidden md:inline">{lang === 'en' ? 'Overflow Adjusted' : 'ওভারফ্লো অ্যাডজাস্টেড'}</span>
            </span>
          )}

          <button
            type="button"
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
            aria-label="Toggle Bulk Config Panel"
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Bulk Controls Body */}
      {isOpen && (
        <div className="p-4 space-y-4 bg-white animate-in fade-in duration-150 text-xs">
          
          {/* Top Quick Action Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="font-semibold text-slate-700 text-[11px]">
                {lang === 'en' ? 'Synchronized across all carton sticker cards' : 'সব কার্টন স্টিকারে একযোগে কার্যকর'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOptimizeForCurrentPaper}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition cursor-pointer"
                title="Auto-apply recommended padding and font scale for this paper size"
              >
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>{lang === 'en' ? 'Optimize for Selected Paper' : 'পেপার অনুযায়ী অপ্টিমাইজ'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition cursor-pointer"
                title="Reset to default A4 4-grid settings"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{lang === 'en' ? 'Reset' : 'রিসেট'}</span>
              </button>
            </div>
          </div>

          {/* 1. Paper Size & Target Layout Selector */}
          <div className="space-y-2">
            <label className="flex items-center justify-between font-bold text-slate-700 text-xs">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>{lang === 'en' ? 'Target Paper Size & Print Medium:' : 'টার্গেট পেপার সাইজ ও প্রিন্ট মিডিয়া:'}</span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                {currentPaper.category === 'roll' ? '🏷️ Thermal Direct / Transfer' : '📄 Sheet Feed / Laser'}
              </span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {(Object.keys(STICKER_PAPER_SIZES) as StickerPaperSize[]).map((key) => {
                const def = STICKER_PAPER_SIZES[key];
                const isSelected = bulkConfig.paperSize === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handlePaperSizeChange(key)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer relative ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-600 ring-2 ring-indigo-500/20 shadow-2xs text-indigo-950'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-bold text-xs leading-tight">
                        {def.name}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className={`px-1.5 py-0.2 rounded font-mono font-semibold ${
                        def.category === 'roll' 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {def.category === 'roll' ? 'Roll (1/page)' : `${def.labelsPerPage}/page`}
                      </span>
                      {def.widthMm > 0 && (
                        <span className="font-mono text-slate-600">
                          {def.widthMm}×{def.heightMm}mm
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Grid with Uniform Padding & Font Scale Overrides */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            
            {/* Uniform Padding Slider & Presets */}
            <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'en' ? 'Uniform Label Padding' : 'লেবেল প্যাডিং'}</span>
                </span>
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700 text-xs">
                  {bulkConfig.uniformPadding}px (~{(bulkConfig.uniformPadding * 0.264).toFixed(1)}mm)
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="4"
                max="26"
                step="1"
                value={bulkConfig.uniformPadding}
                onChange={(e) => onUpdateBulkConfig({ ...bulkConfig, uniformPadding: Number(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: 'Tight', px: 6 },
                  { label: 'Compact', px: 10 },
                  { label: 'Standard', px: 14 },
                  { label: 'Relaxed', px: 18 },
                  { label: 'Spacious', px: 22 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => onUpdateBulkConfig({ ...bulkConfig, uniformPadding: preset.px })}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition border cursor-pointer ${
                      bulkConfig.uniformPadding === preset.px
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {preset.label} ({preset.px}px)
                  </button>
                ))}
              </div>
            </div>

            {/* Font Scale Multiplier Slider & Presets */}
            <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                  <Type className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'en' ? 'Font Scale Override' : 'ফন্ট স্কেল ওভাররাইড'}</span>
                </span>
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700 text-xs">
                  {Math.round(bulkConfig.fontScale * 100)}%
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="0.70"
                max="1.35"
                step="0.02"
                value={bulkConfig.fontScale}
                onChange={(e) => onUpdateBulkConfig({ ...bulkConfig, fontScale: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />

              {/* Quick Font Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: '75% XS', scale: 0.75 },
                  { label: '88% SM', scale: 0.88 },
                  { label: '100% STD', scale: 1.0 },
                  { label: '112% LG', scale: 1.12 },
                  { label: '125% XL', scale: 1.25 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => onUpdateBulkConfig({ ...bulkConfig, fontScale: preset.scale })}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition border cursor-pointer ${
                      Math.abs(bulkConfig.fontScale - preset.scale) < 0.02
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Page Break & Overflow Automation Options */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Force Page Break Per Label */}
            <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={bulkConfig.forcePageBreakPerLabel}
                onChange={(e) => onUpdateBulkConfig({ ...bulkConfig, forcePageBreakPerLabel: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 block text-xs">
                  {lang === 'en' ? 'Force Page Break Per Label' : 'প্রতি লেবেলে পেজ ব্রেক'}
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  {lang === 'en' 
                    ? 'Guarantees 1 sticker per printed page (Essential for thermal rolls)'
                    : 'প্রতিটি স্টিকার পৃথক পেজে প্রিন্ট হবে (থার্মাল রোলের জন্য আবশ্যক)'}
                </span>
              </div>
            </label>

            {/* Auto Scale Font on Overflow */}
            <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={bulkConfig.autoScaleToFitPage}
                onChange={(e) => onUpdateBulkConfig({ ...bulkConfig, autoScaleToFitPage: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 block text-xs">
                  {lang === 'en' ? 'Auto-Fit Content to Paper' : 'পেপার অনুযায়ী অটো-ফিট'}
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  {lang === 'en'
                    ? 'Dynamically adapts typography if label content overflows paper height'
                    : 'কনটেন্ট অতিরিক্ত হলে স্বয়ংক্রিয়ভাবে ফন্ট অ্যাডজাস্ট করবে'}
                </span>
              </div>
            </label>

            {/* Show Visual Page Boundaries in Preview */}
            <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={bulkConfig.showPageBreakVisuals}
                onChange={(e) => onUpdateBulkConfig({ ...bulkConfig, showPageBreakVisuals: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 block text-xs">
                  {lang === 'en' ? 'Show Page Break Splitters' : 'পেজ ব্রেক সীমানা প্রদর্শন'}
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  {lang === 'en'
                    ? 'Displays page boundary markers and pagination badges in preview'
                    : 'স্ক্রিনে পেজ নম্বর এবং পেজ বিভাজন রেখা দেখাবে'}
                </span>
              </div>
            </label>

            {/* Dashed Crop Marks for Manual Cutting */}
            <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
              bulkConfig.showCropMarks
                ? 'bg-emerald-50/60 border-emerald-300'
                : 'border-slate-200 hover:bg-slate-50'
            }`}>
              <input
                type="checkbox"
                checked={!!bulkConfig.showCropMarks}
                onChange={(e) => onUpdateBulkConfig({ ...bulkConfig, showCropMarks: e.target.checked })}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 flex items-center gap-1 text-xs">
                  <Scissors className="w-3 h-3 text-emerald-600" />
                  <span>{lang === 'en' ? 'Dashed Crop Marks' : 'ড্যাশড ক্রপ / কাটিং মার্ক'}</span>
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  {lang === 'en'
                    ? 'Adds dashed cutting guide lines & corner tick marks for easy scissor cutting'
                    : 'প্রিন্টের পর কাঁচি দিয়ে সহজে কাটার জন্য ড্যাশড গাইডলাইন ও কর্নার মার্ক যোগ করে'}
                </span>
              </div>
            </label>
          </div>

          {/* 4. Page Break & Print Diagnostics Bar */}
          <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-100 p-2.5 rounded-lg text-slate-700 flex-wrap gap-2 text-[11px]">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="font-semibold">
                {lang === 'en' ? 'Print Output Status:' : 'প্রিন্ট আউটপুট স্ট্যাটাস:'}
              </span>
              <span className="font-mono text-indigo-900 font-bold">
                {totalLabelsCount} {lang === 'en' ? 'Labels' : 'লেবেল'} → ~{calculatedPages} {lang === 'en' ? 'Page(s)' : 'পেজ'} ({currentPaper.name})
              </span>
            </div>

            <span className="text-[10px] text-slate-500">
              {bulkConfig.forcePageBreakPerLabel 
                ? '⚡ 1 label per print page guaranteed' 
                : `⚡ Automatic chunking (${currentPaper.labelsPerPage > 0 ? `${currentPaper.labelsPerPage}/page` : 'Flow'}) with break-inside avoid`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
