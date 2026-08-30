export type StickerFontFamily = 'sans' | 'mono' | 'serif' | 'condensed' | 'grotesk' | 'industrial';
export type StickerThemePreset = 'classic-mono' | 'navy-industrial' | 'emerald-qc' | 'crimson-export' | 'amber-warehouse' | 'slate-modern' | 'custom';
export type StickerFontSizeScale = 'compact' | 'standard' | 'large';
export type StickerLogoPosition = 'left' | 'right' | 'top';

export interface StickerCustomizationSettings {
  // Font Customization
  fontFamily: StickerFontFamily;
  headingWeight: 'font-bold' | 'font-extrabold' | 'font-black';
  fontSizeScale: StickerFontSizeScale;
  uppercaseHeaders: boolean;

  // Color Customization
  themePreset: StickerThemePreset;
  borderColor: string;
  borderWidth: '1px' | '2px' | '3px' | '4px';
  headerBgColor: string;
  headerTextColor: string;
  badgeBgColor: string;
  badgeTextColor: string;
  netWtBoxBg: string;
  netWtTextColor: string;
  lengthBoxBg: string;
  lengthTextColor: string;
  qrColor: string;

  // Logo & Branding
  logoUrl: string | null;
  logoPosition: StickerLogoPosition;
  logoHeight: number; // in pixels (20 to 70)
  customCompanyName: string;
  customSubtitle: string;
  footerBrandingText: string;
  
  // Visibility toggles
  showBarcode: boolean;
  showBuyerBadge: boolean;
  showOrderSpecs: boolean;
  showUnitWeight: boolean;
  showFooterBranding: boolean;
}

export const DEFAULT_STICKER_SETTINGS: StickerCustomizationSettings = {
  fontFamily: 'sans',
  headingWeight: 'font-black',
  fontSizeScale: 'standard',
  uppercaseHeaders: true,

  themePreset: 'classic-mono',
  borderColor: '#0f172a', // slate-900
  borderWidth: '2px',
  headerBgColor: '#0f172a',
  headerTextColor: '#ffffff',
  badgeBgColor: '#0f172a',
  badgeTextColor: '#ffffff',
  netWtBoxBg: '#ecfdf5', // emerald-50
  netWtTextColor: '#064e3b', // emerald-900
  lengthBoxBg: '#eef2ff', // indigo-50
  lengthTextColor: '#312e81', // indigo-900
  qrColor: '#0f172a',

  logoUrl: null,
  logoPosition: 'left',
  logoHeight: 36,
  customCompanyName: '',
  customSubtitle: 'GARMENT ACCESSORIES & PACKING SPECIFICATION',
  footerBrandingText: 'QC INSPECTED · EXPORT STANDARD PACKING',

  showBarcode: true,
  showBuyerBadge: true,
  showOrderSpecs: true,
  showUnitWeight: true,
  showFooterBranding: true,
};

export const STICKER_THEME_PRESETS: Record<StickerThemePreset, Partial<StickerCustomizationSettings>> = {
  'classic-mono': {
    themePreset: 'classic-mono',
    borderColor: '#0f172a',
    borderWidth: '2px',
    headerBgColor: '#0f172a',
    headerTextColor: '#ffffff',
    badgeBgColor: '#0f172a',
    badgeTextColor: '#ffffff',
    netWtBoxBg: '#f1f5f9',
    netWtTextColor: '#0f172a',
    lengthBoxBg: '#f8fafc',
    lengthTextColor: '#0f172a',
    qrColor: '#0f172a',
  },
  'navy-industrial': {
    themePreset: 'navy-industrial',
    borderColor: '#1e3a8a', // blue-900
    borderWidth: '2px',
    headerBgColor: '#1e3a8a',
    headerTextColor: '#ffffff',
    badgeBgColor: '#1e3a8a',
    badgeTextColor: '#ffffff',
    netWtBoxBg: '#eff6ff', // blue-50
    netWtTextColor: '#172554', // blue-950
    lengthBoxBg: '#f0fdfa', // teal-50
    lengthTextColor: '#134e4a',
    qrColor: '#1e3a8a',
  },
  'emerald-qc': {
    themePreset: 'emerald-qc',
    borderColor: '#065f46', // emerald-800
    borderWidth: '2px',
    headerBgColor: '#065f46',
    headerTextColor: '#ffffff',
    badgeBgColor: '#065f46',
    badgeTextColor: '#ffffff',
    netWtBoxBg: '#ecfdf5', // emerald-50
    netWtTextColor: '#064e3b',
    lengthBoxBg: '#f0fdf4', // green-50
    lengthTextColor: '#14532d',
    qrColor: '#065f46',
  },
  'crimson-export': {
    themePreset: 'crimson-export',
    borderColor: '#881337', // rose-900
    borderWidth: '2px',
    headerBgColor: '#881337',
    headerTextColor: '#ffffff',
    badgeBgColor: '#881337',
    badgeTextColor: '#ffffff',
    netWtBoxBg: '#fff1f2', // rose-50
    netWtTextColor: '#4c0519',
    lengthBoxBg: '#fef2f2', // red-50
    lengthTextColor: '#7f1d1d',
    qrColor: '#881337',
  },
  'amber-warehouse': {
    themePreset: 'amber-warehouse',
    borderColor: '#78350f', // amber-900
    borderWidth: '2px',
    headerBgColor: '#78350f',
    headerTextColor: '#ffffff',
    badgeBgColor: '#d97706', // amber-600
    badgeTextColor: '#ffffff',
    netWtBoxBg: '#fffbeb', // amber-50
    netWtTextColor: '#451a03',
    lengthBoxBg: '#fefce8', // yellow-50
    lengthTextColor: '#713f12',
    qrColor: '#78350f',
  },
  'slate-modern': {
    themePreset: 'slate-modern',
    borderColor: '#334155', // slate-700
    borderWidth: '2px',
    headerBgColor: '#334155',
    headerTextColor: '#ffffff',
    badgeBgColor: '#4f46e5', // indigo-600
    badgeTextColor: '#ffffff',
    netWtBoxBg: '#f8fafc',
    netWtTextColor: '#0f172a',
    lengthBoxBg: '#eef2ff',
    lengthTextColor: '#312e81',
    qrColor: '#334155',
  },
  'custom': {
    themePreset: 'custom',
  }
};

export const FONT_FAMILY_STYLES: Record<StickerFontFamily, { name: string; cssClass: string; label: string }> = {
  'sans': {
    name: 'Inter / Modern Sans',
    cssClass: 'font-sans',
    label: 'Clean Modern Sans',
  },
  'mono': {
    name: 'Space Mono / Tech',
    cssClass: 'font-mono',
    label: 'Technical Monospace',
  },
  'serif': {
    name: 'Classic Serif',
    cssClass: 'font-serif',
    label: 'Traditional Formal',
  },
  'condensed': {
    name: 'Condensed / Barlow',
    cssClass: 'tracking-tight font-sans',
    label: 'Compact High Density',
  },
  'grotesk': {
    name: 'Space Grotesk / Industrial',
    cssClass: 'tracking-wide font-sans',
    label: 'Industrial Grotesk',
  },
  'industrial': {
    name: 'Bold Heavy Industrial',
    cssClass: 'font-mono tracking-wider',
    label: 'Heavy Shipping Label',
  },
};
