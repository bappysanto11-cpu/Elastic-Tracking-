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
  Camera,
  FolderOpen
} from 'lucide-react';
import { ScheduleItem } from '../types/schedule';
import { 
  getAllAvailableScheduleOrders, 
  generateCartonsForOrder, 
  getDefaultCartonCapacity,
  getOrCreateOrderCartons,
  saveOrderPackingData
} from '../utils/orderCartonStorage';
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
import { StickerCustomizationModal } from './StickerCustomizationModal';
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
  activeScheduleItem?: ScheduleItem | null;
  onSelectScheduleItem?: (item: ScheduleItem) => void;
  onAutoGenerateCartons?: (capacity: number) => void;
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
  isPrintPreview?: boolean;
}

export const StickerLabelsView: React.FC<StickerLabelsViewProps> = ({
  sheetData,
  summary,
  lang,
  activeScheduleItem,
  onSelectScheduleItem,
  onAutoGenerateCartons,
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
  isPrintPreview = false,
}) => {
  // Available Schedule Orders for Order Switcher
  const [availableOrders, setAvailableOrders] = useState<ScheduleItem[]>(() => {
    return getAllAvailableScheduleOrders();
  });
  const [isOrderSelectorOpen, setIsOrderSelectorOpen] = useState<boolean>(false);
  const [isCapacityModalOpen, setIsCapacityModalOpen] = useState<boolean>(false);
  const [customCapacityInput, setCustomCapacityInput] = useState<string>(() => {
    if (activeScheduleItem) {
      return String(getDefaultCartonCapacity(activeScheduleItem));
    }
    return sheetData.deliveryUnit === 'pcs' ? '100' : '500';
  });

  // Refresh available orders on mount
  useEffect(() => {
    setAvailableOrders(getAllAvailableScheduleOrders());
  }, []);

  // Sync capacity input if active schedule item changes
  useEffect(() => {
    if (activeScheduleItem) {
      setCustomCapacityInput(String(getDefaultCartonCapacity(activeScheduleItem)));
    }
  }, [activeScheduleItem?.id]);

  const handleSelectOrder = async (order: ScheduleItem) => {
    if (onSelectScheduleItem) {
      onSelectScheduleItem(order);
    } else {
      const { data: orderData } = await getOrCreateOrderCartons(order);
      if (onUpdateHeader) {
        onUpdateHeader({
          buyer: order.buyer,
          customer: order.customer,
          ref: order.customerRefPO || order.jobNo,
          customItemName: order.itemDescription,
          color: order.color,
          size: order.size,
          cartons: orderData.cartons,
        });
      }
      if (onReorderCartons && orderData.cartons) {
        onReorderCartons(orderData.cartons);
      }
    }
  };

  const handleExecuteAutoGenerateCartons = () => {
    const cap = parseInt(customCapacityInput, 10) || 500;
    if (onAutoGenerateCartons) {
      onAutoGenerateCartons(cap);
    } else if (activeScheduleItem) {
      const generated = generateCartonsForOrder(
        activeScheduleItem,
        cap,
        sheetData.defaultTare || 0.50,
        sheetData.defaultWtPerUnit || 30.00
      );
      if (onReorderCartons) {
        onReorderCartons(generated);
      }
    }
    setIsCapacityModalOpen(false);
  };

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
      {/* 1. ORDER-SPECIFIC ACTIVE PROFILE & ORDER SWITCHER BANNER */}
      {!isPrintPreview && (
        <div className="bg-gradient-to-r from-slate-900 via-neutral-950 to-slate-900 text-white p-3.5 sm:p-4 rounded-xl border border-neutral-700/60 shadow-md print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Order Details Left Column */}
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-neutral-900/30 border border-neutral-300/40 flex items-center justify-center text-neutral-300 shrink-0 mt-0.5 sm:mt-0">
              <Package className="w-5 h-5 text-neutral-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-700/60">
                  {lang === 'en' ? 'Order Profile' : 'অর্ডার প্রোফাইল'}
                </span>
                <span className="font-bold text-sm text-white truncate">
                  {sheetData.buyer || activeScheduleItem?.buyer || 'Buyer'}
                </span>
                <span className="text-xs font-mono font-bold text-neutral-300 bg-neutral-950/70 px-2 py-0.5 rounded border border-neutral-600/50">
                  PO: {sheetData.ref || activeScheduleItem?.customerRefPO || 'N/A'}
                </span>
                <span className="text-xs text-neutral-200 truncate">
                  • {sheetData.customItemName || activeScheduleItem?.itemDescription || currentItemConfig.name}
                </span>
                {(sheetData.color || activeScheduleItem?.color) && (
                  <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-200 border border-slate-700">
                    {lang === 'en' ? 'Color:' : 'কালার:'} <strong className="text-white">{sheetData.color || activeScheduleItem?.color}</strong>
                  </span>
                )}
                {(sheetData.size || activeScheduleItem?.size) && (
                  <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-200 border border-slate-700 font-mono">
                    {lang === 'en' ? 'Size:' : 'সাইজ:'} <strong className="text-white">{sheetData.size || activeScheduleItem?.size}</strong>
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-300 mt-1.5 flex items-center gap-3 flex-wrap">
                <span>
                  {lang === 'en' ? 'Order Demand:' : 'অর্ডারের মোট চাহিদা:'}{' '}
                  <strong className="text-white font-mono">
                    {Number(activeScheduleItem?.demandQty || activeScheduleItem?.orderQty || 1000).toLocaleString()}{' '}
                    {activeScheduleItem?.unit || (isPcsMode ? 'Pcs' : 'Mtr')}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  {lang === 'en' ? 'Total Distinct Cartons:' : 'এই অর্ডারের মোট কার্টন:'}{' '}
                  <strong className="text-neutral-400 font-mono font-bold">
                    {sheetData.cartons.length} {lang === 'en' ? 'Boxes' : 'টি বক্স'}
                  </strong>
                </span>
                <span>•</span>
                <span className="text-slate-400">
                  {lang === 'en' ? 'Cloud Status:' : 'ক্লাউড স্ট্যাটাস:'}{' '}
                  <span className="text-neutral-400 font-medium">
                    ✓ {lang === 'en' ? 'Saved per Order' : 'অর্ডারের সাথে সংরক্ষিত'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons Right Column */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Quick Order Switcher Dropdown */}
            {availableOrders.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsOrderSelectorOpen(!isOrderSelectorOpen)}
                  className="px-3 py-1.5 bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-400/50 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-neutral-200" />
                  <span>{lang === 'en' ? 'Switch Order' : 'অর্ডার পরিবর্তন'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-neutral-300 transition-transform ${isOrderSelectorOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOrderSelectorOpen && (
                  <div className="absolute right-0 mt-2 w-80 max-h-80 overflow-y-auto bg-white border border-neutral-300 rounded-xl shadow-2xl z-50 p-1.5 text-xs text-neutral-800 divide-y divide-neutral-200">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
                      <span>{lang === 'en' ? 'Select Schedule Order' : 'শিডিউল থেকে অর্ডার নির্বাচন'}</span>
                      <span className="text-neutral-900 font-mono font-bold">{availableOrders.length} {lang === 'en' ? 'orders' : 'অর্ডার'}</span>
                    </div>
                    {availableOrders.map((ord) => {
                      const isCurrent = (activeScheduleItem?.id === ord.id) || (sheetData.ref === ord.customerRefPO);
                      return (
                        <button
                          key={ord.id}
                          type="button"
                          onClick={() => {
                            setIsOrderSelectorOpen(false);
                            handleSelectOrder(ord);
                          }}
                          className={`w-full text-left p-2 rounded-lg transition cursor-pointer flex flex-col gap-0.5 ${
                            isCurrent
                              ? 'bg-neutral-900 text-white font-bold shadow-xs'
                              : 'hover:bg-neutral-100 text-neutral-800'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="truncate">{ord.buyer}</span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${isCurrent ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-800 border border-neutral-200'}`}>
                              {ord.customerRefPO || ord.jobNo}
                            </span>
                          </div>
                          <div className={`text-[11px] flex items-center justify-between ${isCurrent ? 'text-neutral-300' : 'text-neutral-500'}`}>
                            <span className="truncate">{ord.itemDescription || 'Elastic'} • {ord.color || 'N/A'}</span>
                            <span className="font-mono font-semibold">{ord.demandQty} {ord.unit}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Auto Generate Cartons for This Order Button */}
            <button
              type="button"
              onClick={() => setIsCapacityModalOpen(true)}
              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title={lang === 'en' ? 'Auto generate cartons based on this order demand' : 'এই অর্ডারের ডিমান্ড ও কার্টন সাইজ অনুযায়ী স্বয়ংক্রিয়ভাবে কার্টন প্রস্তুত করুন'}
            >
              <Sparkles className="w-3.5 h-3.5 text-neutral-300" />
              <span>{lang === 'en' ? 'Auto-Generate Cartons' : 'অটো-কার্টন জেনারেট'}</span>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* AUTO GENERATE CARTONS MODAL */}
      {!isPrintPreview && isCapacityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-gradient-to-r from-slate-900 to-neutral-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-neutral-300" />
                <h3 className="font-bold text-sm">
                  {lang === 'en' ? 'Auto-Generate Order Cartons' : 'অর্ডারের কার্টন স্বয়ংক্রিয়ভাবে তৈরি'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCapacityModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-md cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700">
              <div className="bg-neutral-100/70 p-3 rounded-xl border border-neutral-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'en' ? 'Buyer & PO:' : 'বায়ার ও পিও:'}</span>
                  <span className="font-bold text-slate-900">{sheetData.buyer} ({sheetData.ref})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'en' ? 'Item / Spec:' : 'আইটেম ও স্পেক:'}</span>
                  <span className="font-medium text-slate-800">{sheetData.customItemName || 'Elastic'} • {sheetData.color} ({sheetData.size})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'en' ? 'Total Demand:' : 'অর্ডারের মোট চাহিদা:'}</span>
                  <span className="font-mono font-bold text-neutral-800">
                    {Number(activeScheduleItem?.demandQty || 1000).toLocaleString()} {activeScheduleItem?.unit || (isPcsMode ? 'Pcs' : 'Mtr')}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800">
                  {lang === 'en' ? 'Carton Capacity (Units per Carton Box):' : 'কার্টন ক্যাপাসিটি (প্রতি বক্সে পরিমাণ):'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={customCapacityInput}
                    onChange={e => setCustomCapacityInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    placeholder="e.g. 500"
                  />
                  <span className="text-slate-500 font-bold shrink-0">
                    {activeScheduleItem?.unit || (isPcsMode ? 'Pcs/ctn' : 'Mtr/ctn')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {lang === 'en'
                    ? `Estimated total boxes: ${Math.max(1, Math.ceil(Number(activeScheduleItem?.demandQty || 1000) / (parseInt(customCapacityInput, 10) || 500)))} cartons`
                    : `হিসাব অনুযায়ী মোট বক্স তৈরি হবে: ${Math.max(1, Math.ceil(Number(activeScheduleItem?.demandQty || 1000) / (parseInt(customCapacityInput, 10) || 500)))} টি কার্টন`}
                </p>
              </div>

              <div className="bg-neutral-100 p-2.5 rounded-lg border border-neutral-200 text-neutral-900 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-neutral-800 shrink-0" />
                <span>
                  {lang === 'en'
                    ? 'This will auto-generate carton #1 to #N with calculated net and gross weights, saved directly to this order.'
                    : 'এটি এই অর্ডারের নিজস্ব বায়ার ও পিও দিয়ে ১ থেকে N পর্যন্ত সঠিক ওজনের কার্টন তৈরি করে ক্লাউডে সেভ করবে।'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCapacityModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                {lang === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                type="button"
                onClick={handleExecuteAutoGenerateCartons}
                className="px-4 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-neutral-200" />
                <span>{lang === 'en' ? 'Generate & Save' : 'তৈরি ও সেভ করুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Streamlined Sticker Action Bar */}
      {!isPrintPreview && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs print:hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 text-neutral-800 border border-neutral-200 flex items-center justify-center font-bold text-sm shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {lang === 'en' ? 'Carton Sticker Labels Preview' : '🏷️ কার্টন স্টিকার প্রিভিউ'}
                </h3>
                <span className="text-xs bg-neutral-100 text-neutral-800 font-mono font-bold px-2.5 py-0.5 rounded-full shrink-0">
                  {activeCartons.length} {lang === 'en' ? 'Labels' : 'টি লেবেল'}
                </span>
                <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                  {currentItemConfig.name} ({isPcsMode ? 'Pcs' : 'Mtr'})
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {lang === 'en'
                  ? `Format: ${activePaperDef.name} · ${densityMode === 'compact' ? 'Compact Density' : 'Comfort Density'}`
                  : `প্রিন্ট ফরম্যাট: ${activePaperDef.name} · ${densityMode === 'compact' ? 'কমপ্যাক্ট' : 'কমফোর্ট'}`}
              </p>
            </div>
          </div>

          {/* 3 Core Action Buttons: Print All, Image Download, Customize */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap shrink-0">
            {/* 1. Print All */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow transition cursor-pointer"
              title={lang === 'en' ? 'Print all carton labels' : 'সবগুলো স্টিকার প্রিন্ট করুন'}
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'en' ? 'Print All' : 'সব প্রিন্ট'}</span>
            </button>

            {/* 2. Image Download */}
            <button
              type="button"
              onClick={handleExportAllAsImages}
              disabled={isExportingAll || activeCartons.length === 0}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer ${
                isExportingAll
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              title={lang === 'en' ? 'Download all sticker images' : 'স্টিকার ইমেজ ডাউনলোড করুন'}
            >
              <Download className="w-4 h-4 text-neutral-800" />
              <span>
                {isExportingAll 
                  ? (lang === 'en' ? 'Exporting...' : 'ডাউনলোড হচ্ছে...') 
                  : (lang === 'en' ? 'Image Download' : 'ইমেজ ডাউনলোড')}
              </span>
            </button>

            {/* 3. Customize & Settings */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
              title={lang === 'en' ? 'Sticker paper, style, specs & carton customize' : 'পেপার, স্টাইল, স্পেক্স ও সেটিংস কাস্টমাইজ করুন'}
            >
              <SlidersHorizontal className="w-4 h-4 text-neutral-300" />
              <span>{lang === 'en' ? 'Customize' : '⚙️ কাস্টমাইজ'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Full-Page Sticker Preview Mode (Always visible when printing, visible on screen when showPreview is true or in print preview) */}
      <div className={isPrintPreview || showPreview ? 'block space-y-6 print:space-y-0' : 'hidden print:block print:space-y-0'}>
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
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Table className="w-4 h-4" />
              <span>{lang === 'en' ? 'Open List Data Entry Mode' : 'লিস্ট ডাটা এন্ট্রি মোড খুলুন'}</span>
            </button>
          </div>
        ) : (
          <>

            {cartonPages.map((pageCartons, pageIdx) => {
            const isLastPage = pageIdx === cartonPages.length - 1;
            const isSingleCard = pageCartons.length === 1 && shouldBreakPerLabel;

            return (
              <React.Fragment key={`page-group-${pageIdx}`}>
                {/* Visual Page Break Marker in Preview */}
                {!isPrintPreview && bulkConfig.showPageBreakVisuals && cartonPages.length > 1 && (
                  <div className="my-4 flex items-center gap-2 print:hidden select-none">
                    <div className="h-px bg-neutral-200 flex-1 border-b border-dashed border-neutral-300" />
                    <span className="text-[11px] font-mono font-bold bg-neutral-100 text-neutral-900 border border-neutral-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                      <FileText className="w-3.5 h-3.5 text-neutral-800" />
                      {isRollPaper ? (
                        <span>Roll Label #{pageIdx + 1} of {cartonPages.length} · [1 Label / Page Break]</span>
                      ) : (
                        <span>Page {pageIdx + 1} of {cartonPages.length} ({pageCartons.length} labels) · [{activePaperDef.name.split(' ')[0]} Page Break]</span>
                      )}
                    </span>
                    <div className="h-px bg-neutral-200 flex-1 border-b border-dashed border-neutral-300" />
                  </div>
                )}

                {/* Printable Page Grid / A4 Sheet Container */}
                <div 
                  className={isPrintPreview ? "a4-sheet-preview-card bg-white shadow-lg p-5 sm:p-7 mb-8 border border-slate-300 ring-1 ring-slate-200 print:shadow-none print:border-none print:p-0 print:m-0" : ""}
                >
                  {isPrintPreview && (
                    <div className="print:hidden pb-3 mb-4 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-neutral-800" />
                        <span>{lang === 'en' ? 'A4 Sheet' : 'A4 শিট'} {pageIdx + 1} / {cartonPages.length}</span>
                      </span>
                      <span className="bg-neutral-100 text-neutral-800 font-bold px-2.5 py-0.5 rounded-full text-[11px] border border-neutral-200">
                        {pageCartons.length} {lang === 'en' ? 'Labels (2×2 Grid)' : 'টি স্টিকার (২×২ গ্রিড)'} · #{pageCartons[0]?.cartonNo} - #{pageCartons[pageCartons.length - 1]?.cartonNo}
                      </span>
                    </div>
                  )}

                  <div 
                    className={`grid ${isPrintPreview ? 'grid-cols-2' : activePaperDef.gridColsClass} gap-4 print:gap-4 ${
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
                      ? 'opacity-35 ring-2 ring-dashed ring-neutral-400 scale-[0.98] shadow-inner'
                      : isDropTarget
                        ? (dragOverPosition === 'before'
                            ? 'ring-2 ring-neutral-400 bg-neutral-100/30 border-l-4 border-l-indigo-600 shadow-md'
                            : 'ring-2 ring-neutral-400 bg-neutral-100/30 border-r-4 border-r-indigo-600 shadow-md')
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
                  {!isPrintPreview && (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        handleDragStart(e, c.id);
                      }}
                      className="absolute top-2 left-2 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity print:hidden z-10 bg-slate-900/80 hover:bg-neutral-800 text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-grab active:cursor-grabbing shadow-sm select-none"
                      title={lang === 'en' ? 'Drag to change print sequence' : 'প্রিন্ট সিকোয়েন্স পরিবর্তন করতে ড্র্যাগ করুন'}
                    >
                      <GripVertical className="w-3 h-3 text-slate-300" />
                      <span>#{c.cartonNo}</span>
                    </div>
                  )}

                  {/* Sequence Movement & Export Overlay Controls (Visible on mobile and hover on desktop) */}
                  {!isPrintPreview && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-90 sm:hover:opacity-100 transition-opacity print:hidden z-10 bg-white/95 backdrop-blur-xs p-1 rounded-lg shadow-md border border-slate-200 sticker-overlay-control">
                      <button
                        type="button"
                        onClick={() => handleDownloadSticker(c.id, c.cartonNo)}
                        className="flex items-center gap-1 px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-bold rounded shadow-xs transition cursor-pointer"
                        title={lang === 'en' ? 'Download Carton Sticker Image (PNG)' : 'এই কার্টনের স্টিকার ইমেজ ডাউনলোড করুন'}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{lang === 'en' ? 'Image' : 'ইমেজ'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareSticker(c.id, c.cartonNo)}
                        className="p-1 bg-neutral-100 hover:bg-neutral-800 text-neutral-800 hover:text-white rounded transition cursor-pointer border border-neutral-200"
                        title={lang === 'en' ? 'Share as Image' : 'শেয়ার করুন'}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex items-center bg-slate-100 rounded border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleMoveCarton(c.id, 'up')}
                          className="p-1 hover:bg-neutral-800 hover:text-white text-slate-700 rounded-l transition cursor-pointer"
                          title={lang === 'en' ? 'Move earlier in sequence' : 'সিকোয়েন্সে আগে নিন'}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveCarton(c.id, 'down')}
                          className="p-1 hover:bg-neutral-800 hover:text-white text-slate-700 rounded-r transition cursor-pointer"
                          title={lang === 'en' ? 'Move later in sequence' : 'সিকোয়েন্সে পরে নিন'}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
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
                        <div className="flex items-center justify-between bg-neutral-100/80 px-2 py-0.5 border border-neutral-300 rounded-sm">
                          <span className="text-[9px] font-black text-neutral-900 uppercase tracking-wide">QUANTITY:</span>
                          <span className="font-mono font-black text-neutral-900 text-xs sm:text-sm">
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
                                        row.item1.highlight ? 'text-neutral-900 font-black' : 'text-slate-900'
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
                                          row.item2.highlight ? 'text-neutral-900 font-black' : 'text-slate-900'
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
                            text={sheetData.customItemName || activeScheduleItem?.itemDescription || (currentItemKey === 'elastic' ? '🧵 ELASTIC' : '🏷️ WEBBING TAPE')}
                            maxFontSize={isCompact ? 10 : 11}
                            minFontSize={6.5}
                            enabled={stickerSettings.autoScaleLongText !== false}
                            className="font-bold text-slate-900"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] font-bold text-slate-500 uppercase block">SIZE / COLOR:</span>
                          <AutoFitText
                            text={`${c.size || sheetData.size || activeScheduleItem?.size || 'Standard'} | ${c.color || sheetData.color || activeScheduleItem?.color || 'Standard'}`}
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
                                <div className="flex items-center justify-between bg-neutral-100/70 px-1.5 py-0.5 rounded border border-neutral-200 min-w-0 gap-1">
                                  <span className="text-[7.5px] font-bold text-neutral-900 uppercase tracking-tight shrink-0">
                                    {row.item1.label}
                                  </span>
                                  <div className="min-w-0 flex-1 flex justify-end">
                                    <AutoFitText
                                      text={row.item1.value}
                                      maxFontSize={9}
                                      minFontSize={6.5}
                                      align="right"
                                      enabled={stickerSettings.autoScaleLongText !== false}
                                      className="font-black text-neutral-900"
                                    />
                                  </div>
                                </div>
                                {row.item2 && (
                                  <div className="flex items-center justify-between bg-neutral-100/70 px-1.5 py-0.5 rounded border border-neutral-200 min-w-0 gap-1">
                                    <span className="text-[7.5px] font-bold text-neutral-900 uppercase tracking-tight shrink-0">
                                      {row.item2.label}
                                    </span>
                                    <div className="min-w-0 flex-1 flex justify-end">
                                      <AutoFitText
                                        text={row.item2.value}
                                        maxFontSize={9}
                                        minFontSize={6.5}
                                        align="right"
                                        enabled={stickerSettings.autoScaleLongText !== false}
                                        className="font-black text-neutral-900"
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
                          <span className={`font-black text-neutral-900 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
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
                            <span className={`font-black text-neutral-900 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
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
                        className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-300 rounded cursor-pointer hover:border-neutral-400 transition group/qr shrink-0"
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
                            <span className="text-[8px] font-black uppercase text-neutral-800 flex items-center gap-0.5">
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
                </div>
              </React.Fragment>
            );
          })}
        </>
      )}
      </div>

      {/* List-Based Settings & Data Entry Mode */}
      {!isPrintPreview && !showPreview && (
        <div className="space-y-4 print:hidden">
          {/* Sticker Settings & Print Parameters List Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all">
            {/* Settings List Header */}
            <div className="p-3.5 bg-gradient-to-r from-slate-50 via-neutral-100/30 to-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-800">
                      {lang === 'en' ? 'Sticker Settings & Print Parameters List' : 'স্টিকার সেটিংস ও প্রিন্ট প্যারামিটার লিস্ট'}
                    </h4>
                    <span className="text-[10px] bg-neutral-100 text-neutral-800 font-mono px-2 py-0.5 rounded-full font-bold">
                      {STICKER_PAPER_SIZES[bulkConfig.paperSize]?.name.split(' ')[0] || 'A4'} • {FONT_FAMILY_STYLES[stickerSettings.fontFamily]?.name || 'Standard'}
                    </span>
                    <span className="text-[10px] bg-neutral-100 text-neutral-900 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3 text-neutral-800" />
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
                  className="px-2.5 py-1.5 bg-gradient-to-r from-neutral-900 to-neutral-900 hover:from-neutral-800 hover:to-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Palette className="w-3.5 h-3.5 text-neutral-300" />
                  <span>{lang === 'en' ? 'Customize in Studio' : 'স্টুডিওতে এডিট'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  title="Switch to Rendered Labels Visual Grid Preview"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-neutral-200" />
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
                    <span className="flex items-center gap-1.5 text-neutral-900">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-800" />
                      {lang === 'en' ? 'Paper & Geometry' : 'পেপার ও ডাইমেনশন'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsBulkPanelOpen(true)}
                      className="text-neutral-800 hover:text-neutral-900 text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer"
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
                      <span className="font-semibold text-neutral-800">
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
                    <span className="flex items-center gap-1.5 text-neutral-900">
                      <Type className="w-3.5 h-3.5 text-neutral-800" />
                      {lang === 'en' ? 'Typography & Scale' : 'টাইপোগ্রাফি ও স্কেল'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(true)}
                      className="text-neutral-800 hover:text-neutral-900 text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer"
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
                            ? 'bg-neutral-100 text-neutral-900'
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
                              ? 'bg-white text-neutral-800 shadow-2xs'
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
                              ? 'bg-white text-neutral-800 shadow-2xs'
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
                            ? 'bg-neutral-100 text-neutral-900'
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
                    <span className="flex items-center gap-1.5 text-neutral-900">
                      <Palette className="w-3.5 h-3.5 text-neutral-800" />
                      {lang === 'en' ? 'Branding & Borders' : 'ব্র্যান্ডিং ও বর্ডার'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(true)}
                      className="text-neutral-800 hover:text-neutral-900 text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer"
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
                        stickerSettings.logoUrl ? 'bg-neutral-100 text-neutral-900 font-bold' : 'bg-slate-200 text-slate-600'
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
                    <span className="flex items-center gap-1.5 text-neutral-900">
                      <QrCode className="w-3.5 h-3.5 text-neutral-800" />
                      {lang === 'en' ? 'Barcodes & QR' : 'বারকোড ও কিউআর'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQrCode(!showQrCode)}
                      className="text-neutral-800 hover:text-neutral-900 text-[10px] font-semibold cursor-pointer"
                    >
                      {showQrCode ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="space-y-1 text-slate-600 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Dynamic QR Code:</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        showQrCode ? 'bg-neutral-100 text-neutral-900' : 'bg-slate-200 text-slate-600'
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
                    <span className="flex items-center gap-1.5 text-neutral-900">
                      <Package className="w-3.5 h-3.5 text-neutral-800" />
                      {lang === 'en' ? 'Item Specs & Units' : 'আইটেম স্পেকস ও ইউনিট'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSpecsDrawerOpen(true)}
                      className="text-neutral-800 hover:text-neutral-900 text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer"
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
                      <span className="font-semibold text-neutral-800">{isPcsMode ? 'Pieces (pcs)' : 'Meters (mtr)'}</span>
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
                <Table className="w-4 h-4 text-neutral-800" />
                <span>{lang === 'en' ? 'Carton Content Table' : 'কার্টন কনটেন্ট টেবিল'}</span>
              </span>

              {/* Status Filter Tabs */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                    statusFilter === 'all' ? 'bg-white text-neutral-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'en' ? 'All' : 'সব'} ({sheetData.cartons.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('with-weight')}
                  className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                    statusFilter === 'with-weight' ? 'bg-white text-neutral-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'en' ? 'Active' : 'সক্রিয়'} ({activeCartons.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('zero-weight')}
                  className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                    statusFilter === 'zero-weight' ? 'bg-white text-neutral-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
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
                  className="pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg w-44 focus:w-56 transition-all focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Add Single Carton */}
              <button
                type="button"
                onClick={handleAddNewCarton}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
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
                    ? 'bg-neutral-100 border-neutral-200 text-neutral-800'
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
                              ? 'bg-neutral-100/70 ring-1 ring-inset ring-neutral-300'
                              : 'hover:bg-slate-50/80'
                          } ${
                            isBeingDragged ? 'opacity-35 bg-neutral-100/50' : ''
                          } ${
                            isDropTarget
                              ? (dragOverPosition === 'before' ? 'border-t-2 border-t-indigo-600 bg-neutral-100/50' : 'border-b-2 border-b-indigo-600 bg-neutral-100/50')
                              : ''
                          }`}
                        >
                          {/* Drag Handle Column */}
                          <td 
                            className="py-2 px-1 text-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-neutral-800 select-none" 
                            title={lang === 'en' ? 'Drag to change print sequence' : 'ড্র্যাগ করে ক্রম পরিবর্তন করুন'} 
                            onClick={e => e.stopPropagation()}
                          >
                            <GripVertical className="w-4 h-4 mx-auto" />
                          </td>

                          {/* CTN # */}
                          <td className="py-2 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold ${
                                isSelected ? 'bg-neutral-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {c.cartonNo}
                              </span>
                              {isSelected && (
                                <span className="text-[10px] text-neutral-800 font-bold hidden sm:inline">Active</span>
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
                                className="w-24 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400"
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
                                className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-slate-700 text-xs focus:ring-1 focus:ring-neutral-400"
                              />
                              <span className="text-[10px] text-slate-400 ml-1">{wUnit}</span>
                            </div>
                          </td>

                          {/* Net Wt Badge */}
                          <td className="py-2 px-3 whitespace-nowrap font-mono">
                            {c.netWt > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-neutral-900 border border-neutral-200 font-bold text-xs">
                                <Check className="w-3 h-3 text-neutral-800" />
                                {c.netWt.toFixed(2)} kg
                              </span>
                            ) : isInvalidNet ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200 font-bold text-[11px]" title="Gross weight is less than or equal to Tare">
                                <AlertCircle className="w-3 h-3 text-neutral-700" />
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
                                <span className="font-bold text-neutral-900 font-mono text-xs">
                                  {calculatedQty.toLocaleString()} Pcs
                                </span>
                                {c.pkts !== undefined && (
                                  <span className="text-[10px] text-neutral-800 font-mono block">
                                    {c.pkts} Pkt
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="font-bold text-neutral-900 font-mono text-xs">
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
                                className="w-18 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-slate-700 text-xs focus:ring-1 focus:ring-neutral-400"
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
                              className="w-28 sm:w-36 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:ring-1 focus:ring-neutral-400"
                            />
                          </td>

                          {/* Actions */}
                          <td className="py-2 px-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleMoveCarton(c.id, 'up')}
                                className="p-1.5 bg-slate-100 hover:bg-neutral-100 hover:text-neutral-800 text-slate-700 rounded transition cursor-pointer"
                                title={lang === 'en' ? 'Move earlier in sequence' : 'আগে নিন'}
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveCarton(c.id, 'down')}
                                className="p-1.5 bg-slate-100 hover:bg-neutral-100 hover:text-neutral-800 text-slate-700 rounded transition cursor-pointer"
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
                                    ? 'bg-neutral-900 text-white'
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
                                className="p-1.5 bg-neutral-100 hover:bg-neutral-100 text-neutral-800 rounded transition cursor-pointer"
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
                    Net Wt: <strong className="font-mono text-neutral-800">{summary.totalNetWt.toFixed(2)} {wUnit}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    {isPcsMode ? (
                      <>Total: <strong className="font-mono text-neutral-900">{summary.totalQtyPcs?.toLocaleString() || 0} Pcs</strong></>
                    ) : (
                      <>Total: <strong className="font-mono text-neutral-900">{summary.totalMtr.toFixed(2)} Mtr</strong></>
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddNewCarton}
                  className="text-neutral-800 hover:text-neutral-800 font-bold flex items-center gap-1 cursor-pointer"
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
                    <Tag className="w-4 h-4 text-neutral-800" />
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
                              <div className="flex items-center justify-between bg-neutral-100/80 px-2 py-0.5 border border-neutral-300 rounded-sm">
                                <span className="text-[9px] font-black text-neutral-900 uppercase tracking-wide">QUANTITY:</span>
                                <span className="font-mono font-black text-neutral-900 text-xs sm:text-sm">
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
                                              row.item1.highlight ? 'text-neutral-900 font-black' : 'text-slate-900'
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
                                                row.item2.highlight ? 'text-neutral-900 font-black' : 'text-slate-900'
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
                                  text={sheetData.customItemName || activeScheduleItem?.itemDescription || (currentItemKey === 'elastic' ? '🧵 ELASTIC' : '🏷️ WEBBING TAPE')}
                                  maxFontSize={isCompact ? 10 : 11}
                                  minFontSize={6.5}
                                  enabled={stickerSettings.autoScaleLongText !== false}
                                  className="font-bold text-slate-900"
                                />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[8px] font-bold text-slate-500 uppercase block">SIZE / COLOR:</span>
                                <AutoFitText
                                  text={`${c.size || sheetData.size || activeScheduleItem?.size || 'Standard'} | ${c.color || sheetData.color || activeScheduleItem?.color || 'Standard'}`}
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
                                      <div className="flex items-center justify-between bg-neutral-100/70 px-1.5 py-0.5 rounded border border-neutral-200 min-w-0 gap-1">
                                        <span className="text-[7.5px] font-bold text-neutral-900 uppercase tracking-tight shrink-0">
                                          {row.item1.label}
                                        </span>
                                        <div className="min-w-0 flex-1 flex justify-end">
                                          <AutoFitText
                                            text={row.item1.value}
                                            maxFontSize={9}
                                            minFontSize={6.5}
                                            align="right"
                                            enabled={stickerSettings.autoScaleLongText !== false}
                                            className="font-black text-neutral-900"
                                          />
                                        </div>
                                      </div>
                                      {row.item2 && (
                                        <div className="flex items-center justify-between bg-neutral-100/70 px-1.5 py-0.5 rounded border border-neutral-200 min-w-0 gap-1">
                                          <span className="text-[7.5px] font-bold text-neutral-900 uppercase tracking-tight shrink-0">
                                            {row.item2.label}
                                          </span>
                                          <div className="min-w-0 flex-1 flex justify-end">
                                            <AutoFitText
                                              text={row.item2.value}
                                              maxFontSize={9}
                                              minFontSize={6.5}
                                              align="right"
                                              enabled={stickerSettings.autoScaleLongText !== false}
                                              className="font-black text-neutral-900"
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
                                <span className={`font-black text-neutral-900 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
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
                                  <span className={`font-black text-neutral-900 ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
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
                              className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-300 rounded cursor-pointer hover:border-neutral-400 transition group/qr shrink-0"
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
                    className="text-xs font-bold text-neutral-800 hover:text-neutral-800 flex items-center gap-1 cursor-pointer"
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

      {/* Comprehensive Categorized Customization Modal */}
      {!isPrintPreview && (
        <StickerCustomizationModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={stickerSettings}
          onUpdateSettings={handleUpdateSettings}
          bulkConfig={bulkConfig}
          onUpdateBulkConfig={handleUpdateBulkConfig}
          sheetData={sheetData}
          onUpdateHeader={onUpdateHeader}
          lang={lang}
          densityMode={densityMode}
          setDensityMode={setDensityMode}
          showCropMarks={showCropMarks}
          setShowCropMarks={setShowCropMarks}
          showQrCode={showQrCode}
          setShowQrCode={setShowQrCode}
          qrSize={qrSize}
          setQrSize={setQrSize}
          onSortCartons={handleSortCartons}
          onOpenCapacityModal={() => setIsCapacityModalOpen(true)}
          totalLabelsCount={activeCartons.length}
        />
      )}

      {/* Floating Reorder Notification Toast */}
      {!isPrintPreview && reorderNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-neutral-700 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 print:hidden">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <ArrowUpDown className="w-4 h-4 text-white" />
          <span>{reorderNotice}</span>
        </div>
      )}
    </div>
  );
};

export default StickerLabelsView;
