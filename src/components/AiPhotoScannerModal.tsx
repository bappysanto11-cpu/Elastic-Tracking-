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
  Image as ImageIcon
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

export interface DetectedCartonItem {
  id: string;
  photoId: string;
  photoPreviewUrl: string;
  cartonNo: number;
  grossWt: number;
  tareWt?: number | null;
  netWt?: number | null;
  detectedText?: string;
  boxLocation?: string;
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
 * Resizes and compresses an image to max 1920px (Full HD) JPEG to keep handwritten numbers
 * on stacks of 15-25 cartons crystal clear while reducing bandwidth.
 */
async function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;

    img.onload = () => {
      const maxDim = 1920;
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
      const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
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
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [detectedCartons, setDetectedCartons] = useState<DetectedCartonItem[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number } | null>(null);
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');
  const [autoGoToStickers, setAutoGoToStickers] = useState<boolean>(true);
  const [previewZoomUrl, setPreviewZoomUrl] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const t = {
    modalTitle: lang === 'en' ? 'AI Carton Photo Weight Scanner' : 'AI কার্টন ফটো ওজন স্ক্যানার (সিঙ্গেল ও মাল্টি-কার্টন)',
    modalSubtitle: lang === 'en' 
      ? 'Upload 1 photo containing 20+ cartons on a pallet or individual photos. AI extracts all carton numbers & gross weights!'
      : 'এক ছবিতে ২০টি কার্টন থাকলে বা আলাদা আলাদা ছবি দিলে—এআই এক ক্লিকেই প্রতিটি কার্টনের গ্রস ওজন শনাক্ত করবে!',
    addPhotos: lang === 'en' ? 'Choose Photos / Pallet Shots' : 'ছবি বা প্যালেটের ছবি সিলেক্ট করুন',
    snapCamera: lang === 'en' ? 'Take Photo with Camera' : 'মোবাইল ক্যামেরা দিয়ে ছবি তুলুন',
    scanButton: lang === 'en' ? 'Detect All Cartons with Gemini AI' : 'Gemini AI দিয়ে সব কার্টনের ওজন বের করুন',
    scanning: lang === 'en' ? 'AI is analyzing carton boxes...' : 'এআই সব কার্টন ও ওজন স্ক্যান করছে...',
    clearAll: lang === 'en' ? 'Clear All' : 'সব মুছুন',
    cartonLabel: lang === 'en' ? 'Carton #' : 'কার্টন #',
    grossWtLabel: lang === 'en' ? 'Gross Wt (KG)' : 'গ্রস ওজন (কেজি)',
    applyButton: lang === 'en' ? 'Apply Cartons to Sheet & Stickers' : 'প্যাকিং শিট ও স্টিকারে বসান',
    replaceOption: lang === 'en' ? 'Replace current carton rows' : 'বর্তমান কার্টনগুলোর ওপর বসান',
    appendOption: lang === 'en' ? 'Append as new cartons' : 'নতুন কার্টন হিসেবে শেষে যোগ করুন',
    goToStickersCheck: lang === 'en' ? 'Open Stickers View immediately after applying' : 'প্রয়োগ করার সাথে সাথে স্টিকার ভিউ ওপেন করুন',
    multiCartonBanner: lang === 'en'
      ? '💡 Multi-Carton Support: You can photograph an entire stack or pallet of 10-25 cartons together in ONE photo! AI will identify each carton separately.'
      : '💡 মাল্টি-কার্টন সাপোর্ট: এক ছবিতে স্তূপ করা ১০ থেকে ২৫টি কার্টন একসাথে থাকলেও এআই প্রতিটি কার্টনের ওজন আলাদাভাবে খুঁজে বের করবে!',
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setApiError(null);
    const newItems: PhotoItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const id = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const previewUrl = URL.createObjectURL(file);

      newItems.push({
        id,
        file,
        previewUrl,
        status: 'pending',
      });
    }

    setPhotos(prev => [...prev, ...newItems]);
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos(prev => {
      const target = prev.find(p => p.id === photoId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(p => p.id !== photoId);
    });
    setDetectedCartons(prev => prev.filter(c => c.photoId !== photoId));
  };

  const handleClearAll = () => {
    photos.forEach(p => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setDetectedCartons([]);
    setScanProgress(null);
    setApiError(null);
  };

  // Run AI Weight Scan across all uploaded photos
  const handleStartScan = async () => {
    if (photos.length === 0) return;

    setIsScanning(true);
    setApiError(null);
    setScanProgress({ current: 0, total: photos.length });

    const collectedCartons: DetectedCartonItem[] = [];
    const updatedPhotos = [...photos];
    let nextCartonNumber = 1;

    try {
      for (let i = 0; i < updatedPhotos.length; i++) {
        setScanProgress({ current: i + 1, total: updatedPhotos.length });
        const currentItem = updatedPhotos[i];

        updatedPhotos[i] = { ...currentItem, status: 'scanning' };
        setPhotos([...updatedPhotos]);

        try {
          const { base64, mimeType } = await compressImage(currentItem.file);

          const res = await fetch('/api/scan-carton-weights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64,
              mimeType,
              expectedCartonNo: nextCartonNumber,
            }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server responded with ${res.status}`);
          }

          const result = await res.json();
          const detectedList = result.results || [];
          let photoCartonCount = 0;

          if (detectedList.length > 0) {
            detectedList.forEach((c: any, subIdx: number) => {
              const assignedNo = c.cartonNo || (nextCartonNumber + subIdx);
              const grossVal = typeof c.grossWt === 'number' ? c.grossWt : 0;

              collectedCartons.push({
                id: `carton-${Date.now()}-${subIdx}-${Math.random().toString(36).substr(2, 5)}`,
                photoId: currentItem.id,
                photoPreviewUrl: currentItem.previewUrl,
                cartonNo: assignedNo,
                grossWt: grossVal,
                tareWt: c.tareWt,
                netWt: c.netWt,
                detectedText: c.rawDetectedText,
                boxLocation: c.boxLocation,
                confidence: c.confidence || 'high',
              });

              if (grossVal > 0) photoCartonCount++;
            });

            nextCartonNumber += detectedList.length;
          }

          updatedPhotos[i] = {
            ...currentItem,
            status: 'done',
            detectedCount: photoCartonCount || detectedList.length,
          };
        } catch (itemErr: any) {
          console.error(`Error scanning image ${currentItem.id}:`, itemErr);
          updatedPhotos[i] = {
            ...currentItem,
            status: 'error',
            errorMessage: itemErr.message || 'Scan failed',
          };
        }

        setPhotos([...updatedPhotos]);
      }

      // Sort detected cartons logically by Carton Number
      collectedCartons.sort((a, b) => a.cartonNo - b.cartonNo);
      setDetectedCartons(collectedCartons);
    } catch (err: any) {
      console.error('Fatal scan error:', err);
      setApiError(err?.message || 'Error occurred during AI scanning');
    } finally {
      setIsScanning(false);
    }
  };

  const handleGrossWtChange = (id: string, val: number) => {
    setDetectedCartons(prev =>
      prev.map(c => (c.id === id ? { ...c, grossWt: val } : c))
    );
  };

  const handleCartonNoChange = (id: string, val: number) => {
    setDetectedCartons(prev =>
      prev.map(c => (c.id === id ? { ...c, cartonNo: val } : c))
    );
  };

  const handleRemoveDetectedCarton = (id: string) => {
    setDetectedCartons(prev => prev.filter(c => c.id !== id));
  };

  const handleAddManualCarton = () => {
    const nextNo = detectedCartons.length > 0 
      ? Math.max(...detectedCartons.map(c => c.cartonNo)) + 1 
      : 1;
    
    setDetectedCartons(prev => [
      ...prev,
      {
        id: `carton-manual-${Date.now()}`,
        photoId: photos[0]?.id || 'manual',
        photoPreviewUrl: photos[0]?.previewUrl || '',
        cartonNo: nextNo,
        grossWt: 0,
        detectedText: 'Manual addition',
        confidence: 'high',
      },
    ]);
  };

  // Apply all detected cartons into the packing sheet
  const handleApply = () => {
    if (detectedCartons.length === 0) return;

    const defaultTare = sheetData.defaultTare || 0.5;
    const defaultWtPerUnit = sheetData.defaultWtPerUnit || 30.0;
    const deliveryUnit = sheetData.deliveryUnit || 'mtr';
    const pcsPerPkt = sheetData.pcsPerPkt;
    const weightUnit = sheetData.weightUnit || 'kg';

    const sortedCartons = [...detectedCartons].sort((a, b) => a.cartonNo - b.cartonNo);

    const generatedRows: CartonRow[] = sortedCartons.map((item, idx) => {
      const cNo = item.cartonNo || (idx + 1);
      const gross = item.grossWt || 0;
      const tare = item.tareWt && item.tareWt > 0 ? item.tareWt : defaultTare;

      return recomputeCarton(
        {
          cartonNo: cNo,
          grossWt: gross,
          tareWt: tare,
          wtPerUnit: defaultWtPerUnit,
          notes: item.detectedText ? `AI Scan: ${item.detectedText}` : undefined,
        },
        idx,
        defaultTare,
        defaultWtPerUnit,
        deliveryUnit,
        pcsPerPkt,
        weightUnit
      );
    });

    onApplyCartons(generatedRows, applyMode);
    onClose();

    if (autoGoToStickers && onNavigateToStickers) {
      onNavigateToStickers();
    }
  };

  const totalGrossWeight = detectedCartons.reduce((sum, c) => sum + (c.grossWt || 0), 0);
  const avgGrossWeight = detectedCartons.length > 0 ? (totalGrossWeight / detectedCartons.length) : 0;

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
                  Gemini Vision (Multi-Box)
                </span>
              </div>
              <p className="text-xs text-slate-300 line-clamp-1">
                {t.modalSubtitle}
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

        {/* Informative Banner for Single Photo 20 Cartons */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-indigo-50 to-emerald-50 border-b border-indigo-100 flex items-center gap-2 text-xs text-indigo-950 font-medium">
          <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{t.multiCartonBanner}</span>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Action Bar / Dropzone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Pick from Gallery / Files */}
            <label className="flex items-center justify-center gap-3 p-3.5 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 transition cursor-pointer group">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Upload className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="block text-xs sm:text-sm font-bold text-indigo-900">
                  {t.addPhotos}
                </span>
                <span className="block text-[11px] text-indigo-600">
                  {lang === 'en' ? 'Upload 1 photo with 20 cartons or multiple photos' : '১ ছবিতে ২০ কার্টনের ছবি বা একাধিক ছবি নিন'}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </label>

            {/* Direct Camera Capture */}
            <label className="flex items-center justify-center gap-3 p-3.5 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 transition cursor-pointer group">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Camera className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="block text-xs sm:text-sm font-bold text-emerald-900">
                  {t.snapCamera}
                </span>
                <span className="block text-[11px] text-emerald-600">
                  {lang === 'en' ? 'Snap photo of pallet/carton stack' : 'কার্টন স্তূপ বা প্যালেটের ছবি তুলুন'}
                </span>
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </label>
          </div>

          {/* Uploaded Photos Strip */}
          {photos.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span>
                    {lang === 'en' ? 'Uploaded Photo(s):' : 'আপলোডকৃত ছবি:'}{' '}
                    <span className="font-mono text-indigo-600 font-bold bg-indigo-100 px-2 py-0.5 rounded">
                      {photos.length}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={isScanning}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.clearAll}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartScan}
                    disabled={isScanning || photos.length === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-60"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>{t.scanning}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>{t.scanButton}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Thumbnails row */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {photos.map((p, pIdx) => (
                  <div key={p.id} className="relative shrink-0 w-24 h-20 rounded-lg overflow-hidden border border-slate-300 bg-black group">
                    <img src={p.previewUrl} alt="uploaded carton" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPreviewZoomUrl(p.previewUrl)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(p.id)}
                      className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded hover:bg-rose-700 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-mono px-1 rounded">
                      #{pIdx + 1}
                    </span>
                    {p.status === 'scanning' && (
                      <div className="absolute inset-0 bg-indigo-950/70 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scanning Progress Bar */}
          {isScanning && scanProgress && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1.5 animate-in fade-in duration-200">
              <div className="flex justify-between text-xs font-bold text-indigo-900">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>{lang === 'en' ? 'Scanning Photo' : 'ছবি বিশ্লেষণ হচ্ছে'}: {scanProgress.current} / {scanProgress.total}</span>
                </span>
                <span className="font-mono">
                  {Math.round((scanProgress.current / scanProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-indigo-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* API Error Toast */}
          {apiError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Detected Cartons Section */}
          {detectedCartons.length > 0 ? (
            <div className="space-y-3">
              {/* Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      {lang === 'en' ? 'Cartons Detected:' : 'শনাক্তকৃত কার্টন:'}{' '}
                      <strong className="text-emerald-700 font-mono text-sm font-extrabold">
                        {detectedCartons.length}
                      </strong>{' '}
                      {lang === 'en' ? 'cartons' : 'টি'}
                    </span>
                  </span>

                  <span className="text-slate-600">
                    {lang === 'en' ? 'Total G.W:' : 'মোট ওজন:'}{' '}
                    <strong className="text-slate-900 font-mono font-bold">
                      {totalGrossWeight.toFixed(2)} KG
                    </strong>
                  </span>

                  <span className="text-slate-600">
                    {lang === 'en' ? 'Avg G.W:' : 'গড় ওজন:'}{' '}
                    <strong className="text-slate-900 font-mono font-bold">
                      {avgGrossWeight.toFixed(2)} KG
                    </strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddManualCarton}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Add Extra Carton' : '+ কার্টন যোগ করুন'}</span>
                </button>
              </div>

              {/* Cartons Grid / Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {detectedCartons.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200 hover:border-emerald-400 bg-white shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded">
                          C/No:
                        </span>
                        <input
                          type="number"
                          value={item.cartonNo}
                          onChange={(e) => handleCartonNoChange(item.id, parseInt(e.target.value, 10) || 1)}
                          className="w-14 px-1.5 py-0.5 text-xs font-bold font-mono border border-slate-300 rounded focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDetectedCarton(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        title="Remove carton"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mb-2">
                      <label className="block text-[10px] font-bold text-emerald-800 mb-0.5">
                        {t.grossWtLabel}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={item.grossWt > 0 ? item.grossWt : ''}
                          onChange={(e) => handleGrossWtChange(item.id, parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full pl-2 pr-8 py-1 text-sm font-extrabold font-mono text-emerald-700 bg-emerald-50/50 border border-emerald-300 rounded-md focus:border-emerald-600 focus:outline-none"
                        />
                        <span className="absolute right-2 top-1 text-[11px] font-bold text-slate-400">
                          KG
                        </span>
                      </div>
                    </div>

                    {item.detectedText && (
                      <p className="text-[10px] text-slate-500 truncate" title={item.detectedText}>
                        🔍 {item.detectedText}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            photos.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3">
                  <Camera className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-700 mb-1">
                  {lang === 'en' ? 'Upload Carton Photo(s)' : 'কার্টনের ছবি আপলোড করুন'}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mb-4">
                  {lang === 'en'
                    ? 'Take 1 photo of an entire stack of 20 cartons or multiple individual photos. AI extracts all carton numbers and weights automatically!'
                    : 'একটি ছবিতে স্তূপ করে রাখা ২০টি কার্টনের ছবি তুলুন অথবা আলাদা আলাদা ছবি দিন। এআই এক ক্লিকেই প্রতিটি কার্টন শনাক্ত করে ফেলবে!'}
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{t.addPhotos}</span>
                </button>
              </div>
            )
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
              onClick={handleApply}
              disabled={detectedCartons.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/25 transition cursor-pointer disabled:opacity-50"
            >
              <Tag className="w-4 h-4 text-amber-300" />
              <span>
                {t.applyButton} ({detectedCartons.length})
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
            <div className="relative max-w-3xl max-h-[85vh] bg-black rounded-xl overflow-hidden shadow-2xl">
              <button
                type="button"
                onClick={() => setPreviewZoomUrl(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/90 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={previewZoomUrl}
                alt="Enlarged carton preview"
                className="w-full h-full object-contain max-h-[85vh]"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
