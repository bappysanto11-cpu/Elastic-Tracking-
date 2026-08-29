import React, { useState } from 'react';
import { PackingSheetData, SummaryStats, CartonRow } from '../types/calculator';
import { Language } from '../utils/translations';
import { 
  Printer, 
  Columns, 
  Maximize2, 
  ZoomIn,
  ZoomOut,
  RotateCw, 
  Check, 
  Sliders, 
  Eye, 
  Edit3,
  Sparkles,
  FileSpreadsheet,
  AlertTriangle,
  Layers,
  FileText
} from 'lucide-react';

interface FactorySheetViewProps {
  sheetData: PackingSheetData;
  summary: SummaryStats;
  lang: Language;
  onUpdateCarton?: (id: string, updated: Partial<CartonRow>) => void;
  onUpdateHeader?: (updated: Partial<PackingSheetData>) => void;
  onRequestPrint?: (orientation: 'landscape' | 'portrait') => void;
}

export const FactorySheetView: React.FC<FactorySheetViewProps> = ({
  sheetData,
  summary,
  lang,
  onUpdateCarton,
  onUpdateHeader,
  onRequestPrint,
}) => {
  // Grid layout options:
  // 'landscape-6x2': 6 columns x 2 rows (Exact photo orientation on A4 landscape)
  // 'portrait-3x4': 3 columns x 4 rows (A4 portrait)
  // 'portrait-2x6': 2 columns x 6 rows (A4 portrait tall)
  const [gridLayout, setGridLayout] = useState<'landscape-6x2' | 'portrait-3x4' | 'portrait-2x6'>('landscape-6x2');
  const [embedTotalInGrid, setEmbedTotalInGrid] = useState<boolean>(true);
  const [isEditable, setIsEditable] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Calculate slots needed: Default 12 blocks for a full A4 sheet
  const minSlots = 12;
  const targetCount = Math.max(minSlots, Math.ceil(sheetData.cartons.length / 6) * 6);
  
  // Clone active cartons and pad with empty blocks
  const allCartons: CartonRow[] = [...sheetData.cartons];
  while (allCartons.length < targetCount) {
    const idx = allCartons.length;
    allCartons.push({
      id: `virtual-slot-${idx + 1}`,
      cartonNo: idx + 1,
      grossWt: 0,
      tareWt: sheetData.defaultTare,
      netWt: 0,
      wtPerUnit: sheetData.defaultWtPerUnit,
      lengthMtr: 0,
      lengthGry: 0,
      lengthYds: 0,
    });
  }

  const handlePrint = (orientation: 'landscape' | 'portrait') => {
    if (onRequestPrint) {
      onRequestPrint(orientation);
      return;
    }
    // Add print orientation class to body temporarily before print
    document.body.classList.remove('print-landscape', 'print-portrait');
    document.body.classList.add(orientation === 'landscape' ? 'print-landscape' : 'print-portrait');
    window.print();
  };

  // Determine grid CSS classes based on selected layout
  const getGridColsClass = () => {
    switch (gridLayout) {
      case 'landscape-6x2':
        return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-6';
      case 'portrait-3x4':
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3';
      case 'portrait-2x6':
        return 'grid-cols-1 sm:grid-cols-2 print:grid-cols-2';
      default:
        return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-6';
    }
  };

  // Helper for responsive font sizing on reference / PO
  const getRefFontSize = (text: string) => {
    const len = (text || '').length;
    if (len > 22) return 'text-[7.5px] sm:text-[8px] leading-[1.05] tracking-tighter';
    if (len > 15) return 'text-[8px] sm:text-[8.5px] leading-[1.1] tracking-tight';
    return 'text-[9px] sm:text-[9.5px] leading-tight';
  };

  const getGeneralTextFontSize = (text: string) => {
    const len = (text || '').length;
    if (len > 18) return 'text-[8px] sm:text-[8.5px] leading-[1.1] tracking-tight';
    return 'text-[9px] sm:text-[9.5px] leading-tight';
  };

  // Total summary block component (reusable either inside grid or in footer)
  const renderTotalSummaryBlock = (isInline: boolean = false) => (
    <div 
      className={`border-2 border-slate-900 bg-slate-100 flex flex-col justify-between carton-print-block ${
        isInline ? 'h-full min-h-[260px]' : 'min-w-[280px]'
      }`}
    >
      <div className="border-b-2 border-slate-900 py-1 px-1.5 text-center font-black text-[10px] sm:text-[11px] tracking-wider uppercase bg-slate-900 text-white">
        {lang === 'en' ? '★ GRAND TOTAL SUMMARY ★' : '★ সর্বমোট সামারি হিসাব ★'}
      </div>

      <div className="divide-y divide-slate-800 flex-1 flex flex-col justify-around text-[10px] sm:text-[11px]">
        {/* Total Net Wt */}
        <div className="flex min-h-[22px] items-stretch bg-white">
          <div className="w-[42px] sm:w-[46px] shrink-0 border-r border-slate-800 px-1 py-0.5 font-black uppercase text-slate-900 bg-slate-200 flex items-center justify-start text-[9px] sm:text-[10px]">
            Total
          </div>
          <div className="flex-1 px-1 py-0.5 font-mono font-black text-center text-slate-950 text-[11px] sm:text-xs flex items-center justify-center">
            {summary.totalNetWt.toFixed(2)}
          </div>
          <div className="w-7 shrink-0 border-l border-slate-800 px-0.5 py-0.5 font-bold text-center text-slate-800 flex items-center justify-center text-[9px] sm:text-[10px]">
            Kg
          </div>
        </div>

        {/* Total Length (Mtr) */}
        <div className="flex min-h-[22px] items-stretch bg-indigo-50/40">
          <div className="w-[42px] sm:w-[46px] shrink-0 border-r border-slate-800 px-1 py-0.5 font-black uppercase text-slate-900 bg-slate-200 flex items-center justify-start text-[9px] sm:text-[10px]">
            Total
          </div>
          <div className="flex-1 px-1 py-0.5 font-mono font-black text-center text-indigo-950 text-[11px] sm:text-xs flex items-center justify-center">
            {summary.totalMtr.toFixed(1)}
          </div>
          <div className="w-7 shrink-0 border-l border-slate-800 px-0.5 py-0.5 font-bold text-center text-slate-800 flex items-center justify-center text-[9px] sm:text-[10px]">
            Mtr
          </div>
        </div>

        {/* Total Length (Gry) */}
        <div className="flex min-h-[22px] items-stretch bg-purple-50/40">
          <div className="w-[42px] sm:w-[46px] shrink-0 border-r border-slate-800 px-1 py-0.5 font-black uppercase text-slate-900 bg-slate-200 flex items-center justify-start text-[9px] sm:text-[10px]">
            Total
          </div>
          <div className="flex-1 px-1 py-0.5 font-mono font-black text-center text-purple-950 text-[11px] sm:text-xs flex items-center justify-center">
            {summary.totalGry.toFixed(2)}
          </div>
          <div className="w-7 shrink-0 border-l border-slate-800 px-0.5 py-0.5 font-bold text-center text-slate-800 flex items-center justify-center text-[9px] sm:text-[10px]">
            Gry
          </div>
        </div>

        {/* Total Cartons */}
        <div className="flex min-h-[24px] items-stretch bg-slate-900 text-white">
          <div className="w-[42px] sm:w-[46px] shrink-0 border-r border-slate-700 px-1 py-0.5 font-black uppercase text-slate-200 flex items-center justify-start text-[9px] sm:text-[10px]">
            Total
          </div>
          <div className="flex-1 px-1 py-0.5 font-mono font-black text-center text-white text-xs sm:text-sm flex items-center justify-center">
            {summary.totalCtn}
          </div>
          <div className="w-7 shrink-0 border-l border-slate-700 px-0.5 py-0.5 font-bold text-center text-white flex items-center justify-center text-[9px] sm:text-[10px]">
            CTN
          </div>
        </div>
      </div>

      {isInline && (
        <div className="p-1 bg-slate-200 border-t border-slate-900 text-[8.5px] sm:text-[9px] text-center font-mono font-bold text-slate-800 leading-tight">
          Net: {summary.totalNetWt.toFixed(2)} Kg ({summary.totalNetWtLbs.toFixed(1)} Lbs) • {summary.activeNetCartonCount} Active CTN
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Control & Customization Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm print:hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* Left: Layout switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Columns className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-700">
              {lang === 'en' ? 'Grid Layout:' : 'গ্রিড লেআউট:'}
            </span>
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setGridLayout('landscape-6x2')}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                gridLayout === 'landscape-6x2'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Exact 6 columns across 2 rows match to photo"
            >
              <span>6 × 2 (Photo Match)</span>
              <span className="text-[10px] opacity-75 font-mono">Landscape</span>
            </button>

            <button
              onClick={() => setGridLayout('portrait-3x4')}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                gridLayout === 'portrait-3x4'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>3 × 4</span>
              <span className="text-[10px] opacity-75 font-mono">Portrait</span>
            </button>

            <button
              onClick={() => setGridLayout('portrait-2x6')}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                gridLayout === 'portrait-2x6'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>2 × 6</span>
              <span className="text-[10px] opacity-75 font-mono">2-Col</span>
            </button>
          </div>
        </div>

        {/* Middle / Right: Options, Zoom & Print */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 p-0.5 text-xs text-slate-700">
            <button
              onClick={() => setZoomLevel(prev => Math.max(75, prev - 10))}
              disabled={zoomLevel <= 75}
              className="p-1 hover:bg-white rounded transition disabled:opacity-40 cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] font-bold min-w-[42px] text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
              disabled={zoomLevel >= 130}
              className="p-1 hover:bg-white rounded transition disabled:opacity-40 cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomLevel !== 100 && (
              <button
                onClick={() => setZoomLevel(100)}
                className="text-[10px] font-bold px-1.5 py-0.5 text-indigo-600 hover:bg-white rounded transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Toggle Embed Total in Slot 7 */}
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition select-none">
            <input
              type="checkbox"
              checked={embedTotalInGrid}
              onChange={e => setEmbedTotalInGrid(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="hidden sm:inline">{lang === 'en' ? 'Embed Total in Slot 7' : 'স্লট ৭-এ টোটাল সামারি'}</span>
            <span className="sm:hidden">{lang === 'en' ? 'Slot 7 Total' : 'স্লট ৭'}</span>
          </label>

          {/* Toggle In-Place Editing */}
          <button
            onClick={() => setIsEditable(!isEditable)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              isEditable
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
            title="Click to enable or disable direct input in the sticker cards"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditable ? (lang === 'en' ? 'Direct Edit: ON' : 'এডিট: চালু') : (lang === 'en' ? 'Direct Edit: OFF' : 'এডিট: বন্ধ')}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={() => handlePrint(gridLayout === 'landscape-6x2' ? 'landscape' : 'portrait')}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Print Photo Sheet' : 'ফটো শিট প্রিন্ট'}</span>
          </button>
        </div>
      </div>

      {/* Smooth A4 Paper Frame Container */}
      <div className="bg-slate-200/80 p-2 sm:p-5 rounded-2xl border border-slate-300 shadow-inner overflow-x-auto flex justify-center print:bg-transparent print:p-0 print:border-none print:shadow-none">
        {/* The Printable / Live Factory Sheet Canvas */}
        <div 
          id="factory-printable-sheet"
          style={{ transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined, transformOrigin: 'top center' }}
          className="bg-white border-2 border-slate-900 p-3 sm:p-4 rounded-xs shadow-2xl print:shadow-none print:border-none print:p-0 mx-auto w-full max-w-[1140px] transition-transform duration-150"
        >
          {/* Top Factory Header Strip on A4 Page */}
          <div className="border-b-2 border-slate-900 pb-2 mb-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 shrink-0" />
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                {sheetData.companyName || 'GOOD & FAST Pa. Co. Ltd'} — PACKING SPECIFICATION SHEET
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-700">
              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300 font-bold">
                REF: <strong className="text-slate-900">{sheetData.ref || '-'}</strong>
              </span>
              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300 font-bold">
                BUYER: <strong className="text-slate-900">{sheetData.buyer || '-'}</strong>
              </span>
              <span className="bg-slate-900 text-white px-2 py-0.5 rounded font-bold">
                TOTAL: {summary.totalCtn} CTN | {summary.totalMtr.toFixed(1)} Mtr
              </span>
            </div>
          </div>

          {/* The Grid of 12 Sticker Blocks */}
          <div className={`grid gap-1.5 sm:gap-2 text-slate-900 text-[10px] leading-tight select-none ${getGridColsClass()}`}>
            {allCartons.map((c, index) => {
              // If embedTotalInGrid is ON and we are at slot index 6 (7th slot, starting 2nd row in 6x2 grid),
              // replace with the Grand Total box (exactly like in the photo!)
              if (embedTotalInGrid && index === 6) {
                return (
                  <div key="embedded-grand-total" className="flex flex-col">
                    {renderTotalSummaryBlock(true)}
                  </div>
                );
              }

              const isNegativeNet = (c.grossWt > 0 && c.netWt < 0) || c.netWt < 0;
              const hasData = c.netWt !== 0 || c.grossWt > 0 || c.lengthMtr > 0;
              const isActualCarton = index < sheetData.cartons.length;

              return (
                <div 
                  key={c.id || index}
                  className={`border flex flex-col bg-white carton-print-block transition ${
                    isNegativeNet
                      ? 'border-2 border-red-500 ring-2 ring-red-200'
                      : 'border-slate-900 hover:border-indigo-600'
                  }`}
                >
                  {/* Company Name Header in each carton block */}
                  <div className={`border-b py-0.5 px-1 text-center font-bold text-[9.5px] sm:text-[10.5px] tracking-wide uppercase truncate ${
                    isNegativeNet 
                      ? 'bg-red-100 text-red-900 border-red-500' 
                      : 'border-slate-900 text-slate-900 bg-slate-50'
                  }`}>
                    {sheetData.companyName || 'GOOD & FAST Pa. Co. Ltd'}
                  </div>

                  {/* Carton Specification Table Rows */}
                  <div className="divide-y divide-slate-800 flex-1 flex flex-col justify-between">
                    {/* REF - Full display with dynamic scaling & wrapping */}
                    <div className="flex min-h-[22px] items-stretch">
                      <div className="w-[38px] sm:w-[42px] shrink-0 border-r border-slate-800 px-1 py-0.5 font-bold uppercase text-slate-800 text-[9px] sm:text-[9.5px] bg-slate-50/50 flex items-center justify-start">
                        REF
                      </div>
                      <div className={`flex-1 px-1 py-0.5 font-bold font-mono text-center text-slate-950 flex items-center justify-center break-all ${getRefFontSize(sheetData.ref)}`}>
                        {sheetData.ref || '-'}
                      </div>
                    </div>

                    {/* Cust */}
                    <div className="flex min-h-[20px] items-stretch">
                      <div className="w-[38px] sm:w-[42px] shrink-0 border-r border-slate-800 px-1 py-0.5 font-bold uppercase text-slate-800 text-[9px] sm:text-[9.5px] bg-slate-50/50 flex items-center justify-start">
                        Cust
                      </div>
                      <div className={`flex-1 px-1 py-0.5 font-semibold text-center text-slate-900 flex items-center justify-center break-words ${getGeneralTextFontSize(sheetData.customer)}`}>
                        {sheetData.customer || '-'}
                      </div>
                    </div>

                    {/* Buyer - Black block with white text */}
                    <div className="flex min-h-[22px] items-stretch bg-slate-900 text-white">
                      <div className="w-[38px] sm:w-[42px] shrink-0 border-r border-slate-700 px-1 py-0.5 font-bold uppercase text-slate-200 text-[9px] sm:text-[9.5px] flex items-center justify-start">
                        Buyer
                      </div>
                      <div className="flex-1 px-1 py-0.5 font-black text-center text-white tracking-wider text-[10px] sm:text-[10.5px] flex items-center justify-center break-words leading-tight">
                        {sheetData.buyer || '-'}
                      </div>
                    </div>

                    {/* Size */}
                    <div className="flex min-h-[20px] items-stretch">
                      <div className="w-[38px] sm:w-[42px] shrink-0 border-r border-slate-800 px-1 py-0.5 font-bold uppercase text-slate-800 text-[9px] sm:text-[9.5px] bg-slate-50/50 flex items-center justify-start">
                        Size
                      </div>
                      <div className="flex-1 px-1 py-0.5 font-bold text-center text-slate-900 flex items-center justify-center break-words text-[9.5px] sm:text-[10px]">
                        {sheetData.size || '-'}
                      </div>
                    </div>

                    {/* Color */}
                    <div className="flex min-h-[20px] items-stretch">
                      <div className="w-[38px] sm:w-[42px] shrink-0 border-r border-slate-800 px-1 py-0.5 font-bold uppercase text-slate-800 text-[9px] sm:text-[9.5px] bg-slate-50/50 flex items-center justify-start">
                        Color
                      </div>
                      <div className="flex-1 px-1 py-0.5 font-bold text-center text-slate-900 tracking-wider flex items-center justify-center break-words text-[9.5px] sm:text-[10px]">
                        {sheetData.color || '-'}
                      </div>
                    </div>

                    {/* Gross wt */}
                    <div className={`flex min-h-[22px] items-stretch ${isNegativeNet ? 'bg-red-50' : 'bg-amber-50/30'}`}>
                      <div className="w-[38px] sm:w-[42px] shrink-0 border-r border-slate-800 px-1 py-0.5 font-bold text-slate-800 text-[9px] sm:text-[9.5px] flex items-center justify-start">
                        Gross wt
                      </div>
                      <div className="flex-1 px-1 py-0.5 font-mono text-center font-bold text-slate-900 text-[10px] sm:text-[11px] flex items-center justify-center">
                        {isEditable && isActualCarton && onUpdateCarton ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={c.grossWt === 0 ? '' : c.grossWt}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              onUpdateCarton(c.id, { grossWt: val });
                            }}
                            placeholder="0.00"
                            className={`w-full text-center font-bold font-mono border rounded-xs focus:outline-none py-0.2 ${
                              isNegativeNet
                                ? 'bg-white border-red-500 text-red-900 focus:ring-1 focus:ring-red-500'
                                : 'bg-white/90 border-slate-300 focus:bg-white focus:ring-1 focus:ring-indigo-500'
                            }`}
                          />
                        ) : (
                          hasData ? c.grossWt.toFixed(2) : '0.00'
                        )}
                      </div>
                      <div className="w-6 shrink-0 border-l border-slate-800 px-0.5 py-0.5 font-semibold text-center text-slate-700 text-[9px] sm:text-[9.5px] flex items-center justify-center">
                        Kg
                      </div>
                    </div>

                    {/* Net wt */}
                    <div className={`flex min-h-[20px] items-stretch ${isNegativeNet ? 'bg-red-100' : 'bg-emerald-50/40'}`}>
                      <div className="w-[38px] sm:w-[42px] shrink-0 border-r border-slate-800 px-1 py-0.5 font-bold text-slate-800 text-[9px] sm:text-[9.5px] flex items-center justify-start">
                        Net wt
                      </div>
                      <div className={`flex-1 px-1 py-0.5 font-mono text-center font-bold text-[10px] sm:text-[11px] flex items-center justify-center gap-0.5 ${
                        isNegativeNet ? 'text-red-700 font-black' : 'text-emerald-950'
                      }`}>
                        {isNegativeNet && <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />}
                        <span>{hasData ? c.netWt.toFixed(2) : '0.00'}</span>
                      </div>
                      <div className="w-6 shrink-0 border-l border-slate-800 px-0.5 py-0.5 font-semibold text-center text-slate-700 text-[9px] sm:text-[9.5px] flex items-center justify-center">
                        Kg
                      </div>
                    </div>

                    {/* Wt/unit */}
                    <div className="flex min-h-[20px] items-stretch">
                      <div className="w-[38px] sm:w-[42px] shrink-0 border-r border-slate-800 px-1 py-0.5 font-bold text-slate-800 text-[9px] sm:text-[9.5px] flex items-center justify-start">
                        Wt/unit
                      </div>
                      <div className="flex-1 px-1 py-0.5 font-mono text-center font-bold text-slate-900 text-[9.5px] sm:text-[10px] flex items-center justify-center">
                        {c.wtPerUnit > 0 ? c.wtPerUnit.toFixed(2) : sheetData.defaultWtPerUnit.toFixed(2)}
                      </div>
                      <div className="w-6 shrink-0 border-l border-slate-800 px-0.5 py-0.5 font-semibold text-center text-slate-700 text-[9px] sm:text-[9.5px] flex items-center justify-center">
                        gm
                      </div>
                    </div>

                    {/* Length (Mtr) */}
                    <div className="flex min-h-[20px] items-stretch bg-indigo-50/40">
                      <div className="w-[38px] sm:w-[42px] shrink-0 border-r border-slate-800 px-1 py-0.5 font-bold text-slate-800 text-[9px] sm:text-[9.5px] flex items-center justify-start">
                        Length
                      </div>
                      <div className="flex-1 px-1 py-0.5 font-mono text-center font-black text-indigo-950 text-[10px] sm:text-[11px] flex items-center justify-center">
                        {hasData ? c.lengthMtr.toFixed(2) : '0.00'}
                      </div>
                      <div className="w-6 shrink-0 border-l border-slate-800 px-0.5 py-0.5 font-semibold text-center text-slate-700 text-[9px] sm:text-[9.5px] flex items-center justify-center">
                        Mtr
                      </div>
                    </div>

                    {/* Length (Gry) */}
                    <div className="flex min-h-[20px] items-stretch bg-purple-50/40">
                      <div className="w-[38px] sm:w-[42px] shrink-0 border-r border-slate-800 px-1 py-0.5 font-bold text-slate-800 text-[9px] sm:text-[9.5px] flex items-center justify-start">
                        Length
                      </div>
                      <div className="flex-1 px-1 py-0.5 font-mono text-center font-black text-purple-950 text-[10px] sm:text-[11px] flex items-center justify-center">
                        {hasData ? c.lengthGry.toFixed(2) : '0.00'}
                      </div>
                      <div className="w-6 shrink-0 border-l border-slate-800 px-0.5 py-0.5 font-semibold text-center text-slate-700 text-[9px] sm:text-[9.5px] flex items-center justify-center">
                        Gry
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Total / Summary Block (When embedTotalInGrid is false or for standalone summary) */}
          {!embedTotalInGrid && (
            <div className="mt-3 pt-2.5 border-t-2 border-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {renderTotalSummaryBlock(false)}

              {/* Additional details on printable sheet */}
              <div className="text-right text-[10px] text-slate-600 space-y-0.5 font-mono">
                <p className="font-bold text-slate-900">Total Gross: {summary.totalGrossWt.toFixed(2)} Kg | Tare: {summary.totalTareWt.toFixed(2)} Kg</p>
                <p>Total Yards: <span className="font-bold text-slate-900">{summary.totalYds.toFixed(1)} Yds</span> (1 Mtr = 1.0936 Yds | 1 Gry = 144 Yds)</p>
                <p className="text-slate-400">Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
