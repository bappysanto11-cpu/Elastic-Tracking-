import React, { useState } from 'react';
import { PackingSheetData, ItemType } from '../types/calculator';
import { Language, translations } from '../utils/translations';
import { getItemConfig, ITEM_CONFIGS } from '../utils/calc';
import { 
  Building2, 
  Hash, 
  User, 
  Tag, 
  Maximize2, 
  Palette, 
  Box, 
  Scale, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  RefreshCw,
  SlidersHorizontal,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AutocompleteInput } from './AutocompleteInput';

interface OrderHeaderFormProps {
  sheetData: PackingSheetData;
  onChange: (updated: Partial<PackingSheetData>) => void;
  onApplyDefaultWeights: () => void;
  lang: Language;
  demands?: any[];
  onSelectDemand?: (demand: any) => void;
  onOpenDemandsView?: () => void;
}

const COMMON_BUYERS = ['HCF', 'Sports Direct', 'H&M', 'Zara', 'M&S', 'Next', 'Decathlon', 'Primark', 'Target', 'Walmart'];
const COMMON_SIZES = ['5 MM', '6 MM', '7 MM', '8 MM', '10 MM', '12 MM', '15 MM', '20 MM', '25 MM', '30 MM', '32 MM', '38 MM', '40 MM', '50 MM', '61 MM'];
const COMMON_COLORS = ['WHITE', 'BLACK', 'NAVY', 'GREY', 'OPTICAL WHITE', 'OFF WHITE', 'ROYAL BLUE', 'RED'];

export const OrderHeaderForm: React.FC<OrderHeaderFormProps> = ({
  sheetData,
  onChange,
  onApplyDefaultWeights,
  lang,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeChipTray, setActiveChipTray] = useState<'buyer' | 'size' | 'color' | 'none'>('buyer');
  const [copied, setCopied] = useState(false);
  const [syncApplied, setSyncApplied] = useState(false);

  const t = translations[lang];
  const currentItemKey = (sheetData.itemType || 'elastic').toLowerCase();
  const currentItemConfig = getItemConfig(sheetData.itemType);
  const isPcsMode = sheetData.deliveryUnit === 'pcs' || currentItemConfig.defaultDeliveryUnit === 'pcs';

  const handleItemChange = (itemKey: ItemType) => {
    const config = getItemConfig(itemKey);
    onChange({
      itemType: itemKey,
      deliveryUnit: config.defaultDeliveryUnit,
      // If user hasn't modified default unit weight or wants the recommended default
      defaultWtPerUnit: config.defaultWtPerUnit,
    });
  };

  const handleCopySpec = async () => {
    const itemLabel = currentItemConfig.name;
    const unitLabel = isPcsMode ? 'gm/pc' : 'gm/m';
    const specText = `📦 Order Spec: ${sheetData.ref || 'N/A'} | Item: ${itemLabel} (${isPcsMode ? 'Pcs Delivery' : 'Mtr Delivery'}) | Buyer: ${sheetData.buyer || 'N/A'} | Cust: ${sheetData.customer || 'N/A'} | Size: ${sheetData.size || 'N/A'} | Color: ${sheetData.color || 'N/A'} | Unit Wt: ${sheetData.defaultWtPerUnit} ${unitLabel} | Tare: ${sheetData.defaultTare} Kg`;
    try {
      window.focus();
      await navigator.clipboard.writeText(specText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSyncClick = () => {
    onApplyDefaultWeights();
    setSyncApplied(true);
    setTimeout(() => setSyncApplied(false), 2000);
  };

  const activeFieldsCount = [
    sheetData.companyName,
    sheetData.ref,
    sheetData.customer,
    sheetData.buyer,
    sheetData.size,
    sheetData.color,
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs mb-3 transition-all overflow-hidden">
      {/* Sleek Top Smart Control Ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-3 py-1.5 flex items-center justify-between gap-2 text-white">
        {/* Left: Title, Live Status & PO pill */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md bg-indigo-500/25 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
            <SlidersHorizontal className="w-3 h-3" />
          </div>
          
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <h2 className="text-xs font-bold tracking-tight text-white truncate">
              {lang === 'en' ? 'Order & Item Specifications' : 'অর্ডার ও আইটেম স্পেসিফিকেশন'}
            </h2>
            
            {/* Active Spec Counter Pill */}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9.5px] font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${activeFieldsCount === 6 ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              {activeFieldsCount}/6
            </span>

            {/* Current Item & Delivery Style Tag */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded text-[10px] font-bold border truncate max-w-[200px] ${
              currentItemKey === 'elastic' 
                ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/40' 
                : currentItemKey === 'drawstring'
                ? 'bg-amber-500/25 text-amber-200 border-amber-400/40'
                : currentItemKey === 'bow'
                ? 'bg-rose-500/25 text-rose-200 border-rose-400/40'
                : 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40'
            }`}>
              <span>{currentItemKey === 'elastic' ? '🧵' : currentItemKey === 'drawstring' ? '🪢' : currentItemKey === 'bow' ? '🎀' : '🏷️'}</span>
              <span>{currentItemConfig.name}</span>
              <span className="opacity-75 font-mono text-[9px]">({isPcsMode ? 'Pcs' : 'Mtr'})</span>
            </span>

            {sheetData.ref && (
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 truncate max-w-[140px]">
                {sheetData.ref}
              </span>
            )}
          </div>
        </div>

        {/* Right: Quick Tools (Copy Spec, Sync, Collapse) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleCopySpec}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[10.5px] font-medium border border-slate-700/80 transition cursor-pointer"
            title="Copy Order Specs to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">{lang === 'en' ? 'Copied' : 'কপি'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span className="hidden sm:inline">{lang === 'en' ? 'Copy Spec' : 'কপি'}</span>
              </>
            )}
          </button>

          {/* Toggle Collapse */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-[10.5px] font-medium border border-slate-700/80 transition cursor-pointer"
            title={isCollapsed ? 'Expand specifications' : 'Collapse specifications'}
          >
            <span>{isCollapsed ? (lang === 'en' ? 'Expand' : 'খুলুন') : (lang === 'en' ? 'Hide' : 'লুকান')}</span>
            {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Main Body */}
      {!isCollapsed ? (
        <div className="p-2 sm:p-2.5 bg-slate-50/60 space-y-2">
          
          {/* 🌟 Items Selection Toolbar (Requested Feature: Elastic -> Mtr, Drawstring -> Pcs, Bow -> Pcs with Live Sticker Sync) */}
          <div className="bg-white p-2 rounded-lg border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                <Package className="w-3.5 h-3.5 text-indigo-600" />
                <span>{lang === 'en' ? 'Select Item / Product:' : 'আইটেম নির্বাচন করুন:'}</span>
              </div>

              {/* 3 Main Requested Items & Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* 1. Elastic (Mtr delivery) */}
                <button
                  type="button"
                  onClick={() => handleItemChange('elastic')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition shadow-2xs cursor-pointer border ${
                    currentItemKey === 'elastic'
                      ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-300'
                      : 'bg-slate-50 hover:bg-indigo-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>🧵</span>
                  <span>{lang === 'en' ? 'Elastic' : 'ইলাস্টিক'}</span>
                  <span className={`text-[9.5px] px-1 py-0.2 rounded font-mono ${
                    currentItemKey === 'elastic' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {lang === 'en' ? 'Mtr delivery' : 'মিটার'}
                  </span>
                </button>

                {/* 2. Drawstring (Pcs delivery) */}
                <button
                  type="button"
                  onClick={() => handleItemChange('drawstring')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition shadow-2xs cursor-pointer border ${
                    currentItemKey === 'drawstring'
                      ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-300'
                      : 'bg-slate-50 hover:bg-amber-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>🪢</span>
                  <span>{lang === 'en' ? 'Drawstring' : 'ড্রস্ট্রিং'}</span>
                  <span className={`text-[9.5px] px-1 py-0.2 rounded font-mono ${
                    currentItemKey === 'drawstring' ? 'bg-amber-700 text-amber-100' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {lang === 'en' ? 'Pcs delivery' : 'পিস'}
                  </span>
                </button>

                {/* 3. Bow (Pcs delivery) */}
                <button
                  type="button"
                  onClick={() => handleItemChange('bow')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition shadow-2xs cursor-pointer border ${
                    currentItemKey === 'bow'
                      ? 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-300'
                      : 'bg-slate-50 hover:bg-rose-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>🎀</span>
                  <span>{lang === 'en' ? 'Bow' : 'বো (Bow)'}</span>
                  <span className={`text-[9.5px] px-1 py-0.2 rounded font-mono ${
                    currentItemKey === 'bow' ? 'bg-rose-700 text-rose-100' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {lang === 'en' ? 'Pcs delivery' : 'পিস'}
                  </span>
                </button>

                {/* 4. Tape / Webbing (Mtr delivery) */}
                <button
                  type="button"
                  onClick={() => handleItemChange('tape')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition shadow-2xs cursor-pointer border ${
                    currentItemKey === 'tape'
                      ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-300'
                      : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>🏷️</span>
                  <span>{lang === 'en' ? 'Tape' : 'টেপ'}</span>
                  <span className={`text-[9.5px] px-1 py-0.2 rounded font-mono ${
                    currentItemKey === 'tape' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {lang === 'en' ? 'Mtr' : 'মিটার'}
                  </span>
                </button>
              </div>
            </div>

            {/* Live Sticker Style Sync Confirmation Tag */}
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>
                {lang === 'en'
                  ? `Sticker Style: ${currentItemConfig.name} (${isPcsMode ? 'Pieces Delivery' : 'Meters Delivery'})`
                  : `স্টিকার স্টাইল: ${currentItemConfig.nameBn} (${isPcsMode ? 'পিস স্টাইল' : 'মিটার স্টাইল'})`}
              </span>
            </div>
          </div>

          {/* Smart Grid of 6 Core Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
            {/* 1. Company Name */}
            <div className="bg-white p-1.5 rounded-lg border border-slate-200/90 shadow-2xs hover:border-indigo-300 transition">
              <AutocompleteInput
                category="companies"
                value={sheetData.companyName}
                onChange={val => onChange({ companyName: val })}
                placeholder="e.g. GOOD & FAST"
                label={t.companyName}
                icon={<Building2 className="w-3 h-3 text-indigo-500" />}
                lang={lang}
                compact={true}
              />
            </div>

            {/* 2. Reference / PO */}
            <div className="bg-white p-1.5 rounded-lg border border-slate-200/90 shadow-2xs hover:border-amber-300 transition">
              <AutocompleteInput
                category="refs"
                value={sheetData.ref}
                onChange={val => onChange({ ref: val })}
                placeholder="e.g. LIZ-LO-ELS-26080193"
                label={t.ref}
                icon={<Hash className="w-3 h-3 text-amber-500" />}
                monoFont={true}
                bold={true}
                lang={lang}
                compact={true}
              />
            </div>

            {/* 3. Customer */}
            <div className="bg-white p-1.5 rounded-lg border border-slate-200/90 shadow-2xs hover:border-sky-300 transition">
              <AutocompleteInput
                category="customers"
                value={sheetData.customer}
                onChange={val => onChange({ customer: val })}
                placeholder="e.g. Liz"
                label={t.customer}
                icon={<User className="w-3 h-3 text-sky-500" />}
                lang={lang}
                compact={true}
              />
            </div>

            {/* 4. Buyer */}
            <div className="bg-white p-1.5 rounded-lg border border-slate-200/90 shadow-2xs hover:border-violet-300 transition">
              <AutocompleteInput
                category="buyers"
                value={sheetData.buyer}
                onChange={val => onChange({ buyer: val })}
                placeholder="e.g. Sports Direct"
                label={t.buyer}
                icon={<Tag className="w-3 h-3 text-violet-500" />}
                bold={true}
                lang={lang}
                compact={true}
              />
            </div>

            {/* 5. Size */}
            <div className="bg-white p-1.5 rounded-lg border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition">
              <AutocompleteInput
                category="sizes"
                value={sheetData.size}
                onChange={val => onChange({ size: val })}
                placeholder="e.g. 61 MM"
                label={t.size}
                icon={<Maximize2 className="w-3 h-3 text-emerald-500" />}
                bold={true}
                uppercase={true}
                lang={lang}
                compact={true}
              />
            </div>

            {/* 6. Color */}
            <div className="bg-white p-1.5 rounded-lg border border-slate-200/90 shadow-2xs hover:border-rose-300 transition">
              <AutocompleteInput
                category="colors"
                value={sheetData.color}
                onChange={val => onChange({ color: val })}
                placeholder="e.g. WHITE"
                label={t.color}
                icon={<Palette className="w-3 h-3 text-rose-500" />}
                bold={true}
                uppercase={true}
                lang={lang}
                compact={true}
              />
            </div>
          </div>

          {/* Unified Compact Smart Bar: Parameters + Quick Presets + Sync in One Row */}
          <div className="pt-1.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2">
            {/* Left: Weight Constants (Tare & Unit Wt) */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Default Tare */}
              <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                <Box className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="text-[10px] font-bold text-slate-600">{t.defaultTare}:</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sheetData.defaultTare}
                  onChange={e => onChange({ defaultTare: parseFloat(e.target.value) || 0 })}
                  className="w-14 px-1 py-0.2 text-[11px] font-bold font-mono text-center bg-amber-50/60 text-amber-900 border border-amber-200 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
                <span className="text-[9.5px] font-semibold text-slate-400">Kg</span>
              </div>

              {/* Default Unit Weight (Dynamically adjusts to gm/m or gm/pc) */}
              <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                <Scale className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="text-[10px] font-bold text-slate-600">
                  {isPcsMode ? (lang === 'en' ? 'Wt/pc:' : 'পিস ওজন:') : `${t.defaultWtPerUnit}:`}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={sheetData.defaultWtPerUnit}
                  onChange={e => onChange({ defaultWtPerUnit: parseFloat(e.target.value) || 0 })}
                  className="w-14 px-1 py-0.2 text-[11px] font-bold font-mono text-center bg-emerald-50/60 text-emerald-900 border border-emerald-200 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[9.5px] font-semibold text-emerald-700">
                  {isPcsMode ? 'gm/pc' : 'gm/m'}
                </span>
              </div>

              {/* Optional: Pcs per Packet for Drawstring & Bow */}
              {isPcsMode && (
                <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                  <Package className="w-3 h-3 text-purple-600 shrink-0" />
                  <span className="text-[10px] font-bold text-slate-600">{lang === 'en' ? 'Pcs/Pkt:' : 'পিস/প্যাকেট:'}</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="e.g. 50"
                    value={sheetData.pcsPerPkt || ''}
                    onChange={e => onChange({ pcsPerPkt: parseInt(e.target.value, 10) || undefined })}
                    className="w-12 px-1 py-0.2 text-[11px] font-bold font-mono text-center bg-purple-50/60 text-purple-900 border border-purple-200 rounded focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  />
                  <span className="text-[9.5px] font-semibold text-slate-400">pcs</span>
                </div>
              )}

              {/* Sync Weights Button */}
              <button
                type="button"
                onClick={handleSyncClick}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold transition shadow-2xs cursor-pointer ${
                  syncApplied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
                title="Apply default tare & unit weight to all active cartons in the table"
              >
                {syncApplied ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>{lang === 'en' ? 'Synced!' : 'সিঙ্ক হয়েছে!'}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    <span>{lang === 'en' ? 'Sync All' : 'সব সিঙ্ক'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Right: Quick Preset Switchers */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
              <div className="flex items-center gap-0.5 bg-slate-200/80 p-0.5 rounded-md shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveChipTray(activeChipTray === 'buyer' ? 'none' : 'buyer')}
                  className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold transition cursor-pointer ${
                    activeChipTray === 'buyer' ? 'bg-white text-violet-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.buyer}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChipTray(activeChipTray === 'size' ? 'none' : 'size')}
                  className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold transition cursor-pointer ${
                    activeChipTray === 'size' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.size}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChipTray(activeChipTray === 'color' ? 'none' : 'color')}
                  className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold transition cursor-pointer ${
                    activeChipTray === 'color' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.color}
                </button>
              </div>

              {/* Chips */}
              {activeChipTray === 'buyer' && (
                <div className="flex items-center gap-1 overflow-x-auto">
                  {COMMON_BUYERS.slice(0, 7).map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => onChange({ buyer: b })}
                      className={`px-1.5 py-0.2 rounded text-[9.5px] font-semibold whitespace-nowrap transition cursor-pointer ${
                        sheetData.buyer === b
                          ? 'bg-violet-900 text-white font-bold'
                          : 'bg-white hover:bg-violet-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}

              {activeChipTray === 'size' && (
                <div className="flex items-center gap-1 overflow-x-auto">
                  {COMMON_SIZES.slice(0, 8).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onChange({ size: s })}
                      className={`px-1.5 py-0.2 rounded text-[9.5px] font-mono whitespace-nowrap transition cursor-pointer ${
                        sheetData.size === s
                          ? 'bg-emerald-900 text-white font-bold'
                          : 'bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {activeChipTray === 'color' && (
                <div className="flex items-center gap-1 overflow-x-auto">
                  {COMMON_COLORS.slice(0, 6).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onChange({ color: c })}
                      className={`px-1.5 py-0.2 rounded text-[9.5px] whitespace-nowrap transition cursor-pointer ${
                        sheetData.color === c
                          ? 'bg-rose-900 text-white font-bold'
                          : 'bg-white hover:bg-rose-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Collapsed Summary Bar */
        <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 text-[11px]">
            <span className="font-bold text-indigo-700 flex items-center gap-1">
              <span>{currentItemKey === 'elastic' ? '🧵' : currentItemKey === 'drawstring' ? '🪢' : currentItemKey === 'bow' ? '🎀' : '🏷️'}</span>
              <span>{currentItemConfig.name} ({isPcsMode ? 'Pcs' : 'Mtr'})</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-slate-800">{sheetData.companyName || 'No Company'}</span>
            <span className="text-slate-300">|</span>
            <span className="font-mono font-bold text-amber-700">{sheetData.ref || 'No Ref'}</span>
            <span className="text-slate-300">|</span>
            <span>Buyer: <strong className="text-slate-800">{sheetData.buyer || '-'}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Size: <strong className="text-slate-800">{sheetData.size || '-'}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Color: <strong className="text-slate-800">{sheetData.color || '-'}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Tare: <strong>{sheetData.defaultTare} Kg</strong></span>
            <span className="text-slate-300">|</span>
            <span>Unit Wt: <strong className="text-emerald-700">{sheetData.defaultWtPerUnit} {isPcsMode ? 'gm/pc' : 'gm/m'}</strong></span>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-800 shrink-0 cursor-pointer"
          >
            {lang === 'en' ? 'Expand' : 'খুলুন'}
          </button>
        </div>
      )}
    </div>
  );
};
