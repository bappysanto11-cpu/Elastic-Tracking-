import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng, toBlob } from 'html-to-image';
import { CartonRow, PackingSheetData, SummaryStats } from '../types/calculator';
import { Language, translations } from '../utils/translations';
import { generateCartonPreviewUrl } from '../utils/qrCarton';
import { 
  Printer, 
  Tag, 
  QrCode, 
  Minus, 
  Plus, 
  Download, 
  Share2, 
  ImageIcon, 
  Palette, 
  Sliders,
  Settings2,
  Sparkles
} from 'lucide-react';
import { 
  StickerCustomizationSettings, 
  DEFAULT_STICKER_SETTINGS, 
  FONT_FAMILY_STYLES 
} from '../types/stickerSettings';
import { loadStickerSettings, saveStickerSettings } from '../utils/stickerSettingsStorage';
import { StickerSettingsModal } from './StickerSettingsModal';

interface StickerLabelsViewProps {
  sheetData: PackingSheetData;
  summary: SummaryStats;
  lang: Language;
  onRequestPrint?: (orientation: 'landscape' | 'portrait') => void;
  onOpenCartonQr?: (carton: CartonRow) => void;
}

export const StickerLabelsView: React.FC<StickerLabelsViewProps> = ({
  sheetData,
  summary,
  lang,
  onRequestPrint,
  onOpenCartonQr,
}) => {
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [qrSize, setQrSize] = useState<number>(48);
  const [isCompact, setIsCompact] = useState<boolean>(true);
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  
  // Customization Settings State
  const [stickerSettings, setStickerSettings] = useState<StickerCustomizationSettings>(() => {
    return loadStickerSettings();
  });

  const stickerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const t = translations[lang];

  const handleUpdateSettings = (newSettings: StickerCustomizationSettings) => {
    setStickerSettings(newSettings);
    saveStickerSettings(newSettings);
  };

  const activeCartons = sheetData.cartons.filter(
    c => c.netWt > 0 || c.grossWt > 0 || c.lengthMtr > 0
  );

  const handlePrint = () => {
    if (onRequestPrint) {
      onRequestPrint('portrait');
      return;
    }
    document.body.classList.remove('print-landscape', 'print-portrait');
    document.body.classList.add('print-portrait');
    window.print();
  };

  const handleDownloadSticker = async (cartonId: string, cartonNo: number) => {
    const el = stickerRefs.current[cartonId];
    if (!el) return;

    try {
      const dataUrl = await toPng(el, { 
        quality: 1, 
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          margin: '0',
          boxShadow: 'none'
        }
      });
      const link = document.createElement('a');
      link.download = `sticker-ctn-${cartonNo}-${sheetData.ref || 'export'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const handleShareSticker = async (cartonId: string, cartonNo: number) => {
    const el = stickerRefs.current[cartonId];
    if (!el) return;

    try {
      const blob = await toBlob(el, { 
        quality: 1, 
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      if (!blob) return;

      const file = new File([blob], `sticker-ctn-${cartonNo}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Carton #${cartonNo} Sticker`,
          text: `Shipping sticker for Carton #${cartonNo} (${sheetData.ref})`
        });
      } else {
        handleDownloadSticker(cartonId, cartonNo);
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.toLowerCase().includes('cancel')) {
        return;
      }
      console.error('Share failed', err);
    }
  };

  const handleExportAllAsImages = async () => {
    setIsExportingAll(true);
    try {
      for (const c of activeCartons) {
        await handleDownloadSticker(c.id, c.cartonNo);
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    } finally {
      setIsExportingAll(false);
    }
  };

  const fontConfig = FONT_FAMILY_STYLES[stickerSettings.fontFamily] || FONT_FAMILY_STYLES.sans;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center font-bold text-xs">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>{lang === 'en' ? 'Printable Carton Box Stickers & QR Codes' : 'প্রিন্টযোগ্য কার্টন বক্স স্টিকার ও কিউআর কোড'}</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">
                  {activeCartons.length} {lang === 'en' ? 'Labels' : 'লেবেল'}
                </span>
              </h3>
              
              {stickerSettings.logoUrl && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Branded
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {lang === 'en'
                ? 'Standard export shipping sticker with scannable QR verification for factory cartons'
                : 'প্রতি কার্টনের জন্য কিউআর কোড সহ এক্সপোর্ট স্ট্যান্ডার্ড শিপিং স্টিকার'}
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Sticker Styling & Branding Button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            title="Customize sticker fonts, colors, company logo, and layout"
          >
            <Palette className="w-3.5 h-3.5 text-amber-300" />
            <span>{lang === 'en' ? 'Sticker Styling & Logo' : 'স্টাইল ও লোগো'}</span>
          </button>

          <button
            onClick={() => setShowQrCode(!showQrCode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
              showQrCode
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle QR Code visibility on labels"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{showQrCode ? 'QR Code Active' : 'Show QR'}</span>
          </button>

          {showQrCode && (
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button
                onClick={() => setQrSize(Math.max(32, qrSize - 8))}
                className="p-1 hover:bg-white rounded-md text-slate-600 transition cursor-pointer"
                title="Decrease QR Size"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-[10px] font-bold text-slate-500 min-w-[3rem] text-center">
                QR: {qrSize}px
              </span>
              <button
                onClick={() => setQrSize(Math.min(120, qrSize + 8))}
                className="p-1 hover:bg-white rounded-md text-slate-600 transition cursor-pointer"
                title="Increase QR Size"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={() => setIsCompact(!isCompact)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
              isCompact
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Compact Mode"
          >
            <span>{isCompact ? 'Compact' : 'Standard'}</span>
          </button>

          <button
            onClick={handleExportAllAsImages}
            disabled={isExportingAll}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-xs transition cursor-pointer ${
              isExportingAll
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{isExportingAll ? 'Exporting...' : (lang === 'en' ? 'Export Images' : 'ইমেজ এক্সপোর্ট')}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Print All' : 'সব প্রিন্ট করুন'}</span>
          </button>
        </div>
      </div>

      {activeCartons.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
          {lang === 'en'
            ? 'No active cartons found. Please enter gross/net weights in the table.'
            : 'কোনো সক্রিয় কার্টন পাওয়া যায়নি। টেবিল থেকে ওজন প্রদান করুন।'}
        </div>
      ) : (
        /* Printable Sticker Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4">
          {activeCartons.map((c) => {
            const qrUrl = generateCartonPreviewUrl(c, sheetData, summary.totalCtn);
            const companyDisplayName = stickerSettings.customCompanyName || sheetData.companyName || 'GOOD & FAST Pa. Co. Ltd';
            const subtitleText = stickerSettings.customSubtitle || 'GARMENT ACCESSORIES & PACKING SPECIFICATION';

            return (
              <div
                key={c.id}
                ref={el => stickerRefs.current[c.id] = el}
                className={`bg-white rounded-none shadow-sm print:shadow-none flex flex-col justify-between relative group transition-all ${
                  fontConfig.cssClass
                } ${isCompact ? 'p-2.5' : 'p-3.5'}`}
                style={{ 
                  minHeight: isCompact ? '220px' : '270px',
                  border: `${stickerSettings.borderWidth} solid ${stickerSettings.borderColor}`,
                }}
              >
                {/* Export Overlay Controls (Visible on hover) */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden z-10">
                  <button
                    onClick={() => handleShareSticker(c.id, c.cartonNo)}
                    className="p-1.5 bg-indigo-600 text-white rounded shadow-md hover:bg-indigo-700 transition cursor-pointer"
                    title="Share as Image"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDownloadSticker(c.id, c.cartonNo)}
                    className="p-1.5 bg-emerald-600 text-white rounded shadow-md hover:bg-emerald-700 transition cursor-pointer"
                    title="Download as PNG"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Sticker Header with Customized Logo, Font & Styling */}
                <div 
                  className={`${isCompact ? 'pb-1 mb-1' : 'pb-2 mb-2'} flex items-center justify-between gap-2`}
                  style={{ borderBottom: `2px solid ${stickerSettings.borderColor}` }}
                >
                  <div className={`flex ${stickerSettings.logoPosition === 'top' ? 'flex-col items-start' : 'items-center gap-2.5'} flex-1 min-w-0`}>
                    {stickerSettings.logoUrl && (
                      <img 
                        src={stickerSettings.logoUrl} 
                        alt="Company Logo" 
                        style={{ height: `${Math.min(stickerSettings.logoHeight, isCompact ? 36 : 52)}px` }}
                        className="object-contain shrink-0 max-w-[120px]"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 
                        className={`${isCompact ? 'text-[10px]' : 'text-xs'} ${stickerSettings.headingWeight} ${
                          stickerSettings.uppercaseHeaders ? 'uppercase' : ''
                        } tracking-wider truncate`}
                        style={{ color: stickerSettings.borderColor }}
                      >
                        {companyDisplayName}
                      </h4>
                      <span className="text-[8px] text-slate-600 font-semibold block leading-tight truncate">
                        {subtitleText}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <span 
                      className={`inline-block font-black px-2 py-0.5 font-mono ${isCompact ? 'text-[10px]' : 'text-xs'}`}
                      style={{ 
                        backgroundColor: stickerSettings.borderColor, 
                        color: '#ffffff' 
                      }}
                    >
                      CTN: {c.cartonNo} / {summary.totalCtn}
                    </span>
                  </div>
                </div>

                {/* Order Specifics */}
                {stickerSettings.showOrderSpecs && (
                  <div className={`grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs border-b border-slate-300 ${isCompact ? 'py-0.5' : 'py-1'}`}>
                    <div>
                      <span className="text-[8px] font-bold text-slate-500 uppercase block">REF / PO:</span>
                      <span className={`font-bold font-mono text-slate-900 break-all ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
                        {sheetData.ref || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-slate-500 uppercase block">BUYER:</span>
                      {stickerSettings.showBuyerBadge ? (
                        <span 
                          className={`font-black px-1.5 py-0.2 rounded-none inline-block truncate max-w-full ${
                            isCompact ? 'text-[9px]' : 'text-[11px]'
                          }`}
                          style={{
                            backgroundColor: stickerSettings.badgeBgColor,
                            color: stickerSettings.badgeTextColor,
                          }}
                        >
                          {sheetData.buyer || 'N/A'}
                        </span>
                      ) : (
                        <span className={`font-bold text-slate-900 ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>
                          {sheetData.buyer || 'N/A'}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-slate-500 uppercase block">CUSTOMER:</span>
                      <span className={`font-semibold text-slate-800 truncate block ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>
                        {sheetData.customer || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-slate-500 uppercase block">SIZE / COLOR:</span>
                      <span className={`font-bold text-slate-900 ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>
                        {sheetData.size} | {sheetData.color}
                      </span>
                    </div>
                  </div>
                )}

                {/* Numerical Measurements Box */}
                <div 
                  className={`grid grid-cols-4 gap-1 text-center font-mono ${
                    isCompact ? 'my-1 p-1' : 'my-2 p-1.5'
                  }`}
                  style={{ border: `1px solid ${stickerSettings.borderColor}` }}
                >
                  <div className="border-r border-slate-300">
                    <span className="text-[8px] font-bold text-slate-600 uppercase block">GROSS WT</span>
                    <span className={`font-black text-slate-900 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                      {c.grossWt.toFixed(2)}
                    </span>
                    <span className="text-[8px] text-slate-500 block">Kg</span>
                  </div>
                  <div 
                    className="border-r border-slate-300"
                    style={{ backgroundColor: stickerSettings.netWtBoxBg }}
                  >
                    <span 
                      className="text-[8px] font-black uppercase block"
                      style={{ color: stickerSettings.borderColor }}
                    >
                      NET WT
                    </span>
                    <span 
                      className={`font-black ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}
                      style={{ color: stickerSettings.borderColor }}
                    >
                      {c.netWt.toFixed(2)}
                    </span>
                    <span className="text-[8px] block text-slate-600">Kg</span>
                  </div>
                  <div 
                    className="border-r border-slate-300"
                    style={{ backgroundColor: stickerSettings.lengthBoxBg }}
                  >
                    <span className="text-[8px] font-bold text-slate-700 uppercase block">LENGTH (MTR)</span>
                    <span className={`font-black text-slate-900 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                      {c.lengthMtr.toFixed(2)}
                    </span>
                    <span className="text-[8px] text-slate-600 block">Mtr</span>
                  </div>
                  <div className="bg-slate-50">
                    <span className="text-[8px] font-bold text-slate-700 uppercase block">LENGTH (GRY)</span>
                    <span className={`font-black text-slate-900 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                      {c.lengthGry.toFixed(2)}
                    </span>
                    <span className="text-[8px] text-slate-600 block">Gry</span>
                  </div>
                </div>

                {/* Footer Section: Barcode + Scannable QR Code */}
                <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-200">
                  <div className="flex flex-col min-w-0">
                    {/* Decorative Barcode Strip */}
                    {stickerSettings.showBarcode && (
                      <div className={`${isCompact ? 'h-3' : 'h-4.5'} flex items-center gap-[2px] opacity-80 mb-0.5`}>
                        {[3,1,2,4,1,3,2,1,4,2,3,1,2,4,1,2,3,1,4,2,1,3,2,4,1,3].map((w, i) => (
                          <div 
                            key={i} 
                            className="h-full" 
                            style={{ 
                              width: `${w}px`,
                              backgroundColor: stickerSettings.borderColor
                            }} 
                          />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span 
                        className="text-[9px] font-mono tracking-widest font-bold"
                        style={{ color: stickerSettings.borderColor }}
                      >
                        *{sheetData.ref}-{c.cartonNo}*
                      </span>
                      {stickerSettings.showUnitWeight && (
                        <span className="text-[9px] text-slate-500 font-mono">
                          ({c.wtPerUnit.toFixed(2)} gm/m)
                        </span>
                      )}
                    </div>
                    {stickerSettings.showFooterBranding && stickerSettings.footerBrandingText && (
                      <span className="text-[7px] font-bold text-slate-400 tracking-wider uppercase mt-0.5 truncate block">
                        {stickerSettings.footerBrandingText}
                      </span>
                    )}
                  </div>

                  {/* High-Resolution QR Code */}
                  {showQrCode && (
                    <div 
                      onClick={() => onOpenCartonQr && onOpenCartonQr(c)}
                      className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-300 rounded cursor-pointer hover:border-indigo-500 transition group/qr shrink-0"
                      title="Click to view & scan carton detail QR"
                    >
                      <div className="bg-white p-0.5">
                        <QRCodeSVG
                          value={qrUrl}
                          size={qrSize}
                          level="M"
                          fgColor={stickerSettings.qrColor || stickerSettings.borderColor}
                          includeMargin={false}
                        />
                      </div>
                      {!isCompact && qrSize < 64 && (
                        <div className="hidden sm:flex flex-col text-left print:hidden">
                          <span className="text-[8px] font-black uppercase text-indigo-700 flex items-center gap-0.5">
                            <QrCode className="w-2.5 h-2.5" />
                            QR Scan
                          </span>
                          <span className="text-[7.5px] text-slate-400 font-mono">
                            CTN #{c.cartonNo}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Settings Modal */}
      <StickerSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={stickerSettings}
        onUpdateSettings={handleUpdateSettings}
        sheetData={sheetData}
        lang={lang}
      />
    </div>
  );
};
