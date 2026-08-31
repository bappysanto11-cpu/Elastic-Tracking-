import React, { useState } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h2 className="text-white text-2xl font-bold flex items-center gap-3">
            <Upload className="w-6 h-6" />
            Daily Schedule Upload
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            Upload Excel file with buyer details, order quantities, and demands
          </p>
        </div>

        {/* Upload Area */}
        <div className="p-6 border-b">
          <label className="flex items-center justify-center px-6 py-8 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 cursor-pointer hover:border-blue-500 transition">
            <div className="text-center">
              <Upload className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <p className="text-gray-700 font-medium">
                {selectedFile ? selectedFile.name : 'Choose Excel File'}
              </p>
              <p className="text-gray-500 text-sm mt-1">or drag and drop (.xlsx format)</p>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {error && (
            <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
              ✅ Schedule uploaded successfully!
            </div>
          )}
        </div>

        {/* Preview Section */}
        {preview.length > 0 && (
          <div className="p-6 border-b bg-gray-50">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Preview: ✓ {preview.length} Items Detected
            </h3>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-blue-600">{preview.length}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600">Total Demand</p>
                <p className="text-2xl font-bold text-green-600">
                  {preview.reduce((sum, item) => sum + item.demandQty, 0)} {preview[0]?.unit}
                </p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <p className="text-sm text-gray-600">Unique Buyers</p>
                <p className="text-2xl font-bold text-purple-600">
                  {new Set(preview.map((p) => p.buyer)).size}
                </p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <p className="text-sm text-gray-600">Total Weight</p>
                <p className="text-2xl font-bold text-orange-600">
                  {(preview.reduce((sum, item) => sum + item.demandQty, 0) * 2).toFixed(0)} Kg
                </p>
              </div>
            </div>

            {/* Table Preview */}
            <div className="bg-white rounded-lg overflow-x-auto border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left">Buyer</th>
                    <th className="px-4 py-2 text-left">Job No</th>
                    <th className="px-4 py-2 text-left">Ref/PO</th>
                    <th className="px-4 py-2 text-left">Color</th>
                    <th className="px-4 py-2 text-left">Size</th>
                    <th className="px-4 py-2 text-right">Demand</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 5).map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{item.buyer}</td>
                      <td className="px-4 py-2">{item.jobNo}</td>
                      <td className="px-4 py-2 text-xs">{item.customerRefPO}</td>
                      <td className="px-4 py-2">{item.color}</td>
                      <td className="px-4 py-2">{item.size}</td>
                      <td className="px-4 py-2 text-right font-semibold text-blue-600">
                        {item.demandQty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 5 && (
                <div className="px-4 py-2 bg-gray-50 text-gray-600 text-sm border-t">
                  ... and {preview.length - 5} more items
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-6 flex gap-3 justify-end bg-gray-50">
          <button
            onClick={() => {
              setSelectedFile(null);
              setPreview([]);
              setError(null);
              setSuccess(false);
            }}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white transition font-medium"
          >
            Clear
          </button>
          <button
            onClick={handleUpload}
            disabled={preview.length === 0 || loading}
            className={`px-8 py-2 rounded-lg text-white font-bold flex items-center gap-2 transition ${
              loading
                ? 'bg-blue-400 cursor-not-allowed'
                : preview.length > 0
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirm & Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
