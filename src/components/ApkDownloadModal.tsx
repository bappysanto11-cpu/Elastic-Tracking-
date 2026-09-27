import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Language } from '../utils/translations';
import { 
  Smartphone, 
  Download, 
  X, 
  Check, 
  Sparkles, 
  ExternalLink, 
  Share2, 
  HelpCircle,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface ApkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const ApkDownloadModal: React.FC<ApkDownloadModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  useEffect(() => {
    // Listen for PWA beforeinstallprompt event on Android/Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if running in standalone mode (already installed as APK/PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const appUrl = window.location.origin;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback instruction for browser
      alert(
        lang === 'en'
          ? 'To install: Tap the (⋮) menu in Chrome and select "Install app" or "Add to Home screen".'
          : 'ইনস্টল করতে: ব্রাউজারের উপরে ৩ ডট (⋮) মেনুতে চাপুন এবং "Install app" বা "Add to Home screen" নির্বাচন করুন।'
      );
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleShareApp = () => {
    const text = encodeURIComponent(
      lang === 'en'
        ? `Install Elastic & Packing Calculator App: ${appUrl}`
        : `ইলাস্টিক প্যাকিং ক্যালকুলেটর অ্যাপ ইনস্টল করুন: ${appUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-neutral-300 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-neutral-900 animate-in fade-in zoom-in-95 duration-150 my-auto">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900">
                  {lang === 'en' ? 'Install Android App (APK / PWA)' : 'অ্যান্ড্রয়েড অ্যাপ (APK / PWA) ইনস্টল'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300 font-mono">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                {lang === 'en'
                  ? 'Install directly on any Android smartphone, tablet, or desktop'
                  : 'যেকোনো অ্যান্ড্রয়েড ফোন বা ট্যাবলেটে সরাসরি অ্যাপ হিসেবে চালান'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 bg-white">
          
          {/* Main Install Card */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-200 text-neutral-900 text-xs font-bold font-mono">
                <Sparkles className="w-3.5 h-3.5 text-neutral-800" />
                {lang === 'en' ? 'Direct Android Instant Install' : 'সরাসরি ইনস্টল করুন'}
              </div>
              <h4 className="text-lg font-black text-neutral-900">
                {lang === 'en' ? 'Elastic & Packing Calculator' : 'ইলাস্টিক প্যাকিং ক্যালকুলেটর অ্যাপ'}
              </h4>
              <p className="text-xs text-neutral-600 max-w-xs">
                {lang === 'en'
                  ? 'Works 100% full-screen without browser address bar. Supports offline calculations, AI Scan, & QR sticker generator.'
                  : 'ব্রাউজার ছাড়াই ফুলস্ক্রিন অ্যাপ হিসেবে কাজ করবে। অফলাইন ক্যালকুলেশন এবং স্টিকার জেনারেটর যুক্ত।'}
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-black text-sm shadow-xs transition-all transform active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isInstalled ? (lang === 'en' ? 'App Installed' : 'ইনস্টল সম্পন্ন') : (lang === 'en' ? 'Install App Now' : 'অ্যাপ ইনস্টল করুন')}</span>
              </button>
              <span className="text-[10px] text-neutral-500 font-mono">
                {lang === 'en' ? 'No Google Play account needed' : 'গুগল প্লে স্টোর ছাড়াই সরাসরি চালু'}
              </span>
            </div>
          </div>

          {/* QR Code for Instant Phone Scan */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-white p-2.5 rounded-xl border border-neutral-300 shrink-0">
              <QRCodeSVG
                value={appUrl || 'https://ais-pre-qyyo2rn5goexgmucfaom44-778523393809.asia-southeast1.run.app/'}
                size={110}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="space-y-1.5 text-center sm:text-left">
              <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider block">
                {lang === 'en' ? 'Scan to Open on Mobile Phone' : 'মোবাইলে খুলতে কিউআর কোড স্ক্যান করুন'}
              </span>
              <p className="text-xs text-neutral-600">
                {lang === 'en'
                  ? 'Scan with your mobile camera to launch the web APK and tap "Add to Home Screen" to install the app icon on your phone.'
                  : 'মোবাইল ক্যামেরা দিয়ে স্ক্যান করুন এবং ব্রাউজারে অপশন থেকে "Add to Home screen" চাপলেই মোবাইলের ডিসপ্লেতে অ্যাপ আইকন তৈরি হবে।'}
              </p>
              <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-neutral-100 text-[11px] font-semibold text-neutral-800 border border-neutral-300 transition cursor-pointer shadow-xs"
                >
                  {copiedUrl ? <Check className="w-3 h-3 text-neutral-900" /> : <Share2 className="w-3 h-3 text-neutral-600" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
                </button>
                <button
                  onClick={handleShareApp}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-[11px] font-semibold text-white transition cursor-pointer shadow-xs"
                >
                  <Share2 className="w-3 h-3" />
                  <span>Share WhatsApp</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3 Step Easy Installation Guide */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3">
            <h5 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-neutral-700" />
              {lang === 'en' ? 'How to install on Android (Chrome Browser)' : 'অ্যান্ড্রয়েড ফোনে ইনস্টল করার সহজ নিয়ম'}
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-neutral-200 space-y-1">
                <span className="font-mono font-bold text-neutral-900 text-xs">STEP 1</span>
                <p className="text-neutral-700 font-medium">
                  {lang === 'en' ? 'Open in Chrome on your phone' : 'ফোনের ক্রোম ব্রাউজারে লিংকটি খুলুন'}
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-neutral-200 space-y-1">
                <span className="font-mono font-bold text-neutral-900 text-xs">STEP 2</span>
                <p className="text-neutral-700 font-medium">
                  {lang === 'en' ? 'Tap (⋮) Chrome menu top-right' : 'উপরে ৩ ডট (⋮) মেনুতে চাপুন'}
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-neutral-200 space-y-1">
                <span className="font-mono font-bold text-neutral-900 text-xs">STEP 3</span>
                <p className="text-neutral-700 font-medium">
                  {lang === 'en' ? 'Tap "Install app" or "Add to Home screen"' : '"Install app" বা "Add to Home" চাপুন'}
                </p>
              </div>
            </div>
          </div>

          {/* APK Package / Standalone Info */}
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 pt-2 border-t border-neutral-200">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-700" />
              Progressive Web APK Standard
            </span>
            <span>Package: com.packingcalc.app</span>
          </div>

        </div>
      </div>
    </div>
  );
};
