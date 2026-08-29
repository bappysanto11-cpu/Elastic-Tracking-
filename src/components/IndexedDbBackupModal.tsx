import React, { useState, useEffect } from 'react';
import { 
  Database, 
  RotateCcw, 
  Trash2, 
  Plus, 
  X, 
  Check, 
  Clock, 
  ShieldCheck, 
  Download, 
  Upload,
  HardDrive,
  Layers,
  AlertCircle,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import { Language } from '../utils/translations';
import { PackingSheetData } from '../types/calculator';
import { 
  BackupRecord, 
  getAllIndexedDbBackups, 
  triggerIndexedDbBackup, 
  deleteIndexedDbBackup, 
  clearAllIndexedDbBackups,
  getIndexedDbStats 
} from '../utils/indexedDbBackup';

interface IndexedDbBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  currentSheetData: PackingSheetData;
  onRestoreBackup: (restoredData: PackingSheetData) => void;
}

export const IndexedDbBackupModal: React.FC<IndexedDbBackupModalProps> = ({
  isOpen,
  onClose,
  lang,
  currentSheetData,
  onRestoreBackup,
}) => {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<{ count: number; lastBackupDate: Date | null; estimatedSizeKb: number }>({
    count: 0,
    lastBackupDate: null,
    estimatedSizeKb: 0,
  });
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null);
  const [snapshotLabel, setSnapshotLabel] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const records = await getAllIndexedDbBackups();
      setBackups(records);
      const st = await getIndexedDbStats();
      setStats(st);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBackups();
      setSelectedBackup(null);
      setActionSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateSnapshot = async () => {
    const label = snapshotLabel.trim() || undefined;
    const res = await triggerIndexedDbBackup(currentSheetData, 'manual', label);
    if (res) {
      setSnapshotLabel('');
      setActionSuccess(lang === 'en' ? 'Snapshot saved to IndexedDB!' : 'স্ন্যাপশট সংরক্ষিত হয়েছে!');
      setTimeout(() => setActionSuccess(null), 3000);
      loadBackups();
    }
  };

  const handleRestore = (record: BackupRecord) => {
    if (
      window.confirm(
        lang === 'en'
          ? `Are you sure you want to restore the backup from ${record.dateFormatted} (${record.totalCtn} cartons)? Current unsaved edits will be replaced.`
          : `আপনি কি ${record.dateFormatted} এর ব্যাকআপটি (${record.totalCtn} কার্টন) রিস্টোর করতে চান?`
      )
    ) {
      onRestoreBackup(record.sheetData);
      setActionSuccess(lang === 'en' ? 'Backup restored successfully!' : 'ব্যাকআপ সফলভাবে রিস্টোর হয়েছে!');
      setTimeout(() => {
        onClose();
      }, 700);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (window.confirm(lang === 'en' ? 'Delete this backup record?' : 'এই ব্যাকআপ রেকর্ডটি মুছে ফেলবেন?')) {
      await deleteIndexedDbBackup(id);
      if (selectedBackup?.id === id) {
        setSelectedBackup(null);
      }
      loadBackups();
    }
  };

  const handleClearAll = async () => {
    if (
      window.confirm(
        lang === 'en'
          ? 'Are you sure you want to clear all IndexedDB backup history? This cannot be undone.'
          : 'আপনি কি নিশ্চিত সব IndexedDB ব্যাকআপ হিস্ট্রি মুছে ফেলবেন?'
      )
    ) {
      await clearAllIndexedDbBackups();
      setSelectedBackup(null);
      loadBackups();
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(backups, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IndexedDB_ElasticPacking_Backups_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900 animate-in fade-in zoom-in-95 duration-150 my-auto">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {lang === 'en' ? 'IndexedDB Robust Persistence & Auto-Backups' : 'IndexedDB অটো ব্যাকআপ ও রিস্টোর'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  IndexedDB v1
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'en'
                  ? 'High-capacity, fault-tolerant browser storage keeping historical snapshots'
                  : 'ব্রাউজারের হাই-ক্যাপাসিটি ডাটাবেজ ব্যাকআপ যা ডাটা পুরোপুরি সুরক্ষিত রাখে'}
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

        {/* Status Bar */}
        <div className="bg-slate-950 px-5 py-3 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-emerald-300">
                {lang === 'en' ? 'Auto-Backup Active' : 'অটো ব্যাকআপ সক্রিয়'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-slate-400">
              <HardDrive className="w-3.5 h-3.5" />
              <span>{stats.count} Snapshots (~{stats.estimatedSizeKb} KB)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              disabled={backups.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs rounded border border-slate-700 transition cursor-pointer"
              title="Download all backups as JSON file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Export JSON' : 'এক্সপোর্ট JSON'}</span>
            </button>
            {backups.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 px-2.5 py-1 bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-xs rounded border border-rose-800 transition cursor-pointer"
                title="Clear all backup snapshots"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Clear History' : 'হিস্ট্রি মুছুন'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {actionSuccess && (
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Main Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Manual Snapshot Trigger Box */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-center sm:text-left">
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                {lang === 'en' ? 'Create Instant Snapshot Point' : 'ম্যানুয়াল স্ন্যাপশট ব্যাকআপ নিন'}
              </h4>
              <p className="text-xs text-emerald-800">
                {lang === 'en'
                  ? 'Capture the exact current sheet state into IndexedDB with an optional custom label.'
                  : 'বর্তমান প্যাকিং শিটের সঠিক ডাটা IndexedDB তে আলাদা পয়েন্ট হিসেবে সেভ করুন।'}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={snapshotLabel}
                onChange={e => setSnapshotLabel(e.target.value)}
                placeholder={lang === 'en' ? 'Label (e.g. Before Buyer Edit)...' : 'লেবেল (যেমন: এডিটের আগে)...'}
                className="px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-56"
              />
              <button
                onClick={handleCreateSnapshot}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm shrink-0 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Save Snapshot' : 'স্ন্যাপশট নিন'}</span>
              </button>
            </div>
          </div>

          {/* Backup List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                {lang === 'en' ? 'IndexedDB Backup History' : 'স্বয়ংক্রিয় ব্যাকআপের তালিকা'}
              </h4>
              <span className="text-xs text-slate-500">
                {backups.length} {lang === 'en' ? 'stored' : 'টি সেভ করা'}
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {lang === 'en' ? 'Loading IndexedDB records...' : 'লোড হচ্ছে...'}
              </div>
            ) : backups.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
                <Database className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">
                  {lang === 'en' ? 'No IndexedDB backups recorded yet.' : 'এখনো কোনো ব্যাকআপ তৈরি হয়নি।'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {lang === 'en' 
                    ? 'As you add cartons or update order details, automatic snapshots will be safely archived here.'
                    : 'ডাটা ইনপুট করার সাথে সাথে স্বয়ংক্রিয়ভাবে এখানে ব্যাকআপ জমা হবে।'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs max-h-80 overflow-y-auto">
                {backups.map((record, index) => {
                  const isLatest = index === 0;
                  return (
                    <div
                      key={record.id || index}
                      className="p-3 hover:bg-slate-50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            record.source === 'manual' 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {record.source === 'manual' ? 'MANUAL' : 'AUTO-SAVE'}
                          </span>

                          {isLatest && (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              LATEST
                            </span>
                          )}

                          <span className="text-xs font-bold text-slate-800">
                            {record.ref ? `REF: ${record.ref}` : 'Untitled Packing'}
                          </span>

                          {record.label && (
                            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                              "{record.label}"
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-mono">
                          <span className="text-slate-700 font-semibold">{record.dateFormatted}</span>
                          <span>•</span>
                          <span>Buyer: <strong className="text-slate-800">{record.buyer || 'N/A'}</strong></span>
                          <span>•</span>
                          <span>Cartons: <strong className="text-emerald-700">{record.totalCtn} CTN</strong></span>
                          <span>•</span>
                          <span>Net: <strong className="text-indigo-700">{record.totalNetWt.toFixed(2)} Kg</strong></span>
                          <span>•</span>
                          <span>Mtr: <strong className="text-purple-700">{record.totalMtr.toFixed(2)} m</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => handleRestore(record)}
                          className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-xs transition cursor-pointer"
                          title="Restore this backup data into the active editor"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{lang === 'en' ? 'Restore' : 'রিস্টোর'}</span>
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete this snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Storage Architecture Info */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1.5">
            <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              {lang === 'en' ? 'Why IndexedDB Persistence?' : 'IndexedDB ব্যাকআপের সুবিধা কী?'}
            </h5>
            <p className="text-[11.5px] leading-relaxed text-slate-600">
              {lang === 'en'
                ? 'Standard localStorage is limited to ~5MB and can be easily cleared by browser cache cleaners. IndexedDB provides a multi-megabyte transactional database directly on your device, ensuring zero data loss and automated revision history for your garment packing orders.'
                : 'সাধারণ localStorage এ মাত্র ৫ এমবি জায়গা থাকে এবং ব্রাউজার হিস্ট্রি ক্লিয়ার করলে ডাটা মুছে যেতে পারে। কিন্তু IndexedDB সরাসরি আপনার ডিভাইসে একটি নিরাপদ ডাটাবেজ তৈরি করে যাতে প্রতিটি কাজের ব্যাকআপ সংরক্ষিত থাকে।'}
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono">
            IndexedDB Engine: Active & Persistent
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition cursor-pointer"
          >
            {lang === 'en' ? 'Close' : 'বন্ধ করুন'}
          </button>
        </div>

      </div>
    </div>
  );
};
