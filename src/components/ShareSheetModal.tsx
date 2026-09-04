import React, { useState, useEffect } from 'react';
import { X, Copy, Check, QrCode, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PackingSheetData } from '../types/calculator';
import { Language } from '../utils/translations';
import { sharePackingSheet } from '../utils/shareSheet';

interface ShareSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetData: PackingSheetData;
  lang: Language;
}

export const ShareSheetModal: React.FC<ShareSheetModalProps> = ({
  isOpen,
  onClose,
  sheetData,
  lang,
}) => {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setShareUrl(null);
      setError(null);
      generateShareLink();
    }
  }, [isOpen]);

  const generateShareLink = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const shareId = await sharePackingSheet(sheetData);
      const url = new URL(window.location.href);
      url.searchParams.set('shareId', shareId);
      setShareUrl(url.toString());
    } catch (err: any) {
      console.error('Failed to generate share link:', err);
      setError(err.message || 'Failed to generate link');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-900 text-white">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
              <QrCode className="w-4 h-4" />
            </div>
            <span>{lang === 'en' ? 'Share Sheet Data' : 'শীট শেয়ার করুন'}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'en' ? 'Generating QR Code...' : 'কিউআর কোড তৈরি হচ্ছে...'}
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <X className="w-5 h-5" />
              </div>
              <p className="text-sm text-slate-900 font-bold">{lang === 'en' ? 'Error generating link' : 'লিংক তৈরি করতে সমস্যা হয়েছে'}</p>
              <p className="text-xs text-rose-600">{error}</p>
              <button
                onClick={generateShareLink}
                className="mt-2 px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
              >
                {lang === 'en' ? 'Try Again' : 'আবার চেষ্টা করুন'}
              </button>
            </div>
          ) : shareUrl ? (
            <div className="flex flex-col items-center space-y-6 w-full">
              <div className="p-3.5 bg-white rounded-2xl shadow-md border border-slate-200">
                <QRCodeSVG
                  value={shareUrl}
                  size={190}
                  level="H"
                  includeMargin={false}
                  className="rounded-lg"
                />
              </div>

              <div className="w-full space-y-2.5">
                <p className="text-xs text-slate-500 font-medium text-center">
                  {lang === 'en' ? 'Scan this QR code or copy the link below' : 'এই কিউআর কোডটি স্ক্যান করুন অথবা লিংকটি কপি করুন'}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 overflow-hidden">
                    <p className="text-xs font-mono text-slate-600 truncate">
                      {shareUrl}
                    </p>
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`p-2.5 rounded-lg transition cursor-pointer shrink-0 border ${
                      copied
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-indigo-600 border-slate-300'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
