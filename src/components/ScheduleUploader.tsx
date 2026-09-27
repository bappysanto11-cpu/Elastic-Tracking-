import React, { useState } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ScheduleItem } from '../types/schedule';
import { saveDailySchedule } from '../utils/scheduleStorage';

interface ScheduleUploaderProps {
  onUploadSuccess?: (items: ScheduleItem[]) => void;
}

export const ScheduleUploader: React.FC<ScheduleUploaderProps> = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ScheduleItem[]>([]);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const file = e.target.files[0];
    setSelectedFile(file);
    setError(null);
    setPreview([]);
    setSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target?.result);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);

        if (data.length === 0) {
          setError('❌ Excel file is empty');
          return;
        }

        const items: ScheduleItem[] = data.map((row: any, index: number) => ({
          id: `schedule-${Date.now()}-${index}`,
          date: new Date().toISOString().split('T')[0],
          buyer: row['Buyer'] || '',
          customer: row['Customer'] || '',
          jobNo: row['Job No'] || '',
          customerRefPO: row['Customer Ref/PO'] || '',
          woNumber: row['WO Number'] || '',
          itemDescription: row['Item Description'] || '',
          color: row['Color'] || '',
          size: row['Size'] || '',
          orderQty: Number(row['Order Qty']) || 0,
          unit: row['Unit'] || 'Mtr',
          balanceQty: Number(row['Balance qty']) || 0,
          demandQty: Number(row['Demand Qty']) || 0,
          completedQty: 0,
          status: 'pending' as const,
          progress: 0,
          notes: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        setPreview(items);
      } catch (err: any) {
        setError(`❌ Error reading file: ${err.message}`);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    if (preview.length === 0) {
      setError('❌ No valid data to upload');
      return;
    }

    setLoading(true);
    try {
      await saveDailySchedule(preview);
      setSuccess(true);
      setSelectedFile(null);
      
      if (onUploadSuccess) {
        onUploadSuccess(preview);
      }

      setTimeout(() => {
        setPreview([]);
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(`❌ Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-neutral-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white text-base sm:text-lg font-bold flex items-center gap-2">
                Daily Schedule Upload
              </h2>
              <p className="text-neutral-400 text-xs mt-0.5">
                Upload Excel file with buyer details, order quantities, and demands
              </p>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div className="p-6 border-b border-neutral-200">
          <label className="flex flex-col items-center justify-center px-6 py-8 border-2 border-dashed border-neutral-300 rounded-xl bg-neutral-50/50 cursor-pointer hover:border-neutral-900 hover:bg-neutral-50 transition">
            <div className="w-12 h-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-800 mb-3 shadow-2xs">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-neutral-800 font-bold text-sm">
              {selectedFile ? selectedFile.name : 'Choose Excel File (.xlsx)'}
            </p>
            <p className="text-neutral-500 text-xs mt-1">Drag and drop or click to browse</p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {error && (
            <div className="mt-4 flex items-center gap-2 bg-neutral-100 border border-neutral-300 text-neutral-900 px-4 py-3 rounded-xl text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-neutral-800 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-4 flex items-center gap-2 bg-neutral-900 text-white px-4 py-3 rounded-xl text-xs font-semibold shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
              <span>Schedule uploaded and stored successfully!</span>
            </div>
          )}
        </div>

        {/* Preview Section */}
        {preview.length > 0 && (
          <div className="p-6 border-b border-neutral-200 bg-neutral-50/40">
            <h3 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-neutral-900" />
              <span>Preview: {preview.length} Items Detected</span>
            </h3>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs">
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Total Items</p>
                <p className="text-xl font-extrabold text-neutral-900 mt-1">{preview.length}</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs">
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Total Demand</p>
                <p className="text-xl font-extrabold text-neutral-900 mt-1">
                  {preview.reduce((sum, item) => sum + item.demandQty, 0).toLocaleString()} <span className="text-xs font-medium text-neutral-500">{preview[0]?.unit}</span>
                </p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs">
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Unique Buyers</p>
                <p className="text-xl font-extrabold text-neutral-900 mt-1">
                  {new Set(preview.map((p) => p.buyer)).size}
                </p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs">
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Est. Total Wt</p>
                <p className="text-xl font-extrabold text-neutral-900 mt-1">
                  {(preview.reduce((sum, item) => sum + item.demandQty, 0) * 2).toFixed(0)} <span className="text-xs font-medium text-neutral-500">Kg</span>
                </p>
              </div>
            </div>

            {/* Table Preview */}
            <div className="bg-white rounded-xl overflow-x-auto border border-neutral-200 shadow-2xs">
              <table className="w-full text-xs">
                <thead className="bg-neutral-100 border-b border-neutral-200 text-neutral-700 font-bold uppercase tracking-wider text-[10.5px]">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Buyer</th>
                    <th className="px-4 py-2.5 text-left">Job No</th>
                    <th className="px-4 py-2.5 text-left">Ref / PO</th>
                    <th className="px-4 py-2.5 text-left">Color</th>
                    <th className="px-4 py-2.5 text-left">Size</th>
                    <th className="px-4 py-2.5 text-right">Demand</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {preview.slice(0, 5).map((item, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/80 transition">
                      <td className="px-4 py-2 font-bold text-neutral-900">{item.buyer}</td>
                      <td className="px-4 py-2 text-neutral-700 font-mono">{item.jobNo}</td>
                      <td className="px-4 py-2 text-neutral-600 font-mono text-[11px]">{item.customerRefPO}</td>
                      <td className="px-4 py-2 text-neutral-700">{item.color}</td>
                      <td className="px-4 py-2 text-neutral-700 font-semibold">{item.size}</td>
                      <td className="px-4 py-2 text-right font-bold text-neutral-900">
                        {item.demandQty.toLocaleString()} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 5 && (
                <div className="px-4 py-2 bg-neutral-50 text-neutral-500 text-xs border-t border-neutral-200 font-medium">
                  + {preview.length - 5} more items in list
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-4 sm:p-5 flex gap-2.5 justify-end bg-neutral-50/60 border-t border-neutral-200">
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setPreview([]);
              setError(null);
              setSuccess(false);
            }}
            className="px-4 py-2 border border-neutral-300 rounded-xl text-neutral-700 hover:bg-neutral-100 transition text-xs font-bold cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={preview.length === 0 || loading}
            className={`px-5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-xs ${
              loading
                ? 'bg-neutral-400 cursor-not-allowed'
                : preview.length > 0
                ? 'bg-neutral-900 hover:bg-black active:scale-[0.98]'
                : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm & Save Schedule</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
