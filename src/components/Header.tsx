import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator, 
  Sparkles, 
  Printer, 
  FileSpreadsheet, 
  HelpCircle, 
  RotateCcw, 
  Globe, 
  Copy, 
  Check,
  Share2,
  Wrench,
  Cloud,
  Smartphone,
  HardDrive,
  CheckCircle2,
  Clock,
  Database,
  Upload,
  Undo2,
  Redo2
} from 'lucide-react';
import { Language, translations } from '../utils/translations';
import { Folder, Activity } from 'lucide-react';
import { getWorkspaces, DEFAULT_WORKSPACE_ID } from '../utils/workspaceManager';
import { PackingSheetData, SummaryStats, CartonRow } from '../types/calculator';
import { parseExcelOrCsvFile } from '../utils/export';

interface HeaderProps {
  lang: Language;
  setLang: (lang: Language) => void;
  onOpenAiScan: () => void;
  onOpenHelp: () => void;
  onOpenActivityLog?: () => void;
  onOpenTools: () => void;
  onOpenExcelDrive: () => void;
  onOpenCloudSync: () => void;
  onOpenWorkspaces?: () => void;
  activeWorkspaceId?: string;
  onOpenApk?: () => void;
  onOpenIndexedDbBackups?: () => void;
  onPrint: () => void;
  onExportCsv: () => void;
  onReset: () => void;
  onImportData: (importedCartons: CartonRow[], importedHeader?: Partial<PackingSheetData>) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  sheetData: PackingSheetData;
  summary: SummaryStats;
  lastSavedTime?: Date | null;
  isSaving?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  setLang,
  onOpenAiScan,
  onOpenHelp,
  onOpenTools,
  onOpenActivityLog,
  onOpenExcelDrive,
  onOpenCloudSync,
  onOpenApk,
  onOpenIndexedDbBackups,
  onPrint,
  onExportCsv,
  onReset,
  onImportData,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  sheetData,
  summary,
  lastSavedTime,
  isSaving = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSaveTooltip, setShowSaveTooltip] = useState(false);
  const [, setTick] = useState(0);
  const t = translations[lang];

  // Refresh relative time every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getRelativeTimeString = (date: Date | null | undefined): string => {
    if (!date) return lang === 'en' ? 'Saved' : 'সংরক্ষিত';
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 4) return lang === 'en' ? 'Saved just now' : 'এখনই সংরক্ষিত';
    if (diffSec < 60) return lang === 'en' ? `Saved ${diffSec}s ago` : `${diffSec} সেকেন্ড আগে সংরক্ষিত`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return lang === 'en' ? `Saved ${diffMin}m ago` : `${diffMin} মিনিট আগে সংরক্ষিত`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFormattedTime = (date: Date | null | undefined): string => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const handleCopySummary = async () => {
    const text = `📦 ${sheetData.companyName || 'PACKING LIST'}
Ref: ${sheetData.ref} | Buyer: ${sheetData.buyer} | Size: ${sheetData.size} | Color: ${sheetData.color}
Unit Wt: ${sheetData.defaultWtPerUnit} gm/m
---------------------------------------------
Total Cartons: ${summary.totalCtn} CTN (Active Net: ${summary.activeNetCartonCount})
Total Gross Wt: ${summary.totalGrossWt} Kg
Total Net Wt: ${summary.totalNetWt} Kg (${summary.totalNetWtLbs} Lbs / ${summary.totalNetWtGm} gm)
Total Net Wt / Carton: ${summary.totalNetWt} Kg / ${summary.totalCtn} CTN
Total Length: ${summary.totalMtr} Mtr (${summary.totalGry} Gry / ${summary.totalYds} Yds)`;

    try {
      // Ensure window is focused to prevent "Document is not focused" error
      window.focus();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard copy failed', err);
    }
  };

  const handleShareSummary = async () => {
    const text = `📦 ${sheetData.companyName || 'PACKING LIST'}
Ref: ${sheetData.ref} | Buyer: ${sheetData.buyer} | Size: ${sheetData.size} | Color: ${sheetData.color}
Unit Wt: ${sheetData.defaultWtPerUnit} gm/m
---------------------------------------------
Total Cartons: ${summary.totalCtn} CTN (Active Net: ${summary.activeNetCartonCount})
Total Gross Wt: ${summary.totalGrossWt} Kg
Total Net Wt: ${summary.totalNetWt} Kg (${summary.totalNetWtLbs} Lbs / ${summary.totalNetWtGm} gm)
Total Net Wt / Carton: ${summary.totalNetWt} Kg / ${summary.totalCtn} CTN
Total Length: ${summary.totalMtr} Mtr (${summary.totalGry} Gry / ${summary.totalYds} Yds)`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Packing Summary: ${sheetData.ref}`,
          text: text,
        });
      } catch (err: any) {
        // Ignore user cancellations
        if (err.name === 'AbortError' || err.message?.toLowerCase().includes('cancel')) {
          return;
        }
        console.error('Share failed', err);
        handleCopySummary();
      }
    } else {
      handleCopySummary();
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const result = await parseExcelOrCsvFile(buffer, sheetData);

      if (result.success && result.cartons.length > 0) {
        onImportData(result.cartons, result.importedHeader);
        alert(`Successfully imported ${result.cartons.filter(c => c.netWt > 0).length} cartons.`);
      } else {
        alert(result.message || 'Could not find carton weight data in this file.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error processing file.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                {t.appTitle}
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-medium">
                Mtr & Gry Auto-Calc
              </span>

              {/* LocalStorage & IndexedDB Saved Indicator with Tooltip */}
              <div 
                className="relative inline-block"
                onMouseEnter={() => setShowSaveTooltip(true)}
                onMouseLeave={() => setShowSaveTooltip(false)}
              >
                <button
                  onClick={() => {
                    if (onOpenIndexedDbBackups) {
                      onOpenIndexedDbBackups();
                    } else {
                      setShowSaveTooltip(prev => !prev);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-semibold transition-all duration-300 cursor-pointer border ${
                    isSaving
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/50 animate-pulse'
                      : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/60 hover:border-emerald-400/60'
                  }`}
                  title="Saved to LocalStorage & IndexedDB (Click to view snapshots)"
                >
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isSaving ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                      isSaving ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                  </span>

                  <Database className="w-3 h-3 text-emerald-400" />
                  <span className="truncate max-w-[130px] sm:max-w-none">
                    {isSaving 
                      ? (lang === 'en' ? 'Backing up...' : 'সংরক্ষণ হচ্ছে...') 
                      : getRelativeTimeString(lastSavedTime)
                    }
                  </span>
                </button>

                {/* Rich Tooltip */}
                {showSaveTooltip && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-72 p-3.5 bg-slate-950 text-slate-200 border border-slate-700 rounded-xl shadow-2xl text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        {lang === 'en' ? 'IndexedDB Auto-Backup' : 'IndexedDB অটো-ব্যাকআপ'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950 text-emerald-300 rounded border border-emerald-800 font-mono font-bold">
                        Persisted
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{lang === 'en' ? 'Last Saved:' : 'সর্বশেষ সংরক্ষণ:'}</span>
                        <span className="font-mono font-bold text-emerald-300 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getFormattedTime(lastSavedTime) || 'Just now'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{lang === 'en' ? 'Saved Cartons:' : 'সংরক্ষিত কার্টন:'}</span>
                        <span className="font-mono text-slate-200 font-bold">{summary.totalCtn} CTN</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{lang === 'en' ? 'Storage Tier:' : 'স্টোরেজ লেয়ার:'}</span>
                        <span className="font-mono text-emerald-300 font-semibold">LocalStorage + IndexedDB</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[10.5px] text-slate-400 flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-slate-400 shrink-0" />
                        {lang === 'en' ? 'Zero data loss' : 'ডাটা সুরক্ষিত'}
                      </span>
                      {onOpenIndexedDbBackups && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSaveTooltip(false);
                            onOpenIndexedDbBackups();
                          }}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10.5px] font-bold rounded shadow-xs transition cursor-pointer flex items-center gap-1"
                        >
                          <Database className="w-3 h-3" />
                          <span>{lang === 'en' ? 'Manage Backups' : 'ব্যাকআপ দেখুন'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end">
          {/* AI Scan Button */}
          <button
            onClick={onOpenAiScan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            title="Scan handwritten or printed packing list sheet using Gemini AI"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>{t.aiScanPhoto}</span>
          </button>

          {/* Bulk Import CSV/Excel Native Button */}
          <label
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-sm border border-emerald-400/30 transition cursor-pointer"
            title="Directly import CSV or Excel data"
          >
            <Upload className="w-4 h-4 text-emerald-200" />
            <span>{lang === 'en' ? 'Import Data' : 'ফাইল ইমপোর্ট'}</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              className="hidden"
            />
          </label>

          {/* OneDrive / Excel Access Button */}
          <button
            onClick={onOpenExcelDrive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-semibold shadow-sm border border-emerald-500/30 transition cursor-pointer"
            title="OneDrive & Excel Access: Import .xlsx from OneDrive or Export to Excel Online"
          >
            <Cloud className="w-4 h-4 text-sky-300" />
            <span>{lang === 'en' ? 'OneDrive & Excel' : 'ওয়ানড্রাইভ ও এক্সেল'}</span>
          </button>

          {/* Android App APK Button */}
          {onOpenApk && (
            <button
              onClick={onOpenApk}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-sm border border-emerald-400/30 transition cursor-pointer"
              title="Install App on Android Smartphone / Tablet"
            >
              <Smartphone className="w-4 h-4 text-emerald-200" />
              <span>{lang === 'en' ? 'App / APK' : 'অ্যাপ / APK'}</span>
            </button>
          )}

          {/* Tools Modal Button */}
          <button
            onClick={onOpenTools}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
            title="Garment calculation tools: Sample Wt, Reverse Calculator, Bulk Paste"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{t.utilityTools}</span>
          </button>

          {/* Share Summary */}
          <button
            onClick={handleShareSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            title="Share or Copy summary for WhatsApp / Email"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span className="text-white">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share Summary</span>
              </>
            )}
          </button>

          {/* Print */}
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.printSheet}</span>
          </button>

          {/* Formula Help */}
          <button
            onClick={onOpenHelp}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="How calculations work (Formulas)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Undo */}
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1.5 rounded-md border transition cursor-pointer flex items-center justify-center ${
                canUndo 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                  : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
              }`}
              title="Undo last change"
            >
              <Undo2 className="w-4 h-4" />
            </button>
          )}

          {/* Redo */}
          {onRedo && (
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1.5 rounded-md border transition cursor-pointer flex items-center justify-center ${
                canRedo 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                  : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
              }`}
              title="Redo last undone change"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          )}

          {/* Reset */}
          <button
            onClick={onReset}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title={t.resetDefault}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Language Switch */}
          <button
            onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold">{lang === 'en' ? 'বাংলা' : 'English'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
