import React, { useState, useRef } from 'react';
import { PackingSheetData, SummaryStats, CartonRow } from '../types/calculator';
import { Language } from '../utils/translations';
import { 
  exportPackingSheetToExcel, 
  exportPackingSheetToCsv, 
  parseExcelOrCsvFile,
  parseExcelWithWorker 
} from '../utils/export';
import { recomputeCarton, calculateSummary } from '../utils/calc';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Cloud, 
  Check, 
  AlertCircle, 
  ExternalLink, 
  X, 
  FolderSync, 
  FileText
} from 'lucide-react';

interface ExcelDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetData: PackingSheetData;
  summary: SummaryStats;
  lang: Language;
  onImportData: (importedCartons: CartonRow[], importedHeader?: Partial<PackingSheetData>) => void;
}

export const ExcelDriveModal: React.FC<ExcelDriveModalProps> = ({
  isOpen,
  onClose,
  sheetData,
  summary,
  lang,
  onImportData,
}) => {
  const [activeTab, setActiveTab] = useState<'onedrive' | 'import' | 'export'>('onedrive');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'idle'; message?: string }>({ type: 'idle' });
  const [previewData, setPreviewData] = useState<{ cartons: CartonRow[]; header?: Partial<PackingSheetData>; summary: SummaryStats } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    setImportStatus({ type: 'idle' });

    try {
      const result = await parseExcelWithWorker(file, sheetData);

      if (result.success && result.cartons && result.cartons.length > 0) {
        const defaultTare = sheetData.defaultTare ?? 0.5;
        const defaultWtPerUnit = sheetData.defaultWtPerUnit ?? 30;
        const computedCartons: CartonRow[] = result.cartons.map((c: any, idx: number) =>
          recomputeCarton(c, idx, defaultTare, defaultWtPerUnit)
        );
        while (computedCartons.length < 12) {
          const idx = computedCartons.length;
          computedCartons.push(
            recomputeCarton(
              {
                cartonNo: idx + 1,
                grossWt: 0,
                tareWt: defaultTare,
                netWt: 0,
                wtPerUnit: defaultWtPerUnit,
              },
              idx,
              defaultTare,
              defaultWtPerUnit
            )
          );
        }
        const summary = calculateSummary(computedCartons);

        setPreviewData({
          cartons: computedCartons,
          header: result.importedHeader,
          summary: result.summary || summary,
        });
        setImportStatus({
          type: 'success',
          message: `${result.message || 'Excel file parsed successfully with Web Worker'} (${result.cartons.filter((c: any) => c.grossWt > 0).length} active cartons found)`,
        });
      } else {
        setImportStatus({
          type: 'error',
          message: result.error || result.message || 'Could not find carton weight data in this file.',
        });
      }
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        message: err?.message || 'Error processing Excel file.',
      });
    }
  };

  const handleConfirmImport = () => {
    if (!previewData) return;
    onImportData(previewData.cartons, previewData.header);
    onClose();
  };

  const handleOpenOneDriveWeb = () => {
    exportPackingSheetToExcel(sheetData, summary);
    window.open('https://onedrive.live.com', '_blank');
  };

  const handleOpenExcelOnline = () => {
    exportPackingSheetToExcel(sheetData, summary);
    window.open('https://www.office.com/launch/excel', '_blank');
  };

  const handleOpenGoogleDrive = () => {
    exportPackingSheetToExcel(sheetData, summary);
    window.open('https://drive.google.com', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2 text-white">
                <span>{lang === 'en' ? 'Excel & OneDrive Access Manager' : 'এক্সেল ও ওয়ানড্রাইভ ফাইল অ্যাক্সেস'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  .XLSX & .CSV
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'en' 
                  ? 'Access, sync, import & export directly with Microsoft OneDrive, Excel & Cloud storage' 
                  : 'মাইক্রোসফট ওয়ানড্রাইভ ও এক্সেল ফাইলের সাথে সরাসরি সিঙ্ক ও ইমপোর্ট/এক্সপোর্ট'}
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('onedrive')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'onedrive'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cloud className="w-4 h-4 text-sky-600" />
            <span>{lang === 'en' ? 'OneDrive & Cloud Access' : 'ওয়ানড্রাইভ ও ক্লাউড ড্রাইভ'}</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'import'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'en' ? 'Import Excel (.xlsx/.csv)' : 'এক্সেল ফাইল আপলোড'}</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'export'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4 text-amber-600" />
            <span>{lang === 'en' ? 'Export Native .XLSX' : 'এক্সেল .XLSX ডাউনলোড'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: ONEDRIVE & CLOUD DRIVE ACCESS */}
          {activeTab === 'onedrive' && (
            <div className="space-y-4">
              {/* Quick Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Microsoft OneDrive Direct */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-sky-400 transition">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Microsoft OneDrive
                      </h4>
                      <p className="text-xs text-slate-500">
                        {lang === 'en' 
                          ? 'Open, upload & sync live Excel sheets in your OneDrive account' 
                          : 'আপনার ওয়ানড্রাইভ একাউন্টে এক্সেল শিট আপলোড ও সিঙ্ক করুন'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleOpenOneDriveWeb}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
                  >
                    <span>{lang === 'en' ? 'Download & Open in OneDrive' : 'ডাউনলোড করে ওয়ানড্রাইভে খুলুন'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 2. Excel Online */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-400 transition">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Microsoft Excel Online
                      </h4>
                      <p className="text-xs text-slate-500">
                        {lang === 'en' 
                          ? 'Edit online in Office 365 spreadsheet viewer with full formula support' 
                          : 'অফিস ৩৬৫ এক্সেল অনলাইনে সরাসরি ওপেন ও এডিট করুন'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleOpenExcelOnline}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
                  >
                    <span>{lang === 'en' ? 'Export & Open Excel Online' : 'এক্সেল অনলাইনে খুলুন'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Local Sync / OneDrive Folder Guide */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="flex items-center gap-2 mb-2">
                  <FolderSync className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {lang === 'en' ? 'How Automatic OneDrive Folder Sync Works:' : 'ওয়ানড্রাইভ ফোল্ডার সিঙ্ক পদ্ধতি:'}
                  </h4>
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li>
                    {lang === 'en' 
                      ? 'When you click "Export Native .XLSX", save the file directly to your synced PC OneDrive folder (e.g. OneDrive - Documents).'
                      : 'এক্সেল ডাউনলোড করার সময় আপনার পিসির সিঙ্ক করা OneDrive ফোল্ডারে সেভ করুন।'}
                  </li>
                  <li>
                    {lang === 'en' 
                      ? 'OneDrive will automatically upload and sync the workbook across your mobile, tablet, and office computers in real time.'
                      : 'ওয়ানড্রাইভ স্বয়ংক্রিয়ভাবে ক্লাউডে আপলোড করবে এবং মোবাইল/ট্যাবলেটে সরাসরি দেখা যাবে।'}
                  </li>
                  <li>
                    {lang === 'en' 
                      ? 'You can also drag and drop any Excel file from your OneDrive folder into the "Import Excel" tab to load it instantly into this app!'
                      : 'আপনার ওয়ানড্রাইভ থেকে যেকোনো এক্সেল ফাইল টেনে এই অ্যাপের "Import Excel" ট্যাবে ছেড়ে দিলে সাথে সাথে হিসাব লোড হয়ে যাবে!'}
                  </li>
                </ul>
              </div>

              {/* Google Drive Option */}
              <div className="flex items-center justify-between p-3.5 border border-slate-200 rounded-xl bg-slate-50 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    G
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Google Drive & Google Sheets</span>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'en' ? 'Also fully compatible with Google Drive & Google Sheets' : 'গুগল ড্রাইভ ও গুগল শিটসেও শতভাগ কাজ করে'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleOpenGoogleDrive}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <span>Google Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT EXCEL / CSV */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {/* Drag and Drop Zone */}
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {lang === 'en' ? 'Click to browse or Drag & Drop Excel File' : 'এক্সেল ফাইল নির্বাচন করতে ক্লিক করুন বা ড্র্যাগ করে ছাড়ুন'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Supports Microsoft Excel (<code className="font-mono text-emerald-600 font-bold">.xlsx</code>, <code className="font-mono text-emerald-600 font-bold">.xls</code>) & CSV
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-2 px-4 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg shadow-xs"
                >
                  {lang === 'en' ? 'Choose Excel File from OneDrive / Computer' : 'কম্পিউটার বা ওয়ানড্রাইভ থেকে ফাইল বাছুন'}
                </button>
              </div>

              {/* Status Notice */}
              {importStatus.type === 'error' && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{importStatus.message}</span>
                </div>
              )}

              {importStatus.type === 'success' && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-semibold">{importStatus.message}</span>
                </div>
              )}

              {/* Preview Box If Data Extracted */}
              {previewData && (
                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase">
                      {lang === 'en' ? 'Excel Import Preview:' : 'ইমপোর্ট প্রিভিউ:'}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                      {previewData.summary.totalNetWt.toFixed(2)} Kg Net Wt | {previewData.summary.totalCtn} CTN
                    </span>
                  </div>

                  {previewData.header && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-500 block">REF:</span>
                        <span className="font-bold font-mono text-slate-800">{previewData.header.ref || sheetData.ref}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Buyer:</span>
                        <span className="font-bold text-slate-800">{previewData.header.buyer || sheetData.buyer}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Customer:</span>
                        <span className="font-bold text-slate-800">{previewData.header.customer || sheetData.customer}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Unit Wt:</span>
                        <span className="font-bold font-mono text-slate-800">{previewData.header.defaultWtPerUnit || sheetData.defaultWtPerUnit} gm</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setPreviewData(null)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg"
                    >
                      {lang === 'en' ? 'Cancel' : 'বাতিল'}
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Apply & Load into App' : 'অ্যাপে ডাটা লোড করুন'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXPORT NATIVE .XLSX */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
                      XLS
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase font-mono">
                        {sheetData.ref || 'Packing_List'}.xlsx
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {summary.totalCtn} Cartons • {summary.totalNetWt.toFixed(2)} Kg Net Wt • Multi-Sheet Workbook
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold bg-emerald-100 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 rounded-lg">
                    Ready
                  </span>
                </div>

                <div className="text-xs text-slate-700 space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                  <p className="font-semibold text-slate-800">Included Sheets in Workbook:</p>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
                    <span className="px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200">1. Packing List</span>
                    <span className="px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200">2. Net Weight Summary</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <button
                    onClick={() => exportPackingSheetToExcel(sheetData, summary)}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{lang === 'en' ? 'Download Excel (.xlsx)' : 'এক্সেল (.xlsx) ডাউনলোড'}</span>
                  </button>

                  <button
                    onClick={() => exportPackingSheetToCsv(sheetData, summary)}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>{lang === 'en' ? 'Download CSV Format' : 'CSV ফরম্যাট ডাউনলোড'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>{lang === 'en' ? 'Microsoft OneDrive & Office 365 Compatible' : 'মাইক্রোসফট ওয়ানড্রাইভ ও অফিস ৩৬৫ সাপোর্টেড'}</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition cursor-pointer shadow-xs"
          >
            {lang === 'en' ? 'Close' : 'বন্ধ করুন'}
          </button>
        </div>
      </div>
    </div>
  );
};
