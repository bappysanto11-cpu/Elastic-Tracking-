import React, { useState, useRef, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng, toBlob } from 'html-to-image';
import JSZip from 'jszip';
import { CartonRow, PackingSheetData, SummaryStats, ItemType } from '../types/calculator';
import { Language, translations } from '../utils/translations';
import { generateCartonPreviewUrl } from '../utils/qrCarton';
import { getItemConfig, recomputeCarton } from '../utils/calc';
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
  Sparkles,
  Package,
  SlidersHorizontal,
  RefreshCw,
  Check,
  Layers,
  Eye,
  EyeOff,
  Table,
  LayoutGrid,
  Search,
  Trash2,
  Copy,
  PlusCircle,
  AlertCircle,
  ArrowRight,
  FileText,
  GripVertical,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  FolderArchive,
  Archive,
  DownloadCloud,
  CheckCircle2,
  ArrowDownUp,
  ListOrdered,
  Shuffle,
  RotateCcw,
  MoveUp,
  MoveDown,
  FileSpreadsheet,
  ChevronRight,
  ExternalLink,
  Type,
  Minimize2,
  Maximize2,
  Scan,
  Scissors,
  Camera
} from 'lucide-react';
import { 
  StickerCustomizationSettings, 
  DEFAULT_STICKER_SETTINGS, 
  FONT_FAMILY_STYLES,
  RecentStickerConfig,
  StickerBulkConfig,
  StickerPaperSize,
  STICKER_PAPER_SIZES,
  DEFAULT_BULK_CONFIG
} from '../types/stickerSettings';
import { 
  loadStickerSettings, 
  saveStickerSettings, 
  applyThemePreset,
  loadBulkConfig,
  saveBulkConfig
} from '../utils/stickerSettingsStorage';
import { recordStickerUsage } from '../utils/recentStickerConfigsStorage';
import { StickerSettingsModal } from './StickerSettingsModal';
import { StickerBulkConfigPanel } from './StickerBulkConfigPanel';
import { AutoFitText } from './AutoFitText';
import { 
  getItemTechnicalRows, 
  getDefaultSpecsForItem, 
  ITEM_SPEC_SUGGESTIONS 
} from '../utils/itemTechnicalSpecs';

interface StickerLabelsViewProps {
  sheetData: PackingSheetData;
  summary: SummaryStats;
  lang: Language;
  onRequestPrint?: (orientation: 'landscape' | 'portrait') => void;
  onOpenCartonQr?: (carton: CartonRow) => void;
  onUpdateHeader?: (updated: Partial<PackingSheetData>) => void;
  onUpdateCarton?: (id: string, updated: Partial<CartonRow>) => void;
  onAddCarton?: () => void;
  onDeleteCarton?: (id: string) => void;
  onDuplicateCarton?: (carton: CartonRow) => void;
  onAddBulk?: (count: number) => void;
  onReorderCartons?: (newCartons: CartonRow[]) => void;
  onOpenAiPhotoScanner?: () => void;
}

export const StickerLabelsView: React.FC<StickerLabelsViewProps> = ({
  sheetData,
  summary,
  lang,
  onRequestPrint,
  onOpenCartonQr,
  onUpdateHeader,
  onUpdateCarton,
  onAddCarton,
  onDeleteCarton,
  onDuplicateCarton,
  onAddBulk,
  onReorderCartons,
  onOpenAiPhotoScanner,
}) => {
  // View mode: showPreview toggles between full-page sticker preview mode and list-based data entry mode
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [selectedCartonId, setSelectedCartonId] = useState<string | null>(null);
  const [showSidePreview, setShowSidePreview] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'with-weight' | 'zero-weight'>('all');

  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [qrSize, setQrSize] = useState<number>(48);
  const [densityMode, setDensityMode] = useState<'compact' | 'comfort'>('compact');
  const wUnit = sheetData.weightUnit === 'gm' ? 'gm' : 'kg';
  const isCompact = densityMode === 'compact';
  const isComfort = densityMode === 'comfort';
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number; stage: string } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isBulkPanelOpen, setIsBulkPanelOpen] = useState<boolean>(false);
  const [isSpecsDrawerOpen, setIsSpecsDrawerOpen] = useState<boolean>(false);
  const [recentlyNotification, setRecentlyNotification] = useState<string | null>(null);
  const [hasOverflowDetected, setHasOverflowDetected] = useState<boolean>(false);
  const [isSettingsOverviewExpanded, setIsSettingsOverviewExpanded] = useState<boolean>(true);

  // Drag-and-drop & Reordering state
  const [draggedCartonId, setDraggedCartonId] = useState<string | null>(null);
  const [dragOverCartonId, setDragOverCartonId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after' | null>(null);
  const [reorderNotice, setReorderNotice] = useState<string | null>(null);
  const [isReorderMenuOpen, setIsReorderMenuOpen] = useState<boolean>(false);
  
  // Customization Settings State
  const [stickerSettings, setStickerSettings] = useState<StickerCustomizationSettings>(() => {
    return loadStickerSettings();
  });

  // Bulk Sticker Configuration State
  const [bulkConfig, setBulkConfig] = useState<StickerBulkConfig>(() => {
    return loadBulkConfig();
  });

  // Dashed Crop Marks & Cutting Guides State
  const [showCropMarks, setShowCropMarks] = useState<boolean>(() => {
    const loadedSettings = loadStickerSettings();
    const loadedBulk = loadBulkConfig();
    return loadedSettings.showCropMarks ?? loadedBulk.showCropMarks ?? false;
  });

  const handleToggleCropMarks = () => {
    const next = !showCropMarks;
    setShowCropMarks(next);
    handleUpdateSettings({
      ...stickerSettings,
      showCropMarks: next,
    });
    handleUpdateBulkConfig({
      ...bulkConfig,
      showCropMarks: next,
    });
  };

  useEffect(() => {
    if (stickerSettings.showCropMarks !== undefined && stickerSettings.showCropMarks !== showCropMarks) {
      setShowCropMarks(stickerSettings.showCropMarks);
    }
  }, [stickerSettings.showCropMarks]);

  useEffect(() => {
    if (bulkConfig.showCropMarks !== undefined && bulkConfig.showCropMarks !== showCropMarks) {
      setShowCropMarks(bulkConfig.showCropMarks);
    }
  }, [bulkConfig.showCropMarks]);

  const stickerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const t = translations[lang];

  const currentItemConfig = getItemConfig(sheetData.itemType);
  const currentItemKey = (sheetData.itemType || 'elastic').toLowerCase();
  const isPcsMode = sheetData.deliveryUnit === 'pcs' || currentItemConfig.defaultDeliveryUnit === 'pcs';
  const technicalRows = getItemTechnicalRows(sheetData, lang);

  const showReorderToast = (msg: string) => {
    setReorderNotice(msg);
    setTimeout(() => {
      setReorderNotice(null);
    }, 3000);
  };

  // Reorder execution logic: changes cartons order and re-indexes cartonNo sequentially
  const executeReorder = (sourceId: string, targetId: string, position: 'before' | 'after' = 'before') => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const list = [...sheetData.cartons];
    const sourceIndex = list.findIndex(c => c.id === sourceId);
    if (sourceIndex === -1) return;

    const [movedItem] = list.splice(sourceIndex, 1);
    const targetIndex = list.findIndex(c => c.id === targetId);
    if (targetIndex === -1) return;

    const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;
    list.splice(insertIndex, 0, movedItem);

    const renumbered = list.map((c, idx) => ({
      ...c,
      cartonNo: idx + 1,
    }));

    if (onReorderCartons) {
      onReorderCartons(renumbered);
    }
    showReorderToast(
      lang === 'en'
        ? `Reordered Carton #${movedItem.cartonNo} → Sequence Position #${insertIndex + 1}`
        : `কার্টন ক্রম পরিবর্তন: #${movedItem.cartonNo} কে পজিশন #${insertIndex + 1}-এ স্থানান্তর করা হয়েছে`
    );
  };

  // Drag event handlers
  const handleDragStart = (e: React.DragEvent, cartonId: string) => {
    e.dataTransfer.setData('text/plain', cartonId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedCartonId(cartonId);
  };

  const handleDragOver = (e: React.DragEvent, targetCartonId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedCartonId || draggedCartonId === targetCartonId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const isBefore = e.clientY < midY;

    if (dragOverCartonId !== targetCartonId || dragOverPosition !== (isBefore ? 'before' : 'after')) {
      setDragOverCartonId(targetCartonId);
      setDragOverPosition(isBefore ? 'before' : 'after');
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetCartonId: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      if (dragOverCartonId === targetCartonId) {
        setDragOverCartonId(null);
        setDragOverPosition(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, targetCartonId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedCartonId;
    if (sourceId && targetCartonId && sourceId !== targetCartonId) {
      executeReorder(sourceId, targetCartonId, dragOverPosition || 'before');
    }
    setDraggedCartonId(null);
    setDragOverCartonId(null);
    setDragOverPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedCartonId(null);
    setDragOverCartonId(null);
    setDragOverPosition(null);
  };

  // Move single carton up/down/top/bottom in the sequence
  const handleMoveCarton = (cartonId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    const list = [...sheetData.cartons];
    const index = list.findIndex(c => c.id === cartonId);
    if (index === -1) return;

    const item = list[index];
    if (direction === 'up' && index > 0) {
      list.splice(index, 1);
      list.splice(index - 1, 0, item);
    } else if (direction === 'down' && index < list.length - 1) {
      list.splice(index, 1);
      list.splice(index + 1, 0, item);
    } else if (direction === 'top' && index > 0) {
      list.splice(index, 1);
      list.unshift(item);
    } else if (direction === 'bottom' && index < list.length - 1) {
      list.splice(index, 1);
      list.push(item);
    } else {
      return;
    }

    const renumbered = list.map((c, idx) => ({
      ...c,
      cartonNo: idx + 1,
    }));

    if (onReorderCartons) {
      onReorderCartons(renumbered);
    }
    showReorderToast(
      lang === 'en'
        ? `Moved Carton #${item.cartonNo} ${direction}`
        : `কার্টন #${item.cartonNo} ${direction === 'up' ? 'উপরে' : direction === 'down' ? 'নিচে' : direction === 'top' ? 'শীর্ষে' : 'শেষে'} নেওয়া হয়েছে`
    );
  };

  // Quick Sort utilities
  const handleSortCartons = (criterion: 'weight-asc' | 'weight-desc' | 'qty-desc' | 'reverse' | 'carton-asc') => {
    const list = [...sheetData.cartons];
    let sorted: CartonRow[] = [];

    if (criterion === 'weight-asc') {
      sorted = [...list].sort((a, b) => (a.netWt || a.grossWt) - (b.netWt || b.grossWt));
    } else if (criterion === 'weight-desc') {
      sorted = [...list].sort((a, b) => (b.netWt || b.grossWt) - (a.netWt || a.grossWt));
    } else if (criterion === 'qty-desc') {
      sorted = [...list].sort((a, b) => (b.qtyPcs || b.lengthMtr || 0) - (a.qtyPcs || a.lengthMtr || 0));
    } else if (criterion === 'reverse') {
      sorted = [...list].reverse();
    } else if (criterion === 'carton-asc') {
      sorted = [...list].sort((a, b) => a.cartonNo - b.cartonNo);
    }

    const renumbered = sorted.map((c, idx) => ({
      ...c,
      cartonNo: idx + 1,
    }));

    if (onReorderCartons) {
      onReorderCartons(renumbered);
    }
    setIsReorderMenuOpen(false);
    showReorderToast(
      lang === 'en'
        ? `Printing sequence sorted (${criterion.replace('-', ' ')})`
        : `প্রিন্টিং সিকোয়েন্স সাজানো হয়েছে`
    );
  };

  const handleUpdateSettings = (newSettings: StickerCustomizationSettings) => {
    setStickerSettings(newSettings);
    saveStickerSettings(newSettings);
  };

  const handleUpdateBulkConfig = (newConfig: StickerBulkConfig) => {
    setBulkConfig(newConfig);
    saveBulkConfig(newConfig);
  };

  const handleApplyRecentConfig = (config: RecentStickerConfig, mode: 'all' | 'specs' | 'style' = 'all') => {
    // 1. Order and technical specifications update
    if (mode === 'all' || mode === 'specs') {
      if (onUpdateHeader) {
        const updates: Partial<PackingSheetData> = {
          buyer: config.buyer,
          customer: config.customer,
          ref: config.ref,
          size: config.size,
          color: config.color,
          itemType: (config.itemType as ItemType) || sheetData.itemType,
          deliveryUnit: config.deliveryUnit || sheetData.deliveryUnit,
          defaultTare: config.defaultTare !== undefined ? config.defaultTare : sheetData.defaultTare,
          defaultWtPerUnit: config.defaultWtPerUnit !== undefined ? config.defaultWtPerUnit : sheetData.defaultWtPerUnit,
          pcsPerPkt: config.pcsPerPkt !== undefined ? config.pcsPerPkt : sheetData.pcsPerPkt,
          companyName: config.companyName || sheetData.companyName,
          style: config.style || '',
          gsm: config.gsm || '',
          stretch: config.stretch || '',
          finish: config.finish || '',
          tipping: config.tipping || '',
          pattern: config.pattern || '',
        };
        onUpdateHeader(updates);
      }
    }

    // 2. Sticker Customization Settings and Branding update
    if (mode === 'all' || mode === 'style') {
      if (config.bulkConfig) {
        handleUpdateBulkConfig({
          ...bulkConfig,
          ...config.bulkConfig,
        });
      }

      if (config.stickerSettings) {
        const merged: StickerCustomizationSettings = {
          ...stickerSettings,
          ...config.stickerSettings,
          themePreset: config.themePreset || config.stickerSettings.themePreset || stickerSettings.themePreset,
          fontFamily: config.fontFamily || config.stickerSettings.fontFamily || stickerSettings.fontFamily,
          fontSizeScale: config.fontSizeScale || config.stickerSettings.fontSizeScale || stickerSettings.fontSizeScale,
          customCompanyName: config.customCompanyName !== undefined ? config.customCompanyName : (config.stickerSettings.customCompanyName ?? stickerSettings.customCompanyName),
          customSubtitle: config.customSubtitle !== undefined ? config.customSubtitle : (config.stickerSettings.customSubtitle ?? stickerSettings.customSubtitle),
          footerBrandingText: config.footerBrandingText !== undefined ? config.footerBrandingText : (config.stickerSettings.footerBrandingText ?? stickerSettings.footerBrandingText),
          showBarcode: config.showBarcode !== undefined ? config.showBarcode : (config.stickerSettings.showBarcode ?? stickerSettings.showBarcode),
          showTechnicalSpecs: config.showTechnicalSpecs !== undefined ? config.showTechnicalSpecs : (config.stickerSettings.showTechnicalSpecs ?? stickerSettings.showTechnicalSpecs),
          autoScaleLongText: config.autoScaleLongText !== undefined ? config.autoScaleLongText : (config.stickerSettings.autoScaleLongText ?? stickerSettings.autoScaleLongText),
        };
        handleUpdateSettings(merged);
      } else if (config.themePreset) {
        const updated = applyThemePreset(stickerSettings, config.themePreset);
        handleUpdateSettings(updated);
      }
    }
  };

  const handleQuickItemSwitch = (item: ItemType) => {
    if (onUpdateHeader) {
      const config = getItemConfig(item);
      const defaultSpecs = getDefaultSpecsForItem(item);
      const updates: Partial<PackingSheetData> = {
        itemType: item,
        deliveryUnit: config.defaultDeliveryUnit,
        defaultWtPerUnit: config.defaultWtPerUnit,
        ...defaultSpecs,
      };

      // If ref is generic or default, provide convenient item-specific prefix
      if (!sheetData.ref || sheetData.ref.startsWith('GF-') || sheetData.ref.startsWith('LIDA-')) {
        if (item === 'bow') {
          updates.ref = 'LIDA-LO-BOW-26070224';
          if (!sheetData.customer) updates.customer = 'LIDA';
          if (!sheetData.buyer) updates.buyer = 'HCF';
          if (!sheetData.size) updates.size = '3MM';
          if (!sheetData.color) updates.color = 'BLACK';
        } else if (item === 'drawstring') {
          updates.ref = 'LIDA-LO-DRW-26070224';
          if (!sheetData.customer) updates.customer = 'LIDA';
          if (!sheetData.buyer) updates.buyer = 'HCF';
          if (!sheetData.size) updates.size = '5MM';
          if (!sheetData.color) updates.color = 'BLACK';
        }
      }

      onUpdateHeader(updates);
    }
  };

  const activeCartons = sheetData.cartons.filter(
    c => c.netWt > 0 || c.grossWt > 0 || c.lengthMtr > 0 || (c.qtyPcs && c.qtyPcs > 0)
  );

  const activePaperDef = STICKER_PAPER_SIZES[bulkConfig.paperSize] || STICKER_PAPER_SIZES['a4-grid-4'];
  const isRollPaper = activePaperDef.category === 'roll';
  const shouldBreakPerLabel = bulkConfig.forcePageBreakPerLabel || isRollPaper;

  const cartonPages = useMemo(() => {
    if (activeCartons.length === 0) return [];
    if (shouldBreakPerLabel) {
      return activeCartons.map((c) => [c]);
    }
    const perPage = activePaperDef.labelsPerPage;
    if (perPage > 0) {
      const pages: CartonRow[][] = [];
      for (let i = 0; i < activeCartons.length; i += perPage) {
        pages.push(activeCartons.slice(i, i + perPage));
      }
      return pages;
    }
    return [activeCartons];
  }, [activeCartons, shouldBreakPerLabel, activePaperDef.labelsPerPage]);

  useEffect(() => {
    // Check if configuration has compact height (e.g. 3x2 roll) or high padding that may cause overflow
    if (isRollPaper || bulkConfig.uniformPadding > 18 || bulkConfig.fontScale > 1.15) {
      if (activePaperDef.heightMm > 0 && activePaperDef.heightMm <= 60) {
        setHasOverflowDetected(true);
        return;
      }
    }
    setHasOverflowDetected(false);
  }, [bulkConfig, isRollPaper, activePaperDef]);

  const handleUpdateCartonField = (cartonId: string, updated: Partial<CartonRow>) => {
    if (onUpdateCarton) {
      onUpdateCarton(cartonId, updated);
    } else if (onUpdateHeader) {
      const updatedCartons = sheetData.cartons.map((c, idx) => {
        if (c.id === cartonId) {
          return recomputeCarton(
            { ...c, ...updated },
            idx,
            sheetData.defaultTare,
            sheetData.defaultWtPerUnit,
            sheetData.deliveryUnit || 'mtr',
            sheetData.pcsPerPkt
          );
        }
        return c;
      });
      onUpdateHeader({ cartons: updatedCartons });
    }
  };

  const handleAddNewCarton = () => {
    if (onAddCarton) {
      onAddCarton();
    } else if (onUpdateHeader) {
      const nextNo = sheetData.cartons.length + 1;
      const newCarton = recomputeCarton(
        { cartonNo: nextNo, grossWt: 0, tareWt: sheetData.defaultTare, wtPerUnit: sheetData.defaultWtPerUnit },
        sheetData.cartons.length,
        sheetData.defaultTare,
        sheetData.defaultWtPerUnit,
        sheetData.deliveryUnit || 'mtr',
        sheetData.pcsPerPkt
      );
      onUpdateHeader({ cartons: [...sheetData.cartons, newCarton] });
    }
  };

  const handleDeleteExistingCarton = (id: string) => {
    if (onDeleteCarton) {
      onDeleteCarton(id);
    } else if (onUpdateHeader) {
      const filtered = sheetData.cartons.filter(c => c.id !== id).map((c, idx) => ({ ...c, cartonNo: idx + 1 }));
      onUpdateHeader({
        cartons: filtered.length > 0 ? filtered : [
          recomputeCarton({ cartonNo: 1, grossWt: 0 }, 0, sheetData.defaultTare, sheetData.defaultWtPerUnit, sheetData.deliveryUnit || 'mtr', sheetData.pcsPerPkt)
        ]
      });
    }
    if (selectedCartonId === id) {
      setSelectedCartonId(null);
    }
  };

  const handleDuplicateExistingCarton = (carton: CartonRow) => {
    if (onDuplicateCarton) {
      onDuplicateCarton(carton);
    } else if (onUpdateHeader) {
      const duplicated = recomputeCarton(
        { ...carton, id: undefined, cartonNo: sheetData.cartons.length + 1 },
        sheetData.cartons.length,
        sheetData.defaultTare,
        sheetData.defaultWtPerUnit,
        sheetData.deliveryUnit || 'mtr',
        sheetData.pcsPerPkt
      );
      onUpdateHeader({ cartons: [...sheetData.cartons, duplicated] });
    }
  };

  const handleAddBulkEmptyCartons = (count: number) => {
    if (onAddBulk) {
      onAddBulk(count);
    } else if (onUpdateHeader) {
      const newRows: CartonRow[] = [];
      const startNo = sheetData.cartons.length + 1;
      for (let i = 0; i < count; i++) {
        newRows.push(
          recomputeCarton(
            { cartonNo: startNo + i, grossWt: 0, tareWt: sheetData.defaultTare, wtPerUnit: sheetData.defaultWtPerUnit },
            sheetData.cartons.length + i,
            sheetData.defaultTare,
            sheetData.defaultWtPerUnit,
            sheetData.deliveryUnit || 'mtr',
            sheetData.pcsPerPkt
          )
        );
      }
      onUpdateHeader({ cartons: [...sheetData.cartons, ...newRows] });
    }
  };

  const filteredCartons = sheetData.cartons.filter(c => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchNo = `carton ${c.cartonNo}`.includes(term) || `#${c.cartonNo}`.includes(term) || `${c.cartonNo}` === term;
      const matchNotes = (c.notes || '').toLowerCase().includes(term);
      if (!matchNo && !matchNotes) return false;
    }
    if (statusFilter === 'with-weight') {
      return c.grossWt > 0 || c.netWt > 0;
    }
    if (statusFilter === 'zero-weight') {
      return c.grossWt === 0 && c.netWt === 0;
    }
    return true;
  });

  const selectedCarton = 
    sheetData.cartons.find(c => c.id === selectedCartonId) || 
    activeCartons[0] || 
    sheetData.cartons[0];

  const handlePrint = () => {
    // Record this sticker configuration in Recently Used
    recordStickerUsage(sheetData, stickerSettings);

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

    // Record this sticker configuration in Recently Used
    recordStickerUsage(sheetData, stickerSettings);

    try {
      const dataUrl = await toPng(el, { 
        quality: 1, 
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        filter: (node: any) => {
          if (node?.classList && (node.classList.contains('print:hidden') || node.classList.contains('sticker-overlay-control'))) {
            return false;
          }
          return true;
        },
        style: {
          margin: '0',
          boxShadow: 'none'
        }
      });
      const link = document.createElement('a');
      const safeBuyer = (sheetData.buyer || 'Order').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeRef = (sheetData.ref || 'export').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `Sticker_CTN_${cartonNo}_${safeBuyer}_${safeRef}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const handleShareSticker = async (cartonId: string, cartonNo: number) => {
    const el = stickerRefs.current[cartonId];
    if (!el) return;

    recordStickerUsage(sheetData, stickerSettings);

    try {
      const blob = await toBlob(el, { 
        quality: 1, 
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      if (!blob) return;

      const file = new File([blob], `sticker-ctn-${cartonNo}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Carton #${cartonNo} Sticker`,
            text: `Shipping sticker for Carton #${cartonNo} (${sheetData.ref})`
          });
          return;
        } catch (err: any) {
          if (err.name === 'AbortError' || err.message?.toLowerCase().includes('cancel')) {
            return;
          }
          console.warn('Native share failed/expired, falling back to download:', err);
        }
      }
      handleDownloadSticker(cartonId, cartonNo);
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.toLowerCase().includes('cancel')) {
        return;
      }
      console.error('Sticker share/generation failed', err);
      handleDownloadSticker(cartonId, cartonNo);
    }
  };

  const handleExportAllAsZip = async () => {
    if (activeCartons.length === 0) {
      alert(lang === 'en' ? 'No active stickers found for this order to download.' : 'এই অর্ডারে কোনো সক্রিয় স্টিকার পাওয়া যায়নি।');
      return;
    }
    setIsExportingAll(true);
    setExportProgress({ current: 0, total: activeCartons.length, stage: lang === 'en' ? 'Preparing images...' : 'স্টিকার ইমেজ প্রস্তুত করা হচ্ছে...' });

    recordStickerUsage(sheetData, stickerSettings);

    try {
      const zip = new JSZip();
      const safeBuyer = (sheetData.buyer || 'Order').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeRef = (sheetData.ref || 'PO').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeCustomer = (sheetData.customer || '').replace(/[^a-zA-Z0-9_-]/g, '_');

      let successCount = 0;
      for (let i = 0; i < activeCartons.length; i++) {
        const c = activeCartons[i];
        setExportProgress({
          current: i + 1,
          total: activeCartons.length,
          stage: lang === 'en'
            ? `Packaging Carton #${c.cartonNo} (${i + 1}/${activeCartons.length})...`
            : `কার্টন #${c.cartonNo} যুক্ত হচ্ছে (${i + 1}/${activeCartons.length})...`,
        });

        const el = stickerRefs.current[c.id];
        if (el) {
          try {
            const blob = await toBlob(el, {
              quality: 0.8,
              pixelRatio: 1.5,
              backgroundColor: '#ffffff',
              type: 'image/webp',
              style: {
                margin: '0',
                boxShadow: 'none',
              },
            });
            if (blob) {
              const paddedNo = String(c.cartonNo).padStart(3, '0');
              const fileName = `Carton_${paddedNo}_${safeBuyer}_${safeRef}.webp`;
              zip.file(fileName, blob);
              successCount++;
            }
          } catch (itemErr) {
            console.warn(`Failed rendering carton #${c.cartonNo} for ZIP`, itemErr);
          }
        }
        await new Promise(resolve => setTimeout(resolve, 40));
      }

      // Manifest summary text file inside the ZIP archive
      const manifestText = [
        `=====================================================`,
        `PACKING STICKER LABELS MANIFEST - ${sheetData.companyName || 'FACTORY'}`,
        `=====================================================`,
        `Order / PO Ref: ${sheetData.ref || 'N/A'}`,
        `Buyer: ${sheetData.buyer || 'N/A'}`,
        `Customer: ${sheetData.customer || 'N/A'}`,
        `Item Type: ${sheetData.itemType?.toUpperCase() || 'ELASTIC'}`,
        `Item Size/Color: ${sheetData.size || '-'} / ${sheetData.color || '-'}`,
        `Total Active Cartons: ${activeCartons.length}`,
        `Downloaded At: ${new Date().toLocaleString()}`,
        `-----------------------------------------------------`,
        ...activeCartons.map(c =>
          `Carton #${c.cartonNo}: Gross Wt=${c.grossWt.toFixed(2)} ${sheetData.weightUnit || 'kg'}, Net Wt=${c.netWt.toFixed(2)} ${sheetData.weightUnit || 'kg'}, Qty=${c.lengthMtr ? c.lengthMtr + ' Mtr' : (c.qtyPcs || 0) + ' Pcs'}, Notes=${c.notes || '-'}`
        ),
        `=====================================================`,
      ].join('\n');
      zip.file(`ORDER_STICKERS_MANIFEST_${safeBuyer}_${safeRef}.txt`, manifestText);

      setExportProgress({
        current: activeCartons.length,
        total: activeCartons.length,
        stage: lang === 'en' ? 'Compressing all stickers into 1 ZIP file...' : 'সবগুলো স্টিকার ১টি ZIP ফাইলে প্যাক করা হচ্ছে...',
      });

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const zipFileName = `Stickers_${safeBuyer}_${safeRef}_All_${activeCartons.length}_Cartons.zip`;
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = zipFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 15000);

      setExportNotice(
        lang === 'en'
          ? `✅ All ${successCount} active stickers downloaded together in 1 ZIP file!`
          : `✅ অর্ডার অনুযায়ী সবগুলো (${successCount}টি) সক্রিয় স্টিকার এক সাথে ZIP ফাইলে ডাউনলোড হয়েছে!`
      );
      setTimeout(() => setExportNotice(null), 6000);
    } catch (err) {
      console.error('ZIP Export failed', err);
      handleExportIndividualImages();
    } finally {
      setIsExportingAll(false);
      setExportProgress(null);
    }
  };

  const handleExportIndividualImages = async () => {
    setIsExportingAll(true);
    setExportProgress({ current: 0, total: activeCartons.length, stage: 'Exporting individual files...' });
    try {
      for (let i = 0; i < activeCartons.length; i++) {
        const c = activeCartons[i];
        setExportProgress({
          current: i + 1,
          total: activeCartons.length,
          stage: lang === 'en' ? `Downloading #${c.cartonNo}...` : `কার্টন #${c.cartonNo} ডাউনলোড হচ্ছে...`,
        });
        await handleDownloadSticker(c.id, c.cartonNo);
        await new Promise(resolve => setTimeout(resolve, 350));
      }
      setExportNotice(
        lang === 'en'
          ? `✅ Downloaded ${activeCartons.length} individual sticker files!`
          : `✅ আলাদাভাবে ${activeCartons.length}টি স্টিকার ডাউনলোড হয়েছে!`
      );
      setTimeout(() => setExportNotice(null), 5000);
    } finally {
      setIsExportingAll(false);
      setExportProgress(null);
    }
  };

  // Backwards compatibility alias
  const handleExportAllAsImages = handleExportAllAsZip;

  const fontConfig = FONT_FAMILY_STYLES[stickerSettings.fontFamily] || FONT_FAMILY_STYLES.sans;

  // Default subtitle auto-adapted to item type
  const defaultSubtitleByItem = 
    currentItemKey === 'drawstring'
      ? 'DRAWSTRING & CORD ACCESSORIES PACKING SPECIFICATION'
      : currentItemKey === 'bow'
      ? 'BOW & GARMENT TRIMS PACKING SPECIFICATION'
      : currentItemKey === 'tape'
      ? 'WEBBING TAPE & PACKING SPECIFICATION'
      : 'ELASTIC WEBBING & PACKING SPECIFICATION';

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs gap-3 print:hidden">
        
        {/* Top row: Title & Action buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                
                {/* Active Item Badge in Header */}
                <span className={`text-[10px] border px-2 py-0.2 rounded font-bold flex items-center gap-1 ${
                  currentItemKey === 'elastic'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : currentItemKey === 'drawstring'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : currentItemKey === 'bow'
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}>
                  <span>{currentItemKey === 'elastic' ? '🧵' : currentItemKey === 'drawstring' ? '🪢' : currentItemKey === 'bow' ? '🎀' : '🏷️'}</span>
                  <span>{currentItemConfig.name} ({isPcsMode ? 'Pcs Delivery' : 'Mtr Delivery'})</span>
                </span>

                {stickerSettings.logoUrl && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Branded
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {lang === 'en'
                  ? `Active Style: ${currentItemConfig.name} (${isPcsMode ? 'Pieces' : 'Meters'} delivery format with live auto-sync)`
                  : `সক্রিয় স্টাইল: ${currentItemConfig.nameBn} (${isPcsMode ? 'পিস' : 'মিটার'} ডেলিভারি স্টাইলে সিঙ্কড)`}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Primary 'Preview Mode' Toggle Control */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs gap-1.5">
              {/* Interactive Master Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={showPreview}
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs select-none ${
                  showPreview
                    ? 'bg-indigo-600 text-white shadow-indigo-200'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
                }`}
                title={
                  showPreview
                    ? (lang === 'en' ? 'Preview Mode Active (Visual Grid): Click to switch to Sticker Settings & Data List View' : 'প্রিভিউ মোড চালু (ভিজ্যুয়াল গ্রিড): সেটিংস ও ডাটা লিস্ট ভিউতে যেতে ক্লিক করুন')
                    : (lang === 'en' ? 'Click to enable Preview Mode (Rendered Labels Visual Grid)' : 'প্রিভিউ মোড চালু করতে ক্লিক করুন (ভিজ্যুয়াল গ্রিড)')
                }
              >
                <div className="flex items-center gap-1.5">
                  {showPreview ? (
                    <LayoutGrid className="w-3.5 h-3.5 text-indigo-200" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>{lang === 'en' ? 'Preview Mode' : 'প্রিভিউ মোড'}</span>
                </div>

                {/* Animated Switch Pill */}
                <div className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                  showPreview ? 'bg-indigo-400' : 'bg-slate-300'
                }`}>
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition-transform ${
                    showPreview ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`} />
                </div>

                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                  showPreview ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {showPreview ? (lang === 'en' ? 'GRID' : 'গ্রিড') : (lang === 'en' ? 'LIST' : 'লিস্ট')}
                </span>
              </button>

              {/* Segmented Mode Selector for Direct Selection */}
              <div className="hidden sm:flex items-center bg-slate-200/70 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                    !showPreview
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={lang === 'en' ? 'List View: Sticker settings overview & carton contents table' : 'লিস্ট ভিউ: স্টিকার সেটিংস ও কার্টন টেবিল'}
                >
                  <FileSpreadsheet className="w-3 h-3 text-indigo-600" />
                  <span>{lang === 'en' ? 'Settings List' : 'সেটিংস লিস্ট'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                    showPreview
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={lang === 'en' ? 'Visual Grid: True-to-print rendered final sticker labels' : 'ভিজ্যুয়াল গ্রিড: রেন্ডারড প্রিন্ট লেবেল'}
                >
                  <LayoutGrid className="w-3 h-3 text-indigo-600" />
                  <span>{lang === 'en' ? 'Visual Grid' : 'ভিজ্যুয়াল গ্রিড'}</span>
                </button>
              </div>
            </div>

            {/* Bulk Configuration & Paper Layout Button */}
            <button
              type="button"
              onClick={() => setIsBulkPanelOpen(!isBulkPanelOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                isBulkPanelOpen
                  ? 'bg-indigo-600 border-indigo-700 text-white shadow-2xs font-bold'
                  : 'bg-indigo-50/80 border-indigo-200 text-indigo-800 hover:bg-indigo-100'
              }`}
              title="Bulk configure padding, paper size (A4 vs Roll), font scale, and page breaks"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Bulk Config & Paper' : 'বাল্ক কনফিগারেশন'}</span>
              <span className="text-[10px] bg-white/30 px-1 py-0.2 rounded font-mono">
                {STICKER_PAPER_SIZES[bulkConfig.paperSize]?.name.split(' ')[0] || 'A4'}
              </span>
            </button>

            {/* AI Photo Weight Scanner Button */}
            {onOpenAiPhotoScanner && (
              <button
                type="button"
                onClick={onOpenAiPhotoScanner}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                title={lang === 'en' ? 'Scan photos of cartons or weighing scales to auto-detect gross weights and generate stickers' : 'কার্টনের ছবি থেকে ওজন স্ক্যান করে স্টিকার তৈরি করুন'}
              >
                <Camera className="w-3.5 h-3.5 text-white" />
                <span>{lang === 'en' ? 'AI Photo Scan' : '📷 AI ছবি স্ক্যান'}</span>
                <span className="hidden sm:inline-block px-1 py-0.2 text-[9px] bg-emerald-800 text-emerald-100 rounded font-semibold uppercase">
                  AI
                </span>
              </button>
            )}

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

            {/* Density Mode Switcher (Compact vs Comfort) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setDensityMode('compact')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  densityMode === 'compact'
                    ? 'bg-white text-emerald-700 shadow-2xs font-bold border border-emerald-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={lang === 'en' ? 'Compact Density: More labels per page, compact layout & low paper waste' : 'কমপ্যাক্ট মোড: প্রতি পেজে বেশি লেবেল ও কাগজের সাশ্রয়'}
              >
                <Minimize2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === 'en' ? 'Compact' : 'কমপ্যাক্ট'}</span>
              </button>
              <button
                type="button"
                onClick={() => setDensityMode('comfort')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  densityMode === 'comfort'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold border border-indigo-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={lang === 'en' ? 'Comfort Density: Larger typography & high-contrast barcodes for easy scanning' : 'কমফোর্ট মোড: বড় ফন্ট ও সহজে স্ক্যান উপযোগী বারকোড'}
              >
                <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>{lang === 'en' ? 'Comfort' : 'কমফোর্ট'}</span>
              </button>
            </div>

            {/* Dashed Crop Marks Toggle Button */}
            <button
              type="button"
              onClick={handleToggleCropMarks}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                showCropMarks
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title={
                showCropMarks
                  ? (lang === 'en' ? 'Crop Marks ON: Dashed cutting lines & corner guides visible for manual cutting' : 'ক্রপ মার্ক অন: কাঁচি দিয়ে কাটার ড্যাশড দাগ প্রদর্শিত হচ্ছে')
                  : (lang === 'en' ? 'Crop Marks OFF: Click to show dashed cutting crop marks around stickers' : 'ক্রপ মার্ক অফ: স্টিকারের চারপাশে ড্যাশড কাটিং দাগ দেখতে ক্লিক করুন')
              }
            >
              <Scissors className={`w-3.5 h-3.5 ${showCropMarks ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span>{lang === 'en' ? (showCropMarks ? 'Crop Marks: ON' : 'Crop Marks') : (showCropMarks ? 'কাটিং মার্ক: চালু' : 'কাটিং মার্ক')}</span>
            </button>

            <button
              onClick={() => {
                const updated = {
                  ...stickerSettings,
                  autoScaleLongText: stickerSettings.autoScaleLongText === false ? true : false,
                };
                handleUpdateSettings(updated);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                stickerSettings.autoScaleLongText !== false
                  ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title={
                stickerSettings.autoScaleLongText !== false
                  ? 'Auto-Scale Font Enabled: Automatically scales down font sizes for long REF or Customer names to prevent overflow'
                  : 'Auto-Scale Font Disabled: Uses fixed font sizes'
              }
            >
              <span className="font-mono text-[11px] font-black">A↕</span>
              <span>{stickerSettings.autoScaleLongText !== false ? 'Auto-Fit' : 'Fixed Font'}</span>
            </button>

            {/* Sequence & Reordering Tools Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsReorderMenuOpen(!isReorderMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                  isReorderMenuOpen
                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-2xs font-bold'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
                title="Manage print sequence and sort cartons"
              >
                <ArrowDownUp className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Reorder Sequence' : 'ক্রম সাজান'}</span>
              </button>

              {isReorderMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>{lang === 'en' ? 'Print Sequence Tools' : 'প্রিন্ট সিকোয়েন্স টুলস'}</span>
                    <span className="text-[10px] text-indigo-600 font-mono bg-indigo-50 px-1.5 py-0.2 rounded font-bold">
                      Drag & Drop
                    </span>
                  </div>

                  <div className="p-2 bg-slate-50 border-b border-slate-100 text-[11px] text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-800">💡 Tip:</span> {lang === 'en' ? 'Drag any sticker card by its handle to reorder directly.' : 'সরাসরি সিকোয়েন্স বদলাতে যেকোনো স্টিকার কার্ড ধরে ড্র্যাগ করুন।'}
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => handleSortCartons('weight-asc')}
                      className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <MoveUp className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lang === 'en' ? 'Sort by Weight: Light → Heavy' : 'ওজন অনুযায়ী: হালকা → ভারী'}</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSortCartons('weight-desc')}
                      className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <MoveDown className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lang === 'en' ? 'Sort by Weight: Heavy → Light' : 'ওজন অনুযায়ী: ভারী → হালকা'}</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSortCartons('qty-desc')}
                      className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <ListOrdered className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lang === 'en' ? 'Sort by Quantity: High → Low' : 'পরিমাণ অনুযায়ী: বেশি → কম'}</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSortCartons('reverse')}
                      className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Shuffle className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lang === 'en' ? 'Reverse Entire Sequence' : 'সম্পূর্ণ সিকোয়েন্স উল্টান'}</span>
                      </div>
                    </button>

                    <div className="h-px bg-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={() => handleSortCartons('carton-asc')}
                      className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lang === 'en' ? 'Reset to Carton #1...N' : 'আগের কার্টন নম্বরে রিসেট'}</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleExportAllAsImages}
              disabled={isExportingAll || activeCartons.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-xs transition cursor-pointer ${
                isExportingAll
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              title={lang === 'en' ? 'Download all active sticker images' : 'সবগুলো স্টিকার ইমেজ ডাউনলোড করুন'}
            >
              <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isExportingAll ? (lang === 'en' ? 'Downloading...' : 'ডাউনলোড হচ্ছে...') : (lang === 'en' ? 'Export Images' : 'ইমেজ ডাউনলোড')}</span>
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

        {/* Bottom row: Quick Item Switcher Buttons right in Sticker Tab */}
        {onUpdateHeader && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-600 flex items-center gap-1 text-[11px]">
                <Package className="w-3.5 h-3.5 text-indigo-600" />
                <span>{lang === 'en' ? 'Item Style Switcher:' : 'স্টিকার আইটেম পরিবর্তন:'}</span>
              </span>

              {/* 1. Elastic (Mtr) */}
              <button
                type="button"
                onClick={() => handleQuickItemSwitch('elastic')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                  currentItemKey === 'elastic'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                    : 'bg-slate-50 hover:bg-indigo-50 text-slate-700 border-slate-200'
                }`}
              >
                <span>🧵 Elastic</span>
                <span className="text-[9.5px] opacity-80">(Mtr)</span>
              </button>

              {/* 2. Drawstring (Pcs) */}
              <button
                type="button"
                onClick={() => handleQuickItemSwitch('drawstring')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                  currentItemKey === 'drawstring'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                    : 'bg-slate-50 hover:bg-amber-50 text-slate-700 border-slate-200'
                }`}
              >
                <span>🪢 Drawstring</span>
                <span className="text-[9.5px] opacity-80">(Pcs)</span>
              </button>

              {/* 3. Bow (Pcs) */}
              <button
                type="button"
                onClick={() => handleQuickItemSwitch('bow')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                  currentItemKey === 'bow'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                    : 'bg-slate-50 hover:bg-rose-50 text-slate-700 border-slate-200'
                }`}
              >
                <span>🎀 Bow</span>
                <span className="text-[9.5px] opacity-80">(Pcs)</span>
              </button>

              {/* 4. Tape (Mtr) */}
              <button
                type="button"
                onClick={() => handleQuickItemSwitch('tape')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                  currentItemKey === 'tape'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                    : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200'
                }`}
              >
                <span>🏷️ Tape</span>
                <span className="text-[9.5px] opacity-80">(Mtr)</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-500 font-medium">
              {lang === 'en' ? 'Changing items adapts measurements (Mtr vs Pcs) automatically' : 'আইটেম পরিবর্তনে মাপ (মিটার/পিস) স্বয়ংক্রিয়ভাবে পরিবর্তিত হবে'}
            </span>
          </div>
        )}

        {/* Technical Specs Customizer Bar (Dynamic per Item Type) */}
        {onUpdateHeader && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsSpecsDrawerOpen(!isSpecsDrawerOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer border ${
                  isSpecsDrawerOpen
                    ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200'
                }`}
                title="Configure dynamic technical specifications (Style, GSM, Stretch, Tipping, etc.)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
                <span>{lang === 'en' ? 'Technical Specs (Style, GSM...)' : 'টেকনিক্যাল স্পেক্স (স্টাইল, জিএসএম...)'}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                  isSpecsDrawerOpen ? 'bg-purple-800 text-white' : 'bg-purple-200 text-purple-900'
                }`}>
                  {isSpecsDrawerOpen ? (lang === 'en' ? 'Hide' : 'লুকান') : (lang === 'en' ? 'Customize' : 'কাস্টমাইজ')}
                </span>
              </button>

              {/* Active Specs Live Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {currentItemKey === 'elastic' && (
                  <>
                    <span className="text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded font-mono font-bold">
                      Style: {sheetData.style || 'WOVEN JACQUARD'}
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
                      GSM: {sheetData.gsm || '240 GSM'}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-mono">
                      {sheetData.stretch || '140% STRETCH'}
                    </span>
                  </>
                )}

                {currentItemKey === 'bow' && (
                  <>
                    <span className="text-[10px] bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-mono font-bold">
                      Style: {sheetData.style || 'SATIN RIBBON BOW'}
                    </span>
                    <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-mono font-bold">
                      Finish: {sheetData.finish || 'BAR-TACK ULTRASONIC'}
                    </span>
                    <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded font-mono">
                      {sheetData.pattern || '3MM RIBBON | 45MM SPAN'}
                    </span>
                  </>
                )}

                {currentItemKey === 'drawstring' && (
                  <>
                    <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-mono font-bold">
                      Cord: {sheetData.style || 'BRAIDED ROUND CORD'}
                    </span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded font-mono font-bold">
                      Tipping: {sheetData.tipping || 'CLEAR FILM TIP 15MM'}
                    </span>
                    <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded font-mono">
                      {sheetData.pattern || 'Ø 5MM × 120 CM CUT'}
                    </span>
                  </>
                )}

                {currentItemKey === 'tape' && (
                  <>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
                      Style: {sheetData.style || 'HERRINGBONE TWILL'}
                    </span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded font-mono font-bold">
                      GSM: {sheetData.gsm || '320 GSM'}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-mono">
                      {sheetData.finish || '1.2MM HEAVY DUTY'}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const defaultSpecs = getDefaultSpecsForItem(sheetData.itemType);
                  onUpdateHeader(defaultSpecs);
                }}
                className="text-[10.5px] text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 cursor-pointer"
                title="Reset technical specs to standard defaults for this item"
              >
                <RefreshCw className="w-3 h-3 text-slate-400" />
                <span>{lang === 'en' ? 'Reset to Defaults' : 'ডিফল্ট রিসেট'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Collapsible Technical Specs Editor Drawer */}
        {isSpecsDrawerOpen && onUpdateHeader && (
          <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-700 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {lang === 'en' ? `Technical Specifications: ${currentItemConfig.name}` : `টেকনিক্যাল স্পেসিফিকেশন: ${currentItemConfig.nameBn}`}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {lang === 'en'
                      ? 'Extra label rows adapt automatically to this item type. Click chips or enter custom values.'
                      : 'আইটেমের ধরন অনুযায়ী স্টিকারে অতিরিক্ত স্পেক্স রো প্রদর্শিত হবে।'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSpecsDrawerOpen(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-0.5 bg-slate-800 rounded cursor-pointer"
              >
                ✕ {lang === 'en' ? 'Done' : 'সম্পন্ন'}
              </button>
            </div>

            {/* Grid of Spec Inputs with Quick Chips */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Field 1: STYLE / PATTERN */}
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-2">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                  {currentItemKey === 'bow'
                    ? 'Bow Style / Pattern'
                    : currentItemKey === 'drawstring'
                    ? 'Cord Style'
                    : 'Weave / Construction Style'}
                </label>
                <input
                  type="text"
                  value={sheetData.style || ''}
                  placeholder={
                    currentItemKey === 'bow'
                      ? 'e.g. SATIN RIBBON BOW'
                      : currentItemKey === 'drawstring'
                      ? 'e.g. BRAIDED ROUND CORD'
                      : 'e.g. WOVEN JACQUARD'
                  }
                  onChange={(e) => onUpdateHeader({ style: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white uppercase font-bold focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
                {/* Quick suggestion chips */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {(ITEM_SPEC_SUGGESTIONS[currentItemKey]?.styles || ['STANDARD']).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onUpdateHeader({ style: s })}
                      className={`text-[9.5px] px-1.5 py-0.5 rounded cursor-pointer transition ${
                        sheetData.style === s
                          ? 'bg-purple-600 text-white font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 2: GSM (Elastic/Tape) OR Attachment (Bow) OR Tipping (Drawstring) */}
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-2">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                  {ITEM_SPEC_SUGGESTIONS[currentItemKey]?.field2Label || 'GSM / Weight'}
                </label>
                {currentItemKey === 'elastic' || currentItemKey === 'tape' ? (
                  <input
                    type="text"
                    value={sheetData.gsm || ''}
                    placeholder="e.g. 240 GSM"
                    onChange={(e) => onUpdateHeader({ gsm: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-emerald-400 font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                ) : currentItemKey === 'bow' ? (
                  <input
                    type="text"
                    value={sheetData.finish || ''}
                    placeholder="e.g. BAR-TACK ULTRASONIC"
                    onChange={(e) => onUpdateHeader({ finish: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-rose-300 font-bold focus:ring-1 focus:ring-rose-500 focus:outline-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={sheetData.tipping || ''}
                    placeholder="e.g. CLEAR FILM TIP 15MM"
                    onChange={(e) => onUpdateHeader({ tipping: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-amber-300 font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                )}
                {/* Quick suggestion chips */}
                <div className="flex flex-wrap gap-1 pt-1">
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
                      className={`text-[9.5px] px-1.5 py-0.5 rounded cursor-pointer transition ${
                        (currentItemKey === 'elastic' || currentItemKey === 'tape') && sheetData.gsm === opt
                          ? 'bg-emerald-600 text-white font-bold'
                          : currentItemKey === 'bow' && sheetData.finish === opt
                          ? 'bg-rose-600 text-white font-bold'
                          : currentItemKey === 'drawstring' && sheetData.tipping === opt
                          ? 'bg-amber-600 text-white font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 3: Stretch (Elastic) OR Ribbon Span (Bow) OR Cut Length (Drawstring) */}
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-2">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                  {ITEM_SPEC_SUGGESTIONS[currentItemKey]?.field3Label || 'Technical Spec'}
                </label>
                {currentItemKey === 'elastic' ? (
                  <input
                    type="text"
                    value={sheetData.stretch || ''}
                    placeholder="e.g. 140% - 160% HIGH RECOVERY"
                    onChange={(e) => onUpdateHeader({ stretch: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-indigo-300 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                ) : currentItemKey === 'bow' ? (
                  <input
                    type="text"
                    value={sheetData.pattern || ''}
                    placeholder="e.g. 3MM RIBBON | 45MM SPAN"
                    onChange={(e) => onUpdateHeader({ pattern: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-purple-300 font-bold focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  />
                ) : currentItemKey === 'drawstring' ? (
                  <input
                    type="text"
                    value={sheetData.pattern || ''}
                    placeholder="e.g. Ø 5MM × 120 CM CUT"
                    onChange={(e) => onUpdateHeader({ pattern: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-amber-300 font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={sheetData.finish || ''}
                    placeholder="e.g. 1.2MM HEAVY DUTY"
                    onChange={(e) => onUpdateHeader({ finish: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-emerald-300 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                )}
                {/* Quick suggestion chips */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {(ITEM_SPEC_SUGGESTIONS[currentItemKey]?.field3Options || []).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        if (currentItemKey === 'elastic') {
                          onUpdateHeader({ stretch: opt });
                        } else if (currentItemKey === 'bow' || currentItemKey === 'drawstring') {
                          onUpdateHeader({ pattern: opt });
                        } else {
                          onUpdateHeader({ finish: opt });
                        }
                      }}
                      className={`text-[9.5px] px-1.5 py-0.5 rounded cursor-pointer transition ${
                        (currentItemKey === 'elastic' && sheetData.stretch === opt) ||
                        ((currentItemKey === 'bow' || currentItemKey === 'drawstring') && sheetData.pattern === opt) ||
                        (currentItemKey === 'tape' && sheetData.finish === opt)
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notification Banner when a configuration is applied or saved */}
      {recentlyNotification && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md border border-emerald-600 print:hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{recentlyNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setRecentlyNotification(null)}
            className="text-emerald-200 hover:text-white p-0.5 rounded cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bulk Sticker Configuration & Paper Layout Panel */}
      <StickerBulkConfigPanel
        bulkConfig={bulkConfig}
        onUpdateBulkConfig={handleUpdateBulkConfig}
        lang={lang}
        isOpen={isBulkPanelOpen}
        onToggleOpen={() => setIsBulkPanelOpen(!isBulkPanelOpen)}
        hasOverflowWarning={hasOverflowDetected}
        totalLabelsCount={activeCartons.length}
      />

      {/* Render function for a single sticker card (reusable across Full Preview Grid and Live Side Inspector) */}
      {(() => {
        // Internal render helper
        return null;
      })()}

      {/* Full-Page Sticker Preview Mode (Always visible when printing, visible on screen when showPreview is true) */}
      <div className={showPreview ? 'block space-y-6' : 'hidden print:block print:space-y-0'}>
        {/* Dynamic Print CSS for Selected Paper Size */}
        <style>{`
          @media print {
            ${activePaperDef.pageCss}
            .sticker-print-page {
              break-after: page !important;
              page-break-after: always !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            .sticker-print-card-single {
              break-after: page !important;
              page-break-after: always !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              margin-bottom: 0 !important;
            }
            .sticker-print-card {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              position: relative !important;
            }
            .sticker-crop-marks {
              display: block !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>

        {activeCartons.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-sm space-y-3 print:hidden">
            <p className="text-slate-600 font-medium">
              {lang === 'en'
                ? 'No active cartons found with gross weights. Switch to List Data Entry mode to enter carton weights.'
                : 'কোনো সক্রিয় কার্টন পাওয়া যায়নি। কার্টন ওজন প্রবেশ করতে লিস্ট ডাটা এন্ট্রি মোডে যান।'}
            </p>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Table className="w-4 h-4" />
              <span>{lang === 'en' ? 'Open List Data Entry Mode' : 'লিস্ট ডাটা এন্ট্রি মোড খুলুন'}</span>
            </button>
          </div>
        ) : (
          <>
            {/* Interactive Drag-and-Drop Sequence Notice Banner */}
            <div className="bg-gradient-to-r from-indigo-50 via-slate-50 to-indigo-50 border border-indigo-100/80 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs print:hidden shadow-2xs">
              <div className="flex items-center gap-2 text-indigo-950 font-medium">
                <span className="p-1 bg-indigo-100 text-indigo-700 rounded-md">
                  <GripVertical className="w-3.5 h-3.5" />
                </span>
                <span>
                  {lang === 'en'
                    ? 'Drag any sticker card to reorder printing sequence or use the sequence shortcuts.'
                    : 'প্রিন্ট সিকোয়েন্স পরিবর্তন করতে যে কোনো স্টিকার কার্ড ড্র্যাগ করুন অথবা শর্টকাট ব্যবহার করুন।'}
                </span>
                <span className="text-[10px] font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                  {activeCartons.length} {lang === 'en' ? 'Cartons' : 'কার্টন'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSortCartons('weight-asc')}
                  className="px-2 py-1 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-md text-[11px] font-semibold transition cursor-pointer shadow-2xs flex items-center gap-1"
                  title="Sort by net weight ascending"
                >
                  <MoveUp className="w-3 h-3 text-slate-400" />
                  <span>Weight ↑</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSortCartons('weight-desc')}
                  className="px-2 py-1 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-md text-[11px] font-semibold transition cursor-pointer shadow-2xs flex items-center gap-1"
                  title="Sort by net weight descending"
                >
                  <MoveDown className="w-3 h-3 text-slate-400" />
                  <span>Weight ↓</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSortCartons('reverse')}
                  className="px-2 py-1 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-md text-[11px] font-semibold transition cursor-pointer shadow-2xs flex items-center gap-1"
                  title="Reverse print order"
                >
                  <Shuffle className="w-3 h-3 text-slate-400" />
                  <span>Reverse ⇄</span>
                </button>
              </div>
            </div>

            {cartonPages.map((pageCartons, pageIdx) => {
            const isLastPage = pageIdx === cartonPages.length - 1;
            const isSingleCard = pageCartons.length === 1 && shouldBreakPerLabel;

            return (
              <React.Fragment key={`page-group-${pageIdx}`}>
                {/* Visual Page Break Marker in Preview */}
                {bulkConfig.showPageBreakVisuals && cartonPages.length > 1 && (
                  <div className="my-4 flex items-center gap-2 print:hidden select-none">
                    <div className="h-px bg-indigo-200 flex-1 border-b border-dashed border-indigo-300" />
                    <span className="text-[11px] font-mono font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      {isRollPaper ? (
                        <span>Roll Label #{pageIdx + 1} of {cartonPages.length} · [1 Label / Page Break]</span>
                      ) : (
                        <span>Page {pageIdx + 1} of {cartonPages.length} ({pageCartons.length} labels) · [{activePaperDef.name.split(' ')[0]} Page Break]</span>
                      )}
                    </span>
                    <div className="h-px bg-indigo-200 flex-1 border-b border-dashed border-indigo-300" />
                  </div>
                )}

                {/* Printable Page Grid */}
                <div 
                  className={`grid ${activePaperDef.gridColsClass} gap-4 print:gap-4 ${
                    isSingleCard ? 'sticker-print-card-single' : (!isLastPage ? 'sticker-print-page' : 'sticker-print-card')
                  }`}
                  style={{
                    breakAfter: (!isLastPage || shouldBreakPerLabel) ? 'page' : 'auto',
                    pageBreakAfter: (!isLastPage || shouldBreakPerLabel) ? 'always' : 'auto',
                  }}
                >
                  {pageCartons.map((c) => {
              const qrUrl = generateCartonPreviewUrl(c, sheetData, summary.totalCtn);
              const companyDisplayName = stickerSettings.customCompanyName || sheetData.companyName || 'GOOD & FAST Pa. Co. Ltd';
              const subtitleText = stickerSettings.customSubtitle || defaultSubtitleByItem;
              const calculatedQtyPcs = c.qtyPcs || (c.wtPerUnit > 0 ? Math.round((c.netWt * 1000) / c.wtPerUnit) : 0);
              const calculatedPkts = c.pkts || (sheetData.pcsPerPkt ? Math.round(calculatedQtyPcs / sheetData.pcsPerPkt) : undefined);

              const isBeingDragged = draggedCartonId === c.id;
              const isDropTarget = dragOverCartonId === c.id && !isBeingDragged;

              return (
                <div
                  key={c.id}
                  ref={el => stickerRefs.current[c.id] = el}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, c.id)}
                  onDragOver={(e) => handleDragOver(e, c.id)}
                  onDragLeave={(e) => handleDragLeave(e, c.id)}
                  onDrop={(e) => handleDrop(e, c.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white rounded-none shadow-sm print:shadow-none flex flex-col justify-between relative group transition-all sticker-print-card ${
                    fontConfig.cssClass
                  } ${
                    isBeingDragged
                      ? 'opacity-35 ring-2 ring-dashed ring-indigo-500 scale-[0.98] shadow-inner'
                      : isDropTarget
                        ? (dragOverPosition === 'before'
                            ? 'ring-2 ring-indigo-500 bg-indigo-50/30 border-l-4 border-l-indigo-600 shadow-md'
                            : 'ring-2 ring-indigo-500 bg-indigo-50/30 border-r-4 border-r-indigo-600 shadow-md')
                        : 'hover:shadow-md'
                  }`}
                  style={{ 
                    padding: `${bulkConfig.uniformPadding}px`,
                    minHeight: activePaperDef.cardMinHeight || (isCompact ? '220px' : '270px'),
                    border: `${stickerSettings.borderWidth} solid ${stickerSettings.borderColor}`,
                  }}
                >
                  {/* Dashed Crop Marks & Cutting Guides for Manual Cutting */}
                  {showCropMarks && (
                    <div className="sticker-crop-marks pointer-events-none select-none">
                      {/* Outer dashed perimeter cut border */}
                      <div 
                        className="absolute -inset-1 sm:-inset-1.5 border border-dashed border-slate-400 print:border-slate-800 rounded-none z-20 pointer-events-none"
                        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                      />
                      {/* Corner Crosshair / L-shaped Tick Crop Marks */}
                      <span className="absolute -top-2.5 -left-2.5 w-2.5 h-2.5 border-t-2 border-l-2 border-slate-700 print:border-black pointer-events-none z-20" />
                      <span className="absolute -top-2.5 -right-2.5 w-2.5 h-2.5 border-t-2 border-r-2 border-slate-700 print:border-black pointer-events-none z-20" />
                      <span className="absolute -bottom-2.5 -left-2.5 w-2.5 h-2.5 border-b-2 border-l-2 border-slate-700 print:border-black pointer-events-none z-20" />
                      <span className="absolute -bottom-2.5 -right-2.5 w-2.5 h-2.5 border-b-2 border-r-2 border-slate-700 print:border-black pointer-events-none z-20" />
                      {/* Scissor Cut Line Label */}
                      <div className="absolute -top-2.5 left-2 px-1 bg-white print:bg-white text-[7.5px] font-mono font-bold text-slate-600 print:text-black flex items-center gap-0.5 z-20 border border-slate-300 print:border-black rounded-xs shadow-2xs">
                        <Scissors className="w-2 h-2 text-slate-700 print:text-black" />
                        <span>CUT</span>
                      </div>
                    </div>
                  )}

                  {/* Drag Handle Badge on Top-Left */}
                  <div
                    draggable={true}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      handleDragStart(e, c.id);
                    }}
                    className="absolute top-2 left-2 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity print:hidden z-10 bg-slate-900/80 hover:bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-grab active:cursor-grabbing shadow-sm select-none"
                    title={lang === 'en' ? 'Drag to change print sequence' : 'প্রিন্ট সিকোয়েন্স পরিবর্তন করতে ড্র্যাগ করুন'}
                  >
                    <GripVertical className="w-3 h-3 text-slate-300" />
                    <span>#{c.cartonNo}</span>
                  </div>

                  {/* Sequence Movement & Export Overlay Controls (Visible on mobile and hover on desktop) */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-90 sm:hover:opacity-100 transition-opacity print:hidden z-10 bg-white/95 backdrop-blur-xs p-1 rounded-lg shadow-md border border-slate-200 sticker-overlay-control">
                    <button
                      type="button"
                      onClick={() => handleDownloadSticker(c.id, c.cartonNo)}
                      className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded shadow-xs transition cursor-pointer"
                      title={lang === 'en' ? 'Download Carton Sticker Image (PNG)' : 'এই কার্টনের স্টিকার ইমেজ ডাউনলোড করুন'}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Image' : 'ইমেজ'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareSticker(c.id, c.cartonNo)}
                      className="p-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded transition cursor-pointer border border-indigo-200"
                      title={lang === 'en' ? 'Share as Image' : 'শেয়ার করুন'}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center bg-slate-100 rounded border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleMoveCarton(c.id, 'up')}
                        className="p-1 hover:bg-indigo-600 hover:text-white text-slate-700 rounded-l transition cursor-pointer"
                        title={lang === 'en' ? 'Move earlier in sequence' : 'সিকোয়েন্সে আগে নিন'}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCarton(c.id, 'down')}
                        className="p-1 hover:bg-indigo-600 hover:text-white text-slate-700 rounded-r transition cursor-pointer"
                        title={lang === 'en' ? 'Move later in sequence' : 'সিকোয়েন্সে পরে নিন'}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                        <AutoFitText
                          text={companyDisplayName}
                          maxFontSize={isCompact ? 10 : 12}
                          minFontSize={7.5}
                          enabled={stickerSettings.autoScaleLongText !== false}
                          className={`${stickerSettings.headingWeight} ${
                            stickerSettings.uppercaseHeaders ? 'uppercase' : ''
                          } tracking-wider`}
                          style={{ color: stickerSettings.borderColor }}
                        />
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

                  {/* Order Specifics - Dynamic Format based on Item Type */}
                  {stickerSettings.showOrderSpecs && (
                    isPcsMode || currentItemKey === 'bow' || currentItemKey === 'drawstring' ? (
                      /* Bow & Drawstring Carton Export Format */
                      <div className={`space-y-1 text-xs border-b border-slate-300 font-sans ${isCompact ? 'py-1' : 'py-1.5'}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-0.5 min-w-0 gap-1.5">
                          <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wide shrink-0">REF:</span>
                          <div className="min-w-0 flex-1 flex justify-end">
                            <AutoFitText
                              text={sheetData.ref || 'LIDA-LO-BOW-26070224'}
                              maxFontSize={isCompact ? 10 : 12}
                              minFontSize={6.5}
                              isMono={true}
                              align="right"
                              enabled={stickerSettings.autoScaleLongText !== false}
                              className="font-mono font-black text-slate-900"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-0.5 min-w-0 gap-1.5">
                          <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wide shrink-0">CUSTOMER:</span>
                          <div className="min-w-0 flex-1 flex justify-end">
                            <AutoFitText
                              text={sheetData.customer || 'LIDA'}
                              maxFontSize={isCompact ? 9.5 : 11}
                              minFontSize={6.5}
                              align="right"
                              enabled={stickerSettings.autoScaleLongText !== false}
                              className="font-bold text-slate-900"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-0.5 min-w-0 gap-1.5">
                          <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wide shrink-0">BUYER:</span>
                          <div className="min-w-0 flex-1 flex justify-end">
                            {stickerSettings.showBuyerBadge ? (
                              <span 
                                className="font-black px-1.5 py-0.2 rounded-xs inline-block max-w-full overflow-hidden"
                                style={{
                                  backgroundColor: stickerSettings.badgeBgColor,
                                  color: stickerSettings.badgeTextColor,
                                }}
                              >
                                <AutoFitText
                                  text={sheetData.buyer || 'HCF'}
                                  maxFontSize={10}
                                  minFontSize={6.5}
                                  align="right"
                                  enabled={stickerSettings.autoScaleLongText !== false}
                                  className="font-black"
                                />
                              </span>
                            ) : (
                              <AutoFitText
                                text={sheetData.buyer || 'HCF'}
                                maxFontSize={isCompact ? 9.5 : 11}
                                minFontSize={6.5}
                                align="right"
                                enabled={stickerSettings.autoScaleLongText !== false}
                                className="font-bold text-slate-900"
                              />
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-0.5 min-w-0">
                          <div className="flex items-center justify-between gap-1 min-w-0">
                            <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wide shrink-0">SIZE:</span>
                            <div className="min-w-0 flex-1 flex justify-end">
                              <AutoFitText
                                text={sheetData.size || '3MM'}
                                maxFontSize={isCompact ? 9.5 : 11}
                                minFontSize={6.5}
                                align="right"
                                enabled={stickerSettings.autoScaleLongText !== false}
                                className="font-bold text-slate-900"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-1 min-w-0">
                            <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wide shrink-0">COLOUR:</span>
                            <div className="min-w-0 flex-1 flex justify-end">
                              <AutoFitText
                                text={sheetData.color || 'BLACK'}
                                maxFontSize={isCompact ? 9.5 : 11}
                                minFontSize={6.5}
                                align="right"
                                enabled={stickerSettings.autoScaleLongText !== false}
                                className="font-bold text-slate-900"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-amber-50/80 px-2 py-0.5 border border-amber-300 rounded-sm">
                          <span className="text-[9px] font-black text-amber-950 uppercase tracking-wide">QUANTITY:</span>
                          <span className="font-mono font-black text-amber-950 text-xs sm:text-sm">
                            {calculatedQtyPcs ? `${calculatedQtyPcs.toLocaleString()} PCS` : '2000 PCS'}
                            {calculatedPkts ? ` (${calculatedPkts} PKTS)` : ''}
                          </span>
                        </div>

                        {/* Dynamic Technical Specs Rows */}
                        {stickerSettings.showTechnicalSpecs !== false && (
                          <div className="space-y-0.5 pt-0.5 border-t border-slate-200">
                            {technicalRows.map((row) => (
                              <div
                                key={row.id}
                                className="flex items-center justify-between gap-1 text-[8.5px] bg-slate-50/90 px-1.5 py-0.5 rounded border border-slate-200/80"
                              >
                                <div className="flex items-center gap-1 min-w-0 flex-1">
                                  <span className="font-black text-slate-500 uppercase tracking-wider text-[8px] shrink-0">
                                    {row.item1.label}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <AutoFitText
                                      text={row.item1.value}
                                      maxFontSize={8.5}
                                      minFontSize={6.5}
                                      enabled={stickerSettings.autoScaleLongText !== false}
                                      className={`font-bold ${
                                        row.item1.highlight ? 'text-rose-900 font-black' : 'text-slate-900'
                                      }`}
                                    />
                                  </div>
                                </div>
                                {row.item2 && (
                                  <div className="flex items-center gap-1 shrink-0 pl-1.5 border-l border-slate-200 max-w-[45%]">
                                    <span className="font-black text-slate-500 uppercase tracking-wider text-[8px] shrink-0">
                                      {row.item2.label}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <AutoFitText
                                        text={row.item2.value}
                                        maxFontSize={8.5}
                                        minFontSize={6.5}
                                        enabled={stickerSettings.autoScaleLongText !== false}
                                        className={`font-bold ${
                                          row.item2.highlight ? 'text-purple-900 font-black' : 'text-slate-900'
                                        }`}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Elastic & Tape Webbing Format */
                      <div className={`grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs border-b border-slate-300 min-w-0 ${isCompact ? 'py-0.5' : 'py-1'}`}>
                        <div className="min-w-0">
                          <span className="text-[8px] font-bold text-slate-500 uppercase block">REF / PO:</span>
                          <AutoFitText
                            text={sheetData.ref || 'N/A'}
                            maxFontSize={isCompact ? 10 : 12}
                            minFontSize={6.5}
                            isMono={true}
                            enabled={stickerSettings.autoScaleLongText !== false}
                            className="font-bold font-mono text-slate-900"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] font-bold text-slate-500 uppercase block">BUYER:</span>
                          {stickerSettings.showBuyerBadge ? (
                            <span 
                              className="font-black px-1.5 py-0.2 rounded-none inline-block max-w-full overflow-hidden"
                              style={{
                                backgroundColor: stickerSettings.badgeBgColor,
                                color: stickerSettings.badgeTextColor,
                              }}
                            >
                              <AutoFitText
                                text={sheetData.buyer || 'N/A'}
                                maxFontSize={isCompact ? 9 : 11}
                                minFontSize={6.5}
                                enabled={stickerSettings.autoScaleLongText !== false}
                                className="font-black"
                              />
                            </span>
                          ) : (
                            <AutoFitText
                              text={sheetData.buyer || 'N/A'}
                              maxFontSize={isCompact ? 10 : 11}
                              minFontSize={6.5}
                              enabled={stickerSettings.autoScaleLongText !== false}
                              className="font-bold text-slate-900"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] font-bold text-slate-500 uppercase block">CUSTOMER:</span>
                          <AutoFitText
                            text={sheetData.customer || 'N/A'}
                            maxFontSize={isCompact ? 10 : 11}
                            minFontSize={6.5}
                            enabled={stickerSettings.autoScaleLongText !== false}
                            className="font-bold text-slate-900"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] font-bold text-slate-500 uppercase block">ITEM / PRODUCT:</span>
                          <AutoFitText
                            text={currentItemKey === 'elastic' ? '🧵 ELASTIC' : '🏷️ WEBBING TAPE'}
                            maxFontSize={isCompact ? 10 : 11}
                            minFontSize={6.5}
                            enabled={stickerSettings.autoScaleLongText !== false}
                            className="font-bold text-slate-900"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] font-bold text-slate-500 uppercase block">SIZE / COLOR:</span>
                          <AutoFitText
                            text={`${sheetData.size || ''} | ${sheetData.color || ''}`}
                            maxFontSize={isCompact ? 10 : 11}
                            minFontSize={6.5}
                            enabled={stickerSettings.autoScaleLongText !== false}
                            className="font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <span className="text-[8px] font-bold text-slate-500 uppercase block">DELIVERY:</span>
                          <span className="font-semibold text-slate-700 text-[10px]">
                            METERS / GROSS
                          </span>
                        </div>

                        {/* Dynamic Extra Technical Specs Rows (Style, GSM, Stretch, Finish) */}
                        {stickerSettings.showTechnicalSpecs !== false && (
                          <div className="col-span-2 pt-1 border-t border-slate-200 grid grid-cols-2 gap-x-2 gap-y-0.5 min-w-0">
                            {technicalRows.map((row) => (
                              <React.Fragment key={row.id}>
                                <div className="flex items-center justify-between bg-indigo-50/70 px-1.5 py-0.5 rounded border border-indigo-100 min-w-0 gap-1">
                                  <span className="text-[7.5px] font-bold text-indigo-900 uppercase tracking-tight shrink-0">
                                    {row.item1.label}
                                  </span>
                                  <div className="min-w-0 flex-1 flex justify-end">
                                    <AutoFitText
                                      text={row.item1.value}
                                      maxFontSize={9}
                                      minFontSize={6.5}
                                      align="right"
                                      enabled={stickerSettings.autoScaleLongText !== false}
                                      className="font-black text-indigo-950"
                                    />
                                  </div>
                                </div>
                                {row.item2 && (
                                  <div className="flex items-center justify-between bg-emerald-50/70 px-1.5 py-0.5 rounded border border-emerald-100 min-w-0 gap-1">
                                    <span className="text-[7.5px] font-bold text-emerald-900 uppercase tracking-tight shrink-0">
                                      {row.item2.label}
                                    </span>
                                    <div className="min-w-0 flex-1 flex justify-end">
                                      <AutoFitText
                                        text={row.item2.value}
                                        maxFontSize={9}
                                        minFontSize={6.5}
                                        align="right"
                                        enabled={stickerSettings.autoScaleLongText !== false}
                                        className="font-black text-emerald-950"
                                      />
                                    </div>
                                  </div>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  )}

                  {/* Numerical Measurements Box */}
                  <div 
                    className={`grid grid-cols-4 gap-1 text-center font-mono ${
                      isCompact ? 'my-1 p-1' : 'my-2 p-1.5'
                    }`}
                    style={{ border: `1px solid ${stickerSettings.borderColor}` }}
                  >
                    {/* Box 1: Gross Weight */}
                    <div className="border-r border-slate-300">
                      <span className="text-[8px] font-bold text-slate-600 uppercase block">GROSS WT</span>
                      <span className={`font-black text-slate-900 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                        {c.grossWt.toFixed(2)}
                      </span>
                      <span className="text-[8px] text-slate-500 block">{wUnit}</span>
                    </div>

                    {/* Box 2: Net Weight */}
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
                      <span className="text-[8px] block text-slate-600">{wUnit}</span>
                    </div>

                    {/* Box 3: Length (Mtr) or Quantity (Pcs) */}
                    <div 
                      className="border-r border-slate-300"
                      style={{ backgroundColor: stickerSettings.lengthBoxBg }}
                    >
                      {isPcsMode ? (
                        <>
                          <span className="text-[8px] font-bold text-slate-700 uppercase block">TOTAL QTY</span>
                          <span className={`font-black text-amber-900 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                            {calculatedQtyPcs}
                          </span>
                          <span className="text-[8px] text-slate-600 block">Pcs</span>
                        </>
                      ) : (
                        <>
                          <span className="text-[8px] font-bold text-slate-700 uppercase block">LENGTH (MTR)</span>
                          <span className={`font-black text-slate-900 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                            {c.lengthMtr.toFixed(2)}
                          </span>
                          <span className="text-[8px] text-slate-600 block">Mtr</span>
                        </>
                      )}
                    </div>

                    {/* Box 4: Length (Gry) or Packets / Unit Wt */}
                    <div className="bg-slate-50">
                      {isPcsMode ? (
                        calculatedPkts !== undefined ? (
                          <>
                            <span className="text-[8px] font-bold text-slate-700 uppercase block">PACKETS</span>
                            <span className={`font-black text-purple-900 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                              {calculatedPkts}
                            </span>
                            <span className="text-[8px] text-slate-600 block">Pkt</span>
                          </>
                        ) : (
                          <>
                            <span className="text-[8px] font-bold text-slate-700 uppercase block">UNIT WT</span>
                            <span className={`font-black text-slate-900 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                              {c.wtPerUnit.toFixed(2)}
                            </span>
                            <span className="text-[8px] text-slate-600 block">gm/pc</span>
                          </>
                        )
                      ) : (
                        <>
                          <span className="text-[8px] font-bold text-slate-700 uppercase block">LENGTH (GRY)</span>
                          <span className={`font-black text-slate-900 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                            {c.lengthGry.toFixed(2)}
                          </span>
                          <span className="text-[8px] text-slate-600 block">Gry</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Footer Section: Barcode + Scannable QR Code */}
                  <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-200">
                    <div className="flex flex-col min-w-0">
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
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <AutoFitText
                          text={`*${sheetData.ref || 'REF'}-${c.cartonNo}*`}
                          maxFontSize={9}
                          minFontSize={6.5}
                          isMono={true}
                          enabled={stickerSettings.autoScaleLongText !== false}
                          className="font-mono tracking-widest font-bold"
                          style={{ color: stickerSettings.borderColor }}
                        />
                        {stickerSettings.showUnitWeight && (
                          <span className="text-[9px] text-slate-500 font-mono shrink-0">
                            ({c.wtPerUnit.toFixed(2)} {isPcsMode ? 'gm/pc' : 'gm/m'})
                          </span>
                        )}
                      </div>
                      {stickerSettings.showFooterBranding && stickerSettings.footerBrandingText && (
                        <span className="text-[7px] font-bold text-slate-400 tracking-wider uppercase mt-0.5 truncate block">
                          {stickerSettings.footerBrandingText}
                        </span>
                      )}
                    </div>

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
        </React.Fragment>
      );
    })}
  </>
)}
</div>

      {/* List-Based Settings & Data Entry Mode */}
      {!showPreview && (
        <div className="space-y-4 print:hidden">
          {/* Sticker Settings & Print Parameters List Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all">
            {/* Settings List Header */}
            <div className="p-3.5 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-800">
                      {lang === 'en' ? 'Sticker Settings & Print Parameters List' : 'স্টিকার সেটিংস ও প্রিন্ট প্যারামিটার লিস্ট'}
                    </h4>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-mono px-2 py-0.5 rounded-full font-bold">
                      {STICKER_PAPER_SIZES[bulkConfig.paperSize]?.name.split(' ')[0] || 'A4'} • {FONT_FAMILY_STYLES[stickerSettings.fontFamily]?.name || 'Standard'}
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      {lang === 'en' ? 'Synced with live labels' : 'লাইভ সিঙ্কড'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'en'
                      ? 'Detailed overview of sticker geometry, typography, branding, barcodes, and measurement rules.'
                      : 'স্টিকারের সাইজ, টাইপোগ্রাফি, ব্র্যান্ডিং, বারকোড ও পরিমাপ নিয়মের বিস্তারিত তালিকা।'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOverviewExpanded(!isSettingsOverviewExpanded)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                >
                  {isSettingsOverviewExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      <span>{lang === 'en' ? 'Collapse Settings' : 'সেটিংস গুটিয়ে নিন'}</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      <span>{lang === 'en' ? 'Expand Settings' : 'সেটিংস বিস্তারিত'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-2.5 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Palette className="w-3.5 h-3.5 text-amber-300" />
                  <span>{lang === 'en' ? 'Customize in Studio' : 'স্টুডিওতে এডিট'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  title="Switch to Rendered Labels Visual Grid Preview"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-indigo-200" />
                  <span>{lang === 'en' ? 'View Visual Grid →' : 'ভিজ্যুয়াল গ্রিড দেখুন →'}</span>
                </button>
              </div>
            </div>

            {/* Collapsible Settings Grid Items */}
            {isSettingsOverviewExpanded && (
              <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 text-xs animate-in fade-in duration-150">
                {/* 1. Paper & Dimensions */}
                <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/90 space-y-2">
                  <div className="flex items-center justify-between text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-indigo-900">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                      {lang === 'en' ? 'Paper & Geometry' : 'পেপার ও ডাইমেনশন'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsBulkPanelOpen(true)}
                      className="text-indigo-600 hover:text-indigo-800 text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Edit</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <div className="space-y-1 text-slate-600 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Paper Format:</span>
                      <span className="font-semibold text-slate-800">{STICKER_PAPER_SIZES[bulkConfig.paperSize]?.name || 'A4 Paper'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Label Size:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {bulkConfig.paperSize === 'Custom'
                          ? `${bulkConfig.customWidth} × ${bulkConfig.customHeight} mm`
                          : STICKER_PAPER_SIZES[bulkConfig.paperSize]?.labelDimensions || '100 × 75 mm'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Layout Format:</span>
                      <span className="font-semibold text-indigo-700">
                        {activePaperDef.isRoll ? '1 per page (Roll)' : '2 × 2 Grid (4/sheet)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Inner Padding:</span>
                      <span className="font-mono text-slate-800">{bulkConfig.uniformPadding}px</span>
                    </div>
                  </div>
                </div>

                {/* 2. Typography & Scale */}
                <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/90 space-y-2">
                  <div className="flex items-center justify-between text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-indigo-900">
                      <Type className="w-3.5 h-3.5 text-indigo-600" />
                      {lang === 'en' ? 'Typography & Scale' : 'টাইপোগ্রাফি ও স্কেল'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(true)}
                      className="text-indigo-600 hover:text-indigo-800 text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Style</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <div className="space-y-1 text-slate-600 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Font Family:</span>
                      <span className="font-semibold text-slate-800">{FONT_FAMILY_STYLES[stickerSettings.fontFamily]?.name || 'Standard Sans'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Base Size:</span>
                      <span className="font-mono uppercase font-semibold text-slate-800">{stickerSettings.baseFontSize} Scale</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Auto-Fit Scaling:</span>
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateSettings({
                            ...stickerSettings,
                            autoScaleLongText: stickerSettings.autoScaleLongText === false ? true : false,
                          });
                        }}
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold transition cursor-pointer ${
                          stickerSettings.autoScaleLongText !== false
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {stickerSettings.autoScaleLongText !== false ? 'ON (Auto-Shrink)' : 'OFF (Fixed)'}
                      </button>
                    </div>
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="text-slate-500">Density:</span>
                      <div className="flex items-center bg-slate-200/80 p-0.5 rounded-md text-[10px]">
                        <button
                          type="button"
                          onClick={() => setDensityMode('compact')}
                          className={`px-1.5 py-0.5 rounded transition cursor-pointer font-bold ${
                            densityMode === 'compact'
                              ? 'bg-white text-emerald-700 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Compact: More labels per page"
                        >
                          Compact
                        </button>
                        <button
                          type="button"
                          onClick={() => setDensityMode('comfort')}
                          className={`px-1.5 py-0.5 rounded transition cursor-pointer font-bold ${
                            densityMode === 'comfort'
                              ? 'bg-white text-indigo-700 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Comfort: Larger labels for easy scanning"
                        >
                          Comfort
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="text-slate-500">Crop Marks:</span>
                      <button
                        type="button"
                        onClick={handleToggleCropMarks}
                        className={`text-[10px] px-2 py-0.5 rounded font-bold transition cursor-pointer flex items-center gap-1 ${
                          showCropMarks
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                        title="Toggle dashed manual cutting crop marks and corner tick guides"
                      >
                        <Scissors className="w-2.5 h-2.5" />
                        <span>{showCropMarks ? 'ON (Dashed Lines)' : 'OFF'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Branding & Header */}
                <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/90 space-y-2">
                  <div className="flex items-center justify-between text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-indigo-900">
                      <Palette className="w-3.5 h-3.5 text-indigo-600" />
                      {lang === 'en' ? 'Branding & Borders' : 'ব্র্যান্ডিং ও বর্ডার'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(true)}
                      className="text-indigo-600 hover:text-indigo-800 text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Logo</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <div className="space-y-1 text-slate-600 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Company Name:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[110px]" title={stickerSettings.companyName || sheetData.buyer || 'Standard'}>
                        {stickerSettings.companyName || sheetData.buyer || 'Standard'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Logo Badge:</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        stickerSettings.logoUrl ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {stickerSettings.logoUrl ? 'Branded Logo' : 'Default Tag'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Border Width:</span>
                      <span className="font-mono text-slate-800">{stickerSettings.borderWidth}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Border Color:</span>
                      <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: stickerSettings.borderColor }} />
                        <span className="font-mono text-[10px] text-slate-700">{stickerSettings.borderColor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Barcodes & QR Codes */}
                <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/90 space-y-2">
                  <div className="flex items-center justify-between text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-indigo-900">
                      <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                      {lang === 'en' ? 'Barcodes & QR' : 'বারকোড ও কিউআর'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQrCode(!showQrCode)}
                      className="text-indigo-600 hover:text-indigo-800 text-[10px] font-semibold cursor-pointer"
                    >
                      {showQrCode ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="space-y-1 text-slate-600 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Dynamic QR Code:</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        showQrCode ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {showQrCode ? `Active (${qrSize}px)` : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Barcode Format:</span>
                      <span className="font-semibold text-slate-800">Code 128 / QR</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Embedded Data:</span>
                      <span className="text-[10px] text-slate-700 truncate max-w-[110px]" title={`REF: ${sheetData.ref || 'N/A'}, Buyer: ${sheetData.buyer || 'N/A'}`}>
                        REF + Weights + URL
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">QR Quick Size:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setQrSize(Math.max(32, qrSize - 8))}
                          className="px-1 bg-white border border-slate-200 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-mono text-[10px] font-bold text-slate-700">{qrSize}px</span>
                        <button
                          type="button"
                          onClick={() => setQrSize(Math.min(120, qrSize + 8))}
                          className="px-1 bg-white border border-slate-200 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Item Metadata & Units */}
                <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/90 space-y-2">
                  <div className="flex items-center justify-between text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-indigo-900">
                      <Package className="w-3.5 h-3.5 text-indigo-600" />
                      {lang === 'en' ? 'Item Specs & Units' : 'আইটেম স্পেকস ও ইউনিট'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSpecsDrawerOpen(true)}
                      className="text-indigo-600 hover:text-indigo-800 text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Specs</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <div className="space-y-1 text-slate-600 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Item Type:</span>
                      <span className="font-semibold text-slate-800">{currentItemConfig.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Delivery Unit:</span>
                      <span className="font-semibold text-indigo-700">{isPcsMode ? 'Pieces (pcs)' : 'Meters (mtr)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Default Tare:</span>
                      <span className="font-mono text-slate-800">{sheetData.defaultTare || 0.5} {wUnit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Default Unit Wt:</span>
                      <span className="font-mono text-slate-800">{sheetData.defaultWtPerUnit || 0} gm</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* List Toolbar & Content Management Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Table className="w-4 h-4 text-indigo-600" />
                <span>{lang === 'en' ? 'Carton Content Table' : 'কার্টন কনটেন্ট টেবিল'}</span>
              </span>

              {/* Status Filter Tabs */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                    statusFilter === 'all' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'en' ? 'All' : 'সব'} ({sheetData.cartons.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('with-weight')}
                  className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                    statusFilter === 'with-weight' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'en' ? 'Active' : 'সক্রিয়'} ({activeCartons.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('zero-weight')}
                  className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                    statusFilter === 'zero-weight' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'en' ? 'Pending' : 'বাকি'} ({sheetData.cartons.length - activeCartons.length})
                </button>
              </div>

              {/* Search filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={lang === 'en' ? 'Search carton # or note...' : 'কার্টন নম্বর বা নোট খুঁজুন...'}
                  className="pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg w-44 focus:w-56 transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Add Single Carton */}
              <button
                type="button"
                onClick={handleAddNewCarton}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Add Carton' : 'কার্টন যোগ'}</span>
              </button>

              {/* Bulk add buttons */}
              <button
                type="button"
                onClick={() => handleAddBulkEmptyCartons(5)}
                className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                title="Add 5 new cartons to sheet"
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => handleAddBulkEmptyCartons(10)}
                className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                title="Add 10 new cartons to sheet"
              >
                +10
              </button>

              {/* Toggle Live Side Inspector */}
              <button
                type="button"
                onClick={() => setShowSidePreview(!showSidePreview)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                  showSidePreview
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title="Toggle real-time sticker preview panel beside the table"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>{showSidePreview ? (lang === 'en' ? 'Side Preview On' : 'সাইড প্রিভিউ চালু') : (lang === 'en' ? 'Side Preview Off' : 'সাইড প্রিভিউ বন্ধ')}</span>
              </button>
            </div>
          </div>

          {/* Table + Side Inspector Container */}
          <div className="flex flex-col xl:flex-row items-start gap-4">
            {/* Main Table */}
            <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden w-full">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-2 w-7 text-center" title="Drag to reorder sequence">
                        <ArrowUpDown className="w-3.5 h-3.5 mx-auto text-slate-400" />
                      </th>
                      <th className="py-2.5 px-3">CTN #</th>
                      <th className="py-2.5 px-3">Gross Wt (kg)</th>
                      <th className="py-2.5 px-3">Tare (kg)</th>
                      <th className="py-2.5 px-3">Net Wt (kg)</th>
                      <th className="py-2.5 px-3">
                        {isPcsMode ? 'Quantity (Pcs)' : 'Length (Mtr / Gry)'}
                      </th>
                      <th className="py-2.5 px-3">
                        {isPcsMode ? 'Unit Wt (gm/pc)' : 'Unit Wt (gm/m)'}
                      </th>
                      <th className="py-2.5 px-3">Notes</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredCartons.map((c) => {
                      const isSelected = selectedCarton?.id === c.id;
                      const hasGross = c.grossWt > 0;
                      const isInvalidNet = hasGross && c.grossWt <= c.tareWt;
                      const calculatedQty = c.qtyPcs || (c.wtPerUnit > 0 ? Math.round((c.netWt * 1000) / c.wtPerUnit) : 0);
                      const isBeingDragged = draggedCartonId === c.id;
                      const isDropTarget = dragOverCartonId === c.id && !isBeingDragged;

                      return (
                        <tr
                          key={c.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, c.id)}
                          onDragOver={(e) => handleDragOver(e, c.id)}
                          onDragLeave={(e) => handleDragLeave(e, c.id)}
                          onDrop={(e) => handleDrop(e, c.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => setSelectedCartonId(c.id)}
                          className={`transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50/70 ring-1 ring-inset ring-indigo-300'
                              : 'hover:bg-slate-50/80'
                          } ${
                            isBeingDragged ? 'opacity-35 bg-indigo-100/50' : ''
                          } ${
                            isDropTarget
                              ? (dragOverPosition === 'before' ? 'border-t-2 border-t-indigo-600 bg-indigo-50/50' : 'border-b-2 border-b-indigo-600 bg-indigo-50/50')
                              : ''
                          }`}
                        >
                          {/* Drag Handle Column */}
                          <td 
                            className="py-2 px-1 text-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-600 select-none" 
                            title={lang === 'en' ? 'Drag to change print sequence' : 'ড্র্যাগ করে ক্রম পরিবর্তন করুন'} 
                            onClick={e => e.stopPropagation()}
                          >
                            <GripVertical className="w-4 h-4 mx-auto" />
                          </td>

                          {/* CTN # */}
                          <td className="py-2 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold ${
                                isSelected ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {c.cartonNo}
                              </span>
                              {isSelected && (
                                <span className="text-[10px] text-indigo-600 font-bold hidden sm:inline">Active</span>
                              )}
                            </div>
                          </td>

                          {/* Gross Wt Input */}
                          <td className="py-2 px-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={c.grossWt === 0 ? '' : c.grossWt}
                                placeholder="0.00"
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  handleUpdateCartonField(c.id, { grossWt: isNaN(val) ? 0 : val });
                                }}
                                onFocus={() => setSelectedCartonId(c.id)}
                                className="w-24 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                              <span className="text-[10px] font-bold text-slate-400 ml-1">{wUnit}</span>
                            </div>
                          </td>

                          {/* Tare Wt Input */}
                          <td className="py-2 px-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={c.tareWt}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  handleUpdateCartonField(c.id, { tareWt: isNaN(val) ? 0 : val });
                                }}
                                onFocus={() => setSelectedCartonId(c.id)}
                                className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-slate-700 text-xs focus:ring-1 focus:ring-indigo-500"
                              />
                              <span className="text-[10px] text-slate-400 ml-1">{wUnit}</span>
                            </div>
                          </td>

                          {/* Net Wt Badge */}
                          <td className="py-2 px-3 whitespace-nowrap font-mono">
                            {c.netWt > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
                                <Check className="w-3 h-3 text-emerald-600" />
                                {c.netWt.toFixed(2)} kg
                              </span>
                            ) : isInvalidNet ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]" title="Gross weight is less than or equal to Tare">
                                <AlertCircle className="w-3 h-3 text-rose-500" />
                                Gross ≤ Tare
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">0.00 {wUnit}</span>
                            )}
                          </td>

                          {/* Length or Quantity */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            {isPcsMode ? (
                              <div>
                                <span className="font-bold text-amber-900 font-mono text-xs">
                                  {calculatedQty.toLocaleString()} Pcs
                                </span>
                                {c.pkts !== undefined && (
                                  <span className="text-[10px] text-purple-700 font-mono block">
                                    {c.pkts} Pkt
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="font-bold text-indigo-950 font-mono text-xs">
                                  {c.lengthMtr > 0 ? `${c.lengthMtr.toFixed(2)} Mtr` : '-'}
                                </span>
                                {c.lengthGry > 0 && (
                                  <span className="text-[10px] text-slate-500 font-mono block">
                                    {c.lengthGry.toFixed(2)} Gry
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Unit Wt */}
                          <td className="py-2 px-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center">
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={c.wtPerUnit}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  handleUpdateCartonField(c.id, { wtPerUnit: isNaN(val) ? sheetData.defaultWtPerUnit : val });
                                }}
                                onFocus={() => setSelectedCartonId(c.id)}
                                className="w-18 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-slate-700 text-xs focus:ring-1 focus:ring-indigo-500"
                              />
                              <span className="text-[10px] text-slate-400 ml-1">
                                {isPcsMode ? 'g/pc' : 'g/m'}
                              </span>
                            </div>
                          </td>

                          {/* Notes */}
                          <td className="py-2 px-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={c.notes || ''}
                              onChange={e => handleUpdateCartonField(c.id, { notes: e.target.value })}
                              placeholder="Notes / roll"
                              onFocus={() => setSelectedCartonId(c.id)}
                              className="w-28 sm:w-36 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>

                          {/* Actions */}
                          <td className="py-2 px-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleMoveCarton(c.id, 'up')}
                                className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded transition cursor-pointer"
                                title={lang === 'en' ? 'Move earlier in sequence' : 'আগে নিন'}
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveCarton(c.id, 'down')}
                                className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded transition cursor-pointer"
                                title={lang === 'en' ? 'Move later in sequence' : 'পরে নিন'}
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCartonId(c.id);
                                  setShowSidePreview(true);
                                }}
                                className={`p-1.5 rounded transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                                title="Inspect live sticker in side panel"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {onOpenCartonQr && (
                                <button
                                  type="button"
                                  onClick={() => onOpenCartonQr(c)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer"
                                  title="View QR Code"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDuplicateExistingCarton(c)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer"
                                title="Duplicate this carton"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteExistingCarton(c.id)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded transition cursor-pointer"
                                title="Delete this carton"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer / Summary Count */}
              <div className="bg-slate-50 px-3.5 py-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                <div className="flex items-center gap-4">
                  <span>
                    <strong>{filteredCartons.length}</strong> {lang === 'en' ? 'Rows displayed' : 'সারি প্রদর্শিত'}
                  </span>
                  <span>•</span>
                  <span>
                    Gross Wt: <strong className="font-mono text-slate-900">{summary.totalGrossWt.toFixed(2)} {wUnit}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Net Wt: <strong className="font-mono text-emerald-700">{summary.totalNetWt.toFixed(2)} {wUnit}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    {isPcsMode ? (
                      <>Total: <strong className="font-mono text-amber-900">{summary.totalQtyPcs?.toLocaleString() || 0} Pcs</strong></>
                    ) : (
                      <>Total: <strong className="font-mono text-indigo-900">{summary.totalMtr.toFixed(2)} Mtr</strong></>
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddNewCarton}
                  className="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? '+ Add Next Carton' : '+ পরবর্তী কার্টন'}</span>
                </button>
              </div>
            </div>

            {/* Live Side Sticker Inspector */}
            {showSidePreview && selectedCarton && (
              <div className="w-full xl:w-96 shrink-0 xl:sticky xl:top-4 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-indigo-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {lang === 'en' ? `Live Sticker Preview — CTN #${selectedCarton.cartonNo}` : `লাইভ স্টিকার প্রিভিউ — কার্টন #${selectedCarton.cartonNo}`}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {lang === 'en' ? 'Synchronizes live as you edit the table' : 'টেবিলে এডিট করলে সাথে সাথে সিঙ্ক হয়'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSidePreview(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                    title="Close side preview"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Render the actual live sticker card for the selected carton */}
                <div className="scale-95 origin-top">
                  {(() => {
                    const c = selectedCarton;
                    const qrUrl = generateCartonPreviewUrl(c, sheetData, summary.totalCtn);
                    const companyDisplayName = stickerSettings.customCompanyName || sheetData.companyName || 'GOOD & FAST Pa. Co. Ltd';
                    const subtitleText = stickerSettings.customSubtitle || defaultSubtitleByItem;
                    const calculatedQtyPcs = c.qtyPcs || (c.wtPerUnit > 0 ? Math.round((c.netWt * 1000) / c.wtPerUnit) : 0);
                    const calculatedPkts = c.pkts || (sheetData.pcsPerPkt ? Math.round(calculatedQtyPcs / sheetData.pcsPerPkt) : undefined);

                    return (
                      <div
                        key={c.id}
                        className={`bg-white rounded-none shadow-sm print:shadow-none flex flex-col justify-between relative group transition-all ${
                          fontConfig.cssClass
                        }`}
                        style={{ 
                          padding: `${bulkConfig.uniformPadding}px`,
                          minHeight: activePaperDef.cardMinHeight || (isCompact ? '220px' : '270px'),
                          border: `${stickerSettings.borderWidth} solid ${stickerSettings.borderColor}`,
                        }}
                      >
                        {/* Dashed Crop Marks & Cutting Guides for Manual Cutting */}
                        {showCropMarks && (
                          <div className="sticker-crop-marks pointer-events-none select-none">
                            {/* Outer dashed perimeter cut border */}
                            <div 
                              className="absolute -inset-1 sm:-inset-1.5 border border-dashed border-slate-400 print:border-slate-800 rounded-none z-20 pointer-events-none"
                              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                            />
                            {/* Corner Crosshair / L-shaped Tick Crop Marks */}
                            <span className="absolute -top-2.5 -left-2.5 w-2.5 h-2.5 border-t-2 border-l-2 border-slate-700 print:border-black pointer-events-none z-20" />
                            <span className="absolute -top-2.5 -right-2.5 w-2.5 h-2.5 border-t-2 border-r-2 border-slate-700 print:border-black pointer-events-none z-20" />
                            <span className="absolute -bottom-2.5 -left-2.5 w-2.5 h-2.5 border-b-2 border-l-2 border-slate-700 print:border-black pointer-events-none z-20" />
                            <span className="absolute -bottom-2.5 -right-2.5 w-2.5 h-2.5 border-b-2 border-r-2 border-slate-700 print:border-black pointer-events-none z-20" />
                            {/* Scissor Cut Line Label */}
                            <div className="absolute -top-2.5 left-2 px-1 bg-white print:bg-white text-[7.5px] font-mono font-bold text-slate-600 print:text-black flex items-center gap-0.5 z-20 border border-slate-300 print:border-black rounded-xs shadow-2xs">
                              <Scissors className="w-2 h-2 text-slate-700 print:text-black" />
                              <span>CUT</span>
                            </div>
                          </div>
                        )}

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
                              <AutoFitText
                                text={companyDisplayName}
                                maxFontSize={isCompact ? 10 : 12}
                                minFontSize={7.5}
                                enabled={stickerSettings.autoScaleLongText !== false}
                                className={`${stickerSettings.headingWeight} ${
                                  stickerSettings.uppercaseHeaders ? 'uppercase' : ''
                                } tracking-wider`}
                                style={{ color: stickerSettings.borderColor }}
                              />
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
                          isPcsMode || currentItemKey === 'bow' || currentItemKey === 'drawstring' ? (
                            <div className={`space-y-1 text-xs border-b border-slate-300 font-sans ${isCompact ? 'py-1' : 'py-1.5'}`}>
                              <div className="flex items-center justify-between border-b border-slate-100 pb-0.5 min-w-0 gap-1.5">
                                <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wide shrink-0">REF:</span>
                                <div className="min-w-0 flex-1 flex justify-end">
                                  <AutoFitText
                                    text={sheetData.ref || 'LIDA-LO-BOW-26070224'}
                                    maxFontSize={isCompact ? 10 : 12}
                                    minFontSize={6.5}
                                    isMono={true}
                                    align="right"
                                    enabled={stickerSettings.autoScaleLongText !== false}
                                    className="font-mono font-black text-slate-900"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between border-b border-slate-100 pb-0.5 min-w-0 gap-1.5">
                                <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wide shrink-0">CUSTOMER:</span>
                                <div className="min-w-0 flex-1 flex justify-end">
                                  <AutoFitText
                                    text={sheetData.customer || 'LIDA'}
                                    maxFontSize={isCompact ? 9.5 : 11}
                                    minFontSize={6.5}
                                    align="right"
                                    enabled={stickerSettings.autoScaleLongText !== false}
                                    className="font-bold text-slate-900"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between border-b border-slate-100 pb-0.5 min-w-0 gap-1.5">
                                <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wide shrink-0">BUYER:</span>
                                <div className="min-w-0 flex-1 flex justify-end">
                                  {stickerSettings.showBuyerBadge ? (
                                    <span 
                                      className="font-black px-1.5 py-0.2 rounded-xs inline-block max-w-full overflow-hidden"
                                      style={{
                                        backgroundColor: stickerSettings.badgeBgColor,
                                        color: stickerSettings.badgeTextColor,
                                      }}
                                    >
                                      <AutoFitText
                                        text={sheetData.buyer || 'HCF'}
                                        maxFontSize={10}
                                        minFontSize={6.5}
                                        align="right"
                                        enabled={stickerSettings.autoScaleLongText !== false}
                                        className="font-black"
                                      />
                                    </span>
                                  ) : (
                                    <AutoFitText
                                      text={sheetData.buyer || 'HCF'}
                                      maxFontSize={isCompact ? 9.5 : 11}
                                      minFontSize={6.5}
                                      align="right"
                                      enabled={stickerSettings.autoScaleLongText !== false}
                                      className="font-bold text-slate-900"
                                    />
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-0.5 min-w-0">
                                <div className="flex items-center justify-between gap-1 min-w-0">
                                  <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wide shrink-0">SIZE:</span>
                                  <div className="min-w-0 flex-1 flex justify-end">
                                    <AutoFitText
                                      text={sheetData.size || '3MM'}
                                      maxFontSize={isCompact ? 9.5 : 11}
                                      minFontSize={6.5}
                                      align="right"
                                      enabled={stickerSettings.autoScaleLongText !== false}
                                      className="font-bold text-slate-900"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-1 min-w-0">
                                  <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wide shrink-0">COLOUR:</span>
                                  <div className="min-w-0 flex-1 flex justify-end">
                                    <AutoFitText
                                      text={sheetData.color || 'BLACK'}
                                      maxFontSize={isCompact ? 9.5 : 11}
                                      minFontSize={6.5}
                                      align="right"
                                      enabled={stickerSettings.autoScaleLongText !== false}
                                      className="font-bold text-slate-900"
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between bg-amber-50/80 px-2 py-0.5 border border-amber-300 rounded-sm">
                                <span className="text-[9px] font-black text-amber-950 uppercase tracking-wide">QUANTITY:</span>
                                <span className="font-mono font-black text-amber-950 text-xs sm:text-sm">
                                  {calculatedQtyPcs ? `${calculatedQtyPcs.toLocaleString()} PCS` : '2000 PCS'}
                                  {calculatedPkts ? ` (${calculatedPkts} PKTS)` : ''}
                                </span>
                              </div>

                              {/* Dynamic Technical Specs Rows */}
                              {stickerSettings.showTechnicalSpecs !== false && (
                                <div className="space-y-0.5 pt-0.5 border-t border-slate-200">
                                  {technicalRows.map((row) => (
                                    <div
                                      key={row.id}
                                      className="flex items-center justify-between gap-1 text-[8.5px] bg-slate-50/90 px-1.5 py-0.5 rounded border border-slate-200/80"
                                    >
                                      <div className="flex items-center gap-1 min-w-0 flex-1">
                                        <span className="font-black text-slate-500 uppercase tracking-wider text-[8px] shrink-0">
                                          {row.item1.label}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                          <AutoFitText
                                            text={row.item1.value}
                                            maxFontSize={8.5}
                                            minFontSize={6.5}
                                            enabled={stickerSettings.autoScaleLongText !== false}
                                            className={`font-bold ${
                                              row.item1.highlight ? 'text-rose-900 font-black' : 'text-slate-900'
                                            }`}
                                          />
                                        </div>
                                      </div>
                                      {row.item2 && (
                                        <div className="flex items-center gap-1 shrink-0 pl-1.5 border-l border-slate-200 max-w-[45%]">
                                          <span className="font-black text-slate-500 uppercase tracking-wider text-[8px] shrink-0">
                                            {row.item2.label}
                                          </span>
                                          <div className="min-w-0 flex-1">
                                            <AutoFitText
                                              text={row.item2.value}
                                              maxFontSize={8.5}
                                              minFontSize={6.5}
                                              enabled={stickerSettings.autoScaleLongText !== false}
                                              className={`font-bold ${
                                                row.item2.highlight ? 'text-purple-900 font-black' : 'text-slate-900'
                                              }`}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={`grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs border-b border-slate-300 min-w-0 ${isCompact ? 'py-0.5' : 'py-1'}`}>
                              <div className="min-w-0">
                                <span className="text-[8px] font-bold text-slate-500 uppercase block">REF / PO:</span>
                                <AutoFitText
                                  text={sheetData.ref || 'N/A'}
                                  maxFontSize={isCompact ? 10 : 12}
                                  minFontSize={6.5}
                                  isMono={true}
                                  enabled={stickerSettings.autoScaleLongText !== false}
                                  className="font-bold font-mono text-slate-900"
                                />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[8px] font-bold text-slate-500 uppercase block">BUYER:</span>
                                {stickerSettings.showBuyerBadge ? (
                                  <span 
                                    className="font-black px-1.5 py-0.2 rounded-none inline-block max-w-full overflow-hidden"
                                    style={{
                                      backgroundColor: stickerSettings.badgeBgColor,
                                      color: stickerSettings.badgeTextColor,
                                    }}
                                  >
                                    <AutoFitText
                                      text={sheetData.buyer || 'N/A'}
                                      maxFontSize={isCompact ? 9 : 11}
                                      minFontSize={6.5}
                                      enabled={stickerSettings.autoScaleLongText !== false}
                                      className="font-black"
                                    />
                                  </span>
                                ) : (
                                  <AutoFitText
                                    text={sheetData.buyer || 'N/A'}
                                    maxFontSize={isCompact ? 10 : 11}
                                    minFontSize={6.5}
                                    enabled={stickerSettings.autoScaleLongText !== false}
                                    className="font-bold text-slate-900"
                                  />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="text-[8px] font-bold text-slate-500 uppercase block">CUSTOMER:</span>
                                <AutoFitText
                                  text={sheetData.customer || 'N/A'}
                                  maxFontSize={isCompact ? 10 : 11}
                                  minFontSize={6.5}
                                  enabled={stickerSettings.autoScaleLongText !== false}
                                  className="font-bold text-slate-900"
                                />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[8px] font-bold text-slate-500 uppercase block">ITEM / PRODUCT:</span>
                                <AutoFitText
                                  text={currentItemKey === 'elastic' ? '🧵 ELASTIC' : '🏷️ WEBBING TAPE'}
                                  maxFontSize={isCompact ? 10 : 11}
                                  minFontSize={6.5}
                                  enabled={stickerSettings.autoScaleLongText !== false}
                                  className="font-bold text-slate-900"
                                />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[8px] font-bold text-slate-500 uppercase block">SIZE / COLOR:</span>
                                <AutoFitText
                                  text={`${sheetData.size || ''} | ${sheetData.color || ''}`}
                                  maxFontSize={isCompact ? 10 : 11}
                                  minFontSize={6.5}
                                  enabled={stickerSettings.autoScaleLongText !== false}
                                  className="font-bold text-slate-900"
                                />
                              </div>
                              <div>
                                <span className="text-[8px] font-bold text-slate-500 uppercase block">DELIVERY:</span>
                                <span className="font-semibold text-slate-700 text-[10px]">
                                  METERS / GROSS
                                </span>
                              </div>

                              {/* Dynamic Extra Technical Specs Rows */}
                              {stickerSettings.showTechnicalSpecs !== false && (
                                <div className="col-span-2 pt-1 border-t border-slate-200 grid grid-cols-2 gap-x-2 gap-y-0.5 min-w-0">
                                  {technicalRows.map((row) => (
                                    <React.Fragment key={row.id}>
                                      <div className="flex items-center justify-between bg-indigo-50/70 px-1.5 py-0.5 rounded border border-indigo-100 min-w-0 gap-1">
                                        <span className="text-[7.5px] font-bold text-indigo-900 uppercase tracking-tight shrink-0">
                                          {row.item1.label}
                                        </span>
                                        <div className="min-w-0 flex-1 flex justify-end">
                                          <AutoFitText
                                            text={row.item1.value}
                                            maxFontSize={9}
                                            minFontSize={6.5}
                                            align="right"
                                            enabled={stickerSettings.autoScaleLongText !== false}
                                            className="font-black text-indigo-950"
                                          />
                                        </div>
                                      </div>
                                      {row.item2 && (
                                        <div className="flex items-center justify-between bg-emerald-50/70 px-1.5 py-0.5 rounded border border-emerald-100 min-w-0 gap-1">
                                          <span className="text-[7.5px] font-bold text-emerald-900 uppercase tracking-tight shrink-0">
                                            {row.item2.label}
                                          </span>
                                          <div className="min-w-0 flex-1 flex justify-end">
                                            <AutoFitText
                                              text={row.item2.value}
                                              maxFontSize={9}
                                              minFontSize={6.5}
                                              align="right"
                                              enabled={stickerSettings.autoScaleLongText !== false}
                                              className="font-black text-emerald-950"
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </React.Fragment>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
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
                            <span className="text-[8px] text-slate-500 block">{wUnit}</span>
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
                            <span className="text-[8px] block text-slate-600">{wUnit}</span>
                          </div>

                          <div 
                            className="border-r border-slate-300"
                            style={{ backgroundColor: stickerSettings.lengthBoxBg }}
                          >
                            {isPcsMode ? (
                              <>
                                <span className="text-[8px] font-bold text-slate-700 uppercase block">TOTAL QTY</span>
                                <span className={`font-black text-amber-900 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                                  {calculatedQtyPcs}
                                </span>
                                <span className="text-[8px] text-slate-600 block">Pcs</span>
                              </>
                            ) : (
                              <>
                                <span className="text-[8px] font-bold text-slate-700 uppercase block">LENGTH (MTR)</span>
                                <span className={`font-black text-slate-900 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                                  {c.lengthMtr.toFixed(2)}
                                </span>
                                <span className="text-[8px] text-slate-600 block">Mtr</span>
                              </>
                            )}
                          </div>

                          <div className="bg-slate-50">
                            {isPcsMode ? (
                              calculatedPkts !== undefined ? (
                                <>
                                  <span className="text-[8px] font-bold text-slate-700 uppercase block">PACKETS</span>
                                  <span className={`font-black text-purple-900 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                                    {calculatedPkts}
                                  </span>
                                  <span className="text-[8px] text-slate-600 block">Pkt</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-[8px] font-bold text-slate-700 uppercase block">UNIT WT</span>
                                  <span className={`font-black text-slate-900 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                                    {c.wtPerUnit.toFixed(2)}
                                  </span>
                                  <span className="text-[8px] text-slate-600 block">gm/pc</span>
                                </>
                              )
                            ) : (
                              <>
                                <span className="text-[8px] font-bold text-slate-700 uppercase block">LENGTH (GRY)</span>
                                <span className={`font-black text-slate-900 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                                  {c.lengthGry.toFixed(2)}
                                </span>
                                <span className="text-[8px] text-slate-600 block">Gry</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Footer Section: Barcode + QR */}
                        <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-200">
                          <div className="flex flex-col min-w-0">
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
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <AutoFitText
                                text={`*${sheetData.ref || 'REF'}-${c.cartonNo}*`}
                                maxFontSize={9}
                                minFontSize={6.5}
                                isMono={true}
                                enabled={stickerSettings.autoScaleLongText !== false}
                                className="font-mono tracking-widest font-bold"
                                style={{ color: stickerSettings.borderColor }}
                              />
                              {stickerSettings.showUnitWeight && (
                                <span className="text-[9px] text-slate-500 font-mono shrink-0">
                                  ({c.wtPerUnit.toFixed(2)} {isPcsMode ? 'gm/pc' : 'gm/m'})
                                </span>
                              )}
                            </div>
                            {stickerSettings.showFooterBranding && stickerSettings.footerBrandingText && (
                              <span className="text-[7px] font-bold text-slate-400 tracking-wider uppercase mt-0.5 truncate block">
                                {stickerSettings.footerBrandingText}
                              </span>
                            )}
                          </div>

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
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">
                    {lang === 'en' ? 'Want full page print view?' : 'ফুল পেজ প্রিন্ট ভিউ চান?'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{lang === 'en' ? 'Switch to Full Preview' : 'ফুল প্রিভিউতে যান'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
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

      {/* Floating Reorder Notification Toast */}
      {reorderNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700/80 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 print:hidden">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <ArrowUpDown className="w-4 h-4 text-indigo-400" />
          <span>{reorderNotice}</span>
        </div>
      )}
    </div>
  );
};

export default StickerLabelsView;
