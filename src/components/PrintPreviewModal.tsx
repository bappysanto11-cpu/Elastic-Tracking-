import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Printer, Settings2, Info, Maximize2, ZoomIn, ZoomOut, Check, FileText } from 'lucide-react';
import { Language, translations } from '../utils/translations';
import { PackingSheetData, SummaryStats } from '../types/calculator';
import { FactorySheetView } from './FactorySheetView';
import { StickerLabelsView } from './StickerLabelsView';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: (orientation: 'landscape' | 'portrait') => void;
  activeTab: 'table' | 'sheet' | 'stickers' | 'analytics';
  sheetData: PackingSheetData;
  summary: SummaryStats;
  lang: Language;
}

export function PrintPreviewModal({
  isOpen,
  onClose,
  onProceed,
  activeTab,
  sheetData,
  summary,
  lang
}: PrintPreviewModalProps) {
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('portrait');
  const [zoomMode, setZoomMode] = useState<'fit' | '100' | '75'>('fit');
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];

  useEffect(() => {
    if (isOpen) {
      // Default to portrait for stickers, otherwise landscape
      setOrientation(activeTab === 'stickers' ? 'portrait' : 'landscape');
      setZoomMode('fit');
    }
  }, [isOpen, activeTab]);

  // Update container width on open and window resize for fit-to-screen scaling
  useEffect(() => {
    if (!isOpen) return;

    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    measure();
    const timer = setTimeout(measure, 100);

    const handleResize = () => measure();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  // A4 paper dimensions at standard 96 DPI: 794px width x 1123px height
  const baseWidth = orientation === 'landscape' ? 1122 : 794;
  const baseHeight = orientation === 'landscape' ? 794 : 1123;

  // Calculate scaling so that on mobile or narrow desktop the entire A4 sheet fits horizontally
  const computedScale = useMemo(() => {
    if (zoomMode === '100') return 1.0;
    if (zoomMode === '75') return 0.75;

    // 'fit' mode: calculate scale to fit available container width with padding
    if (!containerWidth || containerWidth <= 0) return 0.8;
    const padding = containerWidth < 640 ? 16 : 32;
    const available = Math.max(260, containerWidth - padding);
    const fitScale = available / baseWidth;
    return Math.min(1.0, Math.max(0.3, fitScale));
  }, [zoomMode, containerWidth, baseWidth]);

  // Active carton count for stickers
  const activeCartonsCount = useMemo(() => {
    return sheetData.cartons.filter(
      c => c.grossWt > 0 || c.netWt > 0 || c.lengthMtr > 0 || (c.qtyPcs && c.qtyPcs > 0)
    ).length;
  }, [sheetData.cartons]);

  const estimatedA4Pages = useMemo(() => {
    return Math.max(1, Math.ceil(activeCartonsCount / 4));
  }, [activeCartonsCount]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden border border-neutral-300 animate-in fade-in zoom-in-95 duration-150 text-neutral-900">
        
        {/* Header */}
        <div className="bg-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-neutral-200 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 text-neutral-900 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-neutral-900 truncate">
                  {lang === 'en' ? 'Print Preview' : 'প্রিন্ট প্রিভিউ'}
                </h2>
                <span className="text-[10px] font-mono font-bold bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-300 shrink-0">
                  {activeTab === 'stickers' 
                    ? (lang === 'en' ? 'A4 Sticker Sheet (2×2 Grid)' : 'A4 স্টিকার শিট (২×২ গ্রিড)') 
                    : (lang === 'en' ? 'Factory Sheet' : 'ফ্যাক্টরি শিট')}
                </span>
                {activeTab === 'stickers' && (
                  <span className="text-[10px] bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-300 shrink-0 font-mono font-bold">
                    {activeCartonsCount} {lang === 'en' ? 'Cartons' : 'টি কার্টন'} · {estimatedA4Pages} {lang === 'en' ? 'Pages' : 'টি পেজ'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500 hidden sm:block truncate">
                {lang === 'en'
                  ? 'All UI buttons and banners are hidden for clean print output'
                  : 'প্রিন্টের সময় অপ্রয়োজনীয় সব ইউআই বাটন ও ব্যানার স্বয়ংক্রিয়ভাবে গোপন থাকবে'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-full p-2 transition-colors cursor-pointer shrink-0 ml-2"
            title="Close Preview"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Responsive Body Layout: Stacked on mobile, 2-column on desktop */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden bg-neutral-100">
          
          {/* Controls Panel (Top bar on mobile, left sidebar on md+) */}
          <div className="w-full md:w-72 bg-white border-b md:border-b-0 md:border-r border-neutral-200 p-3 sm:p-4 md:p-5 flex flex-col justify-between gap-3 sm:gap-4 shrink-0 overflow-y-auto max-h-[35vh] md:max-h-none">
            
            <div className="space-y-3 sm:space-y-4">
              {/* Orientation & Page Layout */}
              <div>
                <label className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Settings2 className="w-3.5 h-3.5 text-neutral-600" />
                  <span>{lang === 'en' ? 'Paper Orientation' : 'পেপারের দিক'}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-2 transition cursor-pointer text-xs font-semibold ${
                      orientation === 'portrait'
                        ? 'border-neutral-900 bg-neutral-900 text-white font-bold shadow-xs'
                        : 'border-neutral-300 hover:border-neutral-400 bg-white text-neutral-700'
                    }`}
                  >
                    <div className="w-3.5 h-4.5 border-2 border-current rounded-xs" />
                    <span>{lang === 'en' ? 'Portrait' : 'লম্বালম্বি'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-2 transition cursor-pointer text-xs font-semibold ${
                      orientation === 'landscape'
                        ? 'border-neutral-900 bg-neutral-900 text-white font-bold shadow-xs'
                        : 'border-neutral-300 hover:border-neutral-400 bg-white text-neutral-700'
                    }`}
                  >
                    <div className="w-4.5 h-3.5 border-2 border-current rounded-xs" />
                    <span>{lang === 'en' ? 'Landscape' : 'আড়াআড়ি'}</span>
                  </button>
                </div>
              </div>

              {/* Fit-to-screen & Zoom Controls */}
              <div>
                <label className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-neutral-600" />
                    <span>{lang === 'en' ? 'Preview Scale' : 'প্রিভিউ স্কেল'}</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-900 font-bold bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-300">
                    {Math.round(computedScale * 100)}%
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-neutral-100 p-1 rounded-xl border border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setZoomMode('fit')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                      zoomMode === 'fit'
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                    title="Scale to fit screen width without horizontal scroll"
                  >
                    {lang === 'en' ? 'Fit Screen' : 'ফিট স্ক্রিন'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomMode('75')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                      zoomMode === '75'
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomMode('100')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                      zoomMode === '100'
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    100%
                  </button>
                </div>
              </div>

              {/* Recommended Print Settings Notice */}
              <div className="hidden sm:block bg-neutral-50 p-2.5 sm:p-3 rounded-xl border border-neutral-200 text-[11px] text-neutral-800 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-neutral-900">
                  <Info className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                  <span>{lang === 'en' ? 'Print Settings' : 'সঠিক প্রিন্ট সেটিংস'}</span>
                </div>
                <ul className="space-y-0.5 text-[10px] text-neutral-700 pl-4 list-disc">
                  <li>{lang === 'en' ? 'Margins: ' : 'মার্জিন: '}<b>{lang === 'en' ? 'None or Minimum' : 'None বা Minimum'}</b></li>
                  <li>{lang === 'en' ? 'Background Graphics: ' : 'ব্যাকগ্রাউন্ড গ্রাফিক্স: '}<b>ON</b></li>
                  <li>{lang === 'en' ? 'Paper Size: ' : 'পেপার সাইজ: '}<b>A4</b></li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 md:pt-4 border-t border-neutral-200 flex items-center md:flex-col gap-2">
              <button
                type="button"
                onClick={() => onProceed(orientation)}
                className="flex-1 w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold shadow-xs transition cursor-pointer text-xs sm:text-sm"
              >
                <Printer className="w-4 h-4" />
                <span>{lang === 'en' ? 'Print Now' : 'প্রিন্ট করুন'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="md:w-full py-2 px-3 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl text-xs font-semibold transition cursor-pointer text-center border border-neutral-200"
              >
                {lang === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
            </div>
          </div>

          {/* Preview Canvas Area */}
          <div 
            ref={containerRef}
            className="flex-1 bg-neutral-100 p-2 sm:p-4 md:p-6 overflow-y-auto overflow-x-hidden flex justify-center items-start"
          >
            {/* Scaled A4 Wrapper */}
            <div 
              className="origin-top transition-transform duration-150 ease-out"
              style={{
                width: `${baseWidth}px`,
                transform: `scale(${computedScale})`,
                transformOrigin: 'top center',
                marginBottom: computedScale < 1 ? `-${Math.round((1 - computedScale) * baseHeight * 0.9)}px` : '32px'
              }}
            >
              {activeTab === 'stickers' ? (
                <div className="bg-neutral-100 p-0 sm:p-2 rounded-xl">
                  <StickerLabelsView
                    sheetData={sheetData}
                    summary={summary}
                    lang={lang}
                    onOpenCartonQr={() => {}}
                    onRequestPrint={() => {}}
                    isPrintPreview={true}
                  />
                </div>
              ) : (
                <div className="bg-white p-6 shadow-xl border border-neutral-300">
                  <FactorySheetView
                    sheetData={sheetData}
                    summary={summary}
                    lang={lang}
                    onUpdateCarton={() => {}}
                    onUpdateHeader={() => {}}
                    onRequestPrint={() => {}}
                  />
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

export default PrintPreviewModal;
