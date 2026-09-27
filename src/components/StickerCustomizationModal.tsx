import React, { useState, useRef } from 'react';
import { 
  X, 
  Palette, 
  Type, 
  Image as ImageIcon, 
  Sliders, 
  RotateCcw, 
  Check, 
  Upload, 
  Trash2, 
  Eye, 
  Sparkles,
  QrCode,
  Layers,
  Building2,
  BadgePercent,
  CheckCircle2,
  Scissors,
  FileText,
  Package,
  MoveUp,
  MoveDown,
  ListOrdered,
  Shuffle,
  SlidersHorizontal,
  Minus,
  Plus,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  StickerCustomizationSettings, 
  StickerFontFamily, 
  StickerThemePreset, 
  FONT_FAMILY_STYLES,
  STICKER_THEME_PRESETS,
  DEFAULT_STICKER_SETTINGS,
  StickerBulkConfig,
  StickerPaperSize,
  STICKER_PAPER_SIZES,
  DEFAULT_BULK_CONFIG
} from '../types/stickerSettings';
import { applyThemePreset } from '../utils/stickerSettingsStorage';
import { Language, translations } from '../utils/translations';
import { PackingSheetData, CartonRow } from '../types/calculator';
import { 
  getItemTechnicalRows, 
  getDefaultSpecsForItem, 
  ITEM_SPEC_SUGGESTIONS 
} from '../utils/itemTechnicalSpecs';
import { AutoFitText } from './AutoFitText';

export type CustomizationTabKey = 'paper' | 'branding' | 'specs';

interface StickerCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StickerCustomizationSettings;
  onUpdateSettings: (newSettings: StickerCustomizationSettings) => void;
  bulkConfig: StickerBulkConfig;
  onUpdateBulkConfig: (newConfig: StickerBulkConfig) => void;
  sheetData: PackingSheetData;
  onUpdateHeader?: (updated: Partial<PackingSheetData>) => void;
  lang: Language;
  densityMode: 'compact' | 'comfort';
  setDensityMode: (mode: 'compact' | 'comfort') => void;
  showCropMarks: boolean;
  setShowCropMarks: (show: boolean) => void;
  showQrCode: boolean;
  setShowQrCode: (show: boolean) => void;
  qrSize: number;
  setQrSize: (size: number) => void;
  onSortCartons: (type: 'weight-asc' | 'weight-desc' | 'qty-desc' | 'reverse' | 'carton-asc') => void;
  onOpenCapacityModal?: () => void;
  totalLabelsCount: number;
}

export const StickerCustomizationModal: React.FC<StickerCustomizationModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  bulkConfig,
  onUpdateBulkConfig,
  sheetData,
  onUpdateHeader,
  lang,
  densityMode,
  setDensityMode,
  showCropMarks,
  setShowCropMarks,
  showQrCode,
  setShowQrCode,
  qrSize,
  setQrSize,
  onSortCartons,
  onOpenCapacityModal,
  totalLabelsCount,
}) => {
  const [activeTab, setActiveTab] = useState<CustomizationTabKey>('paper');
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[lang];

  if (!isOpen) return null;

  const currentPaper = STICKER_PAPER_SIZES[bulkConfig.paperSize] || STICKER_PAPER_SIZES['a4-grid-4'];
  const currentItemKey = sheetData.itemType || 'elastic';
  const isPcsMode = sheetData.deliveryUnit === 'pcs' || currentItemKey === 'bow' || currentItemKey === 'drawstring';
  const technicalRows = getItemTechnicalRows(sheetData, lang);

  const handleSettingsChange = <K extends keyof StickerCustomizationSettings>(
    key: K,
    value: StickerCustomizationSettings[K]
  ) => {
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  };

  const handlePaperSizeChange = (paperSize: StickerPaperSize) => {
    const target = STICKER_PAPER_SIZES[paperSize];
    const isRoll = target.category === 'roll';
    
    onUpdateBulkConfig({
      ...bulkConfig,
      paperSize,
      uniformPadding: target.recommendedPadding,
      fontScale: target.recommendedFontScale,
      forcePageBreakPerLabel: isRoll,
      pageBreakAfterN: target.labelsPerPage,
    });
  };

  const handleSelectPreset = (preset: StickerThemePreset) => {
    const updated = applyThemePreset(settings, preset);
    onUpdateSettings(updated);
  };

  const handleResetToDefault = () => {
    if (window.confirm(lang === 'en' ? 'Reset all sticker settings to factory defaults?' : 'স্টিকারের সকল সেটিংস ফ্যাক্টরি ডিফল্টে রিসেট করবেন?')) {
      onUpdateSettings(DEFAULT_STICKER_SETTINGS);
      onUpdateBulkConfig(DEFAULT_BULK_CONFIG);
      setDensityMode('comfort');
      setShowCropMarks(false);
      setShowQrCode(true);
      setQrSize(56);
    }
  };

  const handleLogoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert(lang === 'en' ? 'Please upload an image file (PNG, JPG, SVG, WebP)' : 'অনুগ্রহ করে ইমেজ ফাইল আপলোড করুন (PNG, JPG, SVG)');
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      alert(lang === 'en' ? 'Logo file size should be less than 1.5 MB' : 'লোগো ফাইল সাইজ ১.৫ MB এর কম হতে হবে');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        handleSettingsChange('logoUrl', e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQuickItemSwitch = (newItemType: 'elastic' | 'drawstring' | 'bow' | 'tape') => {
    if (!onUpdateHeader) return;
    const isPcs = newItemType === 'bow' || newItemType === 'drawstring';
    const defaultSpecs = getDefaultSpecsForItem(newItemType);

    onUpdateHeader({
      itemType: newItemType,
      deliveryUnit: isPcs ? 'pcs' : 'meters',
      customItemName:
        newItemType === 'elastic' ? '🧵 ELASTIC' :
        newItemType === 'drawstring' ? '🪢 DRAWSTRING CORD' :
        newItemType === 'bow' ? '🎀 BOW' : '🏷️ WEBBING TAPE',
      ...defaultSpecs,
    });
  };

  // Preview Label Mock Data
  const previewGrossWt = 18.50;
  const previewNetWt = 16.20;
  const previewLengthMtr = 1200;
  const previewQtyPcs = 2000;
  const previewCartonNo = 1;
  const fontConfig = FONT_FAMILY_STYLES[settings.fontFamily] || FONT_FAMILY_STYLES['sans'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl bg-white border border-neutral-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-white border-b border-neutral-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 flex items-center gap-2">
                <span>{lang === 'en' ? 'Sticker Customization & Settings' : 'স্টিকার কাস্টমাইজেশন ও সেটিংস'}</span>
                <span className="text-[10px] bg-neutral-100 text-neutral-800 border border-neutral-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  {totalLabelsCount} {lang === 'en' ? 'Labels' : 'কার্টন'}
                </span>
              </h3>
              <p className="text-[11px] text-neutral-500">
                {lang === 'en'
                  ? 'Configure paper layout, styling, branding, and item technical specs'
                  : 'পেপার লেআউট, স্টাইলিং, ব্র্যান্ডিং এবং আইটেমের টেকনিক্যাল স্পেক্স নির্ধারণ করুন'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition cursor-pointer"
            title={lang === 'en' ? 'Close' : 'বন্ধ করুন'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Main Categorized Tabs (Paper, Style, Specs) */}
        <div className="px-5 bg-neutral-50 border-b border-neutral-200 flex items-center gap-2 overflow-x-auto py-2 shrink-0">
          {/* Tab 1: Paper & Layout */}
          <button
            type="button"
            onClick={() => setActiveTab('paper')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'paper'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{lang === 'en' ? 'Paper & Layout' : '📄 পেপার ও লেআউট'}</span>
          </button>

          {/* Tab 2: Style & Branding */}
          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'branding'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>{lang === 'en' ? 'Style & Branding' : '🎨 স্টাইল ও ব্র্যান্ডিং'}</span>
          </button>

          {/* Tab 3: Item & Specs */}
          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'specs'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{lang === 'en' ? 'Item & Specs' : '🧵 আইটেম ও স্পেক্স'}</span>
          </button>
        </div>

        {/* Modal Body: 2 Columns on Desktop (Controls on left, Live Sticker Preview on right) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 text-neutral-800 bg-white">
          
          {/* Controls Column (7 Cols on desktop) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* ========================================================
                TAB 1: PAPER & LAYOUT
               ======================================================== */}
            {activeTab === 'paper' && (
              <div className="space-y-4">
                
                {/* 1. Paper Size Selection */}
                <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200 space-y-2.5">
                  <label className="block text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-neutral-700" />
                      <span>{lang === 'en' ? 'Paper Size & Printer Format' : 'কাগজের সাইজ ও প্রিন্টার ফরম্যাট'}</span>
                    </span>
                    <span className="text-[11px] font-mono text-neutral-900 font-bold bg-white px-2 py-0.5 rounded border border-neutral-300">
                      {currentPaper.name}
                    </span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.values(STICKER_PAPER_SIZES).map((p) => {
                      const isSelected = bulkConfig.paperSize === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handlePaperSizeChange(p.id)}
                          className={`p-2.5 rounded-lg border text-left flex items-start justify-between transition cursor-pointer ${
                            isSelected
                              ? 'bg-neutral-900 border-neutral-900 text-white shadow-xs'
                              : 'bg-white border-neutral-200 hover:border-neutral-400 text-neutral-800'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs flex items-center gap-1.5">
                              <span>{p.category === 'roll' ? '🏷️' : '📄'}</span>
                              <span>{p.name}</span>
                            </div>
                            <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                              {p.description}
                            </span>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-white shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Density Mode (Compact vs Comfort) */}
                <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200 space-y-2">
                  <label className="block text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    {lang === 'en' ? 'Density Mode (Spacing & Font Scale)' : 'ডেনসিটি মোড (ফন্ট ও স্পেসিং)'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDensityMode('compact')}
                      className={`p-2.5 rounded-lg border text-center transition cursor-pointer ${
                        densityMode === 'compact'
                          ? 'bg-neutral-900 border-neutral-900 text-white font-bold shadow-xs'
                          : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 text-xs">
                        <Minimize2 className="w-3.5 h-3.5" />
                        <span>{lang === 'en' ? 'Compact' : 'কমপ্যাক্ট (Compact)'}</span>
                      </div>
                      <span className={`text-[10px] block mt-0.5 ${densityMode === 'compact' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {lang === 'en' ? 'Low paper waste, dense info' : 'কাগজ সাশ্রয়ী ও কমপ্যাক্ট'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDensityMode('comfort')}
                      className={`p-2.5 rounded-lg border text-center transition cursor-pointer ${
                        densityMode === 'comfort'
                          ? 'bg-neutral-900 border-neutral-900 text-white font-bold shadow-xs'
                          : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 text-xs">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>{lang === 'en' ? 'Comfort' : 'কমফোর্ট (Comfort)'}</span>
                      </div>
                      <span className={`text-[10px] block mt-0.5 ${densityMode === 'comfort' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {lang === 'en' ? 'Larger text & easy scanning' : 'বড় লেখা ও সহজে পাঠযোগ্য'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 3. Cutting Guides (Crop Marks) & Auto-Fit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Scissors Crop Marks */}
                  <div className="bg-neutral-50/80 p-3 rounded-xl border border-neutral-200 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                        <Scissors className="w-3.5 h-3.5 text-neutral-700" />
                        <span>{lang === 'en' ? 'Scissors Crop Marks' : 'কাটিং দাগ (Crop Marks)'}</span>
                      </div>
                      <span className="text-[10px] text-neutral-500 block mt-0.5">
                        {lang === 'en' ? 'Dashed cutting lines on print' : 'প্রিন্টে কাঁচি দিয়ে কাটার দাগ'}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showCropMarks}
                      onClick={() => setShowCropMarks(!showCropMarks)}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                        showCropMarks ? 'bg-neutral-900' : 'bg-neutral-300'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        showCropMarks ? 'translate-x-4.5' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Auto-Scale Long Text */}
                  <div className="bg-neutral-50/80 p-3 rounded-xl border border-neutral-200 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                        <span className="font-mono text-xs font-black text-neutral-800">A↕</span>
                        <span>{lang === 'en' ? 'Auto-Fit Long Text' : 'অটো-ফিট টেক্সট'}</span>
                      </div>
                      <span className="text-[10px] text-neutral-500 block mt-0.5">
                        {lang === 'en' ? 'Prevent text overflow' : 'বড় লেখা স্বয়ংক্রিয়ভাবে ফিট'}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.autoScaleLongText !== false}
                      onClick={() => {
                        handleSettingsChange('autoScaleLongText', settings.autoScaleLongText === false ? true : false);
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                        settings.autoScaleLongText !== false ? 'bg-neutral-900' : 'bg-neutral-300'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        settings.autoScaleLongText !== false ? 'translate-x-4.5' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* 4. QR Code Settings */}
                <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                      <QrCode className="w-4 h-4 text-neutral-700" />
                      <span>{lang === 'en' ? 'QR Code Label Scanner' : 'কিউআর কোড প্রদর্শন'}</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showQrCode}
                      onClick={() => setShowQrCode(!showQrCode)}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                        showQrCode ? 'bg-neutral-900' : 'bg-neutral-300'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        showQrCode ? 'translate-x-4.5' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {showQrCode && (
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-200 gap-2">
                      <span className="text-[11px] text-neutral-600">
                        {lang === 'en' ? 'QR Code Size:' : 'কিউআর কোড সাইজ:'}
                      </span>
                      <div className="flex items-center bg-white rounded-lg p-0.5 border border-neutral-300">
                        <button
                          type="button"
                          onClick={() => setQrSize(Math.max(36, qrSize - 6))}
                          className="p-1 hover:bg-neutral-100 rounded text-neutral-700 transition cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-mono font-bold text-neutral-900">
                          {qrSize}px
                        </span>
                        <button
                          type="button"
                          onClick={() => setQrSize(Math.min(100, qrSize + 6))}
                          className="p-1 hover:bg-neutral-100 rounded text-neutral-700 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Sticker Padding Slider */}
                <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-900">
                      {lang === 'en' ? 'Internal Padding / Margin:' : 'স্টিকারের অভ্যন্তরীণ প্যাডিং:'}
                    </span>
                    <span className="font-mono font-bold text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-300">
                      {bulkConfig.uniformPadding}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="22"
                    step="1"
                    value={bulkConfig.uniformPadding}
                    onChange={(e) => {
                      onUpdateBulkConfig({
                        ...bulkConfig,
                        uniformPadding: parseInt(e.target.value, 10),
                      });
                    }}
                    className="w-full accent-neutral-900 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                    <span>6px (Tight)</span>
                    <span>12px (Balanced)</span>
                    <span>22px (Spacious)</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                TAB 2: STYLE & BRANDING
               ======================================================== */}
            {activeTab === 'branding' && (
              <div className="space-y-4">
                
                {/* 1. Theme Presets */}
                <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200 space-y-2.5">
                  <label className="block text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    {lang === 'en' ? 'Theme Presets' : 'থিম প্রিসেট'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'classic-mono', label: 'Factory Mono', bg: '#000000' },
                      { id: 'navy-industrial', label: 'Dark Charcoal', bg: '#171717' },
                      { id: 'emerald-qc', label: 'Pure Black', bg: '#0a0a0a' },
                      { id: 'crimson-export', label: 'Onyx Industrial', bg: '#18181b' },
                      { id: 'amber-warehouse', label: 'Stark Mono', bg: '#262626' },
                      { id: 'slate-modern', label: 'Modern Slate', bg: '#3f3f46' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectPreset(item.id as StickerThemePreset)}
                        className={`p-2 rounded-lg border text-left flex items-center justify-between transition cursor-pointer ${
                          settings.themePreset === item.id
                            ? 'bg-neutral-900 border-neutral-900 text-white shadow-xs font-bold'
                            : 'bg-white border-neutral-200 hover:border-neutral-400 text-neutral-800'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-neutral-300 shrink-0"
                            style={{ backgroundColor: item.bg }}
                          />
                          <span className="text-[11px] font-semibold truncate">{item.label}</span>
                        </div>
                        {settings.themePreset === item.id && (
                          <Check className="w-3 h-3 text-white shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Company Name & Logo */}
                <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200 space-y-3">
                  <label className="block text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-neutral-700" />
                    <span>{lang === 'en' ? 'Company Branding & Logo' : 'কোম্পানি নাম ও লোগো'}</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-neutral-600 mb-1 font-semibold">
                        {lang === 'en' ? 'Company Header Name:' : 'কোম্পানির নাম:'}
                      </label>
                      <input
                        type="text"
                        value={settings.customCompanyName || sheetData.companyName || ''}
                        placeholder="GOOD & FAST Pa. Co. Ltd"
                        onChange={(e) => handleSettingsChange('customCompanyName', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 uppercase font-bold focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-600 mb-1 font-semibold">
                        {lang === 'en' ? 'Subtitle / Slogan:' : 'সাব-টাইটেল / স্লোগান:'}
                      </label>
                      <input
                        type="text"
                        value={settings.customSubtitle || ''}
                        placeholder="HIGH SPEED AUTOMATION PACKING"
                        onChange={(e) => handleSettingsChange('customSubtitle', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Logo Upload Box */}
                  <div className="pt-1">
                    {settings.logoUrl ? (
                      <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-neutral-300">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={settings.logoUrl}
                            alt="Logo"
                            className="h-9 max-w-[100px] object-contain bg-neutral-50 p-1 rounded border border-neutral-200"
                          />
                          <span className="text-xs font-semibold text-neutral-900">
                            ✓ {lang === 'en' ? 'Active Logo Loaded' : 'লোগো সফলভাবে লোড হয়েছে'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSettingsChange('logoUrl', undefined)}
                          className="px-2.5 py-1 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900 border border-neutral-300 rounded text-xs flex items-center gap-1 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{lang === 'en' ? 'Remove' : 'মুছুন'}</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingLogo(true); }}
                        onDragLeave={() => setIsDraggingLogo(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingLogo(false);
                          if (e.dataTransfer.files?.[0]) handleLogoUpload(e.dataTransfer.files[0]);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-3.5 border-2 border-dashed rounded-xl text-center cursor-pointer transition ${
                          isDraggingLogo
                            ? 'border-neutral-900 bg-neutral-100 text-neutral-900'
                            : 'border-neutral-300 hover:border-neutral-500 bg-white text-neutral-600'
                        }`}
                      >
                        <Upload className="w-5 h-5 mx-auto text-neutral-700 mb-1" />
                        <span className="text-xs font-semibold block text-neutral-800">
                          {lang === 'en' ? 'Upload Company Logo (PNG, JPG, SVG)' : 'কোম্পানি লোগো আপলোড করুন'}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {lang === 'en' ? 'Click to browse or drag & drop' : 'ক্লিক করুন বা ড্র্যাগ করে ছাড়ুন'}
                        </span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Border Color & Width */}
                <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200 space-y-2.5">
                  <label className="block text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    {lang === 'en' ? 'Border & Color Styling' : 'বর্ডার ও ফ্রেমের রঙ'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="block text-[11px] text-neutral-600 mb-1 font-semibold">
                        {lang === 'en' ? 'Border Color:' : 'বর্ডারের রঙ:'}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.borderColor}
                          onChange={(e) => {
                            handleSettingsChange('borderColor', e.target.value);
                            handleSettingsChange('themePreset', 'custom');
                          }}
                          className="w-8 h-8 rounded-lg border border-neutral-300 bg-white cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={settings.borderColor}
                          onChange={(e) => {
                            handleSettingsChange('borderColor', e.target.value);
                            handleSettingsChange('themePreset', 'custom');
                          }}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-mono text-neutral-900"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="block text-[11px] text-neutral-600 mb-1 font-semibold">
                        {lang === 'en' ? 'Border Thickness:' : 'বর্ডারের পুরত্ব:'}
                      </span>
                      <select
                        value={settings.borderWidth}
                        onChange={(e) => handleSettingsChange('borderWidth', e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 font-medium focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                      >
                        <option value="1px">1px (Thin)</option>
                        <option value="2px">2px (Standard Factory)</option>
                        <option value="3px">3px (Bold Heavy)</option>
                        <option value="4px">4px (Ultra Bold)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 4. Font Family */}
                <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200 space-y-2">
                  <label className="block text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-neutral-700" />
                    <span>{lang === 'en' ? 'Label Typography & Font Family' : 'স্টিকারের ফন্ট স্টাইল'}</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(FONT_FAMILY_STYLES) as [StickerFontFamily, { name: string; cssClass: string; label: string }][]).map(([key, f]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSettingsChange('fontFamily', key)}
                        className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                          settings.fontFamily === key
                            ? 'bg-neutral-900 border-neutral-900 text-white font-bold shadow-xs'
                            : 'bg-white border-neutral-200 text-neutral-800 hover:border-neutral-400'
                        }`}
                      >
                        <span className={`text-xs block ${f.cssClass}`}>{f.label}</span>
                        <span className={`text-[10px] block truncate ${settings.fontFamily === key ? 'text-neutral-300' : 'text-neutral-500'}`}>{f.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Buyer Badge */}
                <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900">
                      {lang === 'en' ? 'Highlight Buyer Badge' : 'বায়ার নাম হাইলাইট ব্যাজ'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.showBuyerBadge}
                      onClick={() => handleSettingsChange('showBuyerBadge', !settings.showBuyerBadge)}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                        settings.showBuyerBadge ? 'bg-neutral-900' : 'bg-neutral-300'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        settings.showBuyerBadge ? 'translate-x-4.5' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {settings.showBuyerBadge && (
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-neutral-200 text-xs">
                      <div>
                        <span className="block text-[10px] text-neutral-600 mb-1 font-semibold">Badge Background:</span>
                        <input
                          type="color"
                          value={settings.badgeBgColor}
                          onChange={(e) => handleSettingsChange('badgeBgColor', e.target.value)}
                          className="w-full h-7 rounded border border-neutral-300 bg-white cursor-pointer"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-neutral-600 mb-1 font-semibold">Badge Text Color:</span>
                        <input
                          type="color"
                          value={settings.badgeTextColor}
                          onChange={(e) => handleSettingsChange('badgeTextColor', e.target.value)}
                          className="w-full h-7 rounded border border-neutral-300 bg-white cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
                TAB 3: ITEM & SPECS
               ======================================================== */}
            {activeTab === 'specs' && (
              <div className="space-y-4">
                
                {/* 1. Item Switcher (Elastic, Drawstring, Bow, Tape) */}
                <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200 space-y-2.5">
                  <label className="block text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-neutral-700" />
                      <span>{lang === 'en' ? 'Item Type & Delivery Unit' : 'আইটেমের ধরন ও ডেলিভারি ইউনিট'}</span>
                    </span>
                    <span className="text-[11px] font-mono text-neutral-900 font-bold bg-white px-2 py-0.5 rounded border border-neutral-300">
                      {isPcsMode ? 'PCS (Pieces)' : 'MTR (Meters)'}
                    </span>
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'elastic', label: '🧵 Elastic', unit: 'Mtr' },
                      { key: 'drawstring', label: '🪢 Drawstring', unit: 'Pcs' },
                      { key: 'bow', label: '🎀 Bow', unit: 'Pcs' },
                      { key: 'tape', label: '🏷️ Tape', unit: 'Mtr' },
                    ].map((item) => {
                      const isSelected = currentItemKey === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handleQuickItemSwitch(item.key as any)}
                          className={`p-2.5 rounded-lg border text-center transition cursor-pointer ${
                            isSelected
                              ? 'bg-neutral-900 border-neutral-900 text-white font-bold shadow-xs'
                              : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400'
                          }`}
                        >
                          <span className="text-xs block">{item.label}</span>
                          <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>({item.unit})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Technical Specifications for this Item */}
                {onUpdateHeader && (
                  <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                        <Layers className="w-3.5 h-3.5 text-neutral-700" />
                        <span>{lang === 'en' ? 'Technical Specs for Label' : 'লেবেলের টেকনিক্যাল স্পেসিফিকেশন'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const defaultSpecs = getDefaultSpecsForItem(currentItemKey);
                          onUpdateHeader(defaultSpecs);
                        }}
                        className="text-[10px] text-neutral-600 hover:text-neutral-900 flex items-center gap-1 cursor-pointer font-semibold"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{lang === 'en' ? 'Reset Specs' : 'স্পেক্স রিসেট'}</span>
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      {/* Field 1: STYLE / PATTERN */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-neutral-800 uppercase">
                          {currentItemKey === 'bow'
                            ? 'Bow Style / Pattern'
                            : currentItemKey === 'drawstring'
                            ? 'Cord Style'
                            : 'Weave / Construction Style'}
                        </label>
                        <input
                          type="text"
                          value={sheetData.style || ''}
                          placeholder="e.g. WOVEN JACQUARD"
                          onChange={(e) => onUpdateHeader({ style: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-xs text-neutral-900 uppercase font-bold focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                        />
                        <div className="flex flex-wrap gap-1">
                          {(ITEM_SPEC_SUGGESTIONS[currentItemKey]?.styles || ['STANDARD']).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => onUpdateHeader({ style: s })}
                              className={`text-[9.5px] px-2 py-0.5 rounded cursor-pointer transition border ${
                                sheetData.style === s
                                  ? 'bg-neutral-900 text-white border-neutral-900 font-bold'
                                  : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-300'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Field 2: GSM / Finish / Tipping */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-neutral-800 uppercase">
                          {ITEM_SPEC_SUGGESTIONS[currentItemKey]?.field2Label || 'GSM / Weight'}
                        </label>
                        {currentItemKey === 'elastic' || currentItemKey === 'tape' ? (
                          <input
                            type="text"
                            value={sheetData.gsm || ''}
                            placeholder="e.g. 240 GSM"
                            onChange={(e) => onUpdateHeader({ gsm: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-xs text-neutral-900 font-mono font-bold focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                          />
                        ) : currentItemKey === 'bow' ? (
                          <input
                            type="text"
                            value={sheetData.finish || ''}
                            placeholder="e.g. BAR-TACK ULTRASONIC"
                            onChange={(e) => onUpdateHeader({ finish: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-xs text-neutral-900 font-bold focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                          />
                        ) : (
                          <input
                            type="text"
                            value={sheetData.tipping || ''}
                            placeholder="e.g. CLEAR FILM TIP 15MM"
                            onChange={(e) => onUpdateHeader({ tipping: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-xs text-neutral-900 font-bold focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                          />
                        )}
                        <div className="flex flex-wrap gap-1">
                          {(ITEM_SPEC_SUGGESTIONS[currentItemKey]?.field2Options || []).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                if (currentItemKey === 'elastic' || currentItemKey === 'tape') {
                                  onUpdateHeader({ gsm: opt });
                                } else if (currentItemKey === 'bow') {
                                  onUpdateHeader({ finish: opt });
                                } else {
                                  onUpdateHeader({ tipping: opt });
                                }
                              }}
                              className={`text-[9.5px] px-2 py-0.5 rounded cursor-pointer transition border ${
                                ((currentItemKey === 'elastic' || currentItemKey === 'tape') && sheetData.gsm === opt) ||
                                (currentItemKey === 'bow' && sheetData.finish === opt) ||
                                (currentItemKey === 'drawstring' && sheetData.tipping === opt)
                                  ? 'bg-neutral-900 text-white border-neutral-900 font-bold'
                                  : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-300'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Field 3: Stretch / Pattern / Finish */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-neutral-800 uppercase">
                          {ITEM_SPEC_SUGGESTIONS[currentItemKey]?.field3Label || 'Technical Spec'}
                        </label>
                        {currentItemKey === 'elastic' ? (
                          <input
                            type="text"
                            value={sheetData.stretch || ''}
                            placeholder="e.g. 140% - 160% HIGH RECOVERY"
                            onChange={(e) => onUpdateHeader({ stretch: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-xs text-neutral-900 font-bold focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                          />
                        ) : currentItemKey === 'bow' || currentItemKey === 'drawstring' ? (
                          <input
                            type="text"
                            value={sheetData.pattern || ''}
                            placeholder="e.g. 3MM RIBBON | 45MM SPAN"
                            onChange={(e) => onUpdateHeader({ pattern: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-xs text-neutral-900 font-bold focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                          />
                        ) : (
                          <input
                            type="text"
                            value={sheetData.finish || ''}
                            placeholder="e.g. 1.2MM HEAVY DUTY"
                            onChange={(e) => onUpdateHeader({ finish: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-xs text-neutral-900 font-bold focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Carton Sequence & Sorting Tools */}
                <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200 space-y-2.5">
                  <label className="block text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    {lang === 'en' ? 'Print Sequence & Carton Sorting' : 'কার্টন সিকোয়েন্স ও সাজানোর শর্টকাট'}
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => onSortCartons('weight-desc')}
                      className="p-2 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg flex items-center gap-1.5 text-neutral-800 transition cursor-pointer font-medium"
                    >
                      <MoveDown className="w-3.5 h-3.5 text-neutral-700" />
                      <span>{lang === 'en' ? 'Weight: Heavy → Light' : 'ওজন: ভারী → হালকা'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSortCartons('weight-asc')}
                      className="p-2 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg flex items-center gap-1.5 text-neutral-800 transition cursor-pointer font-medium"
                    >
                      <MoveUp className="w-3.5 h-3.5 text-neutral-700" />
                      <span>{lang === 'en' ? 'Weight: Light → Heavy' : 'ওজন: হালকা → ভারী'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSortCartons('qty-desc')}
                      className="p-2 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg flex items-center gap-1.5 text-neutral-800 transition cursor-pointer font-medium"
                    >
                      <ListOrdered className="w-3.5 h-3.5 text-neutral-700" />
                      <span>{lang === 'en' ? 'Qty: High → Low' : 'পরিমাণ: বেশি → কম'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSortCartons('reverse')}
                      className="p-2 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg flex items-center gap-1.5 text-neutral-800 transition cursor-pointer font-medium"
                    >
                      <Shuffle className="w-3.5 h-3.5 text-neutral-700" />
                      <span>{lang === 'en' ? 'Reverse Sequence' : 'সিকোয়েন্স উল্টান'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSortCartons('carton-asc')}
                      className="p-2 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg flex items-center gap-1.5 text-neutral-800 transition cursor-pointer font-medium"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-neutral-700" />
                      <span>{lang === 'en' ? 'Reset #1..N' : 'আগের নম্বরে রিসেট'}</span>
                    </button>

                    {onOpenCapacityModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenCapacityModal();
                        }}
                        className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-900 rounded-lg flex items-center gap-1.5 text-white font-bold transition cursor-pointer shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                        <span>{lang === 'en' ? 'Auto-Generate Boxes' : 'স্বয়ংক্রিয় কার্টন তৈরি'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live Sticker Preview Column (5 Cols on desktop) */}
          <div className="lg:col-span-5 flex flex-col space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-600">
              <span className="font-bold flex items-center gap-1.5 uppercase tracking-wide text-neutral-900">
                <Eye className="w-3.5 h-3.5 text-neutral-700" />
                <span>{lang === 'en' ? 'Live Label Preview' : 'লাইভ স্টিকার প্রিভিউ'}</span>
              </span>
              <span className="font-mono text-[10px] bg-neutral-100 text-neutral-800 border border-neutral-300 px-2 py-0.5 rounded font-bold">
                {currentPaper.name.split(' ')[0]} · {densityMode}
              </span>
            </div>

            {/* Sticker Card Container */}
            <div className="bg-neutral-100 p-4 rounded-xl border border-neutral-300 flex items-center justify-center min-h-[360px]">
              <div
                className={`bg-white text-neutral-900 shadow-md w-full max-w-[340px] relative transition-all ${
                  fontConfig.cssClass
                }`}
                style={{
                  padding: `${bulkConfig.uniformPadding}px`,
                  border: `${settings.borderWidth} solid ${settings.borderColor}`,
                }}
              >
                {/* Crop marks in preview if enabled */}
                {showCropMarks && (
                  <div className="absolute -inset-1 border border-dashed border-neutral-400 pointer-events-none" />
                )}

                {/* Header */}
                <div 
                  className="pb-1.5 mb-1.5 flex items-center justify-between gap-2"
                  style={{ borderBottom: `2px solid ${settings.borderColor}` }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {settings.logoUrl && (
                      <img
                        src={settings.logoUrl}
                        alt="Logo"
                        className="h-7 max-w-[70px] object-contain shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div 
                        className={`text-xs ${settings.headingWeight} tracking-wider truncate`}
                        style={{ color: settings.borderColor }}
                      >
                        {settings.customCompanyName || sheetData.companyName || 'GOOD & FAST Pa. Co. Ltd'}
                      </div>
                      <span className="text-[7.5px] text-neutral-500 font-semibold block leading-tight truncate">
                        {settings.customSubtitle || 'EXPORT PACKING LABEL'}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className="inline-block font-black px-1.5 py-0.5 text-[9px] font-mono text-white"
                      style={{ backgroundColor: settings.borderColor }}
                    >
                      CTN: {previewCartonNo} / {totalLabelsCount || 1}
                    </span>
                  </div>
                </div>

                {/* Metadata Fields */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9.5px] border-b border-neutral-300 pb-1">
                  <div>
                    <span className="text-[7.5px] font-bold text-neutral-500 uppercase block">REF / PO:</span>
                    <span className="font-black font-mono text-neutral-900 truncate block">
                      {sheetData.ref || 'PO-2026-001'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[7.5px] font-bold text-neutral-500 uppercase block">BUYER:</span>
                    {settings.showBuyerBadge ? (
                      <span 
                        className="font-black px-1 py-0.2 rounded-xs inline-block text-[9px] truncate max-w-full"
                        style={{ backgroundColor: settings.badgeBgColor, color: settings.badgeTextColor }}
                      >
                        {sheetData.buyer || 'TARGET'}
                      </span>
                    ) : (
                      <span className="font-bold text-neutral-900 truncate block">{sheetData.buyer || 'TARGET'}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[7.5px] font-bold text-neutral-500 uppercase block">ITEM:</span>
                    <span className="font-bold text-neutral-900 truncate block">
                      {sheetData.customItemName || '🧵 ELASTIC'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[7.5px] font-bold text-neutral-500 uppercase block">SIZE / COLOR:</span>
                    <span className="font-bold text-neutral-900 truncate block">
                      {sheetData.size || '32MM'} | {sheetData.color || 'BLACK'}
                    </span>
                  </div>

                  {/* Technical Specs Rows in Preview */}
                  {technicalRows.length > 0 && (
                    <div className="col-span-2 pt-1 border-t border-neutral-200 flex items-center justify-between text-[7.5px]">
                      <span className="font-bold text-neutral-900 bg-neutral-100 px-1 py-0.2 rounded border border-neutral-200">
                        {technicalRows[0].item1.label}: {technicalRows[0].item1.value}
                      </span>
                      {technicalRows[0].item2 && (
                        <span className="font-bold text-neutral-900 bg-neutral-100 px-1 py-0.2 rounded border border-neutral-200">
                          {technicalRows[0].item2.label}: {technicalRows[0].item2.value}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Measurements Box */}
                <div 
                  className="grid grid-cols-4 gap-1 text-center font-mono my-1.5 p-1"
                  style={{ border: `1px solid ${settings.borderColor}` }}
                >
                  <div className="border-r border-neutral-300">
                    <span className="text-[7px] font-bold text-neutral-500 uppercase block">GROSS WT</span>
                    <span className="font-black text-neutral-900 text-[10px]">{previewGrossWt.toFixed(2)}</span>
                    <span className="text-[6.5px] text-neutral-500 block">kg</span>
                  </div>
                  <div 
                    className="border-r border-neutral-300"
                    style={{ backgroundColor: settings.netWtBoxBg }}
                  >
                    <span className="text-[7px] font-black uppercase block" style={{ color: settings.borderColor }}>
                      NET WT
                    </span>
                    <span className="font-black text-[10px]" style={{ color: settings.borderColor }}>
                      {previewNetWt.toFixed(2)}
                    </span>
                    <span className="text-[6.5px] block text-neutral-600">kg</span>
                  </div>
                  <div 
                    className="border-r border-neutral-300"
                    style={{ backgroundColor: settings.lengthBoxBg }}
                  >
                    <span className="text-[7px] font-bold text-neutral-700 uppercase block">
                      {isPcsMode ? 'QTY' : 'LENGTH'}
                    </span>
                    <span className="font-black text-neutral-900 text-[10px]">
                      {isPcsMode ? `${previewQtyPcs}` : `${previewLengthMtr}`}
                    </span>
                    <span className="text-[6.5px] text-neutral-600 block">{isPcsMode ? 'pcs' : 'm'}</span>
                  </div>
                  <div className="bg-neutral-100">
                    <span className="text-[7px] font-bold text-neutral-700 uppercase block">
                      {isPcsMode ? 'PKTS' : 'ROLLS'}
                    </span>
                    <span className="font-black text-neutral-900 text-[10px]">
                      {isPcsMode ? '20' : '12'}
                    </span>
                    <span className="text-[6.5px] text-neutral-600 block">{isPcsMode ? 'pkt' : 'rl'}</span>
                  </div>
                </div>

                {/* Footer Barcode & QR Code */}
                <div className="pt-1 flex items-center justify-between gap-1 border-t border-neutral-200">
                  <div className="min-w-0 flex-1">
                    {settings.showBarcode && (
                      <div className="h-3 flex items-center gap-[1.5px] opacity-80 mb-0.5">
                        {[2,1,3,1,2,3,1,2,1,3,2,1,2,3,1,2,1,3].map((w, i) => (
                          <div
                            key={i}
                            className="h-full"
                            style={{ width: `${w}px`, backgroundColor: settings.borderColor }}
                          />
                        ))}
                      </div>
                    )}
                    <span 
                      className="font-mono text-[8px] font-bold tracking-widest block truncate"
                      style={{ color: settings.borderColor }}
                    >
                      *{sheetData.ref || 'REF'}-{previewCartonNo}*
                    </span>
                  </div>

                  {showQrCode && (
                    <div className="p-0.5 bg-white border border-neutral-300 rounded shrink-0">
                      <QRCodeSVG
                        value="https://example.com/carton/1"
                        size={Math.min(qrSize, 44)}
                        level="M"
                        fgColor={settings.borderColor}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 text-center">
              {lang === 'en'
                ? 'All settings update live across all printed stickers automatically.'
                : 'সকল পরিবর্তন তাৎক্ষণিকভাবে সব স্টিকারে স্বয়ংক্রিয়ভাবে কার্যকর হবে।'}
            </p>
          </div>
        </div>

        {/* Modal Footer Bar */}
        <div className="px-5 py-3 bg-white border-t border-neutral-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 text-xs font-semibold transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Reset to Defaults' : 'ডিফল্ট রিসেট'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{lang === 'en' ? 'Save & Done' : 'সংরক্ষণ ও সম্পন্ন'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
