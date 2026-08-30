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
  CheckCircle2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  StickerCustomizationSettings, 
  StickerFontFamily, 
  StickerThemePreset, 
  FONT_FAMILY_STYLES,
  STICKER_THEME_PRESETS,
  DEFAULT_STICKER_SETTINGS
} from '../types/stickerSettings';
import { applyThemePreset } from '../utils/stickerSettingsStorage';
import { Language, translations } from '../utils/translations';
import { PackingSheetData } from '../types/calculator';

interface StickerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StickerCustomizationSettings;
  onUpdateSettings: (newSettings: StickerCustomizationSettings) => void;
  sheetData: PackingSheetData;
  lang: Language;
}

type TabKey = 'theme' | 'font' | 'branding' | 'layout';

export const StickerSettingsModal: React.FC<StickerSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  sheetData,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('theme');
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[lang];

  if (!isOpen) return null;

  const handleChange = <K extends keyof StickerCustomizationSettings>(
    key: K,
    value: StickerCustomizationSettings[K]
  ) => {
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  };

  const handleSelectPreset = (preset: StickerThemePreset) => {
    const updated = applyThemePreset(settings, preset);
    onUpdateSettings(updated);
  };

  const handleResetToDefault = () => {
    if (window.confirm(lang === 'en' ? 'Reset all sticker settings to factory defaults?' : 'স্টিকারের সকল সেটিংস ফ্যাক্টরি ডিফল্টে রিসেট করবেন?')) {
      onUpdateSettings(DEFAULT_STICKER_SETTINGS);
    }
  };

  const handleLogoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert(lang === 'en' ? 'Please upload an image file (PNG, JPG, SVG, WebP)' : 'অনুগ্রহ করে ইমেজ ফাইল আপলোড করুন (PNG, JPG, SVG)');
      return;
    }
    // Limit to 1.5MB for local storage efficiency
    if (file.size > 1.5 * 1024 * 1024) {
      alert(lang === 'en' ? 'Logo file size should be less than 1.5 MB' : 'লোগো ফাইল সাইজ ১.৫ MB এর কম হতে হবে');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        handleChange('logoUrl', e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLogoUpload(e.dataTransfer.files[0]);
    }
  };

  const fontConfig = FONT_FAMILY_STYLES[settings.fontFamily] || FONT_FAMILY_STYLES.sans;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{t.stickerSettings}</span>
                <span className="text-[10px] bg-indigo-900/80 text-indigo-300 border border-indigo-700/60 px-2 py-0.5 rounded-full font-mono">
                  PRO STYLER
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {t.stickerSettingsDesc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Reset all styling to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.resetStickerDefaults}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'theme'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>{t.colorsThemes}</span>
          </button>

          <button
            onClick={() => setActiveTab('font')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'font'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>{t.fontTypography}</span>
          </button>

          <button
            onClick={() => setActiveTab('branding')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'branding'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>{t.logoBranding}</span>
          </button>

          <button
            onClick={() => setActiveTab('layout')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'layout'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{t.layoutVisibility}</span>
          </button>
        </div>

        {/* Content Layout: 2 Columns on Desktop */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900 text-slate-200">
          
          {/* Controls Panel (Left 7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* TAB 1: COLORS & THEMES */}
            {activeTab === 'theme' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    {t.themePresets}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: 'classic-mono', label: 'Factory Mono', bg: '#0f172a', border: '#0f172a', text: '#fff' },
                      { id: 'navy-industrial', label: 'Navy Industrial', bg: '#1e3a8a', border: '#1e3a8a', text: '#fff' },
                      { id: 'emerald-qc', label: 'Emerald QC', bg: '#065f46', border: '#065f46', text: '#fff' },
                      { id: 'crimson-export', label: 'Crimson Export', bg: '#881337', border: '#881337', text: '#fff' },
                      { id: 'amber-warehouse', label: 'Amber Warehouse', bg: '#78350f', border: '#78350f', text: '#fff' },
                      { id: 'slate-modern', label: 'Modern Slate', bg: '#334155', border: '#334155', text: '#fff' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectPreset(item.id as StickerThemePreset)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                          settings.themePreset === item.id
                            ? 'bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/40 text-white'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: item.bg }}
                          />
                          <span className="text-xs font-semibold">{item.label}</span>
                        </div>
                        {settings.themePreset === item.id && (
                          <Check className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Color Overrides */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Custom Color Palette Controls</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    {/* Primary Border Color */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        {t.borderColor}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.borderColor}
                          onChange={(e) => {
                            handleChange('borderColor', e.target.value);
                            handleChange('themePreset', 'custom');
                          }}
                          className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={settings.borderColor}
                          onChange={(e) => {
                            handleChange('borderColor', e.target.value);
                            handleChange('themePreset', 'custom');
                          }}
                          className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                        />
                      </div>
                    </div>

                    {/* Border Thickness */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        {t.borderWidth}
                      </label>
                      <select
                        value={settings.borderWidth}
                        onChange={(e) => handleChange('borderWidth', e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-medium focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="1px">1px (Thin)</option>
                        <option value="2px">2px (Standard Heavy)</option>
                        <option value="3px">3px (Thick Factory)</option>
                        <option value="4px">4px (Ultra Bold)</option>
                      </select>
                    </div>

                    {/* Header Background */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Header Banner Background
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.headerBgColor}
                          onChange={(e) => {
                            handleChange('headerBgColor', e.target.value);
                            handleChange('themePreset', 'custom');
                          }}
                          className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={settings.headerBgColor}
                          onChange={(e) => {
                            handleChange('headerBgColor', e.target.value);
                            handleChange('themePreset', 'custom');
                          }}
                          className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                        />
                      </div>
                    </div>

                    {/* Badge / Highlight Color */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        {t.badgeColor}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.badgeBgColor}
                          onChange={(e) => {
                            handleChange('badgeBgColor', e.target.value);
                            handleChange('themePreset', 'custom');
                          }}
                          className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={settings.badgeBgColor}
                          onChange={(e) => {
                            handleChange('badgeBgColor', e.target.value);
                            handleChange('themePreset', 'custom');
                          }}
                          className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                        />
                      </div>
                    </div>

                    {/* Net Wt Box Background */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        {t.netWtBoxColor}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.netWtBoxBg}
                          onChange={(e) => {
                            handleChange('netWtBoxBg', e.target.value);
                            handleChange('themePreset', 'custom');
                          }}
                          className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={settings.netWtBoxBg}
                          onChange={(e) => {
                            handleChange('netWtBoxBg', e.target.value);
                            handleChange('themePreset', 'custom');
                          }}
                          className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                        />
                      </div>
                    </div>

                    {/* QR Code Color */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        {t.qrColor}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.qrColor}
                          onChange={(e) => {
                            handleChange('qrColor', e.target.value);
                            handleChange('themePreset', 'custom');
                          }}
                          className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={settings.qrColor}
                          onChange={(e) => {
                            handleChange('qrColor', e.target.value);
                            handleChange('themePreset', 'custom');
                          }}
                          className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FONT & TYPOGRAPHY */}
            {activeTab === 'font' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Sticker Font Family
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(Object.keys(FONT_FAMILY_STYLES) as StickerFontFamily[]).map((fontKey) => {
                      const f = FONT_FAMILY_STYLES[fontKey];
                      return (
                        <button
                          key={fontKey}
                          type="button"
                          onClick={() => handleChange('fontFamily', fontKey)}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            settings.fontFamily === fontKey
                              ? 'bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/40 text-white'
                              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-indigo-300">{f.name}</span>
                            {settings.fontFamily === fontKey && (
                              <Check className="w-3.5 h-3.5 text-indigo-400" />
                            )}
                          </div>
                          <p className={`text-sm text-slate-200 font-bold ${f.cssClass}`}>
                            CARTON PACKING SPEC
                          </p>
                          <span className="text-[10px] text-slate-500">{f.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Typography Controls */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Type className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Weights & Scale Adjustments</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Header Font Weight
                      </label>
                      <select
                        value={settings.headingWeight}
                        onChange={(e) => handleChange('headingWeight', e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-medium"
                      >
                        <option value="font-bold">Bold (700)</option>
                        <option value="font-extrabold">Extra Bold (800)</option>
                        <option value="font-black">Heavy Black (900)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Base Text Size Scale
                      </label>
                      <select
                        value={settings.fontSizeScale}
                        onChange={(e) => handleChange('fontSizeScale', e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-medium"
                      >
                        <option value="compact">Compact (High density labels)</option>
                        <option value="standard">Standard Factory Size</option>
                        <option value="large">Large (High visibility)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-medium">Uppercase Header Text</span>
                    <button
                      type="button"
                      onClick={() => handleChange('uppercaseHeaders', !settings.uppercaseHeaders)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        settings.uppercaseHeaders ? 'bg-indigo-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          settings.uppercaseHeaders ? 'translate-x-4.5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: LOGO & BRANDING */}
            {activeTab === 'branding' && (
              <div className="space-y-4">
                {/* Logo Uploader */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{t.uploadLogo}</span>
                    </label>
                    {settings.logoUrl && (
                      <button
                        type="button"
                        onClick={() => handleChange('logoUrl', null)}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{t.removeLogo}</span>
                      </button>
                    )}
                  </div>

                  {settings.logoUrl ? (
                    <div className="flex items-center gap-4 p-3 bg-slate-900 rounded-xl border border-slate-700">
                      <div className="p-2 bg-white rounded-lg border border-slate-300 flex items-center justify-center max-w-[120px] max-h-[60px]">
                        <img 
                          src={settings.logoUrl} 
                          alt="Custom logo" 
                          className="max-h-12 object-contain"
                        />
                      </div>
                      <div className="flex-1 text-xs">
                        <span className="font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Custom Logo Active
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Will be displayed on all printed shipping carton stickers.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-600 transition"
                      >
                        Replace
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingLogo(true); }}
                      onDragLeave={() => setIsDraggingLogo(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                        isDraggingLogo
                          ? 'border-indigo-500 bg-indigo-950/30'
                          : 'border-slate-700 hover:border-indigo-400 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">
                          {lang === 'en' ? 'Click to upload or drag and drop logo image' : 'লোগো আপলোড করতে ক্লিক করুন বা টেনে আনুন'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          PNG, JPG, SVG or WebP (Max 1.5MB)
                        </p>
                      </div>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                    }}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Logo Options */}
                  {settings.logoUrl && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          {t.logoPosition}
                        </label>
                        <select
                          value={settings.logoPosition}
                          onChange={(e) => handleChange('logoPosition', e.target.value as any)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        >
                          <option value="left">Left of Company Name</option>
                          <option value="right">Right of Company Name</option>
                          <option value="top">Top Centered</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          {t.logoHeight}: {settings.logoHeight}px
                        </label>
                        <input
                          type="range"
                          min="20"
                          max="60"
                          step="2"
                          value={settings.logoHeight}
                          onChange={(e) => handleChange('logoHeight', Number(e.target.value))}
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Company Name & Taglines */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {t.customCompanyName}
                    </label>
                    <input
                      type="text"
                      placeholder={sheetData.companyName || 'e.g., GOOD & FAST Pa. Co. Ltd'}
                      value={settings.customCompanyName}
                      onChange={(e) => handleChange('customCompanyName', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Leave blank to automatically use the sheet's company name: <span className="font-semibold text-slate-300">{sheetData.companyName || 'N/A'}</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {t.customSubtitle}
                    </label>
                    <input
                      type="text"
                      placeholder="GARMENT ACCESSORIES & PACKING SPECIFICATION"
                      value={settings.customSubtitle}
                      onChange={(e) => handleChange('customSubtitle', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {t.footerBranding}
                    </label>
                    <input
                      type="text"
                      placeholder="QC INSPECTED · EXPORT STANDARD PACKING"
                      value={settings.footerBrandingText}
                      onChange={(e) => handleChange('footerBrandingText', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: LAYOUT & FIELD TOGGLES */}
            {activeTab === 'layout' && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
                  Visible Sticker Elements & Badges
                </h4>

                {[
                  { key: 'showBuyerBadge', label: 'Buyer & Order Highlights Badge', desc: 'Display prominent Buyer badge in header specs' },
                  { key: 'showOrderSpecs', label: 'Order Details Grid (Ref, Cust, Size, Color)', desc: 'Include full garments PO and product specifications' },
                  { key: 'showUnitWeight', label: 'Unit Weight gm/m Indicator', desc: 'Show gm/m formula verification under barcode' },
                  { key: 'showBarcode', label: 'Decorative Barcode Strip', desc: 'Standard industrial shipping barcode visual' },
                  { key: 'showFooterBranding', label: 'QC Footer Stamp Text', desc: 'Verification tagline at bottom of sticker' },
                ].map((item) => (
                  <div 
                    key={item.key} 
                    className="flex items-center justify-between py-2 border-b border-slate-800/80 last:border-0"
                  >
                    <div>
                      <span className="font-semibold text-slate-200 block">{item.label}</span>
                      <span className="text-[10px] text-slate-400">{item.desc}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChange(item.key as any, !settings[item.key as keyof StickerCustomizationSettings])}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                        settings[item.key as keyof StickerCustomizationSettings] ? 'bg-indigo-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          settings[item.key as keyof StickerCustomizationSettings] ? 'translate-x-4.5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Preview Panel (Right 5 Cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Sticker Preview (Carton #1)</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                Real-Time
              </span>
            </div>

            {/* Rendered Live Sticker Sample Card */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-center flex-1">
              <div
                className={`bg-white shadow-xl flex flex-col justify-between relative overflow-hidden transition-all duration-200 w-full max-w-[340px] p-3 ${fontConfig.cssClass}`}
                style={{
                  border: `${settings.borderWidth} solid ${settings.borderColor}`,
                }}
              >
                {/* Header with Custom Logo & Company Name */}
                <div 
                  className="pb-1.5 mb-1.5 flex items-center justify-between"
                  style={{ borderBottom: `2px solid ${settings.borderColor}` }}
                >
                  <div className={`flex ${settings.logoPosition === 'top' ? 'flex-col items-start' : 'items-center gap-2'} flex-1 min-w-0`}>
                    {settings.logoUrl && (
                      <img 
                        src={settings.logoUrl} 
                        alt="Logo" 
                        style={{ height: `${Math.min(settings.logoHeight, 44)}px` }}
                        className="object-contain shrink-0 max-w-[90px]"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 
                        className={`text-[11px] leading-tight ${settings.headingWeight} ${settings.uppercaseHeaders ? 'uppercase' : ''} truncate`}
                        style={{ color: settings.borderColor }}
                      >
                        {settings.customCompanyName || sheetData.companyName || 'GOOD & FAST Pa. Co. Ltd'}
                      </h4>
                      <span className="text-[7.5px] text-slate-600 font-semibold block leading-tight truncate">
                        {settings.customSubtitle || 'GARMENT ACCESSORIES & PACKING SPECIFICATION'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <span 
                      className="inline-block font-black px-1.5 py-0.5 font-mono text-[10px]"
                      style={{ 
                        backgroundColor: settings.borderColor, 
                        color: '#ffffff' 
                      }}
                    >
                      CTN: 1 / {sheetData.cartons.length || 10}
                    </span>
                  </div>
                </div>

                {/* Order Specifics */}
                {settings.showOrderSpecs && (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs border-b border-slate-300 py-1">
                    <div>
                      <span className="text-[7.5px] font-bold text-slate-500 uppercase block">REF / PO:</span>
                      <span className="font-bold font-mono text-slate-900 text-[10px] truncate block">
                        {sheetData.ref || 'GF-2026-X88'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[7.5px] font-bold text-slate-500 uppercase block">BUYER:</span>
                      {settings.showBuyerBadge ? (
                        <span 
                          className="font-black px-1.5 py-0.2 text-[9px] inline-block truncate max-w-full"
                          style={{
                            backgroundColor: settings.badgeBgColor,
                            color: settings.badgeTextColor,
                          }}
                        >
                          {sheetData.buyer || 'H&M / ZARA'}
                        </span>
                      ) : (
                        <span className="font-bold text-slate-900 text-[10px] truncate block">
                          {sheetData.buyer || 'H&M / ZARA'}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[7.5px] font-bold text-slate-500 uppercase block">CUSTOMER:</span>
                      <span className="font-semibold text-slate-800 text-[9.5px] truncate block">
                        {sheetData.customer || 'Target Global'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[7.5px] font-bold text-slate-500 uppercase block">SIZE / COLOR:</span>
                      <span className="font-bold text-slate-900 text-[9.5px]">
                        {sheetData.size || '32mm'} | {sheetData.color || 'Black'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Measurements Box */}
                <div 
                  className="grid grid-cols-4 gap-0.5 text-center font-mono my-1 p-1 text-slate-900"
                  style={{ border: `1px solid ${settings.borderColor}` }}
                >
                  <div className="border-r border-slate-300">
                    <span className="text-[7px] font-bold text-slate-600 uppercase block">GROSS WT</span>
                    <span className="font-black text-xs text-slate-900">12.50</span>
                    <span className="text-[7px] text-slate-500 block">Kg</span>
                  </div>
                  <div 
                    className="border-r border-slate-300"
                    style={{ backgroundColor: settings.netWtBoxBg }}
                  >
                    <span className="text-[7px] font-black uppercase block" style={{ color: settings.borderColor }}>NET WT</span>
                    <span className="font-black text-xs" style={{ color: settings.borderColor }}>12.00</span>
                    <span className="text-[7px] block text-slate-600">Kg</span>
                  </div>
                  <div 
                    className="border-r border-slate-300"
                    style={{ backgroundColor: settings.lengthBoxBg }}
                  >
                    <span className="text-[7px] font-bold uppercase block text-slate-700">MTR</span>
                    <span className="font-black text-xs text-slate-900">1,500</span>
                    <span className="text-[7px] text-slate-600 block">Mtr</span>
                  </div>
                  <div className="bg-slate-50">
                    <span className="text-[7px] font-bold text-slate-700 uppercase block">GRY</span>
                    <span className="font-black text-xs text-slate-900">11.39</span>
                    <span className="text-[7px] text-slate-600 block">Gry</span>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-200">
                  <div className="flex flex-col min-w-0">
                    {settings.showBarcode && (
                      <div className="h-3.5 flex items-center gap-[1.5px] opacity-85 mb-0.5">
                        {[3,1,2,4,1,3,2,1,4,2,3,1,2,4,1,2,3,1,4,2,1,3,2].map((w, i) => (
                          <div 
                            key={i} 
                            className="h-full" 
                            style={{ width: `${w}px`, backgroundColor: settings.borderColor }} 
                          />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[8px] font-mono tracking-wider font-bold" style={{ color: settings.borderColor }}>
                        *{sheetData.ref || 'GF-2026'}-1*
                      </span>
                      {settings.showUnitWeight && (
                        <span className="text-[7.5px] text-slate-500 font-mono">
                          (8.00 gm/m)
                        </span>
                      )}
                    </div>
                    {settings.showFooterBranding && (
                      <span className="text-[6.5px] font-bold text-slate-400 tracking-wider uppercase mt-0.5 truncate">
                        {settings.footerBrandingText}
                      </span>
                    )}
                  </div>

                  {/* QR Code */}
                  <div className="p-0.5 bg-white border border-slate-300 shrink-0">
                    <QRCodeSVG
                      value="https://ais-preview-carton-verification/1"
                      size={44}
                      level="M"
                      fgColor={settings.qrColor || settings.borderColor}
                      includeMargin={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{t.saveStickerSettings}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
