import { RecentStickerConfig, StickerCustomizationSettings } from '../types/stickerSettings';
import { PackingSheetData } from '../types/calculator';

const STORAGE_KEY = 'garment_recently_used_sticker_configs_v1';
const MAX_RECENT_CONFIGS = 12;

export const SEEDED_RECENT_CONFIGS: RecentStickerConfig[] = [
  {
    id: 'seed-elastic-jacquard-hcf',
    name: 'HCF · LIDA · 32MM Jacquard Elastic (Black)',
    timestamp: Date.now() - 1000 * 60 * 35, // 35 minutes ago
    buyer: 'HCF',
    customer: 'LIDA',
    ref: 'GF-ELASTIC-260702',
    size: '32MM',
    color: 'BLACK',
    itemType: 'elastic',
    deliveryUnit: 'mtr',
    defaultTare: 0.50,
    defaultWtPerUnit: 14.50,
    companyName: 'GOOD & FAST Pa. Co. Ltd',
    style: 'WOVEN JACQUARD',
    gsm: '240 GSM',
    stretch: '140% - 160% HIGH RECOVERY',
    themePreset: 'navy-industrial',
    fontFamily: 'sans',
    fontSizeScale: 'standard',
    customCompanyName: 'GOOD & FAST Pa. Co. Ltd',
    customSubtitle: 'ELASTIC WEBBING & PACKING SPECIFICATION',
    footerBrandingText: 'QC INSPECTED · EXPORT STANDARD PACKING',
    showBarcode: true,
    showTechnicalSpecs: true,
    autoScaleLongText: true,
  },
  {
    id: 'seed-drawstring-cord-hm',
    name: 'H&M · LIDA · 5MM Braided Cord (White)',
    timestamp: Date.now() - 1000 * 60 * 60 * 2.5, // 2.5 hours ago
    buyer: 'H&M',
    customer: 'LIDA',
    ref: 'LIDA-LO-DRW-26070224',
    size: '5MM',
    color: 'OPTICAL WHITE',
    itemType: 'drawstring',
    deliveryUnit: 'pcs',
    defaultTare: 0.40,
    defaultWtPerUnit: 3.20,
    pcsPerPkt: 100,
    companyName: 'GOOD & FAST Pa. Co. Ltd',
    style: 'BRAIDED ROUND CORD',
    tipping: 'CLEAR FILM TIP 15MM',
    pattern: 'Ø 5MM × 120 CM CUT',
    themePreset: 'emerald-qc',
    fontFamily: 'sans',
    fontSizeScale: 'standard',
    customCompanyName: 'GOOD & FAST Pa. Co. Ltd',
    customSubtitle: 'DRAWSTRING & CORD ACCESSORIES PACKING SPECIFICATION',
    footerBrandingText: 'OEKOTEX CERTIFIED · QC VERIFIED',
    showBarcode: true,
    showTechnicalSpecs: true,
    autoScaleLongText: true,
  },
  {
    id: 'seed-bow-satin-zara',
    name: 'ZARA · HCF · 3MM Satin Ribbon Bow (Red)',
    timestamp: Date.now() - 1000 * 60 * 60 * 22, // Yesterday
    buyer: 'ZARA',
    customer: 'HCF',
    ref: 'LIDA-LO-BOW-26070224',
    size: '3MM',
    color: 'CRIMSON RED',
    itemType: 'bow',
    deliveryUnit: 'pcs',
    defaultTare: 0.35,
    defaultWtPerUnit: 0.85,
    pcsPerPkt: 50,
    companyName: 'GOOD & FAST Pa. Co. Ltd',
    style: 'SATIN RIBBON BOW',
    finish: 'BAR-TACK ULTRASONIC',
    pattern: '3MM RIBBON | 45MM SPAN',
    themePreset: 'crimson-export',
    fontFamily: 'sans',
    fontSizeScale: 'compact',
    customCompanyName: 'GOOD & FAST Pa. Co. Ltd',
    customSubtitle: 'BOW & GARMENT TRIMS PACKING SPECIFICATION',
    footerBrandingText: 'QC INSPECTED · GRADE-A FINISH',
    showBarcode: true,
    showTechnicalSpecs: true,
    autoScaleLongText: true,
  }
];

/**
 * Loads recent sticker configurations from local storage.
 * Automatically seeds default export presets if empty.
 */
export function loadRecentStickerConfigs(): RecentStickerConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed initial configs so user immediately sees previous templates
      saveRecentConfigsList(SEEDED_RECENT_CONFIGS);
      return SEEDED_RECENT_CONFIGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return SEEDED_RECENT_CONFIGS;
  } catch (err) {
    console.error('Failed to load recent sticker configs', err);
    return SEEDED_RECENT_CONFIGS;
  }
}

/**
 * Saves a list of recent sticker configurations directly to localStorage.
 */
function saveRecentConfigsList(configs: RecentStickerConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs.slice(0, MAX_RECENT_CONFIGS)));
  } catch (err) {
    console.error('Failed to save recent sticker configs', err);
  }
}

/**
 * Formats a clean descriptive name for a sticker configuration
 */
export function generateConfigDisplayName(
  buyer?: string,
  ref?: string,
  size?: string,
  color?: string,
  itemType?: string
): string {
  const parts: string[] = [];
  if (buyer) parts.push(buyer.trim());
  if (ref) parts.push(ref.trim());
  if (size) parts.push(size.trim());
  if (color) parts.push(color.trim());

  if (parts.length === 0) {
    return `${itemType ? itemType.toUpperCase() : 'EXPORT'} STICKER CONFIG`;
  }
  return parts.join(' · ');
}

/**
 * Records a sticker configuration snapshot into the recently used list.
 * Deduplicates by Buyer + Ref + Size + Color + ItemType.
 */
export function recordStickerUsage(
  sheetData: PackingSheetData,
  settings: StickerCustomizationSettings,
  customLabel?: string
): RecentStickerConfig[] {
  // Avoid saving completely blank configurations
  if (!sheetData.buyer && !sheetData.ref && !sheetData.size && !sheetData.customer) {
    return loadRecentStickerConfigs();
  }

  const currentList = loadRecentStickerConfigs();
  const displayName = customLabel || generateConfigDisplayName(
    sheetData.buyer,
    sheetData.ref,
    sheetData.size,
    sheetData.color,
    sheetData.itemType
  );

  const newConfig: RecentStickerConfig = {
    id: `recent-cfg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: displayName,
    timestamp: Date.now(),
    buyer: sheetData.buyer || '',
    customer: sheetData.customer || '',
    ref: sheetData.ref || '',
    size: sheetData.size || '',
    color: sheetData.color || '',
    itemType: sheetData.itemType || 'elastic',
    deliveryUnit: sheetData.deliveryUnit,
    defaultTare: sheetData.defaultTare,
    defaultWtPerUnit: sheetData.defaultWtPerUnit,
    pcsPerPkt: sheetData.pcsPerPkt,
    companyName: sheetData.companyName,
    style: sheetData.style,
    gsm: sheetData.gsm,
    stretch: sheetData.stretch,
    finish: sheetData.finish,
    tipping: sheetData.tipping,
    pattern: sheetData.pattern,
    themePreset: settings.themePreset,
    fontFamily: settings.fontFamily,
    fontSizeScale: settings.fontSizeScale,
    customCompanyName: settings.customCompanyName,
    customSubtitle: settings.customSubtitle,
    footerBrandingText: settings.footerBrandingText,
    showBarcode: settings.showBarcode,
    showTechnicalSpecs: settings.showTechnicalSpecs,
    autoScaleLongText: settings.autoScaleLongText,
    stickerSettings: {
      themePreset: settings.themePreset,
      fontFamily: settings.fontFamily,
      fontSizeScale: settings.fontSizeScale,
      borderColor: settings.borderColor,
      borderWidth: settings.borderWidth,
      headerBgColor: settings.headerBgColor,
      headerTextColor: settings.headerTextColor,
      badgeBgColor: settings.badgeBgColor,
      badgeTextColor: settings.badgeTextColor,
      netWtBoxBg: settings.netWtBoxBg,
      netWtTextColor: settings.netWtTextColor,
      lengthBoxBg: settings.lengthBoxBg,
      lengthTextColor: settings.lengthTextColor,
      qrColor: settings.qrColor,
      customCompanyName: settings.customCompanyName,
      customSubtitle: settings.customSubtitle,
      footerBrandingText: settings.footerBrandingText,
      showBarcode: settings.showBarcode,
      showTechnicalSpecs: settings.showTechnicalSpecs,
      autoScaleLongText: settings.autoScaleLongText,
      logoUrl: settings.logoUrl,
      logoPosition: settings.logoPosition,
      logoHeight: settings.logoHeight,
    }
  };

  // Check for duplicate matching buyer, ref, size, color and itemType
  const filtered = currentList.filter(item => {
    const isSameOrder = 
      (item.buyer || '').toLowerCase() === (newConfig.buyer || '').toLowerCase() &&
      (item.ref || '').toLowerCase() === (newConfig.ref || '').toLowerCase() &&
      (item.size || '').toLowerCase() === (newConfig.size || '').toLowerCase() &&
      (item.color || '').toLowerCase() === (newConfig.color || '').toLowerCase() &&
      (item.itemType || '').toLowerCase() === (newConfig.itemType || '').toLowerCase();
    return !isSameOrder;
  });

  const updatedList = [newConfig, ...filtered].slice(0, MAX_RECENT_CONFIGS);
  saveRecentConfigsList(updatedList);
  return updatedList;
}

/**
 * Deletes a configuration from recent list
 */
export function deleteRecentStickerConfig(id: string): RecentStickerConfig[] {
  const currentList = loadRecentStickerConfigs();
  const updated = currentList.filter(c => c.id !== id);
  saveRecentConfigsList(updated);
  return updated;
}

/**
 * Clears all recent sticker configurations
 */
export function clearRecentStickerConfigs(): RecentStickerConfig[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear recent configs', err);
  }
  return [];
}
