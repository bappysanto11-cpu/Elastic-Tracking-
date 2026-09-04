import React, { useState } from 'react';
import { Language, translations } from '../utils/translations';
import { Scale, Target, ClipboardPaste, X, Check, ShieldCheck, Wrench } from 'lucide-react';
import { SecuritySettingsPanel } from './SecuritySettingsPanel';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  currentWtPerUnit?: number;
  defaultWtPerUnit?: number;
  onApplyWtPerUnit?: (wtPerUnit: number) => void;
  onApplyUnitWeight?: (wt: number) => void;
  onPasteWeights?: (weights: number[]) => void;
  onBulkPasteWeights?: (weights: number[]) => void;
  onConvertWeights: (multiplier: number, target: 'cartons' | 'unit') => void;
  initialTab?: 'tools' | 'security';
}

export const ToolsModal: React.FC<ToolsModalProps> = ({
  isOpen,
  onClose,
  lang,
  currentWtPerUnit,
  defaultWtPerUnit,
  onApplyWtPerUnit,
  onApplyUnitWeight,
  onPasteWeights,
  onBulkPasteWeights,
  onConvertWeights,
  initialTab = 'tools',
}) => {
  const t = translations[lang];

  // Active Tab: 'tools' | 'security'
  const [activeTab, setActiveTab] = useState<'tools' | 'security'>(initialTab);

  const effectiveWtPerUnit = currentWtPerUnit ?? defaultWtPerUnit ?? 10;
  const effectiveApplyWt = onApplyWtPerUnit || onApplyUnitWeight || (() => {});
  const effectivePasteWeights = onPasteWeights || onBulkPasteWeights || (() => {});

  // 1. Sample Weight Tester State
  const [sampleLength, setSampleLength] = useState<number>(1);
  const [sampleWeight, setSampleWeight] = useState<number>(effectiveWtPerUnit);
  const calculatedUnitWt = sampleLength > 0 ? sampleWeight / sampleLength : 0;

  // 2. Reverse Calculator State
  const [targetMeters, setTargetMeters] = useState<number>(10000);
  const [targetGry, setTargetGry] = useState<number>(75);
  const [activeTargetMode, setActiveTargetMode] = useState<'mtr' | 'gry'>('mtr');

  // 3. Weight Unit Converter State
  const [convertMultiplier, setConvertMultiplier] = useState<string>('2.20462');
  const [convertTarget, setConvertTarget] = useState<'cartons' | 'unit'>('cartons');
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null);

  // 4. Paste Weights State
  const [pasteText, setPasteText] = useState<string>('');
  const [pasteStatus, setPasteStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  // Reverse Calculation
  const unitWt = effectiveWtPerUnit > 0 ? effectiveWtPerUnit : 10;
  const targetMtrFinal =
    activeTargetMode === 'mtr' ? targetMeters : targetGry * 144 * 0.9144;
  const requiredNetKg = (targetMtrFinal * unitWt) / 1000;
  const estimatedCartons = Math.ceil(requiredNetKg / 10);
  const estMtrPerCarton = estimatedCartons > 0 ? Math.round(targetMtrFinal / estimatedCartons) : 0;

  const reverseResult = {
    requiredNetKg: requiredNetKg.toFixed(2),
    estimatedCartons,
    estMtrPerCarton,
  };

  const handleApplySample = () => {
    if (calculatedUnitWt > 0) {
      effectiveApplyWt(parseFloat(calculatedUnitWt.toFixed(2)));
      onClose();
    }
  };

  const handleProcessPaste = () => {
    if (!pasteText.trim()) return;
    const parts = pasteText.split(/[\n,\s\t]+/).filter(Boolean);
    const parsed = parts.map(p => parseFloat(p)).filter(n => !isNaN(n) && n > 0);

    if (parsed.length === 0) {
      setPasteStatus(lang === 'en' ? 'No valid weights found' : 'সঠিক ওজন পাওয়া যায়নি');
      return;
    }

    effectivePasteWeights(parsed);
    setPasteStatus(
      lang === 'en'
        ? `Successfully added ${parsed.length} carton weights!`
        : `${parsed.length} টি কার্টন ওজন সফলভাবে যুক্ত হয়েছে!`
    );
    setTimeout(() => {
      setPasteStatus(null);
      setPasteText('');
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl sm:max-w-3xl overflow-hidden flex flex-col max-h-[92vh] shadow-2xl border border-slate-200 text-slate-800">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-xs transition ${
              activeTab === 'security'
                ? 'bg-indigo-950 border-indigo-700 text-indigo-400'
                : 'bg-slate-800 border-slate-700 text-amber-400'
            }`}>
              {activeTab === 'security' ? <ShieldCheck className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>
                  {activeTab === 'security'
                    ? (lang === 'en' ? 'Security Settings & Team Access' : 'সিকিউরিটি সেটিংস ও টিম অ্যাক্সেস')
                    : (lang === 'en' ? 'Garment Calculation Utilities' : 'গার্মেন্টস ও ট্রিম ক্যালকুলেশন টুলস')}
                </span>
                {activeTab === 'security' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                    Firebase Auth
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {activeTab === 'security'
                  ? (lang === 'en'
                      ? 'Define view-only or editor access levels for team members'
                      : 'টিম মেম্বারদের জন্য ভিউ-অনলি ও এডিটর অ্যাক্সেস লেভেল নির্ধারণ করুন')
                  : (lang === 'en'
                      ? 'Sample Weight Tester, Target Length Planner & Unit Converters'
                      : 'স্যাম্পল টেস্ট, টার্গেট মিটার প্ল্যানার এবং ওজন কনভার্টার')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-5 pt-3 pb-2 bg-slate-100/90 border-b border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('tools')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'tools'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-300/80 ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Scale className={`w-3.5 h-3.5 ${activeTab === 'tools' ? 'text-amber-600' : 'text-slate-500'}`} />
            <span>{lang === 'en' ? 'Calculation Tools' : 'ক্যালকুলেশন টুলস'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'security'
                ? 'bg-white text-indigo-700 shadow-xs border border-indigo-300/80 ring-1 ring-indigo-200'
                : 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/60'
            }`}
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${activeTab === 'security' ? 'text-indigo-600' : 'text-slate-500'}`} />
            <span>{lang === 'en' ? 'Security Settings' : 'সিকিউরিটি সেটিংস'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
              Auth
            </span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {activeTab === 'security' ? (
            /* Security Settings Panel via Firebase Auth */
            <SecuritySettingsPanel lang={lang} />
          ) : (
            /* Calculation Utilities */
            <div className="space-y-4">
              {/* 1. Sample Weight to gm/m Tester */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {t.sampleTesterTitle}
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-lg">
                    Result: {calculatedUnitWt.toFixed(2)} gm/m
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                      {lang === 'en' ? 'Sample Length (Meters)' : 'স্যাম্পল দৈর্ঘ্য (মিটার)'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={sampleLength}
                      onChange={e => setSampleLength(parseFloat(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                      {lang === 'en' ? 'Scale Weight (Grams)' : 'ডিজিটাল পাল্লায় ওজন (গ্রাম)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={sampleWeight}
                      onChange={e => setSampleWeight(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 text-xs">
                  <span className="text-slate-600">
                    Formula: {sampleWeight}g ÷ {sampleLength}m = <strong className="text-emerald-700 font-mono">{calculatedUnitWt.toFixed(2)} gm/m</strong>
                  </span>
                  <button
                    onClick={handleApplySample}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition cursor-pointer"
                  >
                    {lang === 'en' ? 'Apply to Order' : 'অর্ডারে সেট করুন'}
                  </button>
                </div>
              </div>

              {/* 2. Target Length to Required Weight Planner */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {t.reverseCalcTitle}
                    </h4>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setActiveTargetMode('mtr')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition ${
                        activeTargetMode === 'mtr' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Meters
                    </button>
                    <button
                      onClick={() => setActiveTargetMode('gry')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition ${
                        activeTargetMode === 'gry' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Gross Yards (Gry)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
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
                      className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      {lang === 'en' ? 'Required Net Weight' : 'প্রয়োজনীয় মোট নেট ওজন'}
                    </span>
                    <span className="text-base font-extrabold font-mono text-indigo-600">
                      {reverseResult.requiredNetKg} Kg
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      {lang === 'en' ? 'Estimated Cartons (~10kg)' : 'আনুমানিক কার্টন সংখ্যা'}
                    </span>
                    <span className="text-base font-extrabold font-mono text-indigo-600">
                      ~{reverseResult.estimatedCartons} CTN ({reverseResult.estMtrPerCarton} m/ctn)
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Weight Unit Converter */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Scale className="w-4 h-4 text-orange-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {lang === 'en' ? 'Batch Unit Converter' : 'ওজন ইউনিট কনভার্টার'}
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                      {lang === 'en' ? 'Target to Convert' : 'যা পরিবর্তন করবেন'}
                    </label>
                    <select
                      value={convertTarget}
                      onChange={(e) => setConvertTarget(e.target.value as 'cartons' | 'unit')}
                      className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="cartons">{lang === 'en' ? 'Carton Weights (Gross & Tare)' : 'কার্টন ওজন (গ্রস ও ট্যার)'}</option>
                      <option value="unit">{lang === 'en' ? 'Unit Weight (gm/m)' : 'ইউনিট ওজন (gm/m)'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                      {lang === 'en' ? 'Custom Multiplier' : 'গুণক (Multiplier)'}
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={convertMultiplier}
                      onChange={(e) => setConvertMultiplier(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <button onClick={() => setConvertMultiplier('2.20462')} className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg">Kg → Lbs</button>
                  <button onClick={() => setConvertMultiplier('0.453592')} className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg">Lbs → Kg</button>
                  <button onClick={() => setConvertMultiplier('1000')} className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg">Kg → gm</button>
                  <button onClick={() => setConvertMultiplier('0.001')} className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg">gm → Kg</button>
                  <button onClick={() => setConvertMultiplier('0.035274')} className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg">gm → oz</button>
                  <button onClick={() => setConvertMultiplier('28.3495')} className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg">oz → gm</button>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 text-xs">
                  <span className="text-orange-600 font-semibold">
                    {convertSuccess ? <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5"/> {convertSuccess}</span> : ''}
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
                    className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-lg shadow-xs transition cursor-pointer"
                  >
                    {lang === 'en' ? 'Convert All' : 'সব কনভার্ট করুন'}
                  </button>
                </div>
              </div>

              {/* 4. Bulk Paste Carton Weights */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardPaste className="w-4 h-4 text-purple-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {lang === 'en' ? 'Paste Weights from Excel or Clipboard' : 'এক্সেল বা ক্লিপবোর্ড থেকে ওজন পেস্ট করুন'}
                  </h4>
                </div>
                <p className="text-xs text-slate-500 mb-2.5">
                  {lang === 'en'
                    ? 'Paste gross weights separated by newlines, commas, or spaces (e.g. 10.06, 10.60, 10.66)'
                    : 'নতুন লাইন, কমা বা স্পেস দিয়ে গ্রস ওজন পেস্ট করুন (যেমন: 10.06, 10.60, 10.66)'}
                </p>

                <textarea
                  rows={3}
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder="10.06&#10;10.60&#10;10.66"
                  className="w-full p-3 text-xs font-mono bg-white border border-slate-300 rounded-lg mb-2.5 text-slate-900 focus:ring-2 focus:ring-purple-500"
                />

                {pasteStatus && (
                  <p className="text-xs font-semibold text-purple-700 mb-2.5">{pasteStatus}</p>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleProcessPaste}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg shadow-xs transition cursor-pointer"
                  >
                    {lang === 'en' ? 'Import Carton Weights' : 'কার্টন ওজন যুক্ত করুন'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>
              {activeTab === 'security'
                ? (lang === 'en' ? 'Roles synced with Firebase Auth & Cloud Firestore' : 'ফায়ারবেস ক্লাউড স্টোরেজে সুরক্ষিতভাবে সংরক্ষিত')
                : (lang === 'en' ? 'Live Calculation Mode Active' : 'লাইভ ক্যালকুলেশন সক্রিয়')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs"
          >
            {lang === 'en' ? 'Close' : 'বন্ধ করুন'}
          </button>
        </div>
      </div>
    </div>
  );
};
