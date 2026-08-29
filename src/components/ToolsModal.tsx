import React from 'react';
import { Language, translations } from '../utils/translations';
import { 
  calculateUnitWeightFromSample, 
  calculateRequiredWeight, 
  YARD_TO_METER, 
  GROSS_UNITS 
} from '../utils/calc';
import { X, Scale, Target, ClipboardPaste, Check, Sparkles } from 'lucide-react';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  defaultWtPerUnit: number;
  onApplyUnitWeight: (wt: number) => void;
  onBulkPasteWeights: (weights: number[]) => void;
  onConvertWeights: (multiplier: number, target: 'cartons' | 'unit') => void;
}

export const ToolsModal: React.FC<ToolsModalProps> = ({
  isOpen,
  onClose,
  lang,
  defaultWtPerUnit,
  onApplyUnitWeight,
  onBulkPasteWeights,
  onConvertWeights,
}) => {
  const t = translations[lang];

  // Tool 1: Sample tester state
  const [sampleLength, setSampleLength] = React.useState<number>(1);
  const [sampleWeight, setSampleWeight] = React.useState<number>(30);
  const calculatedUnitWt = calculateUnitWeightFromSample(sampleLength, sampleWeight);

  // Tool 2: Reverse target calculator state
  const [targetMeters, setTargetMeters] = React.useState<number>(1000);
  const [targetGry, setTargetGry] = React.useState<number>(7.5);
  const [activeTargetMode, setActiveTargetMode] = React.useState<'mtr' | 'gry'>('mtr');

  const effectiveMtr = activeTargetMode === 'mtr' 
    ? targetMeters 
    : targetGry * GROSS_UNITS * YARD_TO_METER;

  const reverseResult = calculateRequiredWeight(effectiveMtr, defaultWtPerUnit);

  // Tool 3: Bulk paste state
  const [pasteText, setPasteText] = React.useState<string>('10.06\n10.60\n10.66');
  const [pasteStatus, setPasteStatus] = React.useState<string>('');
  const [convertMultiplier, setConvertMultiplier] = React.useState<string>('2.20462');
  const [convertTarget, setConvertTarget] = React.useState<'cartons' | 'unit'>('cartons');
  const [convertSuccess, setConvertSuccess] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplySample = () => {
    if (calculatedUnitWt > 0) {
      onApplyUnitWeight(calculatedUnitWt);
      onClose();
    }
  };

  const handleProcessPaste = () => {
    const lines = pasteText
      .split(/[\n,;\t\s]+/)
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n) && n > 0);

    if (lines.length === 0) {
      setPasteStatus(lang === 'en' ? 'No valid numbers found.' : 'কোনো সঠিক সংখ্যা পাওয়া যায়নি।');
      return;
    }

    onBulkPasteWeights(lines);
    setPasteStatus(
      lang === 'en'
        ? `Successfully imported ${lines.length} carton weights!`
        : `সফলভাবে ${lines.length} টি কার্টনের ওজন যুক্ত হয়েছে!`
    );
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {lang === 'en' ? 'Garment & Trim Calculation Utilities' : 'গার্মেন্টস ও ট্রিম প্রয়োজনীয় টুলস'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'en' ? 'Sample Weight Tester, Target Length Planner & Excel Paste' : 'স্যাম্পল টেস্ট, টার্গেট মিটার প্ল্যানার এবং এক্সেল পেস্ট'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-6 overflow-y-auto">
          {/* 1. Sample Weight to gm/m Tester */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  {t.sampleTesterTitle}
                </h4>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Result: {calculatedUnitWt.toFixed(2)} gm/m
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {lang === 'en' ? 'Sample Length (Meters)' : 'স্যাম্পল দৈর্ঘ্য (মিটার)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={sampleLength}
                  onChange={e => setSampleLength(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {lang === 'en' ? 'Scale Weight (Grams)' : 'ডিজিটাল পাল্লায় ওজন (গ্রাম)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={sampleWeight}
                  onChange={e => setSampleWeight(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
              <span className="text-slate-500">
                Formula: {sampleWeight}g ÷ {sampleLength}m = <strong className="text-slate-800 font-mono">{calculatedUnitWt.toFixed(2)} gm/m</strong>
              </span>
              <button
                onClick={handleApplySample}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-md shadow-xs transition cursor-pointer"
              >
                {lang === 'en' ? 'Apply to Order' : 'অর্ডারে সেট করুন'}
              </button>
            </div>
          </div>

          {/* 2. Target Length to Required Weight Planner */}
          <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  {t.reverseCalcTitle}
                </h4>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTargetMode('mtr')}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer ${
                    activeTargetMode === 'mtr' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Meters
                </button>
                <button
                  onClick={() => setActiveTargetMode('gry')}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer ${
                    activeTargetMode === 'gry' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Gross Yards (Gry)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {activeTargetMode === 'mtr'
                    ? (lang === 'en' ? 'Target Meters' : 'টার্গেট মিটার')
                    : (lang === 'en' ? 'Target Gry' : 'টার্গেট গ্রস ইয়ার্ড')}
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={activeTargetMode === 'mtr' ? targetMeters : targetGry}
                  onChange={e => {
                    const v = parseFloat(e.target.value) || 0;
                    if (activeTargetMode === 'mtr') setTargetMeters(v);
                    else setTargetGry(v);
                  }}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-indigo-100 flex flex-col justify-center">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  {lang === 'en' ? 'Required Net Weight' : 'প্রয়োজনীয় মোট নেট ওজন'}
                </span>
                <span className="text-sm font-black font-mono text-indigo-950">
                  {reverseResult.requiredNetKg} Kg
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-indigo-100 flex flex-col justify-center">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  {lang === 'en' ? 'Estimated Cartons (~10kg)' : 'আনুমানিক কার্টন সংখ্যা'}
                </span>
                <span className="text-sm font-black font-mono text-indigo-950">
                  ~{reverseResult.estimatedCartons} CTN ({reverseResult.estMtrPerCarton} m/ctn)
                </span>
              </div>
            </div>
          </div>

          
          {/* 3. Weight Unit Converter */}
          <div className="p-4 rounded-xl bg-orange-50/40 border border-orange-200">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-4 h-4 text-orange-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                {lang === 'en' ? 'Batch Unit Converter' : 'ওজন ইউনিট কনভার্টার'}
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {lang === 'en' ? 'Target to Convert' : 'যা পরিবর্তন করবেন'}
                </label>
                <select
                  value={convertTarget}
                  onChange={(e) => setConvertTarget(e.target.value as 'cartons' | 'unit')}
                  className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="cartons">{lang === 'en' ? 'Carton Weights (Gross & Tare)' : 'কার্টন ওজন (গ্রস ও ট্যার)'}</option>
                  <option value="unit">{lang === 'en' ? 'Unit Weight (gm/m)' : 'ইউনিট ওজন (gm/m)'}</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {lang === 'en' ? 'Custom Multiplier' : 'গুণক (Multiplier)'}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={convertMultiplier}
                  onChange={(e) => setConvertMultiplier(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={() => setConvertMultiplier('2.20462')} className="px-2 py-1 text-[10px] font-bold bg-orange-100 text-orange-800 rounded hover:bg-orange-200">Kg → Lbs</button>
              <button onClick={() => setConvertMultiplier('0.453592')} className="px-2 py-1 text-[10px] font-bold bg-orange-100 text-orange-800 rounded hover:bg-orange-200">Lbs → Kg</button>
              <button onClick={() => setConvertMultiplier('1000')} className="px-2 py-1 text-[10px] font-bold bg-orange-100 text-orange-800 rounded hover:bg-orange-200">Kg → gm</button>
              <button onClick={() => setConvertMultiplier('0.001')} className="px-2 py-1 text-[10px] font-bold bg-orange-100 text-orange-800 rounded hover:bg-orange-200">gm → Kg</button>
              <button onClick={() => setConvertMultiplier('0.035274')} className="px-2 py-1 text-[10px] font-bold bg-orange-100 text-orange-800 rounded hover:bg-orange-200">gm → oz</button>
              <button onClick={() => setConvertMultiplier('28.3495')} className="px-2 py-1 text-[10px] font-bold bg-orange-100 text-orange-800 rounded hover:bg-orange-200">oz → gm</button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
              <span className="text-orange-700 font-semibold">
                {convertSuccess ? <span className="flex items-center gap-1"><Check className="w-3 h-3"/> {convertSuccess}</span> : ''}
              </span>
              <button
                onClick={() => {
                  const val = parseFloat(convertMultiplier);
                  if (!isNaN(val) && val > 0) {
                    if (window.confirm(lang === 'en' ? 'Are you sure you want to convert the entire sheet?' : 'পুরো শিটের ওজন পরিবর্তন করতে চান?')) {
                      onConvertWeights(val, convertTarget);
                      setConvertSuccess('Converted!');
                      setTimeout(() => setConvertSuccess(null), 2000);
                    }
                  }
                }}
                className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs rounded-md shadow-xs transition cursor-pointer"
              >
                {lang === 'en' ? 'Convert All' : 'সব কনভার্ট করুন'}
              </button>
            </div>
          </div>

          {/* 4. Bulk Paste Carton Weights */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardPaste className="w-4 h-4 text-purple-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                {lang === 'en' ? 'Paste Weights from Excel or Clipboard' : 'এক্সেল বা ক্লিপবোর্ড থেকে ওজন পেস্ট করুন'}
              </h4>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              {lang === 'en'
                ? 'Paste gross weights separated by newlines, commas, or spaces (e.g. 10.06, 10.60, 10.66)'
                : 'নতুন লাইন, কমা বা স্পেস দিয়ে গ্রস ওজন পেস্ট করুন (যেমন: 10.06, 10.60, 10.66)'}
            </p>

            <textarea
              rows={3}
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="10.06&#10;10.60&#10;10.66"
              className="w-full p-2.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none mb-2"
            />

            {pasteStatus && (
              <p className="text-xs font-semibold text-purple-700 mb-2">{pasteStatus}</p>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleProcessPaste}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-lg shadow-xs transition cursor-pointer"
              >
                {lang === 'en' ? 'Import Carton Weights' : 'কার্টন ওজন যুক্ত করুন'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            {lang === 'en' ? 'Close' : 'বন্ধ করুন'}
          </button>
        </div>
      </div>
    </div>
  );
};
