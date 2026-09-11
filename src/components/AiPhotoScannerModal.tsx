import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Loader2, 
  Trash2, 
  Eye, 
  ArrowRight, 
  Plus, 
  Tag, 
  Layers, 
  Edit3, 
  Image as ImageIcon,
  Grid,
  Check,
  RotateCcw,
  Sliders,
  Maximize2
} from 'lucide-react';
import { CartonRow, PackingSheetData } from '../types/calculator';
import { recomputeCarton } from '../utils/calc';

interface PhotoItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'scanning' | 'done' | 'error';
  detectedCount?: number;
  errorMessage?: string;
}

export interface DetectedCartonDetail {
  id: string;
  cartonNo: number;
  grossWt: number;
  tareWt?: number | null;
  netWt?: number | null;
  color?: string;
  size?: string;
  qtyPcs?: number;
  pkts?: number;
  boxLocation?: string;
  rawDetectedText?: string;
  confidence?: 'high' | 'medium' | 'low';
}

interface AiPhotoScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetData: PackingSheetData;
  lang: 'en' | 'bn';
  onApplyCartons: (newCartons: CartonRow[], mode: 'replace' | 'append') => void;
  onNavigateToStickers?: () => void;
}

/**
 * Compresses an image to max 2560px JPEG to keep handwritten numbers,
 * printed shipping marks, and up to 20 small labels on a pallet crystal clear.
 */
async function compressImageForBatch(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;

    img.onload = () => {
      const maxDim = 2560; // Extra resolution for 20-carton wide shots
      let { width, height } = img;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Canvas context not available'));
      }

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      resolve({
        base64: dataUrl,
        mimeType: 'image/jpeg',
      });
    };

    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const AiPhotoScannerModal: React.FC<AiPhotoScannerModalProps> = ({
  isOpen,
  onClose,
  sheetData,
  lang,
  onApplyCartons,
  onNavigateToStickers,
}) => {
  // Scanner modes: 'batch20' (1 photo containing up to 20 carton labels) vs 'multiPhoto' (individual photos)
  const [activeMode, setActiveMode] = useState<'batch20' | 'multiPhoto'>('batch20');

  // Batch Mode States (Up to 20 labels in 1 photo)
  const [batchPhoto, setBatchPhoto] = useState<{ file: File; previewUrl: string } | null>(null);
  const [startCartonNo, setStartCartonNo] = useState<number>(() => {
    return sheetData.cartons.length > 0 ? sheetData.cartons.length + 1 : 1;
  });
  const [parsedCartonRows, setParsedCartonRows] = useState<CartonRow[]>([]);
  const [detectedDetails, setDetectedDetails] = useState<DetectedCartonDetail[]>([]);
  const [isBatchScanning, setIsBatchScanning] = useState<boolean>(false);

  // Multi-Photo Mode States
  const [multiPhotos, setMultiPhotos] = useState<PhotoItem[]>([]);
  const [isMultiScanning, setIsMultiScanning] = useState<boolean>(false);
  const [multiProgress, setMultiProgress] = useState<{ current: number; total: number } | null>(null);

  // Shared Modal States
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');
  const [autoGoToStickers, setAutoGoToStickers] = useState<boolean>(true);
  const [previewZoomUrl, setPreviewZoomUrl] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const batchCameraInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const multiCameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const defaultTare = sheetData.defaultTare || 0.50;
  const defaultWtPerUnit = sheetData.defaultWtPerUnit || 30.0;
  const deliveryUnit = sheetData.deliveryUnit || 'mtr';
  const pcsPerPkt = sheetData.pcsPerPkt;
  const weightUnit = sheetData.weightUnit || 'kg';

  const t = {
    modalTitle: lang === 'en' ? 'AI Carton Photo Scanner' : 'AI কার্টন ফটো স্ক্যানার',
    batchTab: lang === 'en' ? 'Batch Mode (Up to 20 Labels in 1 Photo)' : 'ব্যাচ মোড (১ ছবিতে সর্বোচ্চ ২০টি লেবেল)',
    multiTab: lang === 'en' ? 'Multi-Photo Mode (1 Photo per Carton)' : 'মাল্টি-ফটো মোড (প্রতি কার্টনের আলাদা ছবি)',
    batchDescription: lang === 'en'
      ? 'Upload 1 photo containing up to 20 carton labels (pallet stack, warehouse floor, or shipping mark grid). AI parses each label into CartonRow objects!'
      : 'প্যালেট বা ফ্লোরে থাকা ২০টি কার্টনের একটিমাত্র ছবি দিন। এআই প্রতিটি লেবেল শনাক্ত করে আলাদা কার্টন রো (CartonRow) তৈরি করবে!',
    uploadBatchPhoto: lang === 'en' ? 'Select 1 Photo with up to 20 Cartons' : 'সর্বোচ্চ ২০ কার্টনের ১টি ছবি সিলেক্ট করুন',
    snapBatchPhoto: lang === 'en' ? 'Snap Photo of Pallet / Carton Stack' : 'প্যালেট বা কার্টন স্তূপের ছবি তুলুন',
    startScanBtn: lang === 'en' ? '⚡ Detect & Parse Up to 20 Labels' : '⚡ এক ক্লিকে ২০টি কার্টন লেবেল শনাক্ত করুন',
    scanningText: lang === 'en' ? 'Gemini AI is parsing up to 20 carton labels...' : 'এআই ছবির সব (সর্বোচ্চ ২০টি) কার্টন লেবেল স্ক্যান করছে...',
    cartonNoLabel: lang === 'en' ? 'C/No' : 'কার্টন নং',
    grossWtLabel: lang === 'en' ? 'Gross Wt (KG)' : 'গ্রস ওজন (কেজি)',
    tareWtLabel: lang === 'en' ? 'Tare Wt' : 'ট্যার ওজন',
    netWtLabel: lang === 'en' ? 'Net Wt' : 'নেট ওজন',
    lengthOrPcsLabel: deliveryUnit === 'pcs' ? (lang === 'en' ? 'Qty (Pcs)' : 'পরিমাণ (পিস)') : (lang === 'en' ? 'Length (Mtr)' : 'দৈর্ঘ্য (মিটার)'),
    labelsDetected: lang === 'en' ? 'Carton Labels Detected' : 'শনাক্তকৃত কার্টন লেবেল',
    totalGross: lang === 'en' ? 'Total Gross Wt' : 'মোট গ্রস ওজন',
    totalNet: lang === 'en' ? 'Total Net Wt' : 'মোট নেট ওজন',
    applyButton: lang === 'en' ? 'Populate Table with CartonRows' : 'টেবিলে কার্টনগুলো বসান',
    replaceOption: lang === 'en' ? 'Replace current carton rows' : 'বর্তমান কার্টনগুলোর ওপর বসান',
    appendOption: lang === 'en' ? 'Append to existing cartons' : 'নতুন কার্টন হিসেবে শেষে যোগ করুন',
    goToStickersCheck: lang === 'en' ? 'Open Stickers View immediately after applying' : 'প্রয়োগ করার সাথে সাথে স্টিকার ভিউ ওপেন করুন',
    startCartonHint: lang === 'en' ? 'Start Carton #:' : 'শুরুর কার্টন নং:',
    addRowBtn: lang === 'en' ? '+ Add Extra Row' : '+ অতিরিক্ত রো যোগ করুন',
    clearPhoto: lang === 'en' ? 'Remove Photo' : 'ছবি মুছুন',
  };

  // Helper to recompute carton row on client
  const recomputeRow = (row: Partial<CartonRow>, idx: number): CartonRow => {
    return recomputeCarton(row, idx, defaultTare, defaultWtPerUnit, deliveryUnit, pcsPerPkt, weightUnit);
  };

  // Handler: Select Batch Single Photo
  const handleBatchPhotoSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    if (batchPhoto) {
      URL.revokeObjectURL(batchPhoto.previewUrl);
    }

    setBatchPhoto({
      file,
      previewUrl: URL.createObjectURL(file),
    });
    setApiError(null);
    setParsedCartonRows([]);
    setDetectedDetails([]);
  };

  // Run AI Batch Scanner on single photo with up to 20 labels
  const handleExecuteBatchScan = async () => {
    if (!batchPhoto) return;

    setIsBatchScanning(true);
    setApiError(null);

    try {
      const { base64, mimeType } = await compressImageForBatch(batchPhoto.file);

      const res = await fetch('/api/scan-carton-labels-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          startCartonNo: Number(startCartonNo) || 1,
          maxCartons: 20,
          sheetContext: {
            defaultTare,
            defaultWtPerUnit,
            deliveryUnit,
            pcsPerPkt,
            weightUnit,
            color: sheetData.color || '',
            size: sheetData.size || '',
            itemType: sheetData.itemType || 'elastic',
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      const rawRows: CartonRow[] = data.cartonRows || [];
      const rawDetected: any[] = data.detectedCartons || [];

      if (rawRows.length === 0) {
        setApiError(
          lang === 'en'
            ? 'No carton labels or weight markings could be detected in this photo. Please ensure numbers or labels are visible.'
            : 'এই ছবিতে কোনো কার্টন লেবেল বা ওজনের লেখা স্পষ্টভাবে শনাক্ত করা যায়নি। অনুগ্রহ করে পরিষ্কার ছবি দিন।'
        );
        return;
      }

      // Ensure client-side recomputation with exact parameters
      const computedRows = rawRows.map((r, i) => recomputeRow(r, i));

      setParsedCartonRows(computedRows);
      setDetectedDetails(
        rawDetected.map((c, i) => ({
          id: `det-${i}`,
          cartonNo: c.cartonNo || i + 1,
          grossWt: c.grossWt || 0,
          tareWt: c.tareWt,
          netWt: c.netWt,
          color: c.color,
          size: c.size,
          qtyPcs: c.qtyPcs,
          pkts: c.pkts,
          boxLocation: c.boxLocation,
          rawDetectedText: c.rawDetectedText,
          confidence: c.confidence || 'high',
        }))
      );
    } catch (err: any) {
      console.error('Batch scan error:', err);
      setApiError(err?.message || 'Error occurred during AI batch scanning');
    } finally {
      setIsBatchScanning(false);
    }
  };

  // Run AI Scanner on multiple individual photos
  const handleExecuteMultiScan = async () => {
    if (multiPhotos.length === 0) return;

    setIsMultiScanning(true);
    setApiError(null);
    setMultiProgress({ current: 0, total: multiPhotos.length });

    try {
      const payloadImages: Array<{ id: string; imageBase64: string; mimeType: string; expectedCartonNo: number }> = [];

      for (let i = 0; i < multiPhotos.length; i++) {
        setMultiProgress({ current: i + 1, total: multiPhotos.length });
        const { base64, mimeType } = await compressImageForBatch(multiPhotos[i].file);
        payloadImages.push({
          id: multiPhotos[i].id,
          imageBase64: base64,
          mimeType,
          expectedCartonNo: startCartonNo + i,
        });
      }

      const res = await fetch('/api/scan-carton-weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: payloadImages,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      const results: any[] = data.results || [];

      const newRows: CartonRow[] = results.map((r, i) => {
        return recomputeRow({
          id: `ctn-multi-${Date.now()}-${i}`,
          cartonNo: r.cartonNo || (startCartonNo + i),
          grossWt: typeof r.grossWt === 'number' ? r.grossWt : 0,
          tareWt: typeof r.tareWt === 'number' ? r.tareWt : defaultTare,
          netWt: typeof r.netWt === 'number' ? r.netWt : undefined,
          notes: r.rawDetectedText ? `Scan: ${r.rawDetectedText}` : undefined,
        }, i);
      });

      setParsedCartonRows(newRows);
      setDetectedDetails(
        results.map((r, i) => ({
          id: `det-multi-${i}`,
          cartonNo: r.cartonNo || (startCartonNo + i),
          grossWt: r.grossWt || 0,
          tareWt: r.tareWt,
          netWt: r.netWt,
          boxLocation: r.boxLocation,
          rawDetectedText: r.rawDetectedText,
          confidence: r.confidence || 'high',
        }))
      );

      // Switch to table view to display parsed rows
      setActiveMode('batch20');
    } catch (err: any) {
      console.error('Multi-photo scan error:', err);
      setApiError(err?.message || 'Error occurred during multi-photo scanning');
    } finally {
      setIsMultiScanning(false);
      setMultiProgress(null);
    }
  };

  // Modify parsed carton row field inline
  const handleUpdateParsedRow = (index: number, field: keyof CartonRow, value: any) => {
    setParsedCartonRows(prev => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: value };
      updated[index] = recomputeRow(target, index);
      return updated;
    });
  };

  // Remove one parsed row
  const handleRemoveParsedRow = (index: number) => {
    setParsedCartonRows(prev => prev.filter((_, idx) => idx !== index));
    setDetectedDetails(prev => prev.filter((_, idx) => idx !== index));
  };

  // Add extra carton row manually
  const handleAddParsedRow = () => {
    const nextNo = parsedCartonRows.length > 0 
      ? Math.max(...parsedCartonRows.map(r => r.cartonNo || 0)) + 1 
      : 1;

    const newRow = recomputeRow({
      id: `ctn-extra-${Date.now()}`,
      cartonNo: nextNo,
      grossWt: 0,
      tareWt: defaultTare,
      notes: 'Manual extra carton',
    }, parsedCartonRows.length);

    setParsedCartonRows(prev => [...prev, newRow]);
  };

  // Apply parsed CartonRow[] into main packing sheet table
  const handleApplyCartonsToTable = () => {
    if (parsedCartonRows.length === 0) return;

    onApplyCartons(parsedCartonRows, applyMode);
    onClose();

    if (autoGoToStickers && onNavigateToStickers) {
      onNavigateToStickers();
    }
  };

  // Summary statistics for parsed rows
  const totalGrossWeight = parsedCartonRows.reduce((sum, r) => sum + (r.grossWt || 0), 0);
  const totalNetWeight = parsedCartonRows.reduce((sum, r) => sum + (r.netWt || 0), 0);
  const totalLengthMtr = parsedCartonRows.reduce((sum, r) => sum + (r.lengthMtr || 0), 0);
  const totalQtyPcs = parsedCartonRows.reduce((sum, r) => sum + (r.qtyPcs || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-inner">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  {t.modalTitle}
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Gemini Vision 20-Carton Batch
                </span>
              </div>
              <p className="text-xs text-slate-300 line-clamp-1">
                {t.batchDescription}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-5 pt-3 pb-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
            <button
              onClick={() => setActiveMode('batch20')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeMode === 'batch20'
                  ? 'bg-white text-indigo-900 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5 text-indigo-600" />
              <span>{t.batchTab}</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono px-1.5 py-0.2 rounded font-extrabold">
                RECOMMENDED
              </span>
            </button>

            <button
              onClick={() => setActiveMode('multiPhoto')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeMode === 'multiPhoto'
                  ? 'bg-white text-indigo-900 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>{t.multiTab}</span>
            </button>
          </div>

          {/* Quick starting carton # setting */}
          {activeMode === 'batch20' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600 font-semibold">{t.startCartonHint}</span>
              <input
                type="number"
                min="1"
                value={startCartonNo}
                onChange={(e) => setStartCartonNo(parseInt(e.target.value, 10) || 1)}
                className="w-16 px-2 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

          {/* BATCH MODE CONTENT (Up to 20 labels in 1 photo) */}
          {activeMode === 'batch20' && (
            <div className="space-y-4">
              
              {/* Photo Upload Card */}
              {!batchPhoto ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Select File */}
                  <label className="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50 transition cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <span className="block text-xs sm:text-sm font-bold text-indigo-950">
                        {t.uploadBatchPhoto}
                      </span>
                      <span className="block text-[11px] text-indigo-600">
                        {lang === 'en' ? 'JPG, PNG of carton pallet or label grid' : 'প্যালেট বা কার্টনের ছবি সিলেক্ট করুন'}
                      </span>
                    </div>
                    <input
                      ref={batchFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleBatchPhotoSelected(e.target.files)}
                    />
                  </label>

                  {/* Camera Snap */}
                  <label className="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 transition cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <span className="block text-xs sm:text-sm font-bold text-emerald-950">
                        {t.snapBatchPhoto}
                      </span>
                      <span className="block text-[11px] text-emerald-600">
                        {lang === 'en' ? 'Take live photo with smartphone camera' : 'মোবাইল ক্যামেরা দিয়ে সরাসরি ছবি তুলুন'}
                      </span>
                    </div>
                    <input
                      ref={batchCameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleBatchPhotoSelected(e.target.files)}
                    />
                  </label>
                </div>
              ) : (
                /* Photo Preview & Control Bar */
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-900 text-xs font-bold">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{batchPhoto.file.name}</span>
                        <span className="text-[10px] text-indigo-600 font-normal">
                          ({(batchPhoto.file.size / 1024).toFixed(0)} KB)
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setPreviewZoomUrl(batchPhoto.previewUrl)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded cursor-pointer"
                        title="Zoom Image"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>{lang === 'en' ? 'View' : 'বড় করে দেখুন'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (batchPhoto) URL.revokeObjectURL(batchPhoto.previewUrl);
                          setBatchPhoto(null);
                          setParsedCartonRows([]);
                          setDetectedDetails([]);
                        }}
                        disabled={isBatchScanning}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t.clearPhoto}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExecuteBatchScan}
                        disabled={isBatchScanning}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-60"
                      >
                        {isBatchScanning ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>{t.scanningText}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span>{t.startScanBtn}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Compact Preview Thumbnail with Scan Radar Indicator */}
                  <div className="relative w-full h-32 sm:h-44 rounded-xl overflow-hidden bg-slate-900 border border-slate-300 flex items-center justify-center">
                    <img
                      src={batchPhoto.previewUrl}
                      alt="Batch Pallet Cartons"
                      className="w-full h-full object-contain"
                    />

                    {isBatchScanning && (
                      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
                        <div className="relative">
                          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                          <Sparkles className="w-4 h-4 text-amber-300 absolute -top-1 -right-1" />
                        </div>
                        <p className="text-xs font-bold tracking-wide text-emerald-300">
                          {lang === 'en' ? 'Scanning image to isolate up to 20 carton labels...' : 'ছবি থেকে ২০টি কার্টন লেবেল পৃথকভাবে শনাক্ত হচ্ছে...'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {apiError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{apiError}</span>
                </div>
              )}

              {/* Parsed CartonRows Section */}
              {parsedCartonRows.length > 0 && (
                <div className="space-y-3">
                  {/* Summary Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-3 sm:gap-4 text-xs flex-wrap">
                      <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>
                          {t.labelsDetected}:{' '}
                          <strong className="text-emerald-700 font-mono text-sm font-extrabold">
                            {parsedCartonRows.length}
                          </strong>{' '}
                          {lang === 'en' ? 'CartonRows' : 'টি কার্টন'}
                        </span>
                      </span>

                      <span className="text-slate-600">
                        {t.totalGross}:{' '}
                        <strong className="text-slate-900 font-mono font-bold">
                          {totalGrossWeight.toFixed(2)} KG
                        </strong>
                      </span>

                      <span className="text-slate-600">
                        {t.totalNet}:{' '}
                        <strong className="text-slate-900 font-mono font-bold">
                          {totalNetWeight.toFixed(2)} KG
                        </strong>
                      </span>

                      {deliveryUnit === 'pcs' ? (
                        <span className="text-slate-600">
                          {lang === 'en' ? 'Total Pcs:' : 'মোট পিস:'}{' '}
                          <strong className="text-slate-900 font-mono font-bold">
                            {totalQtyPcs.toLocaleString()} PCS
                          </strong>
                        </span>
                      ) : (
                        <span className="text-slate-600">
                          {lang === 'en' ? 'Total Mtr:' : 'মোট দৈর্ঘ্য:'}{' '}
                          <strong className="text-slate-900 font-mono font-bold">
                            {totalLengthMtr.toFixed(2)} Mtr
                          </strong>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddParsedRow}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.addRowBtn}</span>
                    </button>
                  </div>

                  {/* CartonRows Editable Table / Grid */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div className="overflow-x-auto max-h-80">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">{t.cartonNoLabel}</th>
                            <th className="py-2 px-3">{lang === 'en' ? 'Label Location' : 'লেবেলের স্থান'}</th>
                            <th className="py-2 px-3">{t.grossWtLabel}</th>
                            <th className="py-2 px-3">{t.tareWtLabel}</th>
                            <th className="py-2 px-3">{t.netWtLabel}</th>
                            <th className="py-2 px-3">{t.lengthOrPcsLabel}</th>
                            <th className="py-2 px-3">{lang === 'en' ? 'Color / Size' : 'কালার / সাইজ'}</th>
                            <th className="py-2 px-3 text-right">{lang === 'en' ? 'Action' : 'অ্যাকশন'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedCartonRows.map((row, idx) => {
                            const detail = detectedDetails[idx];
                            return (
                              <tr key={row.id || idx} className="hover:bg-indigo-50/40 transition">
                                {/* Carton No */}
                                <td className="py-1.5 px-3">
                                  <input
                                    type="number"
                                    min="1"
                                    value={row.cartonNo}
                                    onChange={(e) => handleUpdateParsedRow(idx, 'cartonNo', parseInt(e.target.value, 10) || 1)}
                                    className="w-14 px-1.5 py-0.5 font-mono font-bold text-slate-900 border border-slate-300 rounded focus:border-indigo-500 focus:outline-none"
                                  />
                                </td>

                                {/* Label Location in Photo */}
                                <td className="py-1.5 px-3">
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-semibold truncate max-w-[140px]">
                                    {detail?.boxLocation || `Label #${idx + 1}`}
                                  </span>
                                </td>

                                {/* Gross Wt (Editable) */}
                                <td className="py-1.5 px-3">
                                  <div className="relative w-24">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={row.grossWt > 0 ? row.grossWt : ''}
                                      onChange={(e) => handleUpdateParsedRow(idx, 'grossWt', parseFloat(e.target.value) || 0)}
                                      placeholder="0.00"
                                      className="w-full pl-1.5 pr-6 py-0.5 font-mono font-bold text-emerald-700 bg-emerald-50/50 border border-emerald-300 rounded focus:border-emerald-600 focus:outline-none"
                                    />
                                    <span className="absolute right-1.5 top-1 text-[10px] font-bold text-slate-400">
                                      KG
                                    </span>
                                  </div>
                                </td>

                                {/* Tare Wt (Editable) */}
                                <td className="py-1.5 px-3">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={row.tareWt}
                                    onChange={(e) => handleUpdateParsedRow(idx, 'tareWt', parseFloat(e.target.value) || defaultTare)}
                                    className="w-16 px-1.5 py-0.5 font-mono text-slate-600 border border-slate-200 rounded focus:border-indigo-500 focus:outline-none"
                                  />
                                </td>

                                {/* Net Wt (Auto computed) */}
                                <td className="py-1.5 px-3 font-mono font-bold text-slate-800">
                                  {row.netWt > 0 ? `${row.netWt.toFixed(2)} KG` : '0.00'}
                                </td>

                                {/* Length or Pcs */}
                                <td className="py-1.5 px-3 font-mono font-bold text-indigo-700">
                                  {deliveryUnit === 'pcs'
                                    ? `${(row.qtyPcs || 0).toLocaleString()} Pcs`
                                    : `${(row.lengthMtr || 0).toFixed(2)} Mtr`}
                                </td>

                                {/* Color / Size */}
                                <td className="py-1.5 px-3">
                                  <span className="text-[11px] text-slate-600">
                                    {row.color || sheetData.color || '-'} {row.size ? `(${row.size})` : ''}
                                  </span>
                                </td>

                                {/* Action Delete */}
                                <td className="py-1.5 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveParsedRow(idx)}
                                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                    title="Delete row"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MULTI-PHOTO MODE CONTENT (Individual photos) */}
          {activeMode === 'multiPhoto' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50 transition cursor-pointer group">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="block text-xs sm:text-sm font-bold text-indigo-950">
                      {lang === 'en' ? 'Select Multiple Photos' : 'একাধিক ছবি সিলেক্ট করুন'}
                    </span>
                    <span className="block text-[11px] text-indigo-600">
                      {lang === 'en' ? 'Select 1 photo per carton box' : 'প্রতিটি কার্টনের জন্য আলাদা ছবি নির্বাচন করুন'}
                    </span>
                  </div>
                  <input
                    ref={multiFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (!e.target.files) return;
                      const newItems: PhotoItem[] = [];
                      for (let i = 0; i < e.target.files.length; i++) {
                        const file = e.target.files[i];
                        if (file.type.startsWith('image/')) {
                          newItems.push({
                            id: `mphoto-${Date.now()}-${i}`,
                            file,
                            previewUrl: URL.createObjectURL(file),
                            status: 'pending',
                          });
                        }
                      }
                      setMultiPhotos(prev => [...prev, ...newItems]);
                    }}
                  />
                </label>

                <label className="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 transition cursor-pointer group">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="block text-xs sm:text-sm font-bold text-emerald-950">
                      {lang === 'en' ? 'Camera Snap' : 'ক্যামেরা দিয়ে ছবি'}
                    </span>
                    <span className="block text-[11px] text-emerald-600">
                      {lang === 'en' ? 'Take sequential photos of cartons' : 'একের পর এক কার্টনের ছবি তুলুন'}
                    </span>
                  </div>
                  <input
                    ref={multiCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (!e.target.files) return;
                      const newItems: PhotoItem[] = [];
                      for (let i = 0; i < e.target.files.length; i++) {
                        const file = e.target.files[i];
                        if (file.type.startsWith('image/')) {
                          newItems.push({
                            id: `mphoto-${Date.now()}-${i}`,
                            file,
                            previewUrl: URL.createObjectURL(file),
                            status: 'pending',
                          });
                        }
                      }
                      setMultiPhotos(prev => [...prev, ...newItems]);
                    }}
                  />
                </label>
              </div>

              {/* Multi-Photo Grid */}
              {multiPhotos.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      {lang === 'en' ? 'Photos Added:' : 'যুক্তকৃত ছবি:'} {multiPhotos.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          multiPhotos.forEach(p => URL.revokeObjectURL(p.previewUrl));
                          setMultiPhotos([]);
                        }}
                        className="text-xs text-rose-600 hover:bg-rose-50 px-2 py-1 rounded"
                      >
                        {lang === 'en' ? 'Clear Photos' : 'ছবি মুছুন'}
                      </button>

                      <button
                        type="button"
                        onClick={handleExecuteMultiScan}
                        disabled={isMultiScanning}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-60"
                      >
                        {isMultiScanning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{lang === 'en' ? `Scanning (${multiProgress?.current || 0}/${multiProgress?.total || multiPhotos.length})...` : 'স্ক্যান করা হচ্ছে...'}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>{lang === 'en' ? 'Scan All Photos with AI' : 'সব ছবি স্ক্যান করুন'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {multiPhotos.map((p, idx) => (
                      <div key={p.id} className="relative w-20 h-16 shrink-0 rounded-lg overflow-hidden border border-slate-300">
                        <img src={p.previewUrl} alt="carton" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0.5 left-0.5 bg-black/70 text-white text-[9px] px-1 rounded font-mono">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer: Application Options & Master Apply */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
          
          {/* Options */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-700">
                {lang === 'en' ? 'Mode:' : 'মোড:'}
              </label>
              <select
                value={applyMode}
                onChange={(e) => setApplyMode(e.target.value as 'replace' | 'append')}
                className="bg-white border border-slate-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="replace">{t.replaceOption}</option>
                <option value="append">{t.appendOption}</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-slate-700 cursor-pointer font-medium select-none">
              <input
                type="checkbox"
                checked={autoGoToStickers}
                onChange={(e) => setAutoGoToStickers(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span>{t.goToStickersCheck}</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              {lang === 'en' ? 'Cancel' : 'বাতিল'}
            </button>

            <button
              type="button"
              onClick={handleApplyCartonsToTable}
              disabled={parsedCartonRows.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/25 transition cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              <span>
                {t.applyButton} ({parsedCartonRows.length} CartonRows)
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Zoom Modal */}
        {previewZoomUrl && (
          <div 
            className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPreviewZoomUrl(null)}
          >
            <div className="relative max-w-4xl max-h-[88vh] bg-black rounded-xl overflow-hidden shadow-2xl">
              <button
                type="button"
                onClick={() => setPreviewZoomUrl(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/70 text-white rounded-full hover:bg-black/90 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={previewZoomUrl}
                alt="Enlarged carton preview"
                className="w-full h-full object-contain max-h-[88vh]"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
