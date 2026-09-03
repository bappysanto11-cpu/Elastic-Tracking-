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
  showTechnicalSpecs?: boolean; // Dynamic extra rows for Style, GSM, Stretch, Tipping, etc.
  showUnitWeight: boolean;
  showFooterBranding: boolean;
  autoScaleLongText?: boolean; // Automatically scales down font sizes for fields like REF, Customer to prevent overflow
  showCropMarks?: boolean; // Show dashed cutting lines and corner crop tick marks for manual cutting
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
  showTechnicalSpecs: true,
  showUnitWeight: true,
  showFooterBranding: true,
  autoScaleLongText: true,
  showCropMarks: false,
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

export type StickerPaperSize = 
  | 'a4-grid-4'    // A4 Sheet: 4 Labels per page (2x2 Grid)
  | 'a4-grid-6'    // A4 Sheet: 6 Labels per page (2x3 Grid)
  | 'a4-grid-2'    // A4 Sheet: 2 Labels per page (1x2 Large)
  | 'roll-4x6'     // Thermal Label Roll: 4" x 6" (100mm x 150mm) Single Label
  | 'roll-4x4'     // Thermal Label Roll: 4" x 4" (100mm x 100mm) Single Label
  | 'roll-3x2'     // Thermal Label Roll: 3" x 2" (75mm x 50mm) Compact Label
  | 'auto-flow';   // Auto Responsive Flow

export interface PaperSizeDefinition {
  id: StickerPaperSize;
  name: string;
  nameBn: string;
  description: string;
  category: 'sheet' | 'roll' | 'auto';
  labelsPerPage: number;
  widthMm: number;
  heightMm: number;
  pageCss: string;
  gridColsClass: string;
  printGridClass: string;
  cardMinHeight: string;
  recommendedPadding: number; // in px
  recommendedFontScale: number; // multiplier
}

export const STICKER_PAPER_SIZES: Record<StickerPaperSize, PaperSizeDefinition> = {
  'a4-grid-4': {
    id: 'a4-grid-4',
    name: 'A4 Sheet (4 Labels / 2×2)',
    nameBn: 'এ৪ শিট (৪টি লেবেল / ২×২)',
    description: 'Standard 2×2 export packing label layout on A4 paper',
    category: 'sheet',
    labelsPerPage: 4,
    widthMm: 210,
    heightMm: 297,
    pageCss: '@page { size: A4 portrait; margin: 5mm; }',
    gridColsClass: 'grid-cols-1 md:grid-cols-2',
    printGridClass: 'print:grid-cols-2',
    cardMinHeight: '260px',
    recommendedPadding: 14,
    recommendedFontScale: 1.0,
  },
  'a4-grid-6': {
    id: 'a4-grid-6',
    name: 'A4 Sheet (6 Labels / 2×3)',
    nameBn: 'এ৪ শিট (৬টি লেবেল / ২×৩)',
    description: 'High-density 2×3 carton label layout on A4 paper',
    category: 'sheet',
    labelsPerPage: 6,
    widthMm: 210,
    heightMm: 297,
    pageCss: '@page { size: A4 portrait; margin: 4mm; }',
    gridColsClass: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    printGridClass: 'print:grid-cols-2',
    cardMinHeight: '215px',
    recommendedPadding: 10,
    recommendedFontScale: 0.88,
  },
  'a4-grid-2': {
    id: 'a4-grid-2',
    name: 'A4 Sheet (2 Large Labels)',
    nameBn: 'এ৪ শিট (২টি বড় লেবেল)',
    description: 'Extra-large shipping master carton labels (1×2 on A4)',
    category: 'sheet',
    labelsPerPage: 2,
    widthMm: 210,
    heightMm: 297,
    pageCss: '@page { size: A4 portrait; margin: 8mm; }',
    gridColsClass: 'grid-cols-1 md:grid-cols-2',
    printGridClass: 'print:grid-cols-1',
    cardMinHeight: '340px',
    recommendedPadding: 18,
    recommendedFontScale: 1.15,
  },
  'roll-4x6': {
    id: 'roll-4x6',
    name: 'Label Roll (4" × 6" / 100×150mm)',
    nameBn: 'লেবেল রোল (৪" × ৬" / ১০০×১৫০ মিমি)',
    description: 'Standard 4×6 inch thermal transfer sticker roll (1 label/page)',
    category: 'roll',
    labelsPerPage: 1,
    widthMm: 100,
    heightMm: 150,
    pageCss: '@page { size: 100mm 150mm; margin: 2mm; }',
    gridColsClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    printGridClass: 'print:grid-cols-1',
    cardMinHeight: '320px',
    recommendedPadding: 14,
    recommendedFontScale: 1.05,
  },
  'roll-4x4': {
    id: 'roll-4x4',
    name: 'Label Roll (4" × 4" / 100×100mm)',
    nameBn: 'লেবেল রোল (৪" × ৪" / ১০০×১০০ মিমি)',
    description: 'Square 4×4 inch thermal barcode sticker roll (1 label/page)',
    category: 'roll',
    labelsPerPage: 1,
    widthMm: 100,
    heightMm: 100,
    pageCss: '@page { size: 100mm 100mm; margin: 2mm; }',
    gridColsClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    printGridClass: 'print:grid-cols-1',
    cardMinHeight: '260px',
    recommendedPadding: 11,
    recommendedFontScale: 0.95,
  },
  'roll-3x2': {
    id: 'roll-3x2',
    name: 'Compact Roll (3" × 2" / 75×50mm)',
    nameBn: 'কমপ্যাক্ট রোল (৩" × ২" / ৭৫×৫০ মিমি)',
    description: 'Compact 3×2 inch thermal label roll (1 label/page)',
    category: 'roll',
    labelsPerPage: 1,
    widthMm: 75,
    heightMm: 50,
    pageCss: '@page { size: 75mm 50mm; margin: 1.5mm; }',
    gridColsClass: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    printGridClass: 'print:grid-cols-1',
    cardMinHeight: '190px',
    recommendedPadding: 8,
    recommendedFontScale: 0.78,
  },
  'auto-flow': {
    id: 'auto-flow',
    name: 'Auto Responsive Grid',
    nameBn: 'অটো রেসপন্সিভ গ্রিড',
    description: 'Flows labels dynamically to fill screen and standard printers',
    category: 'auto',
    labelsPerPage: 0,
    widthMm: 0,
    heightMm: 0,
    pageCss: '@page { size: auto; margin: 5mm; }',
    gridColsClass: 'grid-cols-1 md:grid-cols-2',
    printGridClass: 'print:grid-cols-2',
    cardMinHeight: '260px',
    recommendedPadding: 14,
    recommendedFontScale: 1.0,
  },
};

export interface StickerBulkConfig {
  paperSize: StickerPaperSize;
  uniformPadding: number;          // in pixels (4px to 28px)
  fontScale: number;               // multiplier (0.7 to 1.35)
  forcePageBreakPerLabel: boolean; // each label starts on fresh page (auto for rolls)
  pageBreakAfterN: number;         // 0 for auto, or 1, 2, 4, 6
  showPageBreakVisuals: boolean;   // show visual page boundary splitters in UI
  autoScaleToFitPage: boolean;     // automatically adapt font scale when overflow is detected
  showCropMarks?: boolean;         // show dashed crop marks and corner cutting guides
}

export const DEFAULT_BULK_CONFIG: StickerBulkConfig = {
  paperSize: 'a4-grid-4',
  uniformPadding: 14,
  fontScale: 1.0,
  forcePageBreakPerLabel: false,
  pageBreakAfterN: 4,
  showPageBreakVisuals: true,
  autoScaleToFitPage: true,
  showCropMarks: false,
};

export interface RecentStickerConfig {
  id: string;
  name: string;
  timestamp: number;
  // Core order and packaging details
  buyer: string;
  customer: string;
  ref: string;
  size: string;
  color: string;
  itemType: string;
  deliveryUnit?: 'mtr' | 'pcs' | 'yds';
  defaultTare?: number;
  defaultWtPerUnit?: number;
  pcsPerPkt?: number;
  companyName?: string;
  // Dynamic technical specifications
  style?: string;
  gsm?: string;
  stretch?: string;
  finish?: string;
  tipping?: string;
  pattern?: string;
  // Sticker appearance & branding settings
  themePreset?: StickerThemePreset;
  fontFamily?: StickerFontFamily;
  fontSizeScale?: StickerFontSizeScale;
  customCompanyName?: string;
  customSubtitle?: string;
  footerBrandingText?: string;
  showBarcode?: boolean;
  showTechnicalSpecs?: boolean;
  autoScaleLongText?: boolean;
  stickerSettings?: Partial<StickerCustomizationSettings>;
  bulkConfig?: Partial<StickerBulkConfig>;
}

