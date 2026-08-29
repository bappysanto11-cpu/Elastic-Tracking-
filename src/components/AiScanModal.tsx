import React from 'react';
import { Language } from '../utils/translations';
import { PackingSheetData } from '../types/calculator';
import { recomputeCarton } from '../utils/calc';
import { Sparkles, Upload, Camera, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface AiScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExtractedData: (data: Partial<PackingSheetData>) => void;
  lang: Language;
}

export const AiScanModal: React.FC<AiScanModalProps> = ({
  isOpen,
  onClose,
  onApplyExtractedData,
  lang,
}) => {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [extractedPreview, setExtractedPreview] = React.useState<any | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setError(null);
      setExtractedPreview(null);

      const reader = new FileReader();
      reader.onload = ev => {
        setImagePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!imagePreview) {
      setError(lang === 'en' ? 'Please select or capture a photo first.' : 'দয়া করে প্রথমে একটি ছবি সিলেক্ট করুন।');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/scan-sheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: imagePreview,
          mimeType: selectedFile?.type || 'image/jpeg',
          prompt: 'Extract all carton packing list details, company name, buyer, size, color, unit weight, and all carton weights and lengths from this image accurately.',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to parse image with Gemini');
      }

      setExtractedPreview(json.data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || (lang === 'en' ? 'Scanning failed. Please check image quality.' : 'স্ক্যান করা যায়নি। অনুগ্রহ করে পরিষ্কার ছবি দিন।'));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!extractedPreview) return;

    const defaultTare = extractedPreview.defaultTare || 0.50;
    const defaultWtPerUnit = extractedPreview.defaultWtPerUnit || 30.00;

    const rawCartons = Array.isArray(extractedPreview.cartons) ? extractedPreview.cartons : [];
    const populatedCartons = rawCartons.map((c: any, idx: number) => {
      return recomputeCarton({
        cartonNo: c.cartonNo || idx + 1,
        grossWt: typeof c.grossWt === 'number' ? c.grossWt : 0,
        netWt: typeof c.netWt === 'number' ? c.netWt : 0,
        tareWt: defaultTare,
        wtPerUnit: typeof c.wtPerUnit === 'number' && c.wtPerUnit > 0 ? c.wtPerUnit : defaultWtPerUnit,
        notes: c.notes || '',
      }, idx, defaultTare, defaultWtPerUnit);
    });

    onApplyExtractedData({
      companyName: extractedPreview.companyName || 'GOOD & FAST Pa. Co. Ltd',
      ref: extractedPreview.ref || '',
      customer: extractedPreview.customer || '',
      buyer: extractedPreview.buyer || '',
      size: extractedPreview.size || '',
      color: extractedPreview.color || '',
      defaultTare,
      defaultWtPerUnit,
      cartons: populatedCartons.length > 0 ? populatedCartons : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                {lang === 'en' ? 'AI Packing Sheet & Photo Scanner' : 'ছবি বা শিট স্ক্যানার (AI Gemini)'}
              </h3>
              <p className="text-[11px] text-indigo-200">
                {lang === 'en'
                  ? 'Upload any packing sheet, scale receipt, or paper note'
                  : 'যেকোনো প্যাকিং শিট, ওজনের চিরকুট বা কাগজের ছবি আপলোড করুন'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* File Upload Box */}
          <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-5 text-center transition bg-slate-50 relative cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            {imagePreview ? (
              <div className="space-y-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-48 mx-auto rounded-lg border border-slate-300 object-contain shadow-xs"
                />
                <p className="text-xs text-indigo-600 font-semibold">
                  {lang === 'en' ? 'Click or drag another image to change' : 'অন্য ছবি দিতে ক্লিক বা ড্র্যাগ করুন'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-slate-700">
                  {lang === 'en' ? 'Click to upload or take a photo of packing sheet' : 'প্যাকিং শিটের ছবি আপলোড বা ক্যামেরা দিয়ে তুলুন'}
                </div>
                <p className="text-[11px] text-slate-400">
                  PNG, JPG, JPEG, WEBP
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Extracted Details Preview */}
          {extractedPreview && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{lang === 'en' ? 'Successfully Extracted from Image!' : 'ছবি থেকে তথ্য সফলভাবে পাওয়া গেছে!'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-700 font-mono text-[11px]">
                <div>Company: <strong>{extractedPreview.companyName || 'N/A'}</strong></div>
                <div>REF: <strong>{extractedPreview.ref || 'N/A'}</strong></div>
                <div>Buyer: <strong>{extractedPreview.buyer || 'N/A'}</strong></div>
                <div>Size/Color: <strong>{extractedPreview.size} | {extractedPreview.color}</strong></div>
                <div>Unit Wt: <strong>{extractedPreview.defaultWtPerUnit || 30} gm/m</strong></div>
                <div>Cartons Found: <strong>{extractedPreview.cartons?.length || 0} CTN</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            {lang === 'en' ? 'Cancel' : 'বাতিল'}
          </button>

          <div className="flex items-center gap-2">
            {!extractedPreview ? (
              <button
                onClick={handleScan}
                disabled={!imagePreview || loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'en' ? 'Scanning with AI...' : 'AI দিয়ে স্ক্যান হচ্ছে...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{lang === 'en' ? 'Analyze Image' : 'ছবি বিশ্লেষণ করুন'}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleApply}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === 'en' ? 'Apply to Sheet' : 'শিটে প্রয়োগ করুন'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
