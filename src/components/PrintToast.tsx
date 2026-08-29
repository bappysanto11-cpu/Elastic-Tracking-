import React, { useEffect } from 'react';
import { Printer, CheckCircle2, Sliders, X } from 'lucide-react';
import { Language } from '../utils/translations';

interface PrintToastProps {
  isVisible: boolean;
  onClose: () => void;
  orientation: 'landscape' | 'portrait';
  lang: Language;
}

export const PrintToast: React.FC<PrintToastProps> = ({
  isVisible,
  onClose,
  orientation,
  lang,
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 p-4 animate-in slide-in-from-bottom-5 duration-200 print:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <Printer className="w-5 h-5 animate-pulse" />
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{lang === 'en' ? 'Print Triggered' : 'প্রিন্ট কমান্ড চালু হয়েছে'}</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded font-mono uppercase font-bold border border-emerald-800">
                {orientation}
              </span>
            </h4>

            <p className="text-[11px] text-slate-300 leading-snug">
              {lang === 'en'
                ? 'Reminder for best alignment: Set Scale to 100%, Margins to None, Background Graphics ON, and uncheck Headers/Footers.'
                : 'সেরা এলাইনমেন্টের জন্য: Scale ১০০%, Margins None, Background Graphics চালু এবং Headers/Footers আনচেক রাখুন।'}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] font-mono text-emerald-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                BG Graphics: ON
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Headers/Footers: OFF
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Scale: 100%
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
