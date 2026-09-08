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
  CloudOff,
  Smartphone,
  HardDrive,
  CheckCircle2,
  Clock,
  Database,
  Upload,
  Undo2,
  Redo2,
  LogIn,
  User,
  ShieldCheck,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  QrCode,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Language, translations } from '../utils/translations';
import { Folder, Activity } from 'lucide-react';
import { getWorkspaces, DEFAULT_WORKSPACE_ID } from '../utils/workspaceManager';
import { PackingSheetData, SummaryStats, CartonRow } from '../types/calculator';
import { parseExcelOrCsvFile } from '../utils/export';
import { useAuth } from '../context/AuthContext';
import { SyncStatus } from '../hooks/useRealtimeSync';
import { BrandTitle3D } from './BrandTitle3D';

interface HeaderProps {
  lang: Language;
  setLang: (lang: Language) => void;
  onOpenAiScan?: () => void;
  onOpenHelp: () => void;
  onOpenActivityLog?: () => void;
  onOpenTools: () => void;
  onOpenScheduleUpload?: () => void;
  onOpenExcelDrive: () => void;
  onOpenCloudSync: () => void;
  onOpenWorkspaces?: () => void;
  activeWorkspaceId?: string;
  onOpenApk?: () => void;
  onOpenIndexedDbBackups?: () => void;
  onOpenAuthModal?: () => void;
  onOpenShareSheet?: () => void;
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
  // Realtime Sync & Online/Offline props
  isOnline?: boolean;
  syncStatus?: SyncStatus;
  lastCloudSyncTime?: Date | null;
  pendingOfflineChanges?: boolean;
  onManualSync?: () => Promise<boolean>;
  onToggleWeightUnit?: () => void;
  weightUnit?: 'kg' | 'gm';
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  setLang,
  onOpenAiScan,
  onOpenHelp,
  onOpenTools,
  onOpenScheduleUpload,
  onOpenActivityLog,
  onOpenExcelDrive,
  onOpenCloudSync,
  onOpenApk,
  onOpenIndexedDbBackups,
  onOpenAuthModal,
  onOpenShareSheet,
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
  isOnline = true,
  syncStatus = 'local_only',
  lastCloudSyncTime = null,
  pendingOfflineChanges = false,
  onManualSync,
  onToggleWeightUnit,
  weightUnit = 'kg',
}) => {
  const [copied, setCopied] = useState(false);
  const [showSaveTooltip, setShowSaveTooltip] = useState(false);
  const [showSyncTooltip, setShowSyncTooltip] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [, setTick] = useState(0);
  const t = translations[lang];
  const { user } = useAuth();

  // Header Hide / Collapse state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('garment_header_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('garment_header_collapsed', String(next));
      } catch {}
      return next;
    });
  };

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

    if (diffSec < 4) return lang === 'en' ? 'Just now' : 'এখনই';
    if (diffSec < 60) return lang === 'en' ? `${diffSec}s ago` : `${diffSec} সেকেন্ড আগে`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return lang === 'en' ? `${diffMin}m ago` : `${diffMin} মিনিট আগে`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFormattedTime = (date: Date | null | undefined): string => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const handleManualSyncClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onManualSync || isManualSyncing) return;
    setIsManualSyncing(true);
    try {
      await onManualSync();
    } finally {
      setTimeout(() => setIsManualSyncing(false), 600);
    }
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
        return;
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message?.toLowerCase().includes('cancel')) {
          return;
        }
        console.warn('Share not allowed or failed, falling back to copy', err);
      }
    }
    handleCopySummary();
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

  if (isCollapsed) {
    return (
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
          {/* Left: Brand / Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandTitle3D title={t.appTitle} isCollapsed={true} />
            <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} title={isOnline ? 'Online' : 'Offline'} />
          </div>

          {/* Right: Quick actions + Expand Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onUndo && (
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                  canUndo ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
                }`}
                title="Undo"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onRedo && (
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                  canRedo ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
                }`}
                title="Redo"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onPrint}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs border border-emerald-500 transition cursor-pointer"
              title={t.printSheet}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.printSheet}</span>
            </button>
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition cursor-pointer"
            >
              {lang === 'en' ? 'বাংলা' : 'EN'}
            </button>
            <button
              type="button"
              onClick={toggleCollapse}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              title={lang === 'en' ? 'Expand header' : 'হেডার খুলুন'}
            >
              <span>{lang === 'en' ? 'Expand' : 'খুলুন'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Left: Brand / Title & Status Indicators */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <BrandTitle3D title={t.appTitle} />

              {/* Online / Offline & Realtime Sync Status Badge */}
              <div 
                className="relative inline-block"
                onMouseEnter={() => setShowSyncTooltip(true)}
                onMouseLeave={() => setShowSyncTooltip(false)}
              >
                <button
                  type="button"
                  onClick={() => setShowSyncTooltip(prev => !prev)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-mono font-semibold transition-all duration-300 cursor-pointer border shadow-[0_2px_10px_rgba(0,0,0,0.3)] backdrop-blur-md ${
                    !isOnline || syncStatus === 'offline'
                      ? 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900/60 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : syncStatus === 'syncing' || isManualSyncing
                      ? 'bg-cyan-950/70 text-cyan-200 border-cyan-400/50 animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                      : syncStatus === 'synced'
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50 hover:border-emerald-400/60 hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                      : syncStatus === 'error'
                      ? 'bg-rose-950/70 text-rose-300 border-rose-500/50 hover:bg-rose-900/60 hover:shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                      : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08]'
                  }`}
                  title="Real-time network and Firestore sync status"
                >
                  {/* Glowing Status Dot */}
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      !isOnline || syncStatus === 'offline'
                        ? 'bg-amber-400'
                        : syncStatus === 'syncing' || isManualSyncing
                        ? 'bg-cyan-400'
                        : syncStatus === 'synced'
                        ? 'bg-emerald-400'
                        : 'bg-emerald-400'
                    }`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                      !isOnline || syncStatus === 'offline'
                        ? 'bg-amber-500'
                        : syncStatus === 'syncing' || isManualSyncing
                        ? 'bg-cyan-400'
                        : syncStatus === 'synced'
                        ? 'bg-emerald-500'
                        : 'bg-emerald-500'
                    }`} />
                  </span>

                  {/* Icon */}
                  {!isOnline ? (
                    <WifiOff className="w-3 h-3 text-amber-400" />
                  ) : syncStatus === 'syncing' || isManualSyncing ? (
                    <RefreshCw className="w-3 h-3 text-cyan-300 animate-spin" />
                  ) : syncStatus === 'synced' ? (
                    <Cloud className="w-3 h-3 text-emerald-400" />
                  ) : syncStatus === 'offline' ? (
                    <CloudOff className="w-3 h-3 text-amber-400" />
                  ) : syncStatus === 'error' ? (
                    <AlertCircle className="w-3 h-3 text-rose-400" />
                  ) : (
                    <Wifi className="w-3 h-3 text-emerald-400" />
                  )}

                  {/* Text Label */}
                  <span className="truncate max-w-[130px] sm:max-w-none">
                    {!isOnline
                      ? (lang === 'en' ? 'Offline · Local' : 'অফলাইন · লোকাল')
                      : syncStatus === 'syncing' || isManualSyncing
                      ? (lang === 'en' ? 'Syncing...' : 'সিঙ্ক হচ্ছে...')
                      : syncStatus === 'synced'
                      ? (lang === 'en' ? 'Online · Synced' : 'অনলাইন · সিঙ্কড')
                      : syncStatus === 'offline'
                      ? (lang === 'en' ? 'Offline · Queued' : 'অফলাইন · সংরক্ষিত')
                      : syncStatus === 'error'
                      ? (lang === 'en' ? 'Sync Retry' : 'সিঙ্ক রিট্রাই')
                      : (lang === 'en' ? 'Online · Local' : 'অনলাইন · লোকাল')}
                  </span>
                </button>

                {/* Rich Real-Time Sync Tooltip */}
                {showSyncTooltip && (
                  <div className="absolute left-0 top-full mt-2 z-50 w-80 p-4 bg-slate-900 text-slate-200 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        {isOnline ? (
                          <Wifi className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-amber-400" />
                        )}
                        {lang === 'en' ? 'Real-Time Sync Engine' : 'রিয়েল-টাইম সিঙ্ক ইঞ্জিন'}
                      </span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border backdrop-blur-md ${
                        isOnline 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {isOnline ? (lang === 'en' ? 'ONLINE' : 'অনলাইন') : (lang === 'en' ? 'OFFLINE' : 'অফলাইন')}
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px] text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{lang === 'en' ? 'Network Connection:' : 'নেটওয়ার্ক সংযোগ:'}</span>
                        <span className={`font-mono font-bold flex items-center gap-1 ${
                          isOnline ? 'text-emerald-300' : 'text-amber-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          {isOnline ? (lang === 'en' ? 'Active' : 'সক্রিয়') : (lang === 'en' ? 'Disconnected' : 'বিচ্ছিন্ন')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{lang === 'en' ? 'Firestore Cloud Sync:' : 'ফায়ারস্টোর ক্লাউড সিঙ্ক:'}</span>
                        <span className="font-mono font-semibold text-slate-200 flex items-center gap-1">
                          {user ? (
                            syncStatus === 'synced' ? (
                              <span className="text-emerald-300 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                {lang === 'en' ? 'Real-Time Active' : 'রিয়েল-টাইম সক্রিয়'}
                              </span>
                            ) : syncStatus === 'syncing' ? (
                              <span className="text-cyan-300 font-bold flex items-center gap-1">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                {lang === 'en' ? 'Pushing edits...' : 'সিঙ্ক করা হচ্ছে...'}
                              </span>
                            ) : (
                              <span className="text-amber-300 font-bold">
                                {pendingOfflineChanges ? (lang === 'en' ? 'Queued (Offline)' : 'কিউ করা আছে') : (lang === 'en' ? 'Offline' : 'অফলাইন')}
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 font-medium">
                              {lang === 'en' ? 'Local Only (Sign in to sync)' : 'শুধুমাত্র লোকাল (সিঙ্ক করতে লগইন করুন)'}
                            </span>
                          )}
                        </span>
                      </div>

                      {user && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">{lang === 'en' ? 'Last Cloud Synced:' : 'সর্বশেষ ক্লাউড সিঙ্ক:'}</span>
                          <span className="font-mono font-bold text-emerald-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {lastCloudSyncTime ? getRelativeTimeString(lastCloudSyncTime) : (lang === 'en' ? 'Pending' : 'অপেক্ষমান')}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{lang === 'en' ? 'Offline Safety:' : 'অফলাইন নিরাপত্তা:'}</span>
                        <span className="font-mono text-emerald-300 font-semibold">LocalStorage + IndexedDB</span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-slate-400 shrink-0" />
                        {lang === 'en' ? 'Immediate auto-push on edit' : 'এডিট করলেই অটো-সিঙ্ক'}
                      </span>

                      {user && onManualSync ? (
                        <button
                          type="button"
                          onClick={handleManualSyncClick}
                          disabled={isManualSyncing || !isOnline}
                          className="px-3 py-1 bg-indigo-600/90 hover:bg-indigo-500 disabled:bg-slate-800/80 disabled:text-slate-500 text-white text-[10.5px] font-bold rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.3)] transition cursor-pointer flex items-center gap-1.5 border border-indigo-400/30"
                        >
                          <RefreshCw className={`w-3 h-3 ${isManualSyncing ? 'animate-spin text-cyan-300' : ''}`} />
                          <span>{isManualSyncing ? (lang === 'en' ? 'Syncing...' : 'সিঙ্ক হচ্ছে...') : t.syncNowBtn}</span>
                        </button>
                      ) : onOpenAuthModal ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSyncTooltip(false);
                            onOpenAuthModal();
                          }}
                          className="px-2.5 py-1 bg-indigo-600/90 hover:bg-indigo-500 text-white text-[10.5px] font-bold rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.3)] transition cursor-pointer flex items-center gap-1 border border-indigo-400/30"
                        >
                          <LogIn className="w-3 h-3" />
                          <span>{lang === 'en' ? 'Sign In' : 'লগইন'}</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              {/* LocalStorage & IndexedDB Saved Indicator with Tooltip */}
              <div 
                className="relative inline-block"
                onMouseEnter={() => setShowSaveTooltip(true)}
                onMouseLeave={() => setShowSaveTooltip(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenIndexedDbBackups) {
                      onOpenIndexedDbBackups();
                    } else {
                      setShowSaveTooltip(prev => !prev);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold transition-all duration-300 cursor-pointer border shadow-[0_2px_10px_rgba(0,0,0,0.3)] backdrop-blur-md ${
                    isSaving
                      ? 'bg-amber-950/60 text-amber-300 border-amber-500/40 animate-pulse'
                      : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08] hover:border-white/20 hover:text-white'
                  }`}
                  title="Saved to LocalStorage & IndexedDB (Click to view snapshots)"
                >
                  <Database className="w-3 h-3 text-emerald-400" />
                  <span className="truncate max-w-[110px] sm:max-w-none">
                    {isSaving 
                      ? (lang === 'en' ? 'Saving...' : 'সংরক্ষণ...') 
                      : (lang === 'en' ? 'IndexedDB' : 'লোকাল')}
                  </span>
                </button>

                {/* Rich Tooltip */}
                {showSaveTooltip && (
                  <div className="absolute left-0 top-full mt-2 z-50 w-72 p-4 bg-slate-900 text-slate-200 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        {lang === 'en' ? 'IndexedDB Auto-Backup' : 'IndexedDB অটো-ব্যাকআপ'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/40 font-mono font-bold">
                        Persisted
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px] text-slate-300">
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

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                      <span className="text-[10.5px] text-slate-400 flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-slate-400 shrink-0" />
                        {lang === 'en' ? 'Zero data loss' : 'ডাটা সুরক্ষিত'}
                      </span>
                      {onOpenIndexedDbBackups && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSaveTooltip(false);
                            onOpenIndexedDbBackups();
                          }}
                          className="px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white text-[10.5px] font-bold rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition cursor-pointer flex items-center gap-1 border border-emerald-400/30"
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
          {/* User Account / Google Login Button */}
          {onOpenAuthModal && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs border transition-all cursor-pointer ${
                user 
                  ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500'
              }`}
              title={user ? `Signed in as ${user.displayName || user.email}` : 'Sign in with Google or Email'}
            >
              {user ? (
                <>
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="User avatar" 
                      className="w-4 h-4 rounded-full border border-indigo-400 object-cover shadow-xs" 
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="max-w-[80px] sm:max-w-[120px] truncate">
                    {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'User'}
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} title={isOnline ? "Cloud Active" : "Offline Mode"} />
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{t.loginAccount}</span>
                </>
              )}
            </button>
          )}

          {/* Upload Schedule & Excel Tracker Button */}
          {onOpenScheduleUpload && (
            <button
              type="button"
              onClick={onOpenScheduleUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs border border-blue-400 transition-all cursor-pointer ring-2 ring-blue-400/20"
              title="Upload Excel Schedule & Track/Edit Orders (এক্সেল শিডিউল আপলোড ও এডিটর)"
            >
              <Upload className="w-3.5 h-3.5 text-blue-100 animate-bounce" />
              <span>{lang === 'en' ? 'Upload Schedule' : 'শিডিউল আপলোড'}</span>
              <span className="hidden xl:inline text-[9px] bg-blue-800/80 px-1 py-0.2 rounded font-mono text-blue-200">
                Excel
              </span>
            </button>
          )}

          {/* OneDrive / Excel Access Button */}
          <button
            type="button"
            onClick={onOpenExcelDrive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs border border-emerald-600 transition-all cursor-pointer"
            title="OneDrive & Excel Access: Import .xlsx from OneDrive or Export to Excel Online"
          >
            <Cloud className="w-4 h-4 text-sky-200" />
            <span>{lang === 'en' ? 'OneDrive & Excel' : 'ওয়ানড্রাইভ ও এক্সেল'}</span>
          </button>

          {/* Android App APK Button */}
          {onOpenApk && (
            <button
              type="button"
              onClick={onOpenApk}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs border border-emerald-700 transition-all cursor-pointer"
              title="Install App on Android Smartphone / Tablet"
            >
              <Smartphone className="w-4 h-4 text-emerald-200" />
              <span>{lang === 'en' ? 'App / APK' : 'অ্যাপ / APK'}</span>
            </button>
          )}

          {/* Tools Modal Button */}
          <button
            type="button"
            onClick={onOpenTools}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium transition cursor-pointer shadow-xs"
            title="Garment calculation tools: Sample Wt, Reverse Calculator, Bulk Paste"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{t.utilityTools}</span>
          </button>

          {/* Share Summary */}
          <button
            type="button"
            onClick={handleShareSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs border border-indigo-500 transition-all cursor-pointer"
            title="Share or Copy summary for WhatsApp / Email"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span className="text-white">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share Summary</span>
              </>
            )}
          </button>

          {/* Share QR */}
          {onOpenShareSheet && (
            <button
              type="button"
              onClick={onOpenShareSheet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-xs border border-violet-500 transition-all cursor-pointer"
              title="Generate a QR code to share this sheet data"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share QR</span>
            </button>
          )}

          {/* Print */}
          <button
            type="button"
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs border border-emerald-500 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.printSheet}</span>
          </button>

          {/* Formula Help */}
          <button
            type="button"
            onClick={onOpenHelp}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
            title="How calculations work (Formulas)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Undo */}
          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-2 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                canUndo 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700' 
                  : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
              }`}
              title="Undo last change"
            >
              <Undo2 className="w-4 h-4" />
            </button>
          )}

          {/* Redo */}
          {onRedo && (
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-2 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                canRedo 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700' 
                  : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
              }`}
              title="Redo last undone change"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          )}

          {/* Reset */}
          <button
            type="button"
            onClick={onReset}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
            title={t.resetDefault}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Weight Unit Toggle */}
          {onToggleWeightUnit && (
            <button
              type="button"
              onClick={onToggleWeightUnit}
              className="flex items-center justify-center min-w-[38px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition cursor-pointer"
              title={lang === 'en' ? 'Toggle unit between KG and GM' : 'KG এবং GM এর মাঝে পরিবর্তন করুন'}
            >
              {weightUnit === 'gm' ? 'GM' : 'KG'}
            </button>
          )}

          {/* Language Switch */}
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold">{lang === 'en' ? 'বাংলা' : 'English'}</span>
          </button>

          {/* Hide Header Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition cursor-pointer"
            title={lang === 'en' ? 'Hide header bar' : 'হেডার লুকান'}
          >
            <span>{lang === 'en' ? 'Hide' : 'লুকান'}</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
