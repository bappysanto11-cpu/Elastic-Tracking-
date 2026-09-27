import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CartonRow, PackingSheetData } from '../types/calculator';
import { Language } from '../utils/translations';
import { generateCartonPreviewUrl, CartonQrPayload } from '../utils/qrCarton';
import { 
  QrCode, 
  X, 
  Printer, 
  Copy, 
  Check, 
  ExternalLink, 
  Share2, 
  Package, 
  Scale, 
  Ruler, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight,
  Download
} from 'lucide-react';

interface CartonQrDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  carton: CartonRow | null;
  sheetData: PackingSheetData;
  totalCtn: number;
  lang: Language;
  onNavigateCarton?: (direction: 'prev' | 'next') => void;
  hasPrevCarton?: boolean;
  hasNextCarton?: boolean;
  directQrPayload?: CartonQrPayload | null;
}

export const CartonQrDetailModal: React.FC<CartonQrDetailModalProps> = ({
  isOpen,
  onClose,
  carton,
  sheetData,
  totalCtn,
  lang,
  onNavigateCarton,
  hasPrevCarton,
  hasNextCarton,
  directQrPayload,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [qrSize, setQrSize] = useState<number>(135);

  if (!isOpen) return null;

  // Use direct payload if loaded from QR code scan, or carton state
  const ctnNo = directQrPayload ? directQrPayload.ctn : carton?.cartonNo || 1;
  const totalCount = directQrPayload ? directQrPayload.totalCtn : totalCtn || sheetData.cartons.length || 1;
  const grossWt = directQrPayload ? directQrPayload.gross : carton?.grossWt || 0;
  const tareWt = directQrPayload ? directQrPayload.tare : carton?.tareWt || sheetData.defaultTare || 1;
  const netWt = directQrPayload ? directQrPayload.net : carton?.netWt || 0;
  const lengthMtr = directQrPayload ? directQrPayload.mtr : carton?.lengthMtr || 0;
  const lengthGry = directQrPayload ? directQrPayload.gry : carton?.lengthGry || 0;
  const lengthYds = directQrPayload ? directQrPayload.yds : (carton?.lengthYds || (lengthMtr * 1.09361));
  const wtPerUnit = directQrPayload ? directQrPayload.unit : carton?.wtPerUnit || sheetData.defaultWtPerUnit || 7.2;
  const companyName = directQrPayload ? directQrPayload.company : sheetData.companyName || 'GOOD & FAST Pa. Co. Ltd';
  const refPo = directQrPayload ? directQrPayload.ref : sheetData.ref;
  const buyer = directQrPayload ? directQrPayload.buyer : sheetData.buyer;
  const customer = directQrPayload ? directQrPayload.customer : sheetData.customer;
  const size = directQrPayload ? directQrPayload.size : sheetData.size;
  const color = directQrPayload ? directQrPayload.color : sheetData.color;

  const netWtLbs = (netWt * 2.20462).toFixed(2);
  const netWtGm = Math.round(netWt * 1000);
  const netGrossRatio = grossWt > 0 ? ((netWt / grossWt) * 100).toFixed(1) : '0';

  // Construct target QR Link
  const mockCartonObj: CartonRow = {
    id: carton?.id || `carton-${ctnNo}`,
    cartonNo: ctnNo,
    grossWt,
    tareWt,
    netWt,
    wtPerUnit,
    lengthMtr,
    lengthGry,
    lengthYds,
  };

  const previewUrl = generateCartonPreviewUrl(mockCartonObj, sheetData, totalCount);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(previewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyInspectionSummary = () => {
    const summaryText = `📦 CARTON SPECIFICATION [CTN #${ctnNo} / ${totalCount}]
━━━━━━━━━━━━━━━━━━━━━━━
🏢 Company: ${companyName}
📋 REF/PO: ${refPo || 'N/A'}
🏷️ Buyer: ${buyer || 'N/A'}
👤 Customer: ${customer || 'N/A'}
🎨 Size/Color: ${size || 'N/A'} | ${color || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━
⚖️ Gross Wt: ${grossWt.toFixed(2)} kg
📦 Tare Wt: ${tareWt.toFixed(2)} kg
✅ NET WT: ${netWt.toFixed(2)} kg (${netWtLbs} lbs / ${netWtGm} gm)
📏 Length (Mtr): ${lengthMtr.toFixed(2)} M
📐 Length (Gry): ${lengthGry.toFixed(2)} Gross Yds
📊 Unit Wt: ${wtPerUnit.toFixed(2)} gm/m
🔗 Live Inspection Link: ${previewUrl}
`;
    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `📦 Carton Inspection #${ctnNo}/${totalCount} (${companyName}) - Net Wt: ${netWt.toFixed(2)}kg, Length: ${lengthMtr.toFixed(2)}m. View Details: ${previewUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handlePrintSingleSticker = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white border border-neutral-300 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-neutral-900 animate-in fade-in zoom-in-95 duration-150 my-auto print:border-none print:shadow-none print:text-black print:bg-white print:w-full">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-200 bg-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900">
                  {lang === 'en' ? 'Carton QR Inspection & Live Preview' : 'কার্টন কিউআর কোড ও লাইভ বিবরণ'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                {lang === 'en' 
                  ? 'Scan with phone camera to view full carton specifications' 
                  : 'ফোনের ক্যামেরা দিয়ে স্ক্যান করলেই এই কার্টনের বিস্তারিত দেখা যাবে'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onNavigateCarton && (
              <div className="flex items-center bg-neutral-100 rounded-lg p-0.5 border border-neutral-300 mr-2">
                <button
                  disabled={!hasPrevCarton}
                  onClick={() => onNavigateCarton('prev')}
                  className="p-1.5 text-neutral-600 hover:text-neutral-900 disabled:opacity-30 rounded transition cursor-pointer"
                  title="Previous Carton"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono font-bold px-2 text-neutral-900">
                  {ctnNo} / {totalCount}
                </span>
                <button
                  disabled={!hasNextCarton}
                  onClick={() => onNavigateCarton('next')}
                  className="p-1.5 text-neutral-600 hover:text-neutral-900 disabled:opacity-30 rounded transition cursor-pointer"
                  title="Next Carton"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Printable Label Card */}
        <div className="p-5 sm:p-6 space-y-5 bg-white">
          
          {/* Main Inspection Card with QR */}
          <div className="bg-white text-neutral-900 rounded-xl p-5 border-2 border-neutral-900 shadow-md">
            
            {/* Header / Brand info */}
            <div className="border-b-2 border-neutral-900 pb-3 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-neutral-900">
                  {companyName}
                </h2>
                <div className="text-[11px] font-semibold text-neutral-600">
                  GARMENT PACKING & ACCESSORIES SPECIFICATION
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="bg-neutral-900 text-white font-black px-3 py-1 text-sm font-mono tracking-wide rounded-none">
                  CTN #{ctnNo} / {totalCount}
                </span>
              </div>
            </div>

            {/* Middle Grid: Details & Live QR Code */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              
              {/* Order Info & Specifications (8 cols) */}
              <div className="md:col-span-8 space-y-3">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase block">REF / PO:</span>
                    <span className="font-bold font-mono text-neutral-900 break-all">{refPo || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase block">BUYER:</span>
                    <span className="font-black text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-300 inline-block">
                      {buyer || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase block">CUSTOMER:</span>
                    <span className="font-semibold text-neutral-800">{customer || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase block">SIZE / COLOR:</span>
                    <span className="font-bold text-neutral-900">{size || 'N/A'} | {color || 'N/A'}</span>
                  </div>
                </div>

                {/* Primary Weight Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-300">
                    <span className="text-[9px] font-bold text-neutral-600 uppercase block">Gross Wt</span>
                    <span className="text-base font-black text-neutral-900">{grossWt.toFixed(2)}</span>
                    <span className="text-[9px] text-neutral-500 block">Kg</span>
                  </div>

                  <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-300">
                    <span className="text-[9px] font-bold text-neutral-600 uppercase block">Tare Wt</span>
                    <span className="text-base font-black text-neutral-700">{tareWt.toFixed(2)}</span>
                    <span className="text-[9px] text-neutral-500 block">Kg</span>
                  </div>

                  <div className="bg-neutral-100 p-2 rounded-lg border-2 border-neutral-900">
                    <span className="text-[9px] font-black text-neutral-900 uppercase block">TOTAL NET WT</span>
                    <span className="text-lg font-black text-neutral-950 leading-tight">{netWt.toFixed(2)}</span>
                    <span className="text-[9px] font-bold text-neutral-700 block">Kg ({netWtLbs} Lbs)</span>
                  </div>
                </div>

                {/* Length & Unit Wt Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                  <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                    <span className="text-[9px] font-bold text-neutral-800 uppercase block">Length (Mtr)</span>
                    <span className="text-sm font-black text-neutral-900">{lengthMtr.toFixed(2)}</span>
                    <span className="text-[9px] text-neutral-600 block">Meters</span>
                  </div>

                  <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                    <span className="text-[9px] font-bold text-neutral-800 uppercase block">Length (Gry)</span>
                    <span className="text-sm font-black text-neutral-900">{lengthGry.toFixed(2)}</span>
                    <span className="text-[9px] text-neutral-600 block">Gross Yards</span>
                  </div>

                  <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                    <span className="text-[9px] font-bold text-neutral-800 uppercase block">Unit Weight</span>
                    <span className="text-sm font-black text-neutral-900">{wtPerUnit.toFixed(2)}</span>
                    <span className="text-[9px] text-neutral-600 block">gm / Meter</span>
                  </div>
                </div>
              </div>

              {/* Scannable QR Code Section (4 cols) */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-3 bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-xl">
                <div className="bg-white p-2.5 rounded-lg border border-neutral-300 shadow-xs mb-2">
                  <QRCodeSVG
                    value={previewUrl}
                    size={qrSize}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                
                {/* Size Controls */}
                <div className="flex items-center gap-2 mb-3 print:hidden">
                  <button 
                    onClick={() => setQrSize(Math.max(64, qrSize - 16))}
                    className="w-7 h-7 flex items-center justify-center bg-white border border-neutral-300 rounded shadow-xs hover:bg-neutral-100 transition cursor-pointer text-neutral-700"
                  >
                    <span className="font-bold">-</span>
                  </button>
                  <span className="text-[10px] font-bold text-neutral-600 w-12 text-center">{qrSize}px</span>
                  <button 
                    onClick={() => setQrSize(Math.min(250, qrSize + 16))}
                    className="w-7 h-7 flex items-center justify-center bg-white border border-neutral-300 rounded shadow-xs hover:bg-neutral-100 transition cursor-pointer text-neutral-700"
                  >
                    <span className="font-bold">+</span>
                  </button>
                </div>

                <span className="text-[10px] font-bold font-mono text-neutral-900 uppercase tracking-tight text-center">
                  SCAN TO VERIFY CTN #{ctnNo}
                </span>
                <span className="text-[9px] text-neutral-500 font-mono mt-0.5">
                  *{refPo}-{ctnNo}*
                </span>
              </div>
            </div>

            {/* Bottom Certification Banner */}
            <div className="mt-3 pt-2.5 border-t border-neutral-200 flex items-center justify-between text-[10px] font-mono text-neutral-500">
              <span>Net Yield: {netGrossRatio}% • {netWtGm.toLocaleString()} gm</span>
              <span>QC Inspection Standard PASS</span>
            </div>
          </div>

          {/* Quick Action Buttons & Direct Link Box (Screen only) */}
          <div className="space-y-3 print:hidden">
            {/* Direct URL Input Bar */}
            <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-300 rounded-xl p-2">
              <input
                type="text"
                readOnly
                value={previewUrl}
                className="w-full bg-transparent text-neutral-800 text-xs font-mono px-2 py-1 focus:outline-none select-all"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shrink-0 transition cursor-pointer shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>

            {/* Quick Share / Export Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyInspectionSummary}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-300 text-xs font-semibold text-neutral-800 transition cursor-pointer shadow-xs"
                >
                  {copiedSummary ? <Check className="w-3.5 h-3.5 text-neutral-900" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSummary ? 'Copied Details' : 'Copy Specs Text'}</span>
                </button>

                <button
                  onClick={handleShareWhatsApp}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-300 text-xs font-semibold text-neutral-800 transition cursor-pointer shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintSingleSticker}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Sticker with QR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
