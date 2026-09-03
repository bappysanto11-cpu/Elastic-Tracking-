import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ClipboardPaste, 
  Sparkles, 
  Check, 
  ArrowDownToLine, 
  RefreshCw, 
  Layers, 
  Scale, 
  Ruler, 
  AlertCircle,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { Language, translations } from '../utils/translations';
import { parseRawWeightData, calculateLengthMeters, calculateLengthGry } from '../utils/calc';

export interface PasteWeightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPaste: (
    weights: number[], 
    mode: 'append' | 'replace' | 'fromIndex', 
    startIndex: number,
    customTare?: number,
    customUnitWt?: number
  ) => void;
  defaultTare: number;
  defaultWtPerUnit: number;
  existingCartonCount: number;
  selectedCartonIndex?: number;
  lang: Language;
  initialText?: string;
}

export const PasteWeightsModal: React.FC<PasteWeightsModalProps> = ({
  isOpen,
  onClose,
  onApplyPaste,
  defaultTare,
  defaultWtPerUnit,
  existingCartonCount,
  selectedCartonIndex = 0,
  lang,
  initialText = ''
}) => {
  const t = translations[lang];
  const [rawText, setRawText] = useState<string>(initialText);
  const [pasteMode, setPasteMode] = useState<'append' | 'replace' | 'fromIndex'>('append');
  const [startCartonNo, setStartCartonNo] = useState<number>(selectedCartonIndex + 1);
  const [batchTare, setBatchTare] = useState<number>(defaultTare);
  const [batchUnitWt, setBatchUnitWt] = useState<number>(defaultWtPerUnit);
  const [clipboardReadStatus, setClipboardReadStatus] = useState<string | null>(null);
  const [sampleLoaded, setSampleLoaded] = useState<boolean>(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialText) {
        setRawText(initialText);
      }
      setBatchTare(defaultTare);
      setBatchUnitWt(defaultWtPerUnit);
      setStartCartonNo(Math.max(1, selectedCartonIndex + 1));
      setClipboardReadStatus(null);
      setSampleLoaded(false);

      // Auto-focus and try to read clipboard if empty
      if (!initialText && !rawText && navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText()
          .then(text => {
            if (text && text.trim()) {
              const detected = parseRawWeightData(text);
              if (detected.length > 0) {
                setRawText(text);
                setClipboardReadStatus(lang === 'en' ? `Auto-detected ${detected.length} weights from clipboard` : `ক্লিপবোর্ড থেকে ${detected.length} টি ওজন লোড করা হয়েছে`);
              }
            }
          })
          .catch(() => {
            // Clipboard permission might not be granted; silent ignore
          });
      }
    }
  }, [isOpen, initialText, defaultTare, defaultWtPerUnit, selectedCartonIndex, lang]);

  // Parse weights in real-time
  const parsedWeights = useMemo(() => {
    return parseRawWeightData(rawText);
  }, [rawText]);

  // Compute preview metrics
  const previewStats = useMemo(() => {
    if (parsedWeights.length === 0) return null;
    let totalGross = 0;
    let totalNet = 0;
    let totalMtr = 0;

    for (const gw of parsedWeights) {
      totalGross += gw;
      const net = Math.max(0, gw - batchTare);
      totalNet += net;
      totalMtr += calculateLengthMeters(net, batchUnitWt);
    }

    return {
      count: parsedWeights.length,
      totalGross: Number(totalGross.toFixed(2)),
      totalNet: Number(totalNet.toFixed(2)),
      totalMtr: Number(totalMtr.toFixed(2)),
      totalGry: calculateLengthGry(totalMtr),
      avgGross: Number((totalGross / parsedWeights.length).toFixed(2)),
    };
  }, [parsedWeights, batchTare, batchUnitWt]);

  if (!isOpen) return null;

  const handleReadClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        setClipboardReadStatus(lang === 'en' ? 'Clipboard access not supported in this browser. Please use Ctrl+V.' : 'ব্রাউজারে ক্লিপবোর্ড সাপোর্ট নেই। সরাসরি Ctrl+V চাপুন।');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        setClipboardReadStatus(lang === 'en' ? 'Clipboard is empty.' : 'ক্লিপবোর্ড খালি।');
        return;
      }
      setRawText(text);
      const detected = parseRawWeightData(text);
      setClipboardReadStatus(
        lang === 'en'
          ? `Read ${detected.length} valid weight(s) from clipboard!`
          : `ক্লিপবোর্ড থেকে ${detected.length} টি ওজন সফলভাবে নেওয়া হয়েছে!`
      );
    } catch (err) {
      setClipboardReadStatus(lang === 'en' ? 'Could not read clipboard. Please click inside the box and press Ctrl+V.' : 'ক্লিপবোর্ড পড়তে পারেনি। বক্সে ক্লিক করে Ctrl+V চাপুন।');
    }
  };

  const handleLoadSample = () => {
    const sample = '10.06\n10.60\n10.66\n10.80\n10.45\n10.90\n10.55\n10.70';
    setRawText(sample);
    setSampleLoaded(true);
    setClipboardReadStatus(lang === 'en' ? 'Sample weight data loaded' : 'নমুনা ওজন ডাটা লোড করা হয়েছে');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedWeights.length === 0) return;

    const actualStartIndex = pasteMode === 'fromIndex' 
      ? Math.max(0, startCartonNo - 1)
      : pasteMode === 'append' 
      ? existingCartonCount 
      : 0;

    onApplyPaste(parsedWeights, pasteMode, actualStartIndex, batchTare, batchUnitWt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <ClipboardPaste className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>{t.pasteWeights}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                  Fast Import
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {t.pasteWeightsDescription}
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReadClipboard}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t.readClipboardBtn}</span>
              </button>

              <button
                type="button"
                onClick={handleLoadSample}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-300 transition cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{lang === 'en' ? 'Load Sample' : 'নমুনা ডাটা'}</span>
              </button>
            </div>

            {parsedWeights.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{parsedWeights.length} {lang === 'en' ? 'Weights Detected' : 'টি ওজন শনাক্ত'}</span>
              </span>
            )}
          </div>

          {/* Status Message if any */}
          {clipboardReadStatus && (
            <div className="p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{clipboardReadStatus}</span>
              </span>
              <button 
                type="button" 
                onClick={() => setClipboardReadStatus(null)}
                className="text-indigo-400 hover:text-indigo-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Raw Text Input Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>{lang === 'en' ? 'Raw Weight Input (Excel column, commas, or newlines)' : 'কাঁচা ওজন ডাটা (এক্সেল কলাম, কমা বা নতুন লাইন)'}</span>
              <span className="text-[11px] text-slate-400 font-normal">
                {lang === 'en' ? 'Format: 10.05, 10.20, 10.60...' : 'ফরম্যাট: ১০.০৫, ১০.২০, ১০.৬০...'}
              </span>
            </label>
            <textarea
              rows={5}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={`10.06\n10.60\n10.66\n10.80\n10.45\n10.90\n(Or paste entire Excel table column)`}
              className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border-2 border-slate-300 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition resize-y"
              autoFocus
            />
          </div>

          {/* Mode Selection */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              {lang === 'en' ? 'Select Import Mode' : 'ইমপোর্ট মোড নির্বাচন করুন'}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Option 1: Append */}
              <label 
                className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                  pasteMode === 'append'
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-950 ring-1 ring-indigo-400'
                    : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="pasteMode"
                  value="append"
                  checked={pasteMode === 'append'}
                  onChange={() => setPasteMode('append')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <div className="font-bold">{t.pasteAppendOption}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {lang === 'en' 
                      ? `Adds after Carton #${existingCartonCount}` 
                      : `কার্টন #${existingCartonCount} এর পর যোগ হবে`}
                  </div>
                </div>
              </label>

              {/* Option 2: Replace All */}
              <label 
                className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                  pasteMode === 'replace'
                    ? 'bg-rose-50 border-rose-400 text-rose-950 ring-1 ring-rose-400'
                    : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="pasteMode"
                  value="replace"
                  checked={pasteMode === 'replace'}
                  onChange={() => setPasteMode('replace')}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div className="text-xs">
                  <div className="font-bold">{t.pasteReplaceOption}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {lang === 'en' ? 'Starts fresh (#1 to #N)' : 'নতুন কার্টন #১ থেকে শুরু হবে'}
                  </div>
                </div>
              </label>

              {/* Option 3: Fill starting from row */}
              <label 
                className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                  pasteMode === 'fromIndex'
                    ? 'bg-purple-50 border-purple-400 text-purple-950 ring-1 ring-purple-400'
                    : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="pasteMode"
                  value="fromIndex"
                  checked={pasteMode === 'fromIndex'}
                  onChange={() => setPasteMode('fromIndex')}
                  className="mt-0.5 text-purple-600 focus:ring-purple-500"
                />
                <div className="text-xs">
                  <div className="font-bold">{t.pasteFillFromCurrent}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[11px] text-slate-500">Carton #:</span>
                    <input
                      type="number"
                      min="1"
                      value={startCartonNo}
                      onChange={e => setStartCartonNo(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={pasteMode !== 'fromIndex'}
                      className="w-14 px-1 py-0.5 text-xs font-bold border border-slate-300 rounded bg-white"
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Batch Specifications (Tare & Unit Wt) */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {lang === 'en' ? 'Carton Tare Weight (Kg)' : 'কার্টন ট্যার ওজন (Kg)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={batchTare}
                onChange={e => setBatchTare(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {lang === 'en' ? 'Unit Weight (gm/m)' : 'ওজন প্রতি একক (gm/m)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={batchUnitWt}
                onChange={e => setBatchUnitWt(Math.max(0.1, parseFloat(e.target.value) || 30))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Live Preview Stats & Table */}
          {previewStats && (
            <div className="bg-slate-900 text-white p-3.5 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Live Calculated Summary Preview' : 'লাইভ ক্যালকুলেশন প্রিভিউ'}</span>
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  {previewStats.count} {lang === 'en' ? 'Cartons' : 'টি কার্টন'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-sans">Total Gross</div>
                  <div className="text-sm font-black font-mono text-white">{previewStats.totalGross} <span className="text-[10px] font-normal text-slate-400">Kg</span></div>
                </div>
                <div className="bg-emerald-950/60 p-2 rounded-lg border border-emerald-700/50">
                  <div className="text-[10px] text-emerald-400 uppercase font-sans">Total Net</div>
                  <div className="text-sm font-black font-mono text-emerald-300">{previewStats.totalNet} <span className="text-[10px] font-normal text-emerald-400">Kg</span></div>
                </div>
                <div className="bg-indigo-950/60 p-2 rounded-lg border border-indigo-700/50">
                  <div className="text-[10px] text-indigo-400 uppercase font-sans">Total Meters</div>
                  <div className="text-sm font-black font-mono text-indigo-300">{previewStats.totalMtr.toLocaleString()} <span className="text-[10px] font-normal text-indigo-400">Mtr</span></div>
                </div>
                <div className="bg-purple-950/60 p-2 rounded-lg border border-purple-700/50">
                  <div className="text-[10px] text-purple-400 uppercase font-sans">Total GRY</div>
                  <div className="text-sm font-black font-mono text-purple-300">{previewStats.totalGry} <span className="text-[10px] font-normal text-purple-400">Gry</span></div>
                </div>
              </div>

              {/* Mini preview list */}
              <div className="max-h-28 overflow-y-auto bg-slate-950 rounded-lg p-2 border border-slate-800">
                <div className="grid grid-cols-5 text-[10px] font-mono text-slate-400 border-b border-slate-800 pb-1 font-bold">
                  <span>#</span>
                  <span className="text-right">Gross (Kg)</span>
                  <span className="text-right">Tare (Kg)</span>
                  <span className="text-right text-emerald-400">Net (Kg)</span>
                  <span className="text-right text-indigo-400">Meters</span>
                </div>
                {parsedWeights.slice(0, 10).map((gw, idx) => {
                  const cNo = pasteMode === 'fromIndex' 
                    ? startCartonNo + idx 
                    : pasteMode === 'append' 
                    ? existingCartonCount + idx + 1 
                    : idx + 1;
                  const nw = Math.max(0, gw - batchTare);
                  const mtr = calculateLengthMeters(nw, batchUnitWt);
                  return (
                    <div key={idx} className="grid grid-cols-5 text-[11px] font-mono py-0.5 border-b border-slate-900/60 text-slate-300">
                      <span className="font-bold text-slate-400">#{cNo}</span>
                      <span className="text-right">{gw.toFixed(2)}</span>
                      <span className="text-right text-slate-500">{batchTare.toFixed(2)}</span>
                      <span className="text-right text-emerald-300 font-bold">{nw.toFixed(2)}</span>
                      <span className="text-right text-indigo-300">{mtr.toFixed(2)}</span>
                    </div>
                  );
                })}
                {parsedWeights.length > 10 && (
                  <div className="text-center text-[10px] text-slate-500 pt-1">
                    ... + {parsedWeights.length - 10} more cartons
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-medium text-xs transition cursor-pointer"
          >
            {lang === 'en' ? 'Cancel' : 'বাতিল'}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={parsedWeights.length === 0}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-2 ${
              parsedWeights.length > 0
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-lg'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {t.autoGenerateCartons} ({parsedWeights.length})
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
