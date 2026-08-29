import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Settings2, Info } from 'lucide-react';
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
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const t = translations[lang];

  useEffect(() => {
    if (isOpen) {
      // Default to portrait for stickers, otherwise landscape
      setOrientation(activeTab === 'stickers' ? 'portrait' : 'landscape');
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-700">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 text-white">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <Printer className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold">Print Preview</h2>
              <p className="text-xs text-slate-400">Review your document before printing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Settings Sidebar */}
          <div className="w-72 bg-white border-r border-slate-200 p-5 overflow-y-auto flex flex-col gap-6">
            
            {/* Orientation */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-400" />
                Layout
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`py-3 px-2 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                    orientation === 'portrait'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <div className="w-6 h-8 border-2 border-current rounded-sm"></div>
                  <span className="text-xs">Portrait</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`py-3 px-2 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                    orientation === 'landscape'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <div className="w-8 h-6 border-2 border-current rounded-sm"></div>
                  <span className="text-xs">Landscape</span>
                </button>
              </div>
            </div>

            {/* Print Settings Info */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
               <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                System Print Settings
              </label>
              
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Important Defaults
                </div>
                <ul className="list-disc pl-4 space-y-1 opacity-90">
                  <li>Set Margins to <b>None</b> or <b>Minimum</b></li>
                  <li>Turn <b>ON</b> Background Graphics</li>
                  <li>Turn <b>OFF</b> Headers & Footers</li>
                  <li>Set Scale to <b>100%</b> or Default</li>
                </ul>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <button
                onClick={() => onProceed(orientation)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-200 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Now
              </button>
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex-1 bg-slate-200/50 p-4 md:p-8 overflow-y-auto flex justify-center items-start relative">
            <div 
              className="bg-white shadow-xl shadow-slate-300/50 origin-top overflow-hidden ring-1 ring-slate-200 print-preview-container"
              style={{
                width: orientation === 'landscape' ? '1122px' : '794px',
                minHeight: orientation === 'landscape' ? '794px' : '1122px',
                transform: 'scale(0.8)',
                transformOrigin: 'top center',
                marginBottom: '-15%'
              }}
            >
              <div className="p-8">
                {activeTab === 'stickers' ? (
                  <StickerLabelsView
                    sheetData={sheetData}
                    summary={summary}
                    lang={lang}
                    onOpenCartonQr={() => {}}
                    onRequestPrint={() => {}}
                  />
                ) : (
                  <FactorySheetView
                    sheetData={sheetData}
                    summary={summary}
                    lang={lang}
                    onUpdateCarton={() => {}}
                    onUpdateHeader={() => {}}
                    onRequestPrint={() => {}}
                  />
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
