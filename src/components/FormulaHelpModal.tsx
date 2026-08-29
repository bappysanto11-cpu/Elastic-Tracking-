import React from 'react';
import { Language } from '../utils/translations';
import { X, HelpCircle, BookOpen, Check, Calculator } from 'lucide-react';

interface FormulaHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const FormulaHelpModal: React.FC<FormulaHelpModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold">
              {lang === 'en' ? 'How Calculations Work (Textile & Garment Industry Formulas)' : 'ক্যালকুলেশন কিভাবে কাজ করে (গার্মেন্টস সূত্রাবলী)'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-700 overflow-y-auto">
          {/* Formula 1: Net Weight */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-mono">1</span>
              {lang === 'en' ? 'Net Weight Calculation' : '১. নেট ওজন নির্ণয়'}
            </h4>
            <div className="bg-white p-2 rounded border border-slate-200 font-mono text-slate-900 font-bold">
              Net Weight (Kg) = Gross Weight (Kg) − Tare Weight (Kg)
            </div>
            <p className="text-[11px] text-slate-500">
              {lang === 'en' 
                ? 'Example: Gross = 10.06 Kg, Tare = 0.50 Kg -> Net = 10.06 - 0.50 = 9.56 Kg' 
                : 'উদাহরণ: গ্রস = ১০.০৬ কেজি, কার্টন/ট্যার = ০.৫০ কেজি -> নেট = ৯.৫৬ কেজি'}
            </p>
          </div>

          {/* Formula 2: Length in Meters */}
          <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-1">
            <h4 className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-mono">2</span>
              {lang === 'en' ? 'Length in Meters (Mtr)' : '২. দৈর্ঘ্য মিটার (Mtr) নির্ণয়'}
            </h4>
            <div className="bg-white p-2 rounded border border-indigo-200 font-mono text-indigo-950 font-bold">
              Length (Mtr) = (Net Weight in Kg × 1000) ÷ Unit Weight (gm/meter)
            </div>
            <p className="text-[11px] text-slate-500">
              {lang === 'en' 
                ? 'Example: Net = 9.56 Kg, Unit Wt = 30.00 gm -> (9.56 × 1000) ÷ 30.00 = 318.67 Mtr' 
                : 'উদাহরণ: নেট = ৯.৫৬ কেজি, প্রতি মিটার = ৩০.০০ গ্রাম -> (৯.৫৬ × ১০০০) ÷ ৩০.০০ = ৩১৮.৬৭ মিটার'}
            </p>
          </div>

          {/* Formula 3: Length in Gross Yards (Gry) */}
          <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-xl space-y-1">
            <h4 className="font-bold text-purple-950 flex items-center gap-1.5 text-xs">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-mono">3</span>
              {lang === 'en' ? 'Length in Gross Yards (Gry)' : '৩. গ্রস ইয়ার্ড (Gry) নির্ণয়'}
            </h4>
            <div className="bg-white p-2 rounded border border-purple-200 font-mono text-purple-950 font-bold">
              Length (Gry) = (Length in Meters ÷ 0.9144) ÷ 144
            </div>
            <p className="text-[11px] text-slate-500">
              {lang === 'en'
                ? '1 Meter = 1.09361 Yards | 1 Gross (Gry) = 144 Yards -> 318.67 ÷ 0.9144 ÷ 144 = 2.42 Gry'
                : '১ মিটার = ১.০৯৩৬১ ইয়ার্ড | ১ গ্রস (Gry) = ১৪৪ ইয়ার্ড -> ৩১৮.৬৭ ÷ ০.৯১৪৪ ÷ ১৪৪ = ২.৪২ Gry'}
            </p>
          </div>

          {/* Summary */}
          <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1">
            <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-mono">4</span>
              {lang === 'en' ? 'Grand Summary' : '৪. সর্বমোট হিসাব'}
            </h4>
            <p className="text-[11px] text-slate-600">
              {lang === 'en'
                ? 'All carton weights, meters, and gross yards are automatically aggregated and displayed on the bottom summary bar and printable factory sticker grid.'
                : 'সব কার্টনের মোট ওজন, মিটার এবং গ্রস ইয়ার্ড স্বয়ংক্রিয়ভাবে যোগ হয়ে সামারি বারে এবং ফ্যাক্টরি প্রিন্ট শিটে দেখানো হয়।'}
            </p>
          </div>
          {/* Keyboard Shortcuts Section */}
          <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2 border border-slate-800">
            <h4 className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-mono">⚡</span>
              {lang === 'en' ? 'Packing Table Keyboard Shortcuts' : 'প্যাকিং টেবিল কীবোর্ড শর্টকাট'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-slate-800/90 p-2 rounded border border-slate-700 flex items-center justify-between">
                <span className="text-slate-300 font-sans">{lang === 'en' ? 'Add Empty Row' : 'নতুন সারি যোগ'}</span>
                <kbd className="px-1.5 py-0.5 bg-slate-950 text-emerald-400 font-bold rounded text-[10px]">Ctrl + Enter</kbd>
              </div>
              <div className="bg-slate-800/90 p-2 rounded border border-slate-700 flex items-center justify-between">
                <span className="text-slate-300 font-sans">{lang === 'en' ? 'Delete Selected Row' : 'সিলেক্টেড সারি মুছুন'}</span>
                <kbd className="px-1.5 py-0.5 bg-slate-950 text-rose-400 font-bold rounded text-[10px]">Ctrl + Del</kbd>
              </div>
              <div className="bg-slate-800/90 p-2 rounded border border-slate-700 flex items-center justify-between">
                <span className="text-slate-300 font-sans">{lang === 'en' ? 'Duplicate Row' : 'সারি ডুপ্লিকেট'}</span>
                <kbd className="px-1.5 py-0.5 bg-slate-950 text-amber-400 font-bold rounded text-[10px]">Ctrl + D</kbd>
              </div>
              <div className="bg-slate-800/90 p-2 rounded border border-slate-700 flex items-center justify-between">
                <span className="text-slate-300 font-sans">{lang === 'en' ? 'Navigate Rows' : 'সারি নেভিগেশন'}</span>
                <kbd className="px-1.5 py-0.5 bg-slate-950 text-sky-400 font-bold rounded text-[10px]">Alt + ↑ / ↓</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            {lang === 'en' ? 'Got It' : 'বুঝতে পেরেছি'}
          </button>
        </div>
      </div>
    </div>
  );
};
