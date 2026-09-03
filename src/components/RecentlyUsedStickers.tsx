import React, { useState, useEffect } from 'react';
import { 
  History, 
  BookmarkPlus, 
  Check, 
  Trash2, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Palette, 
  Sparkles, 
  Clock, 
  RotateCcw,
  Sliders,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { RecentStickerConfig, StickerCustomizationSettings } from '../types/stickerSettings';
import { Language, translations } from '../utils/translations';
import { PackingSheetData } from '../types/calculator';
import { 
  loadRecentStickerConfigs, 
  deleteRecentStickerConfig, 
  clearRecentStickerConfigs,
  recordStickerUsage 
} from '../utils/recentStickerConfigsStorage';

interface RecentlyUsedStickersProps {
  sheetData: PackingSheetData;
  stickerSettings: StickerCustomizationSettings;
  lang: Language;
  onApplyConfig: (config: RecentStickerConfig, mode: 'all' | 'specs' | 'style') => void;
  onNotification?: (msg: string) => void;
}

export const RecentlyUsedStickers: React.FC<RecentlyUsedStickersProps> = ({
  sheetData,
  stickerSettings,
  lang,
  onApplyConfig,
  onNotification,
}) => {
  const [configs, setConfigs] = useState<RecentStickerConfig[]>(() => loadRecentStickerConfigs());
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recentlyAppliedId, setRecentlyAppliedId] = useState<string | null>(null);
  const [isSavingCustom, setIsSavingCustom] = useState<boolean>(false);
  const [customNameInput, setCustomNameInput] = useState<string>('');

  const t = translations[lang];

  // Refresh list from storage
  const refreshList = () => {
    setConfigs(loadRecentStickerConfigs());
  };

  useEffect(() => {
    refreshList();
  }, []);

  const handleApply = (config: RecentStickerConfig, mode: 'all' | 'specs' | 'style' = 'all') => {
    onApplyConfig(config, mode);
    setRecentlyAppliedId(config.id);
    setTimeout(() => {
      setRecentlyAppliedId(null);
    }, 3500);

    const modeText = mode === 'specs' 
      ? (lang === 'en' ? 'specs only' : 'শুধু স্পেক্স') 
      : mode === 'style' 
      ? (lang === 'en' ? 'styling only' : 'শুধু স্টাইল') 
      : (lang === 'en' ? 'all details' : 'সকল তথ্য ও স্টাইল');

    if (onNotification) {
      onNotification(
        lang === 'en'
          ? `Re-applied ${config.name || 'configuration'} (${modeText})`
          : `কনফিগারেশন লোড হয়েছে: ${config.name || 'স্টিকার'} (${modeText})`
      );
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteRecentStickerConfig(id);
    setConfigs(updated);
  };

  const handleClearAll = () => {
    const confirmMsg = lang === 'en' 
      ? 'Clear all recently used sticker configurations?' 
      : 'সকল পূর্বে ব্যবহৃত স্টিকার কনফিগারেশন মুছে ফেলবেন?';
    if (window.confirm(confirmMsg)) {
      const empty = clearRecentStickerConfigs();
      setConfigs(empty);
    }
  };

  const handleSaveCurrent = () => {
    const updated = recordStickerUsage(
      sheetData, 
      stickerSettings, 
      customNameInput.trim() ? customNameInput.trim() : undefined
    );
    setConfigs(updated);
    setIsSavingCustom(false);
    setCustomNameInput('');
    if (onNotification) {
      onNotification(lang === 'en' ? 'Current sticker setup saved to Recently Used!' : 'বর্তমান সেটআপ সম্প্রতি ব্যবহৃতে সংরক্ষিত হয়েছে!');
    }
  };

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diffMs = Math.max(0, now - timestamp);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (lang === 'bn') {
      if (diffMins < 2) return 'এইমাত্র';
      if (diffMins < 60) return `${diffMins} মি. আগে`;
      if (diffHours < 24) return `${diffHours} ঘণ্টা আগে`;
      if (diffDays === 1) return 'গতকাল';
      return `${diffDays} দিন আগে`;
    }

    if (diffMins < 2) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  // Filter configs based on search query
  const filteredConfigs = configs.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.buyer || '').toLowerCase().includes(q) ||
      (c.ref || '').toLowerCase().includes(q) ||
      (c.size || '').toLowerCase().includes(q) ||
      (c.color || '').toLowerCase().includes(q) ||
      (c.customer || '').toLowerCase().includes(q) ||
      (c.style || '').toLowerCase().includes(q) ||
      (c.itemType || '').toLowerCase().includes(q) ||
      (c.themePreset || '').toLowerCase().includes(q)
    );
  });

  const getItemEmoji = (type?: string) => {
    switch (type) {
      case 'drawstring':
        return '🪢';
      case 'bow':
        return '🎀';
      case 'tape':
        return '🏷️';
      case 'elastic':
      default:
        return '🧵';
    }
  };

  const getThemeBadgeColor = (theme?: string) => {
    switch (theme) {
      case 'navy-industrial':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'emerald-qc':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'crimson-export':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'amber-warehouse':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'slate-modern':
        return 'bg-slate-200 text-slate-800 border-slate-300';
      case 'classic-mono':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <section 
      aria-label="Recently Used Sticker Configurations"
      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all print:hidden"
    >
      {/* Top Header Bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <History className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900 truncate">
                {lang === 'en' ? 'Recently Used Sticker Configurations' : 'পূর্বে ব্যবহৃত স্টিকার কনফিগারেশন'}
              </h4>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.2 rounded-full border border-indigo-200 shrink-0">
                {configs.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate hidden sm:block">
              {lang === 'en' 
                ? 'Quickly re-apply order details, technical specs, and styling from previous label jobs'
                : 'পূর্ববর্তী স্টিকারের বায়ার, রেফারেন্স, টেকনিক্যাল স্পেক্স ও স্টাইল এক ক্লিকে লোড করুন'}
            </p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Save Current Button */}
          <button
            type="button"
            onClick={() => setIsSavingCustom(!isSavingCustom)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold shadow-2xs transition cursor-pointer"
            title={lang === 'en' ? 'Save current active sticker settings as a recent preset' : 'বর্তমান সক্রিয় স্টিকার সেটআপ সংরক্ষণ করুন'}
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden xs:inline">{lang === 'en' ? '+ Save Current' : '+ বর্তমানটি সেভ করুন'}</span>
          </button>

          {/* Expand/Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
            title={isExpanded ? (lang === 'en' ? 'Collapse section' : 'সংকুচিত করুন') : (lang === 'en' ? 'Expand section' : 'প্রসারিত করুন')}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Save Current Inline Prompt Modal / Bar */}
      {isSavingCustom && (
        <div className="p-3 bg-indigo-50/70 border-b border-indigo-200 flex flex-wrap items-center gap-2 text-xs animate-in slide-in-from-top-1 duration-150">
          <span className="font-bold text-indigo-950 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>{lang === 'en' ? 'Snapshot Active Sticker Details:' : 'বর্তমান সক্রিয় স্টিকার সংরক্ষণ:'}</span>
          </span>
          <input
            type="text"
            value={customNameInput}
            onChange={(e) => setCustomNameInput(e.target.value)}
            placeholder={
              lang === 'en'
                ? `e.g. ${sheetData.buyer || 'Buyer'} · ${sheetData.ref || 'Ref'} (${sheetData.size || '32MM'})`
                : 'নাম দিন (ঐচ্ছিক)'
            }
            className="px-2.5 py-1 bg-white border border-indigo-300 rounded text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 min-w-[180px] max-w-sm"
          />
          <button
            type="button"
            onClick={handleSaveCurrent}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-xs shadow-xs transition cursor-pointer"
          >
            {lang === 'en' ? 'Save Setup' : 'সংরক্ষণ করুন'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSavingCustom(false);
              setCustomNameInput('');
            }}
            className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
          >
            {lang === 'en' ? 'Cancel' : 'বাতিল'}
          </button>
        </div>
      )}

      {/* Expanded Content Area */}
      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* Search and Manage Bar */}
          {configs.length > 3 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'en' ? 'Filter by Buyer, Ref, Size, Color...' : 'বায়ার, রেফারেন্স, সাইজ দিয়ে খুঁজুন...'}
                  className="w-full pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>

              {configs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] text-slate-400 hover:text-rose-600 transition flex items-center gap-1 cursor-pointer ml-auto"
                  title="Clear all saved configurations"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{lang === 'en' ? 'Clear History' : 'ইতিহাস মুছুন'}</span>
                </button>
              )}
            </div>
          )}

          {/* Cards Grid */}
          {filteredConfigs.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <p className="font-medium">
                {searchQuery
                  ? (lang === 'en' ? 'No matching sticker configurations found.' : 'কোনো মিল পাওয়া যায়নি।')
                  : (lang === 'en' ? 'No recently used sticker configurations yet.' : 'কোনো পূর্ববর্তী কনফিগারেশন নেই।')}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {lang === 'en' 
                  ? 'Print labels or click "+ Save Current" to add configurations here.'
                  : 'লেবেল প্রিন্ট করুন অথবা "+ বর্তমানটি সেভ করুন" ক্লিক করুন।'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {filteredConfigs.map((cfg) => {
                const isApplied = recentlyAppliedId === cfg.id;
                const emoji = getItemEmoji(cfg.itemType);
                const themeBadge = getThemeBadgeColor(cfg.themePreset);

                return (
                  <div
                    key={cfg.id}
                    className={`rounded-lg border p-2.5 flex flex-col justify-between gap-2 transition-all relative group shadow-2xs ${
                      isApplied
                        ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-300'
                        : 'bg-white hover:bg-slate-50/90 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {/* Top Row: Item Emoji & Type, Theme Preset & Time */}
                    <div className="flex items-center justify-between gap-1.5 text-[10.5px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm shrink-0" title={cfg.itemType}>
                          {emoji}
                        </span>
                        <span className="font-bold text-slate-800 uppercase truncate">
                          {cfg.buyer || 'No Buyer'}
                        </span>
                        {cfg.customer && (
                          <span className="text-[10px] text-slate-500 truncate hidden xs:inline">
                            · {cfg.customer}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Theme pill */}
                        {cfg.themePreset && (
                          <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[9px] border ${themeBadge}`}>
                            {cfg.themePreset.replace('-industrial', '').replace('-qc', '').replace('-export', '').replace('-warehouse', '').replace('-modern', '')}
                          </span>
                        )}

                        {/* Relative time */}
                        <span className="text-slate-400 text-[10px] flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{formatTimeAgo(cfg.timestamp)}</span>
                        </span>

                        {/* Delete button (visible on hover) */}
                        <button
                          type="button"
                          onClick={(e) => handleDelete(cfg.id, e)}
                          className="text-slate-300 hover:text-rose-600 p-0.5 rounded transition cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Remove from recently used"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: Ref, Size, Color & Tech Specs */}
                    <div className="space-y-1">
                      <div className="text-xs font-black text-slate-900 truncate font-mono tracking-tight" title={cfg.ref}>
                        {cfg.ref || (lang === 'en' ? 'Standard Export Ref' : 'স্ট্যান্ডার্ড রেফারেন্স')}
                      </div>

                      <div className="flex flex-wrap items-center gap-1 text-[10.5px]">
                        {cfg.size && (
                          <span className="bg-slate-100 text-slate-800 font-bold px-1.5 py-0.2 rounded font-mono border border-slate-200">
                            {cfg.size}
                          </span>
                        )}
                        {cfg.color && (
                          <span className="bg-slate-100 text-slate-700 font-medium px-1.5 py-0.2 rounded border border-slate-200">
                            {cfg.color}
                          </span>
                        )}
                        {cfg.deliveryUnit && (
                          <span className="text-[9.5px] text-indigo-600 font-semibold uppercase">
                            ({cfg.deliveryUnit === 'pcs' ? 'Pieces' : 'Meters'})
                          </span>
                        )}
                      </div>

                      {/* Specs snippet */}
                      {(cfg.style || cfg.gsm || cfg.finish || cfg.tipping || cfg.stretch) && (
                        <div className="text-[10px] text-slate-600 truncate bg-slate-50 px-1.5 py-0.5 rounded border border-slate-150 font-mono">
                          {[cfg.style, cfg.gsm || cfg.finish || cfg.tipping, cfg.stretch].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Quick Action Re-apply Buttons */}
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      {/* Primary Re-Apply Button */}
                      <button
                        type="button"
                        onClick={() => handleApply(cfg, 'all')}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg font-bold text-xs transition cursor-pointer shadow-2xs ${
                          isApplied
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                        title={lang === 'en' ? 'Re-apply all order details, specs, and sticker styling' : 'সব তথ্য ও স্টিকার স্টাইল এক ক্লিকে লোড করুন'}
                      >
                        {isApplied ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            <span>{lang === 'en' ? 'Applied!' : 'প্রয়োগ করা হয়েছে!'}</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>{lang === 'en' ? 'Re-apply Details' : 'তথ্য লোড করুন'}</span>
                          </>
                        )}
                      </button>

                      {/* Secondary Quick Buttons */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleApply(cfg, 'specs')}
                          className="px-1.5 py-1 text-[10px] font-semibold text-slate-600 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50 rounded border border-slate-200 transition cursor-pointer"
                          title={lang === 'en' ? 'Re-apply order specs only (keep current sticker theme)' : 'শুধু বায়ার ও স্পেক্স লোড করুন'}
                        >
                          <Layers className="w-2.5 h-2.5 inline mr-0.5" />
                          <span>{lang === 'en' ? 'Specs' : 'স্পেক্স'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApply(cfg, 'style')}
                          className="px-1.5 py-1 text-[10px] font-semibold text-slate-600 hover:text-purple-700 bg-slate-100 hover:bg-purple-50 rounded border border-slate-200 transition cursor-pointer"
                          title={lang === 'en' ? 'Re-apply styling & colors only (keep current order details)' : 'শুধু স্টিকার স্টাইল লোড করুন'}
                        >
                          <Palette className="w-2.5 h-2.5 inline mr-0.5" />
                          <span>{lang === 'en' ? 'Style' : 'স্টাইল'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
