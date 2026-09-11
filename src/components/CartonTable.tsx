import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CartonRow, PackingSheetData } from '../types/calculator';
import { ElasticDemand } from '../types/elasticDemand';
import { Language, translations } from '../utils/translations';
import { calculateSummary, parseRawWeightData } from '../utils/calc';
import { QuickFillModal, QuickFillPreset } from './QuickFillModal';
import { PasteWeightsModal } from './PasteWeightsModal';
import { CartonTableRow } from './CartonTableRow';
import { CartonMobileCard } from './CartonMobileCard';
import { OrderHeaderForm } from './OrderHeaderForm';
import { 
  DemandComplianceReport, 
  analyzeCartonDeviations, 
  findMatchingDemand, 
  CartonDeviation 
} from '../utils/deviationDetector';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Sparkles, 
  Layers, 
  ArrowUpDown,
  Calculator,
  ChevronDown,
  AlertTriangle,
  QrCode,
  Command,
  CornerDownLeft,
  Keyboard,
  CheckSquare,
  Square,
  MinusSquare,
  Sliders,
  Check,
  CheckCheck,
  RotateCcw,
  X,
  Edit3,
  Scale,
  Hash,
  FileText,
  Filter,
  Search,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  BookmarkCheck,
  Zap,
  Info,
  LocateFixed,
  Ruler,
  Compass,
  Package,
  ClipboardPaste,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  ArrowLeft,
  Camera
} from 'lucide-react';
import { ScheduleItem } from '../types/schedule';

const ACTIVE_ROW_STORAGE_KEY = 'garment_elastic_active_carton_id';

interface CartonTableProps {
  sheetData: PackingSheetData;
  onUpdateCarton: (id: string, updated: Partial<CartonRow>) => void;
  onBatchUpdateCartons?: (ids: string[], updated: Partial<CartonRow>) => void;
  onBatchDeleteCartons?: (ids: string[]) => void;
  onBatchDuplicateCartons?: (ids: string[]) => void;
  onAddCarton: () => void;
  onAddBulk: (count: number) => void;
  onDeleteCarton: (id: string) => void;
  onDuplicateCarton: (carton: CartonRow) => void;
  onClearEmpty: () => void;
  onOpenCartonQr?: (carton: CartonRow) => void;
  onOpenAiPhotoScanner?: () => void;
  onBulkPasteWeights?: (
    weights: number[],
    mode?: 'append' | 'replace' | 'fromIndex',
    startIndex?: number,
    customTare?: number,
    customUnitWt?: number
  ) => void;
  lang: Language;
  demands?: ElasticDemand[];
  activeDemandId?: string;
  onSelectDemand?: (demand: ElasticDemand | null) => void;
  activeScheduleItem?: ScheduleItem | null;
  onCompletePackingAndReturn?: (packedTotalQty?: number) => void;
  onReturnToPreviousTab?: () => void;
  onUpdateHeader?: (updated: Partial<PackingSheetData>) => void;
  onApplyDefaultWeights?: () => void;
  onOpenDemandsView?: () => void;
}

export const CartonTable: React.FC<CartonTableProps> = ({
  sheetData,
  onUpdateCarton,
  onBatchUpdateCartons,
  onBatchDeleteCartons,
  onBatchDuplicateCartons,
  onAddCarton,
  onAddBulk,
  onDeleteCarton,
  onDuplicateCarton,
  onClearEmpty,
  onOpenCartonQr,
  onOpenAiPhotoScanner,
  onBulkPasteWeights,
  lang,
  demands = [],
  activeDemandId,
  onSelectDemand,
  activeScheduleItem,
  onCompletePackingAndReturn,
  onReturnToPreviousTab,
  onUpdateHeader,
  onApplyDefaultWeights,
  onOpenDemandsView,
}) => {
  const t = translations[lang]; const wUnit = sheetData.weightUnit === "gm" ? "Gm" : "Kg";
  const [bulkCount, setBulkCount] = useState(5);
  const [groupBy, setGroupBy] = useState<'none' | 'color' | 'size'>('none');
  
  // Persisted Active Editing Row State (stored across reloads, focus mode, and tab switches)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_ROW_STORAGE_KEY);
      if (saved && sheetData.cartons.some(c => c.id === saved)) {
        return saved;
      }
    } catch {
      // Ignore localStorage errors
    }
    return sheetData.cartons[0]?.id || null;
  });

  // Sync selectedRowId to localStorage
  useEffect(() => {
    if (selectedRowId) {
      try {
        localStorage.setItem(ACTIVE_ROW_STORAGE_KEY, selectedRowId);
      } catch {
        // Ignore
      }
    }
  }, [selectedRowId]);

  // Row element references for smooth scrolling & locating
  const rowRefs = useRef<{ [id: string]: HTMLTableRowElement | null }>({});
  const grossInputRefs = useRef<{ [id: string]: HTMLInputElement | null }>({});

  const registerRowRef = useCallback((id: string, el: HTMLTableRowElement | null) => {
    rowRefs.current[id] = el;
  }, []);

  const registerGrossInputRef = useCallback((id: string, el: HTMLInputElement | null) => {
    grossInputRefs.current[id] = el;
  }, []);

  const scrollToActiveRow = useCallback((id?: string) => {
    const targetId = id || selectedRowId;
    if (!targetId) return;
    const rowEl = rowRefs.current[targetId];
    if (rowEl) {
      rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedRowId]);

  // Elastic Demand Benchmark & Deviation State
  const [selectedDemandIdState, setSelectedDemandIdState] = useState<string | null>(activeDemandId || null);
  const [tolerancePercent, setTolerancePercent] = useState<number>(5);
  const [filterOnlyDeviations, setFilterOnlyDeviations] = useState<boolean>(false);
  const [inspectedCartonId, setInspectedCartonId] = useState<string | null>(null);

  // Direct Clipboard Raw Weight Paste Modal & Notification States
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [initialPasteText, setInitialPasteText] = useState<string>('');
  const [pastedSuccessToast, setPastedSuccessToast] = useState<string | null>(null);

  const handleOpenPasteModal = (prefill = '') => {
    setInitialPasteText(prefill);
    setIsPasteModalOpen(true);
  };

  const handleApplyPasteFromModal = (
    weights: number[],
    mode: 'append' | 'replace' | 'fromIndex',
    startIndex: number,
    customTare?: number,
    customUnitWt?: number
  ) => {
    if (onBulkPasteWeights) {
      onBulkPasteWeights(weights, mode, startIndex, customTare, customUnitWt);
    } else {
      if (mode === 'replace') {
        weights.forEach((grossWt, idx) => {
          const target = sheetData.cartons[idx];
          if (target) {
            onUpdateCarton(target.id, {
              grossWt,
              ...(customTare !== undefined ? { tareWt: customTare } : {}),
              ...(customUnitWt !== undefined ? { wtPerUnit: customUnitWt } : {}),
            });
          }
        });
      } else if (mode === 'fromIndex') {
        weights.forEach((grossWt, idx) => {
          const target = sheetData.cartons[startIndex + idx];
          if (target) {
            onUpdateCarton(target.id, {
              grossWt,
              ...(customTare !== undefined ? { tareWt: customTare } : {}),
              ...(customUnitWt !== undefined ? { wtPerUnit: customUnitWt } : {}),
            });
          }
        });
      }
    }
    setIsPasteModalOpen(false);
    setPastedSuccessToast(
      lang === 'en'
        ? `Successfully pasted ${weights.length} carton weights!`
        : `${weights.length} টি কার্টন ওজন সফলভাবে পেস্ট হয়েছে!`
    );
    setTimeout(() => setPastedSuccessToast(null), 3500);
  };

  // Grand Total Summary computed live for the table
  const tableSummary = useMemo(() => calculateSummary(sheetData.cartons), [sheetData.cartons]);

  // Sync selected demand with prop or auto-match
  const activeDemand = useMemo(
    () => findMatchingDemand(sheetData, demands, selectedDemandIdState),
    [sheetData, demands, selectedDemandIdState]
  );

  // Run deviation detector against active demand
  const complianceReport: DemandComplianceReport = useMemo(
    () => analyzeCartonDeviations(sheetData, activeDemand, {
      unitWeightTolerancePercent: tolerancePercent,
    }),
    [sheetData, activeDemand, tolerancePercent]
  );

  // Batch Weight Average & Deviation Analysis
  const [weightDevThresholdPercent, setWeightDevThresholdPercent] = useState<number>(10);

  const { activeCartonCount, batchAvgGrossWt, batchAvgNetWt, weightDeviatingCartons } = useMemo(() => {
    const activeCartonsForWeight = sheetData.cartons.filter(c => c.grossWt > 0 || c.netWt > 0);
    const count = activeCartonsForWeight.length;
    const totalBatchGross = activeCartonsForWeight.reduce((sum, c) => sum + c.grossWt, 0);
    const totalBatchNet = activeCartonsForWeight.reduce((sum, c) => sum + c.netWt, 0);
    const avgGross = count > 0 ? totalBatchGross / count : 0;
    const avgNet = count > 0 ? totalBatchNet / count : 0;

    const deviating = activeCartonsForWeight.filter(c => {
      if (avgGross <= 0 || c.grossWt <= 0) return false;
      const devP = Math.abs(((c.grossWt - avgGross) / avgGross) * 100);
      return devP >= weightDevThresholdPercent;
    });

    return {
      activeCartonCount: count,
      batchAvgGrossWt: avgGross,
      batchAvgNetWt: avgNet,
      weightDeviatingCartons: deviating,
    };
  }, [sheetData.cartons, weightDevThresholdPercent]);

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Quick Inline Converter State
  const [converterState, setConverterState] = useState<{ id: string, mode: 'yds' | 'mtr' | 'lb', value: string } | null>(null);

  const applyConversion = () => {
    if (!converterState) return;
    const carton = sheetData.cartons.find(c => c.id === converterState.id);
    const num = parseFloat(converterState.value);

    if (!isNaN(num) && carton) {
      let newGross = 0;
      if (converterState.mode === 'lb') {
        newGross = num * 0.453592;
      } else if (converterState.mode === 'yds') {
        const mtr = num / 1.09361;
        const net = (mtr * carton.wtPerUnit) / 1000;
        newGross = net + carton.tareWt;
      } else if (converterState.mode === 'mtr') {
        const net = (num * carton.wtPerUnit) / 1000;
        newGross = net + carton.tareWt;
      }
      onUpdateCarton(carton.id, { grossWt: parseFloat(newGross.toFixed(2)) });
    }

    const focusId = converterState.id;
    setConverterState(null);
    setTimeout(() => {
      if (grossInputRefs.current[focusId]) {
        grossInputRefs.current[focusId]?.focus();
      }
    }, 10);
  };

  const startConversion = (id: string, mode: 'yds' | 'mtr' | 'lb') => {
    setConverterState({ id, mode, value: '' });
    setSelectedRowId(id);
  };

  // Batch Editing Inputs
  const [batchTare, setBatchTare] = useState<string>(sheetData.defaultTare.toString());
  const [isQuickFillOpen, setIsQuickFillOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [batchWtPerUnit, setBatchWtPerUnit] = useState<string>(sheetData.defaultWtPerUnit.toString());
  const [batchGross, setBatchGross] = useState<string>('');
  const [batchNotes, setBatchNotes] = useState<string>('');
  const [activeBatchField, setActiveBatchField] = useState<'tare' | 'wtPerUnit' | 'gross' | 'notes' | 'all'>('tare');
  const [batchFeedback, setBatchFeedback] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Sync batch default values when order defaults change
  useEffect(() => {
    setBatchTare(sheetData.defaultTare.toString());
    setBatchWtPerUnit(sheetData.defaultWtPerUnit.toString());
  }, [sheetData.defaultTare, sheetData.defaultWtPerUnit]);

  // Clean up selectedIds if rows are deleted
  useEffect(() => {
    setSelectedIds(prev => {
      const validIds = new Set(sheetData.cartons.map(c => c.id));
      const next = new Set<string>();
      prev.forEach(id => {
        if (validIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [sheetData.cartons]);

  // Auto-enable batch mode visual bar if selections are made
  useEffect(() => {
    if (selectedIds.size > 0 && !isBatchMode) {
      setIsBatchMode(true);
    }
  }, [selectedIds.size]);

  // Master Checkbox Ref for Indeterminate state
  const masterCheckboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (masterCheckboxRef.current) {
      const total = sheetData.cartons.length;
      const count = selectedIds.size;
      const allSelected = total > 0 && count === total;
      const someSelected = count > 0 && !allSelected;
      masterCheckboxRef.current.checked = allSelected;
      masterCheckboxRef.current.indeterminate = someSelected;
    }
  }, [selectedIds, sheetData.cartons.length]);

  // Auto-focus after adding a new row
  const shouldFocusNewRow = useRef<boolean>(false);
  const previousCartonsCount = useRef<number>(sheetData.cartons.length);

  // Keep selectedRowId valid if cartons list changes
  useEffect(() => {
    if (sheetData.cartons.length > 0) {
      const exists = sheetData.cartons.some(c => c.id === selectedRowId);
      if (!exists) {
        setSelectedRowId(sheetData.cartons[sheetData.cartons.length - 1]?.id || null);
      }
    } else {
      setSelectedRowId(null);
    }
  }, [sheetData.cartons, selectedRowId]);

  // Handle auto-focusing after adding a new row
  useEffect(() => {
    if (sheetData.cartons.length > previousCartonsCount.current && shouldFocusNewRow.current) {
      const latestCarton = sheetData.cartons[sheetData.cartons.length - 1];
      if (latestCarton) {
        setSelectedRowId(latestCarton.id);
        setTimeout(() => {
          const inputEl = grossInputRefs.current[latestCarton.id];
          if (inputEl) {
            inputEl.focus();
            inputEl.select();
          }
        }, 30);
      }
      shouldFocusNewRow.current = false;
    }
    previousCartonsCount.current = sheetData.cartons.length;
  }, [sheetData.cartons]);

  // Helper for triggering feedback
  const showFeedback = (message: string, type: 'success' | 'info' = 'success') => {
    setBatchFeedback({ message, type });
    setTimeout(() => {
      setBatchFeedback(null);
    }, 4000);
  };

  // Row Selection logic (supports Shift + Click Range Selection)
  const handleToggleRowSelection = (id: string, shiftKey: boolean = false) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (shiftKey && lastSelectedId && lastSelectedId !== id) {
        const lastIdx = sheetData.cartons.findIndex(c => c.id === lastSelectedId);
        const currIdx = sheetData.cartons.findIndex(c => c.id === id);
        if (lastIdx !== -1 && currIdx !== -1) {
          const start = Math.min(lastIdx, currIdx);
          const end = Math.max(lastIdx, currIdx);
          for (let i = start; i <= end; i++) {
            next.add(sheetData.cartons[i].id);
          }
          return next;
        }
      }

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setLastSelectedId(id);
  };

  // Master Checkbox Toggle
  const handleToggleSelectAll = () => {
    if (selectedIds.size === sheetData.cartons.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sheetData.cartons.map(c => c.id)));
    }
  };

  // Quick Selection Helpers
  const selectAll = () => {
    setSelectedIds(new Set(sheetData.cartons.map(c => c.id)));
    showFeedback(
      lang === 'en' 
        ? `Selected all ${sheetData.cartons.length} cartons` 
        : `সকল ${sheetData.cartons.length}টি কার্টন সিলেক্ট করা হয়েছে`, 
      'info'
    );
  };

  const selectNone = () => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  };

  const selectNonEmpty = () => {
    const ids = sheetData.cartons
      .filter(c => c.grossWt > 0 || c.netWt > 0 || c.lengthMtr > 0)
      .map(c => c.id);
    setSelectedIds(new Set(ids));
    showFeedback(
      lang === 'en' 
        ? `Selected ${ids.length} active cartons` 
        : `${ids.length}টি ওজনযুক্ত কার্টন সিলেক্ট করা হয়েছে`, 
      'info'
    );
  };

  const selectEmpty = () => {
    const ids = sheetData.cartons
      .filter(c => c.grossWt === 0 && c.netWt === 0)
      .map(c => c.id);
    setSelectedIds(new Set(ids));
    showFeedback(
      lang === 'en' 
        ? `Selected ${ids.length} empty cartons` 
        : `${ids.length}টি খালি কার্টন সিলেক্ট করা হয়েছে`, 
      'info'
    );
  };

  const selectWithErrors = () => {
    const ids = sheetData.cartons
      .filter(c => (c.grossWt > 0 && c.netWt < 0) || c.netWt < 0)
      .map(c => c.id);
    setSelectedIds(new Set(ids));
    showFeedback(
      lang === 'en' 
        ? `Selected ${ids.length} cartons with errors` 
        : `${ids.length}টি ত্রুটিযুক্ত কার্টন সিলেক্ট করা হয়েছে`, 
      'info'
    );
  };

  const invertSelection = () => {
    setSelectedIds(prev => {
      const next = new Set<string>();
      sheetData.cartons.forEach(c => {
        if (!prev.has(c.id)) {
          next.add(c.id);
        }
      });
      return next;
    });
  };

  // Batch Attribute Apply Handlers
  const handleApplyBatchTare = (customVal?: number) => {
    const val = customVal !== undefined ? customVal : parseFloat(batchTare);
    if (isNaN(val) || val < 0) {
      alert(lang === 'en' ? 'Please enter a valid Tare Weight (>= 0).' : 'সঠিক ট্যার ওজন লিখুন।');
      return;
    }
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (onBatchUpdateCartons) {
      onBatchUpdateCartons(ids, { tareWt: val });
    } else {
      ids.forEach(id => onUpdateCarton(id, { tareWt: val }));
    }

    showFeedback(
      lang === 'en'
        ? `Applied Tare Weight ${val.toFixed(2)} {wUnit} to ${ids.length} selected cartons!`
        : `${ids.length}টি কার্টনে ট্যার ওজন ${val.toFixed(2)} {wUnit} সেট করা হয়েছে!`
    );
  };

  const handleApplyBatchWtPerUnit = (customVal?: number) => {
    const val = customVal !== undefined ? customVal : parseFloat(batchWtPerUnit);
    if (isNaN(val) || val <= 0) {
      alert(lang === 'en' ? 'Please enter a valid Unit Weight (> 0).' : 'সঠিক ইউনিট ওজন লিখুন।');
      return;
    }
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (onBatchUpdateCartons) {
      onBatchUpdateCartons(ids, { wtPerUnit: val });
    } else {
      ids.forEach(id => onUpdateCarton(id, { wtPerUnit: val }));
    }

    showFeedback(
      lang === 'en'
        ? `Applied Unit Weight ${val.toFixed(2)} gm to ${ids.length} selected cartons!`
        : `${ids.length}টি কার্টনে ইউনিট ওজন ${val.toFixed(2)} gm সেট করা হয়েছে!`
    );
  };

  const handleApplyBatchGross = () => {
    const val = parseFloat(batchGross);
    if (isNaN(val) || val < 0) {
      alert(lang === 'en' ? 'Please enter a valid Gross Weight (>= 0).' : 'সঠিক গ্রস ওজন লিখুন।');
      return;
    }
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (onBatchUpdateCartons) {
      onBatchUpdateCartons(ids, { grossWt: val });
    } else {
      ids.forEach(id => onUpdateCarton(id, { grossWt: val }));
    }

    showFeedback(
      lang === 'en'
        ? `Applied Gross Weight ${val.toFixed(2)} {wUnit} to ${ids.length} selected cartons!`
        : `${ids.length}টি কার্টনে গ্রস ওজন ${val.toFixed(2)} {wUnit} সেট করা হয়েছে!`
    );
  };

  const handleApplyBatchNotes = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (onBatchUpdateCartons) {
      onBatchUpdateCartons(ids, { notes: batchNotes });
    } else {
      ids.forEach(id => onUpdateCarton(id, { notes: batchNotes }));
    }

    showFeedback(
      lang === 'en'
        ? `Updated notes for ${ids.length} selected cartons!`
        : `${ids.length}টি কার্টনে নোট আপডেট করা হয়েছে!`
    );
  };

  const handleResetBatchToDefaults = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (
      window.confirm(
        lang === 'en'
          ? `Reset Tare (${sheetData.defaultTare} {wUnit}) and Unit Weight (${sheetData.defaultWtPerUnit} gm) for ${ids.length} selected cartons?`
          : `সিলেক্টেড ${ids.length}টি কার্টনের ট্যার (${sheetData.defaultTare} {wUnit}) ও ইউনিট ওজন (${sheetData.defaultWtPerUnit} gm) অর্ডারের ডিফল্ট মানে রিসেট করবেন?`
      )
    ) {
      if (onBatchUpdateCartons) {
        onBatchUpdateCartons(ids, {
          tareWt: sheetData.defaultTare,
          wtPerUnit: sheetData.defaultWtPerUnit,
        });
      } else {
        ids.forEach(id =>
          onUpdateCarton(id, {
            tareWt: sheetData.defaultTare,
            wtPerUnit: sheetData.defaultWtPerUnit,
          })
        );
      }

      showFeedback(
        lang === 'en'
          ? `Reset ${ids.length} cartons to order defaults!`
          : `${ids.length}টি কার্টন অর্ডারের ডিফল্ট মানে রিসেট করা হয়েছে!`
      );
    }
  };

  const handleApplyQuickFill = (preset: QuickFillPreset) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    
    if (onBatchUpdateCartons) {
      onBatchUpdateCartons(ids, { grossWt: preset.grossWt, tareWt: preset.tareWt });
    } else {
      ids.forEach(id => onUpdateCarton(id, { grossWt: preset.grossWt, tareWt: preset.tareWt }));
    }
    
    showFeedback(
      lang === 'en' 
        ? `Applied "${preset.name}" to ${ids.length} cartons!` 
        : `${ids.length}টি কার্টনে "${preset.name}" প্রয়োগ করা হয়েছে!`,
      'success'
    );
    setIsQuickFillOpen(false);
  };

  const handleBatchDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (
      window.confirm(
        lang === 'en'
          ? `Are you sure you want to delete ${ids.length} selected cartons?`
          : `আপনি কি নিশ্চিত ${ids.length}টি সিলেক্টেড কার্টন মুছে ফেলবেন?`
      )
    ) {
      if (onBatchDeleteCartons) {
        onBatchDeleteCartons(ids);
      } else {
        ids.forEach(id => onDeleteCarton(id));
      }
      setSelectedIds(new Set());
      showFeedback(
        lang === 'en'
          ? `Deleted ${ids.length} cartons!`
          : `${ids.length}টি কার্টন মুছে ফেলা হয়েছে!`,
        'info'
      );
    }
  };

  const handleBatchDuplicate = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (onBatchDuplicateCartons) {
      onBatchDuplicateCartons(ids);
    } else {
      const toDup = sheetData.cartons.filter(c => ids.includes(c.id));
      toDup.forEach(c => onDuplicateCarton(c));
    }
    showFeedback(
      lang === 'en'
        ? `Duplicated ${ids.length} cartons!`
        : `${ids.length}টি কার্টন ডুপ্লিকেট করা হয়েছে!`
    );
  };

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is inside an open modal or input dialog not in the table, don't trigger global shortcuts
      const activeEl = document.activeElement;
      const isInsideModal = activeEl?.closest('[role="dialog"]') || activeEl?.closest('.z-50');
      if (isInsideModal) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // Escape -> Clear batch selection
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set());
        return;
      }

      // 1. Ctrl + Enter -> Add New Row
      if (isCtrlOrCmd && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        shouldFocusNewRow.current = true;
        onAddCarton();
        return;
      }

      // 2. Ctrl + Delete (or Ctrl + Backspace) -> Delete Currently Selected Row or Batch
      if (isCtrlOrCmd && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (selectedIds.size > 0) {
          e.preventDefault();
          e.stopPropagation();
          handleBatchDelete();
          return;
        }

        if (selectedRowId && sheetData.cartons.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          const currentIndex = sheetData.cartons.findIndex(c => c.id === selectedRowId);
          if (currentIndex !== -1) {
            onDeleteCarton(selectedRowId);
            const nextCarton = sheetData.cartons[currentIndex + 1] || sheetData.cartons[currentIndex - 1];
            if (nextCarton) {
              setSelectedRowId(nextCarton.id);
              setTimeout(() => {
                grossInputRefs.current[nextCarton.id]?.focus();
              }, 40);
            }
          }
        }
        return;
      }

      // 3. Ctrl + D -> Duplicate Currently Selected Row or Batch
      if (isCtrlOrCmd && (e.key === 'd' || e.key === 'D')) {
        if (selectedIds.size > 0) {
          e.preventDefault();
          e.stopPropagation();
          handleBatchDuplicate();
          return;
        }

        if (selectedRowId) {
          e.preventDefault();
          e.stopPropagation();
          const targetCarton = sheetData.cartons.find(c => c.id === selectedRowId);
          if (targetCarton) {
            shouldFocusNewRow.current = true;
            onDuplicateCarton(targetCarton);
          }
        }
        return;
      }

      // 4. Alt + ArrowUp / Alt + ArrowDown -> Quick navigate rows
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const currentIndex = sheetData.cartons.findIndex(c => c.id === selectedRowId);
        if (currentIndex !== -1) {
          const targetIndex = e.key === 'ArrowUp' 
            ? Math.max(0, currentIndex - 1)
            : Math.min(sheetData.cartons.length - 1, currentIndex + 1);
          const targetCarton = sheetData.cartons[targetIndex];
          if (targetCarton) {
            setSelectedRowId(targetCarton.id);
            grossInputRefs.current[targetCarton.id]?.focus();
          }
        }
        return;
      }

      // 5. Ctrl + V when not actively typing in an input -> Open Paste Weights Modal
      if (isCtrlOrCmd && (e.key === 'v' || e.key === 'V')) {
        const isInputField = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA' || activeEl?.tagName === 'SELECT';
        if (!isInputField) {
          e.preventDefault();
          handleOpenPasteModal('');
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRowId, selectedIds, sheetData.cartons, onAddCarton, onDeleteCarton, onDuplicateCarton]);

  const invalidCartons = sheetData.cartons.filter(c => (c.grossWt > 0 && c.netWt < 0) || c.netWt < 0);
  const hasErrors = invalidCartons.length > 0;
  const selectedCount = selectedIds.size;
  const totalCount = sheetData.cartons.length;

  // Auto-Fix All Cartons to Demand Standards
  const handleAutoFixAllDeviations = () => {
    if (!activeDemand) return;
    const targetUnitWt = activeDemand.unitWeightGm;
    const targetTare = activeDemand.defaultTare || sheetData.defaultTare || 0.5;

    const idsToFix = sheetData.cartons.map(c => c.id);
    if (idsToFix.length === 0) return;

    if (onBatchUpdateCartons) {
      onBatchUpdateCartons(idsToFix, {
        wtPerUnit: targetUnitWt,
        tareWt: targetTare,
      });
    } else {
      idsToFix.forEach(id => onUpdateCarton(id, {
        wtPerUnit: targetUnitWt,
        tareWt: targetTare,
      }));
    }

    showFeedback(
      lang === 'en'
        ? `Aligned ${idsToFix.length} cartons to ${activeDemand.buyer} spec (${targetUnitWt} gm/m, ${targetTare} {wUnit} tare)!`
        : `${idsToFix.length}টি কার্টনে ${activeDemand.buyer}-এর স্পেসিফিকেশন (${targetUnitWt} gm/m, ${targetTare} {wUnit}) সেট করা হয়েছে!`,
      'success'
    );
  };

  const handleFixCartonField = useCallback((cartonId: string, field: 'wtPerUnit' | 'tareWt', value: number) => {
    onUpdateCarton(cartonId, { [field]: value });
    showFeedback(
      lang === 'en'
        ? `Aligned ${field === 'wtPerUnit' ? 'Unit Weight' : 'Tare'} to ${value} ${field === 'wtPerUnit' ? 'gm/m' : 'Kg'}!`
        : `কার্টনে মান সেট করা হয়েছে!`,
      'success'
    );
  }, [onUpdateCarton, lang]);

  const filteredCartons = useMemo(() => {
    let result = sheetData.cartons.filter(c => {
      if (filterOnlyDeviations) {
        const devs = complianceReport.deviationsByCartonId[c.id];
        if (!devs || devs.length === 0) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.cartonNo.toString().includes(q) ||
        (c.notes && c.notes.toLowerCase().includes(q)) ||
        (c.color && c.color.toLowerCase().includes(q)) ||
        (c.size && c.size.toLowerCase().includes(q))
      );
    });

    if (groupBy !== 'none') {
      result = [...result].sort((a, b) => {
        const valA = (a[groupBy] || '').toString().toLowerCase();
        const valB = (b[groupBy] || '').toString().toLowerCase();
        return valA.localeCompare(valB);
      });
    }

    return result;
  }, [
    sheetData.cartons,
    filterOnlyDeviations,
    complianceReport.deviationsByCartonId,
    searchQuery,
    groupBy,
  ]);

  const displayedCount = filteredCartons.length;
  const activeEditingCarton = sheetData.cartons.find(c => c.id === selectedRowId) || null;

  // View Mode: 'table' vs 'cards' (optimal for mobile devices)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Virtual Scrolling Configuration & Engine
  const ROW_HEIGHT = 44;
  const CARD_HEIGHT = 165;
  const OVERSCAN = 5;
  const [isVirtualScroll, setIsVirtualScroll] = useState<boolean>(true);
  const [virtualThreshold, setVirtualThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('garment_virtual_threshold');
    return saved ? Number(saved) : 25;
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(600);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleResize = () => {
      if (el) setContainerHeight(el.clientHeight || 600);
    };
    handleResize();

    const observer = new ResizeObserver(handleResize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleContainerScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const isVirtualActive = isVirtualScroll && displayedCount > virtualThreshold;
  const effectiveItemHeight = viewMode === 'cards' ? CARD_HEIGHT : ROW_HEIGHT;

  const { startIndex, endIndex, topSpacerHeight, bottomSpacerHeight } = useMemo(() => {
    if (!isVirtualActive) {
      return {
        startIndex: 0,
        endIndex: displayedCount,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
      };
    }
    const start = Math.max(0, Math.floor(scrollTop / effectiveItemHeight) - OVERSCAN);
    const end = Math.min(displayedCount, Math.ceil((scrollTop + containerHeight) / effectiveItemHeight) + OVERSCAN);
    const topH = start * effectiveItemHeight;
    const bottomH = Math.max(0, (displayedCount - end) * effectiveItemHeight);

    return {
      startIndex: start,
      endIndex: end,
      topSpacerHeight: topH,
      bottomSpacerHeight: bottomH,
    };
  }, [isVirtualActive, displayedCount, scrollTop, effectiveItemHeight, containerHeight]);

  const visibleCartons = useMemo(() => {
    if (!isVirtualActive) return filteredCartons;
    return filteredCartons.slice(startIndex, endIndex);
  }, [filteredCartons, isVirtualActive, startIndex, endIndex]);

  // Keyboard Navigation: Enter / Down jumps to next row, Up to previous
  const handleNavigateRow = useCallback((direction: 'up' | 'down', currentId: string) => {
    const currentIndex = filteredCartons.findIndex(c => c.id === currentId);
    if (currentIndex === -1) return;

    if (direction === 'down') {
      if (currentIndex < filteredCartons.length - 1) {
        const nextCarton = filteredCartons[currentIndex + 1];
        setSelectedRowId(nextCarton.id);

        if (scrollContainerRef.current) {
          const targetY = (currentIndex + 1) * effectiveItemHeight;
          const currentY = scrollContainerRef.current.scrollTop;
          const cH = scrollContainerRef.current.clientHeight;
          if (targetY > currentY + cH - 100 || targetY < currentY) {
            scrollContainerRef.current.scrollTop = Math.max(0, targetY - 100);
          }
        }
        setTimeout(() => {
          grossInputRefs.current[nextCarton.id]?.focus();
          grossInputRefs.current[nextCarton.id]?.select();
        }, 30);
      } else {
        shouldFocusNewRow.current = true;
        onAddCarton();
      }
    } else {
      if (currentIndex > 0) {
        const prevCarton = filteredCartons[currentIndex - 1];
        setSelectedRowId(prevCarton.id);
        if (scrollContainerRef.current) {
          const targetY = (currentIndex - 1) * effectiveItemHeight;
          const currentY = scrollContainerRef.current.scrollTop;
          if (targetY < currentY + 50) {
            scrollContainerRef.current.scrollTop = Math.max(0, targetY - 50);
          }
        }
        setTimeout(() => {
          grossInputRefs.current[prevCarton.id]?.focus();
          grossInputRefs.current[prevCarton.id]?.select();
        }, 30);
      }
    }
  }, [filteredCartons, effectiveItemHeight, onAddCarton]);

  const handleSelectRow = useCallback((id: string, shiftKey: boolean = false) => {
    setSelectedRowId(id);
    if (shiftKey) {
      handleToggleRowSelection(id, true);
    }
  }, []);

  const handleInspectCarton = useCallback((id: string) => {
    setInspectedCartonId(id);
  }, []);

  const handleStartConversion = useCallback((id: string, mode: 'yds' | 'mtr' | 'lb') => {
    startConversion(id, mode);
  }, []);

  const handleConversionChange = useCallback((value: string) => {
    setConverterState(prev => prev ? { ...prev, value } : null);
  }, []);

  const handleCancelConversion = useCallback(() => {
    setConverterState(null);
  }, []);

  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      
      {/* Table Toolbar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">
            {lang === 'en' ? 'Carton Breakdown & Live Calculation' : 'কার্টন ভিত্তিক ওজন ও দৈর্ঘ্য ক্যালকুলেশন'}
          </h3>
          
          <span className="text-xs bg-slate-200/80 text-slate-700 font-bold px-2 py-0.5 rounded-full font-mono">
            {searchQuery || filterOnlyDeviations ? `${displayedCount} / ${totalCount}` : totalCount} {lang === 'en' ? 'Rows' : 'সারি'}
          </span>

          {/* View Mode Switcher: Table vs Cards */}
          <div className="flex items-center bg-slate-200/90 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title={lang === 'en' ? 'Table View (Virtual Scroll)' : 'টেবিল ভিউ'}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{lang === 'en' ? 'Table' : 'টেবিল'}</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title={lang === 'en' ? 'Card View (Mobile Optimized)' : 'কার্ড ভিউ (মোবাইল)'}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{lang === 'en' ? 'Cards' : 'কার্ড'}</span>
            </button>
          </div>

          {/* Virtual Scroll Fast Performance Badge */}
          {isVirtualActive && (
            <span 
              className="inline-flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200"
              title={lang === 'en' ? `Virtual Scrolling active: Visible rows ${startIndex + 1}–${endIndex} of ${displayedCount}` : `ভার্চুয়াল স্ক্রোল সক্রিয়: দৃশ্যমান ${startIndex + 1}–${endIndex}`}
            >
              <Zap className="w-3 h-3 text-emerald-600" />
              <span>{lang === 'en' ? `Fast: ${startIndex + 1}–${endIndex}` : `সক্রিয়: ${startIndex + 1}–${endIndex}`}</span>
            </span>
          )}

          {/* Active Editing Carton Quick Jump / Status Chip - hidden on small mobile to save space */}
          {activeEditingCarton && (
            <button
              onClick={() => scrollToActiveRow(activeEditingCarton.id)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 shadow-2xs group"
              title={lang === 'en' ? `Click to jump to currently active Carton #${activeEditingCarton.cartonNo}` : `বর্তমান সক্রিয় কার্টন #${activeEditingCarton.cartonNo}-এ স্ক্রল করুন`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              <span className="text-[11px] font-mono">
                {lang === 'en' ? 'Editing:' : 'সক্রিয়:'} <strong className="text-blue-950 font-black">CTN #{activeEditingCarton.cartonNo}</strong>
              </span>
              <LocateFixed className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
            </button>
          )}

          {filterOnlyDeviations && (
            <span className="text-xs bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>{lang === 'en' ? 'Filtered: Errors Only' : 'শুধু ত্রুটি ফিল্টার'}</span>
              <button 
                onClick={() => setFilterOnlyDeviations(false)}
                className="hover:text-white p-0.5"
                title="Clear filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}



          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={lang === 'en' ? 'Search carton or notes...' : 'কার্টন বা নোট খুঁজুন...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs w-48 sm:w-56 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Virtual Scroll Threshold */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Virtual Scroll:</span>
            </label>
            <select
              value={virtualThreshold}
              onChange={(e) => {
                const val = Number(e.target.value);
                setVirtualThreshold(val);
                localStorage.setItem('garment_virtual_threshold', String(val));
              }}
              className="bg-white border border-slate-300 text-xs font-bold px-2 py-1 rounded-lg"
            >
              <option value="10">10 (Light)</option>
              <option value="25">25 (Default)</option>
              <option value="50">50 (Balanced)</option>
              <option value="100">100 (Pro)</option>
            </select>
          </div>

          {/* Batch Mode Toggle Badge */}
          <button
            onClick={() => {
              setIsBatchMode(prev => !prev);
              if (isBatchMode && selectedIds.size > 0) {
                // Keep selections or allow user to toggle toolbar
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
              isBatchMode || selectedCount > 0
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs ring-2 ring-indigo-200'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-indigo-600'
            }`}
            title="Toggle Batch Multi-Row Selection & Global Attribute Editor"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Batch Edit Mode' : 'ব্যাচ এডিট মোড'}</span>
            {selectedCount > 0 && (
              <span className="px-1.5 py-0.2 bg-white text-indigo-700 rounded-full text-[10px] font-black font-mono">
                {selectedCount}
              </span>
            )}
          </button>

          {hasErrors && (
            <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 font-bold px-2.5 py-0.5 rounded-full border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              {invalidCartons.length} {lang === 'en' ? 'Error(s)' : 'ত্রুটি'}
            </span>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Group By Toggle */}
          <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden shadow-xs">
            <span className="text-[11px] text-slate-500 px-2 py-1 font-medium bg-slate-100 border-r border-slate-200">
              <Layers className="w-3.5 h-3.5 inline-block mr-1" />
              {lang === 'en' ? 'Group' : 'গ্রুপ'}
            </span>
            <select
              value={groupBy}
              onChange={e => setGroupBy(e.target.value as 'none' | 'color' | 'size')}
              className="px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none cursor-pointer border-none"
            >
              <option value="none">{lang === 'en' ? 'None' : 'কোনটি নয়'}</option>
              <option value="color">{lang === 'en' ? 'Color' : 'রঙ'}</option>
              <option value="size">{lang === 'en' ? 'Size' : 'সাইজ'}</option>
            </select>
          </div>

          {/* Add 1 Carton */}
          <button
            onClick={() => {
              shouldFocusNewRow.current = true;
              onAddCarton();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            title="Add 1 Carton Row (Shortcut: Ctrl + Enter)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addCarton}</span>
            <kbd className="hidden md:inline-block ml-1 px-1.5 py-0.2 text-[9.5px] bg-indigo-700 text-indigo-100 rounded font-mono">
              Ctrl+↵
            </kbd>
          </button>

          {/* Add Bulk Cartons */}
          <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden shadow-xs">
            <span className="text-[11px] text-slate-500 px-2 py-1 font-medium bg-slate-100 border-r border-slate-200">
              +{bulkCount}
            </span>
            <button
              onClick={() => onAddBulk(bulkCount)}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition cursor-pointer"
            >
              {lang === 'en' ? 'Add Bulk' : 'বাল্ক যোগ'}
            </button>
            <select
              value={bulkCount}
              onChange={e => setBulkCount(parseInt(e.target.value, 10))}
              className="px-1 py-1 text-xs text-slate-500 bg-transparent border-l border-slate-200 focus:outline-none cursor-pointer"
            >
              <option value={3}>+3</option>
              <option value={5}>+5</option>
              <option value={10}>+10</option>
              <option value={20}>+20</option>
            </select>
          </div>

          {/* Direct Paste Raw Weights from Clipboard */}
          <button
            onClick={() => handleOpenPasteModal('')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold shadow-xs transition cursor-pointer"
            title={lang === 'en' ? 'Paste raw weight data from Clipboard or Excel to auto-generate carton rows' : 'এক্সেল বা ক্লিপবোর্ড থেকে কাঁচা ওজন পেস্ট করে কার্টন তৈরি করুন'}
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t.pasteWeights}</span>
            <kbd className="hidden lg:inline-block ml-0.5 px-1.5 py-0.2 text-[9.5px] bg-white text-indigo-900 border border-indigo-300 rounded font-mono font-bold">
              Paste
            </kbd>
          </button>

          {/* AI Photo Weight Scanner Button */}
          {onOpenAiPhotoScanner && (
            <button
              onClick={onOpenAiPhotoScanner}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              title={lang === 'en' ? 'Scan photos of cartons or weighing scale to auto-detect gross weights' : 'কার্টনের ছবি থেকে ওজন স্ক্যান করে অটো বসান'}
            >
              <Camera className="w-3.5 h-3.5 text-white" />
              <span>{lang === 'en' ? 'AI Photo Scan' : '📷 AI ছবি স্ক্যান'}</span>
              <span className="hidden sm:inline-block px-1 py-0.2 text-[9px] bg-emerald-800 text-emerald-100 rounded font-semibold uppercase">
                AI
              </span>
            </button>
          )}

          {/* Clear Empty Rows */}
          <button
            onClick={onClearEmpty}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium transition cursor-pointer"
            title="Remove all rows with 0 weight"
          >
            {lang === 'en' ? 'Clean Empty' : 'খালি সারি মুছুন'}
          </button>
        </div>
      </div>

      {/* BATCH ACTION & GLOBAL ATTRIBUTE APPLIER PANEL */}
      {(isBatchMode || selectedCount > 0) && (
        <div className="bg-slate-900 text-slate-100 border-b border-slate-800 p-3 sm:p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Header & Quick Selector Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2.5 py-1 rounded-lg text-xs font-bold font-mono">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {selectedCount} / {totalCount} {lang === 'en' ? 'Cartons Selected' : 'কার্টন নির্বাচিত'}
                </span>
              </span>

              {/* Quick Preset Selector Buttons */}
              <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px]">
                <button
                  onClick={selectAll}
                  className="px-2 py-0.5 rounded hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                  title="Select all rows"
                >
                  {lang === 'en' ? 'All' : 'সব'}
                </button>
                <button
                  onClick={selectNonEmpty}
                  className="px-2 py-0.5 rounded hover:bg-slate-700 text-emerald-300 transition cursor-pointer"
                  title="Select rows with weights"
                >
                  {lang === 'en' ? 'Active' : 'ওজনযুক্ত'}
                </button>
                <button
                  onClick={selectEmpty}
                  className="px-2 py-0.5 rounded hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                  title="Select rows with 0 weight"
                >
                  {lang === 'en' ? 'Empty' : 'খালি'}
                </button>
                {hasErrors && (
                  <button
                    onClick={selectWithErrors}
                    className="px-2 py-0.5 rounded hover:bg-slate-700 text-rose-300 transition cursor-pointer"
                    title="Select invalid rows"
                  >
                    {lang === 'en' ? 'Errors' : 'ত্রুটি'}
                  </button>
                )}
                <button
                  onClick={invertSelection}
                  className="px-2 py-0.5 rounded hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  title="Invert current selection"
                >
                  {lang === 'en' ? 'Invert' : 'ইনভার্ট'}
                </button>
                {selectedCount > 0 && (
                  <button
                    onClick={selectNone}
                    className="px-2 py-0.5 rounded hover:bg-rose-900/60 text-rose-300 transition cursor-pointer"
                    title="Clear selection (Esc)"
                  >
                    {lang === 'en' ? 'Clear' : 'মুছুন'}
                  </button>
                )}
              </div>
            </div>

            {/* Close Batch Mode */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 hidden sm:inline font-mono">
                {lang === 'en' ? 'Shift+Click to select ranges' : 'Shift+ক্লিকে রেঞ্জ সিলেক্ট করুন'}
              </span>
              <button
                onClick={() => {
                  setIsBatchMode(false);
                  setSelectedIds(new Set());
                }}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Exit Batch Mode"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Feedback Toast */}
          {batchFeedback && (
            <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
              batchFeedback.type === 'success' 
                ? 'bg-emerald-950 text-emerald-200 border border-emerald-700' 
                : 'bg-indigo-950 text-indigo-200 border border-indigo-700'
            }`}>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{batchFeedback.message}</span>
            </div>
          )}

          {/* Global Attribute Applicator Controls */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>{lang === 'en' ? 'Apply Global Attribute Changes to Selected Rows' : 'সিলেক্টেড সারিতে একসাথে মান পরিবর্তন করুন'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* 1. Global Tare Weight (${wUnit}) */}
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-200 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-amber-400" />
                      {t.tareWeight}
                    </span>
                    <button
                      onClick={() => {
                        setBatchTare(sheetData.defaultTare.toString());
                        handleApplyBatchTare(sheetData.defaultTare);
                      }}
                      disabled={selectedCount === 0}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-mono underline disabled:opacity-40 cursor-pointer"
                      title="Apply order default tare"
                    >
                      {lang === 'en' ? `Use Default (${sheetData.defaultTare}kg)` : `ডিফল্ট (${sheetData.defaultTare}kg)`}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={batchTare}
                      onChange={e => setBatchTare(e.target.value)}
                      placeholder="e.g. 2.50"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={() => handleApplyBatchTare()}
                      disabled={selectedCount === 0}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded transition shrink-0 cursor-pointer shadow-xs"
                      title="Apply tare to selected rows"
                    >
                      {lang === 'en' ? 'Set Tare' : 'ট্যার দিন'}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  {lang === 'en' ? 'Updates Tare Wt & recalculates Net Wt.' : 'ট্যার পরিবর্তন করে নেট রিক্য্যালকুলেট করে।'}
                </p>
              </div>

              {/* 2. Global Unit Weight (gm) */}
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-200 flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-indigo-400" />
                      {t.wtPerUnit}
                    </span>
                    <button
                      onClick={() => {
                        setBatchWtPerUnit(sheetData.defaultWtPerUnit.toString());
                        handleApplyBatchWtPerUnit(sheetData.defaultWtPerUnit);
                      }}
                      disabled={selectedCount === 0}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono underline disabled:opacity-40 cursor-pointer"
                      title="Apply order default unit weight"
                    >
                      {lang === 'en' ? `Use Default (${sheetData.defaultWtPerUnit}gm)` : `ডিফল্ট (${sheetData.defaultWtPerUnit}gm)`}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={batchWtPerUnit}
                      onChange={e => setBatchWtPerUnit(e.target.value)}
                      placeholder="e.g. 12.80"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white font-mono focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      onClick={() => handleApplyBatchWtPerUnit()}
                      disabled={selectedCount === 0}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded transition shrink-0 cursor-pointer shadow-xs"
                      title="Apply unit weight to selected rows"
                    >
                      {lang === 'en' ? 'Set Wt/Unit' : 'ইউনিট ওজন দিন'}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  {lang === 'en' ? 'Recalculates Meters & Gry lengths.' : 'মিটার ও Gry দৈর্ঘ্য রিক্য্যালকুলেট করে।'}
                </p>
              </div>

              {/* 3. Global Gross Weight (${wUnit}) */}
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-200 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-emerald-400" />
                      {t.grossWeight}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{wUnit}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={batchGross}
                      onChange={e => setBatchGross(e.target.value)}
                      placeholder="e.g. 24.50"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      onClick={handleApplyBatchGross}
                      disabled={selectedCount === 0 || !batchGross}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded transition shrink-0 cursor-pointer shadow-xs"
                      title="Apply gross weight to selected rows"
                    >
                      {lang === 'en' ? 'Set Gross' : 'গ্রস দিন'}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  {lang === 'en' ? 'Applies uniform gross weight.' : 'সকল সারিতে একই গ্রস ওজন বসান।'}
                </p>
              </div>

              {/* 4. Global Notes & Quick Row Actions */}
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-200 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-purple-400" />
                      {lang === 'en' ? 'Notes / Remarks' : 'নোট / মন্তব্য'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={batchNotes}
                      onChange={e => setBatchNotes(e.target.value)}
                      placeholder="e.g. Grade A, Roll 2"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white font-sans focus:outline-none focus:border-purple-400"
                    />
                    <button
                      onClick={handleApplyBatchNotes}
                      disabled={selectedCount === 0}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded transition shrink-0 cursor-pointer shadow-xs"
                      title="Apply notes to selected rows"
                    >
                      {lang === 'en' ? 'Set Note' : 'নোট দিন'}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  {lang === 'en' ? 'Sets custom remark on selected cartons.' : 'সিলেক্টেড সারিতে নোট বসায়।'}
                </p>
              </div>

            </div>

            {/* Quick Bulk Action Buttons Row */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleResetBatchToDefaults}
                  disabled={selectedCount === 0}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
                  title="Reset Tare & Unit Weight of selected rows to Order Defaults"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{lang === 'en' ? 'Reset to Order Defaults' : 'অর্ডারের ডিফল্টে রিসেট'}</span>
                </button>

                <button
                  onClick={handleBatchDuplicate}
                  disabled={selectedCount === 0}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
                  title="Duplicate all selected cartons (Ctrl+D)"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'en' ? `Duplicate Selected (${selectedCount})` : `ডুপ্লিকেট (${selectedCount})`}</span>
                </button>
              </div>

              <button
                onClick={handleBatchDelete}
                disabled={selectedCount === 0}
                className="flex items-center gap-1.5 px-3.5 py-1 bg-rose-950 hover:bg-rose-900 disabled:opacity-40 text-rose-200 text-xs font-bold rounded-lg border border-rose-800 transition cursor-pointer ml-auto"
                title="Delete all selected cartons (Ctrl+Delete)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>{lang === 'en' ? `Delete Selected (${selectedCount})` : `মুছুন (${selectedCount})`}</span>
              </button>
            </div>

          </div>

        </div>
      )}

      <QuickFillModal
        isOpen={isQuickFillOpen}
        onClose={() => setIsQuickFillOpen(false)}
        onApply={handleApplyQuickFill}
        lang={lang}
      />

      <PasteWeightsModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onApplyPaste={handleApplyPasteFromModal}
        defaultTare={sheetData.defaultTare || 0.50}
        defaultWtPerUnit={sheetData.defaultWtPerUnit || 30.00}
        existingCartonCount={sheetData.cartons.length}
        selectedCartonIndex={
          selectedRowId 
            ? Math.max(0, filteredCartons.findIndex(c => c.id === selectedRowId))
            : 0
        }
        lang={lang}
        initialText={initialPasteText}
      />

      {/* Validation Warning Alert Banner */}
      {hasErrors && (
        <div className="p-3 bg-red-50 border-b border-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-red-900 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-semibold">
              {lang === 'en' 
                ? `Input Error: Carton #${invalidCartons.map(c => c.cartonNo).join(', ')} has a negative Net Weight because Gross Weight is less than Tare Weight.`
                : `ইনপুট ত্রুটি: কার্টন #${invalidCartons.map(c => c.cartonNo).join(', ')} এ নেট ওজন নেগেটিভ এসেছে কারণ গ্রস ওজন ট্যার ওজনের চেয়ে কম।`}
            </span>
          </div>
          <button
            onClick={selectWithErrors}
            className="text-[11px] font-bold bg-red-200 hover:bg-red-300 text-red-900 px-2.5 py-0.5 rounded-md shrink-0 cursor-pointer transition"
          >
            {lang === 'en' ? 'Select Invalid Rows' : 'ত্রুটিযুক্ত সারি সিলেক্ট করুন'}
          </button>
        </div>
      )}

      {/* Auto-Generated Pasted Weights Notification Toast */}
      {pastedSuccessToast && (
        <div className="p-2.5 bg-indigo-50 border-b border-indigo-300 text-indigo-950 text-xs font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4 text-indigo-600" />
            <span>{pastedSuccessToast}</span>
          </div>
          <span className="text-[11px] text-indigo-700 font-normal">
            {lang === 'en' ? 'Gross, Tare, Net, Meters & GRY calculated automatically' : 'গ্রস, ট্যার, নেট, মিটার ও জিআরওয়াই অটোমেটিক ক্যালকুলেট হয়েছে'}
          </span>
        </div>
      )}

      {/* Active Order Packing Header Banner */}
      {activeScheduleItem && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex flex-wrap items-center justify-between gap-2 border-b border-indigo-700/60 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-emerald-300">
              {lang === 'en' ? 'ACTIVE ORDER PACKING:' : 'চলমান অর্ডার প্যাকিং:'}
            </span>
            <span className="text-xs font-mono font-semibold bg-white/10 px-2 py-0.5 rounded text-white">
              {activeScheduleItem.buyer} • PO: {activeScheduleItem.customerRefPO || activeScheduleItem.jobNo || 'N/A'}
            </span>
            <span className="text-xs text-indigo-200 hidden sm:inline">
              ({lang === 'en' ? 'Target Demand:' : 'টার্গেট চাহিদা:'} {activeScheduleItem.demandQty} {activeScheduleItem.unit})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReturnToPreviousTab}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer border border-slate-600"
              title={lang === 'en' ? 'Return to Excel Schedule without completing' : 'শিডিউল তালিকায় ফিরে যান'}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Back to Schedule' : '← আগের স্থানে ফিরে যান'}</span>
            </button>
            <button
              onClick={() => onCompletePackingAndReturn?.(tableSummary.totalMtr || tableSummary.totalGrossWt)}
              className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm ring-1 ring-emerald-400"
              title={lang === 'en' ? 'Complete packing and return to schedule' : 'প্যাকিং সম্পূর্ণ করুন ও শিডিউলে ফিরে যান'}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>{lang === 'en' ? 'Complete & Return ✓' : '✅ প্যাকিং সম্পন্ন ও শিডিউলে ফিরুন'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Embedded Order & Item Specifications Control Bar */}
      {onUpdateHeader && (
        <OrderHeaderForm
          sheetData={sheetData}
          onChange={onUpdateHeader}
          onApplyDefaultWeights={onApplyDefaultWeights || (() => {})}
          lang={lang}
          demands={demands}
          onSelectDemand={onSelectDemand}
          onOpenDemandsView={onOpenDemandsView}
          isEmbeddedInTable={true}
        />
      )}

      {/* Main Content Area: Cards View or Table View */}
      {viewMode === 'cards' ? (
        <div
          ref={scrollContainerRef}
          onScroll={handleContainerScroll}
          className="p-3 sm:p-4 space-y-3 overflow-y-auto max-h-[72vh] bg-slate-50/50"
        >
          {topSpacerHeight > 0 && (
            <div style={{ height: `${topSpacerHeight}px` }} aria-hidden="true" />
          )}
          {visibleCartons.map((carton, idx) => {
            const originalIndex = startIndex + idx;
            const isNegativeNet = (carton.grossWt > 0 && carton.netWt < 0) || carton.netWt < 0;
            const isActive = carton.netWt !== 0 || carton.grossWt > 0;
            const isFocused = selectedRowId === carton.id;
            const isChecked = selectedIds.has(carton.id);

            const cartonDevs = complianceReport.deviationsByCartonId[carton.id] || [];
            const hasCriticalDev = cartonDevs.some(d => d.severity === 'critical') || isNegativeNet;
            const hasWarningDev = !hasCriticalDev && cartonDevs.some(d => d.severity === 'warning');
            const unitWtDev = cartonDevs.find(d => d.type === 'unit_weight');
            const tareDev = cartonDevs.find(d => d.type === 'tare_weight');
            const underpackDev = cartonDevs.find(d => d.type === 'underpack');
            const overpackDev = cartonDevs.find(d => d.type === 'overpack');
            const isCompliantWithDemand = activeDemand && isActive && !isNegativeNet && cartonDevs.length === 0;

            return (
              <CartonMobileCard
                key={carton.id}
                carton={carton}
                index={originalIndex}
                isFocused={isFocused}
                isChecked={isChecked}
                wUnit={wUnit}
                lang={lang}
                cartonDevs={cartonDevs}
                hasCriticalDev={hasCriticalDev}
                hasWarningDev={hasWarningDev}
                unitWtDev={unitWtDev}
                tareDev={tareDev}
                underpackDev={underpackDev}
                overpackDev={overpackDev}
                isCompliantWithDemand={!!isCompliantWithDemand}
                batchAvgGrossWt={batchAvgGrossWt}
                batchAvgNetWt={batchAvgNetWt}
                weightDevThresholdPercent={weightDevThresholdPercent}
                activeDemandTare={activeDemand?.defaultTare}
                activeDemandUnitWt={activeDemand?.unitWeightGm}
                onSelectRow={handleSelectRow}
                onToggleSelection={handleToggleRowSelection}
                onUpdateCarton={onUpdateCarton}
                onDeleteCarton={onDeleteCarton}
                onDuplicateCarton={onDuplicateCarton}
                onOpenCartonQr={onOpenCartonQr}
                onInspect={handleInspectCarton}
                onFixField={handleFixCartonField}
                registerGrossInputRef={registerGrossInputRef}
              />
            );
          })}
          {bottomSpacerHeight > 0 && (
            <div style={{ height: `${bottomSpacerHeight}px` }} aria-hidden="true" />
          )}

          {/* Cards View Bottom Summary Strip */}
          <div className="mt-4 p-3.5 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <span className="font-bold text-amber-400">★ {lang === 'en' ? 'GRAND TOTAL' : 'সর্বমোট সামারি'} ★</span>
              <span className="font-mono font-bold text-slate-300">
                {tableSummary.totalCtn} CTN ({tableSummary.activeNetCartonCount} {lang === 'en' ? 'Active' : 'সক্রিয়'})
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2.5 text-center font-mono text-xs">
              <div className="bg-slate-800/80 p-1.5 rounded">
                <div className="text-[10px] text-slate-400">{lang === 'en' ? 'Gross' : 'গ্রস'}</div>
                <div className="font-black text-white">{tableSummary.totalGrossWt.toFixed(2)} {wUnit}</div>
              </div>
              <div className="bg-emerald-950/80 p-1.5 rounded border border-emerald-800">
                <div className="text-[10px] text-emerald-300">{lang === 'en' ? 'Net' : 'নেট'}</div>
                <div className="font-black text-emerald-400">{tableSummary.totalNetWt.toFixed(2)} {wUnit}</div>
              </div>
              <div className="bg-indigo-950/80 p-1.5 rounded border border-indigo-800">
                <div className="text-[10px] text-indigo-300">{lang === 'en' ? 'Meters' : 'মিটার'}</div>
                <div className="font-black text-indigo-300">{tableSummary.totalMtr.toFixed(1)} m</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div 
          ref={scrollContainerRef}
          onScroll={handleContainerScroll}
          className="overflow-x-auto overflow-y-auto max-h-[72vh] relative"
        >
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 shadow-xs">
              <tr className="bg-slate-900 text-slate-100 uppercase text-[11px] font-bold tracking-wider select-none">
                
                {/* Batch Checkbox Column */}
                <th className="py-2.5 px-3 text-center w-10 border-r border-slate-800">
                  <div className="flex items-center justify-center">
                    <input
                      ref={masterCheckboxRef}
                      type="checkbox"
                      checked={totalCount > 0 && selectedCount === totalCount}
                      onChange={handleToggleSelectAll}
                      title={lang === 'en' ? 'Select/Deselect All Rows' : 'সব সারি সিলেক্ট/আনসিলেক্ট করুন'}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                    />
                  </div>
                </th>

                <th className="py-2.5 px-3 text-center w-14 border-r border-slate-800">
                  {t.cartonNo}
                </th>
                <th className="py-2.5 px-3 text-right border-r border-slate-800 bg-slate-800/80">
                  {t.grossWeight}
                </th>
                <th className="py-2.5 px-3 text-right border-r border-slate-800">
                  {t.tareWeight}
                </th>
                <th className="py-2.5 px-3 text-right border-r border-slate-800 bg-emerald-950/70 text-emerald-300">
                  {t.netWeight}
                </th>
                <th className="py-2.5 px-3 text-right border-r border-slate-800">
                  {t.wtPerUnit}
                </th>
                <th className="py-2.5 px-3 text-right border-r border-slate-800 bg-indigo-950/70 text-indigo-300">
                  {t.lengthMtr}
                </th>
                <th className="py-2.5 px-3 text-right border-r border-slate-800 bg-purple-950/70 text-purple-300">
                  {t.lengthGry}
                </th>
                <th className="py-2.5 px-3 text-right border-r border-slate-800 text-slate-400">
                  {t.lengthYds}
                </th>
                <th className="py-2.5 px-3 text-left border-r border-slate-800 min-w-[120px]">
                  {lang === 'en' ? 'Notes' : 'নোট'}
                </th>
                <th className="py-2.5 px-3 text-center w-20">
                  {t.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {topSpacerHeight > 0 && (
                <tr style={{ height: `${topSpacerHeight}px` }} aria-hidden="true">
                  <td colSpan={11} className="p-0 m-0 border-0 pointer-events-none" />
                </tr>
              )}
            {visibleCartons.map((carton, idx) => {
              const originalIndex = startIndex + idx;
              const getGroupColor = (val?: string) => {
                if (!val) return 'transparent';
                let hash = 0;
                for (let i = 0; i < val.length; i++) {
                  hash = val.charCodeAt(i) + ((hash << 5) - hash);
                }
                const hue = Math.abs(hash) % 360;
                return `hsl(${hue}, 70%, 94%)`;
              };
              
              const rowBgColor = groupBy !== 'none' ? getGroupColor(carton[groupBy]) : undefined;
              const isNegativeNet = (carton.grossWt > 0 && carton.netWt < 0) || carton.netWt < 0;
              const isActive = carton.netWt !== 0 || carton.grossWt > 0;
              const isFocused = selectedRowId === carton.id;
              const isChecked = selectedIds.has(carton.id);

              const cartonDevs = complianceReport.deviationsByCartonId[carton.id] || [];
              const hasCriticalDev = cartonDevs.some(d => d.severity === 'critical') || isNegativeNet;
              const hasWarningDev = !hasCriticalDev && cartonDevs.some(d => d.severity === 'warning');
              const unitWtDev = cartonDevs.find(d => d.type === 'unit_weight');
              const tareDev = cartonDevs.find(d => d.type === 'tare_weight');
              const underpackDev = cartonDevs.find(d => d.type === 'underpack');
              const overpackDev = cartonDevs.find(d => d.type === 'overpack');
              const isCompliantWithDemand = activeDemand && isActive && !isNegativeNet && cartonDevs.length === 0;

              return (
                <CartonTableRow
                  key={carton.id}
                  carton={carton}
                  index={originalIndex}
                  isFocused={isFocused}
                  isChecked={isChecked}
                  rowBgColor={rowBgColor}
                  wUnit={wUnit}
                  lang={lang}
                  cartonDevs={cartonDevs}
                  hasCriticalDev={hasCriticalDev}
                  hasWarningDev={hasWarningDev}
                  unitWtDev={unitWtDev}
                  tareDev={tareDev}
                  underpackDev={underpackDev}
                  overpackDev={overpackDev}
                  isCompliantWithDemand={!!isCompliantWithDemand}
                  batchAvgGrossWt={batchAvgGrossWt}
                  batchAvgNetWt={batchAvgNetWt}
                  weightDevThresholdPercent={weightDevThresholdPercent}
                  activeDemandTare={activeDemand?.defaultTare}
                  activeDemandUnitWt={activeDemand?.unitWeightGm}
                  isConverting={converterState?.id === carton.id}
                  converterMode={converterState?.id === carton.id ? converterState.mode : undefined}
                  converterValue={converterState?.id === carton.id ? converterState.value : undefined}
                  onSelectRow={handleSelectRow}
                  onToggleSelection={handleToggleRowSelection}
                  onUpdateCarton={onUpdateCarton}
                  onDeleteCarton={onDeleteCarton}
                  onDuplicateCarton={onDuplicateCarton}
                  onOpenCartonQr={onOpenCartonQr}
                  onInspect={handleInspectCarton}
                  onFixField={handleFixCartonField}
                  onStartConversion={handleStartConversion}
                  onApplyConversion={applyConversion}
                  onCancelConversion={handleCancelConversion}
                  onConversionChange={handleConversionChange}
                  onNavigateRow={handleNavigateRow}
                  registerGrossInputRef={registerGrossInputRef}
                  registerRowRef={registerRowRef}
                />
              );
            })}
            {bottomSpacerHeight > 0 && (
              <tr style={{ height: `${bottomSpacerHeight}px` }} aria-hidden="true">
                <td colSpan={13} className="p-0 m-0 border-0 pointer-events-none" />
              </tr>
            )}
          </tbody>

          {/* Sticky Grand Total Table Footer */}
          <tfoot className="bg-slate-900 text-white font-mono border-t-2 border-slate-700 shadow-md">
            <tr className="divide-x divide-slate-800 text-xs">
              {/* Checkbox Col / Sum Badge */}
              <td className="py-2.5 px-2 text-center bg-slate-950 font-sans">
                <div className="flex items-center justify-center gap-1 font-black text-amber-400 text-xs">
                  <span>Σ</span>
                </div>
              </td>

              {/* Total Cartons Count */}
              <td className="py-2.5 px-2 text-center bg-slate-950">
                <div className="font-black text-white text-xs">
                  {tableSummary.totalCtn} <span className="text-[10px] text-slate-400 uppercase font-sans">CTN</span>
                </div>
                <div className="text-[9.5px] text-emerald-400 font-sans font-bold">
                  {tableSummary.activeNetCartonCount} {lang === 'en' ? 'Active' : 'সক্রিয়'}
                </div>
              </td>

              {/* Grand Total Gross Wt */}
              <td className="py-2.5 px-2 text-right bg-slate-900">
                <div className="font-black text-white text-xs sm:text-sm">
                  {tableSummary.totalGrossWt.toFixed(2)}
                </div>
                <div className="text-[9.5px] text-slate-400 font-sans font-bold">
                  {wUnit} Gross
                </div>
              </td>

              {/* Grand Total Tare Wt */}
              <td className="py-2.5 px-2 text-right bg-slate-900">
                <div className="font-bold text-slate-300 text-xs">
                  {tableSummary.totalTareWt.toFixed(2)}
                </div>
                <div className="text-[9.5px] text-slate-400 font-sans">
                  {wUnit} Tare
                </div>
              </td>

              {/* Grand Total Net Wt (Highlighted Emerald) */}
              <td className="py-2.5 px-2 text-right bg-emerald-950 text-emerald-200 border-x border-emerald-700">
                <div className="font-black text-emerald-300 text-xs sm:text-sm">
                  {tableSummary.totalNetWt.toFixed(2)} {wUnit}
                </div>
                <div className="text-[9.5px] text-emerald-400/90 font-sans font-semibold flex items-center justify-end gap-1">
                  <span>{tableSummary.totalNetWtLbs.toFixed(1)} Lbs</span>
                </div>
              </td>

              {/* Default / Expected Unit Weight */}
              <td className="py-2.5 px-2 text-right bg-slate-900">
                <div className="font-bold text-slate-200 text-xs">
                  {activeDemand?.unitWeightGm || sheetData.defaultWtPerUnit}
                </div>
                <div className="text-[9.5px] text-slate-400 font-sans">
                  gm/m (Spec)
                </div>
              </td>

              {/* Grand Total Length (Meters - Highlighted Indigo) */}
              <td className="py-2.5 px-2 text-right bg-indigo-950 text-indigo-200 border-x border-indigo-700">
                <div className="font-black text-indigo-300 text-xs sm:text-sm">
                  {tableSummary.totalMtr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[9.5px] text-indigo-400 font-sans font-semibold">
                  Meters
                </div>
              </td>

              {/* Grand Total Length (Gry - Highlighted Purple) */}
              <td className="py-2.5 px-2 text-right bg-purple-950 text-purple-200 border-x border-purple-700">
                <div className="font-black text-purple-300 text-xs sm:text-sm">
                  {tableSummary.totalGry.toFixed(2)}
                </div>
                <div className="text-[9.5px] text-purple-400 font-sans font-semibold">
                  Gry (144Y)
                </div>
              </td>

              {/* Grand Total Length (Yards) */}
              <td className="py-2.5 px-2 text-right bg-slate-900">
                <div className="font-bold text-slate-200 text-xs">
                  {tableSummary.totalYds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[9.5px] text-slate-400 font-sans">
                  Yards
                </div>
              </td>

              {/* Grand Total Label / Status */}
              <td className="py-2.5 px-2 text-center bg-slate-900 font-sans">
                <div className="text-[10.5px] font-black text-amber-400 uppercase tracking-wider">
                  {lang === 'en' ? '★ GRAND TOTAL ★' : '★ সর্বমোট সামারি ★'}
                </div>
                <div className="text-[9px] text-slate-400">
                  {tableSummary.netGrossRatio}% Net Ratio
                </div>
              </td>

              {/* Footer Action / Status badge */}
              <td className="py-2.5 px-2 text-center bg-slate-950 font-sans">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Live</span>
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
        {filteredCartons.length === 0 && searchQuery.trim() !== '' && (
          <div className="py-12 text-center text-slate-500 text-sm">
            {lang === 'en' ? 'No cartons match your search.' : 'আপনার অনুসন্ধানের সাথে কোনো কার্টন মেলেনি।'}
          </div>
        )}
      </div>
      )}

      {/* PACKING COMPLETION & RETURN ACTION BAR */}
      <div className="bg-slate-900 text-white border-t-2 border-emerald-500/80 p-3.5 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-emerald-300">
                {lang === 'en' ? 'Packing Summary & Status' : 'প্যাকিং সামারি ও সমাপ্তিকরণ'}
              </span>
              {activeScheduleItem ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-700 font-semibold">
                  {activeScheduleItem.buyer} • {activeScheduleItem.customerRefPO || activeScheduleItem.jobNo}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 font-semibold">
                  {sheetData.buyer || 'Order'} • {sheetData.ref || 'Ref'}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap mt-0.5">
              <span>
                {lang === 'en'
                  ? `Packed: ${tableSummary.activeNetCartonCount} Cartons`
                  : `প্যাক হয়েছে: ${tableSummary.activeNetCartonCount}টি কার্টন`}
              </span>
              <span>•</span>
              <span className="font-bold text-indigo-300">
                {tableSummary.totalMtr.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Meters
              </span>
              <span>•</span>
              <span className="text-emerald-300">
                {tableSummary.totalGrossWt.toFixed(2)} {wUnit} Gross
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          {/* Previous location / return button */}
          <button
            type="button"
            onClick={onReturnToPreviousTab}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title={lang === 'en' ? 'Return to Excel Schedule Manager' : 'আগের শিডিউল পেজে ফিরে যান'}
          >
            <ArrowLeft className="w-4 h-4 text-slate-300" />
            <span>{lang === 'en' ? 'Back to Schedule' : '← আগের স্থানে ফিরে যান'}</span>
          </button>

          {/* Packing Complete & Return Button */}
          <button
            type="button"
            onClick={() => onCompletePackingAndReturn?.(tableSummary.totalMtr || tableSummary.totalGrossWt)}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-400 hover:scale-102 transition cursor-pointer"
            title={lang === 'en' ? 'Mark packing 100% complete and return to schedule' : 'প্যাকিং সম্পূর্ণ হিসেবে চিহ্নিত করুন এবং শিডিউলে ফিরে যান (স্টিকার ডাউনলোড আনলক হবে)'}
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{lang === 'en' ? 'Complete Packing & Return ✓' : '✅ প্যাকিং সম্পূর্ণ করুন ও ফিরে যান'}</span>
          </button>
        </div>
      </div>

      {/* Table Footer Prompt */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Calculator className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {lang === 'en'
              ? 'Press Ctrl+Enter to add rows quickly, and Ctrl+Delete to remove selected rows.'
              : 'দ্রুত সারি যোগ করতে Ctrl+Enter এবং সিলেক্টেড সারি মুছতে Ctrl+Delete চাপুন।'}
          </span>
        </div>
        <button
          onClick={() => {
            shouldFocusNewRow.current = true;
            onAddCarton();
          }}
          className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.addCarton}</span>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-200 text-slate-700 rounded font-mono font-bold">
            Ctrl+↵
          </kbd>
        </button>
      </div>

      {/* Carton Quality & Deviation Inspection Modal */}
      {inspectedCartonId && (() => {
        const inspectedCarton = sheetData.cartons.find(c => c.id === inspectedCartonId);
        if (!inspectedCarton) return null;
        const devs = complianceReport.deviationsByCartonId[inspectedCartonId] || [];

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${devs.some(d => d.severity === 'critical') ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">
                      {lang === 'en' ? `Carton #${inspectedCarton.cartonNo} Quality Inspection` : `কার্টন #${inspectedCarton.cartonNo} কোয়ালিটি নিরীক্ষণ`}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {activeDemand 
                        ? `${activeDemand.buyer} • Ref: ${activeDemand.ref} • Size: ${activeDemand.size}`
                        : (lang === 'en' ? 'Carton Quality Check' : 'কার্টন কোয়ালিটি চেক')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectedCartonId(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Deviations List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {lang === 'en' ? 'Detected Deviations & Alerts' : 'শনাক্তকৃত ত্রুটি ও সতর্কতা'}
                  </h4>
                  {devs.length === 0 ? (
                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{lang === 'en' ? 'This carton complies with all specifications!' : 'এই কার্টনটি সকল স্পেসিফিকেশনের সাথে সামঞ্জস্যপূর্ণ!'}</span>
                    </div>
                  ) : (
                    devs.map((dev, dIdx) => (
                      <div
                        key={`${dev.cartonId}-${dev.type}-${dIdx}`}
                        className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                          dev.severity === 'critical'
                            ? 'bg-red-50/80 border-red-200 text-red-950'
                            : 'bg-amber-50/80 border-amber-200 text-amber-950'
                        }`}
                      >
                        {dev.severity === 'critical' ? (
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-bold flex items-center justify-between">
                            <span>{dev.message}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-mono ${
                              dev.severity === 'critical' ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'
                            }`}>
                              {dev.severity}
                            </span>
                          </div>
                          {dev.expectedValue !== undefined && dev.actualValue !== undefined && (
                            <div className="mt-1 text-[11px] text-slate-600 flex items-center gap-3">
                              <span>Actual: <strong className="font-mono text-slate-900">{dev.actualValue}</strong></span>
                              <span>•</span>
                              <span>Expected: <strong className="font-mono text-slate-900">{dev.expectedValue}</strong></span>
                              {dev.percentDiff !== undefined && (
                                <span className="font-bold text-red-600">
                                  ({dev.percentDiff > 0 ? '+' : ''}{dev.percentDiff.toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Batch Weight Benchmark Card */}
                {batchAvgGrossWt > 0 && inspectedCarton.grossWt > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-indigo-600" />
                        {lang === 'en' ? 'Batch Weight Benchmark Comparison' : 'ব্যাচ গড় ওজনের সাপেক্ষে তুলনা'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Avg: {batchAvgGrossWt.toFixed(2)} {wUnit}
                      </span>
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-2">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">
                          {lang === 'en' ? 'This Carton Gross' : 'এই কার্টন গ্রস'}
                        </span>
                        <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                          {inspectedCarton.grossWt.toFixed(2)} {wUnit}
                        </span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">
                          {lang === 'en' ? 'Batch Avg Gross' : 'ব্যাচ গড় গ্রস'}
                        </span>
                        <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                          {batchAvgGrossWt.toFixed(2)} {wUnit}
                        </span>
                      </div>
                    </div>

                    {(() => {
                      const diff = inspectedCarton.grossWt - batchAvgGrossWt;
                      const pDiff = (diff / batchAvgGrossWt) * 100;
                      const isDev = Math.abs(pDiff) >= weightDevThresholdPercent;
                      const isOver = pDiff > 0;

                      return (
                        <div className={`p-2 rounded-lg text-xs font-bold flex items-center justify-between ${
                          isDev 
                            ? isOver ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'bg-sky-100 text-sky-950 border border-sky-300'
                            : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                        }`}>
                          <span className="flex items-center gap-1">
                            {isDev ? (
                              isOver ? <TrendingUp className="w-3.5 h-3.5 text-amber-800" /> : <TrendingDown className="w-3.5 h-3.5 text-sky-800" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            )}
                            <span>
                              {isDev
                                ? (isOver ? (lang === 'en' ? 'Overweight vs Batch Avg' : 'ব্যাচ গড়ের চেয়ে ওজনে বেশি') : (lang === 'en' ? 'Underweight vs Batch Avg' : 'ব্যাচ গড়ের চেয়ে ওজনে কম'))
                                : (lang === 'en' ? 'Within Normal Batch Range' : 'স্বাভাবিক ব্যাচ সীমার মধ্যে')}
                            </span>
                          </span>
                          <span className="font-mono font-black">
                            {pDiff > 0 ? '+' : ''}{pDiff.toFixed(1)}% ({diff > 0 ? '+' : ''}{diff.toFixed(2)} {wUnit})
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Comparison Card */}
                {activeDemand && (
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-700 mb-2.5">
                      {lang === 'en' ? 'Standard vs Actual Metrics' : 'স্ট্যান্ডার্ড বনাম বর্তমান মান'}
                    </h4>
                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          {lang === 'en' ? 'Unit Weight (gm/m)' : 'ইউনিট ওজন (গ্রাম/মি)'}
                        </span>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="font-mono font-bold text-slate-900">{inspectedCarton.wtPerUnit} gm</span>
                          <span className="text-[11px] text-slate-500 font-mono">Demand: {activeDemand.unitWeightGm} gm</span>
                        </div>
                        {inspectedCarton.wtPerUnit !== activeDemand.unitWeightGm && (
                          <button
                            onClick={() => handleFixCartonField(inspectedCarton.id, 'wtPerUnit', activeDemand.unitWeightGm)}
                            className="mt-2 w-full py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded transition cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Zap className="w-3 h-3" />
                            <span>{lang === 'en' ? `Apply ${activeDemand.unitWeightGm} gm/m` : `${activeDemand.unitWeightGm} gm/m সেট করুন`}</span>
                          </button>
                        )}
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          {lang === 'en' ? 'Tare Weight (${wUnit})' : 'ট্যার ওজন (${wUnit})'}
                        </span>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="font-mono font-bold text-slate-900">{inspectedCarton.tareWt} {wUnit}</span>
                          <span className="text-[11px] text-slate-500 font-mono">Demand: {activeDemand.defaultTare || 0.5} {wUnit}</span>
                        </div>
                        {inspectedCarton.tareWt !== (activeDemand.defaultTare || 0.5) && (
                          <button
                            onClick={() => handleFixCartonField(inspectedCarton.id, 'tareWt', activeDemand.defaultTare || 0.5)}
                            className="mt-2 w-full py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[11px] rounded transition cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Zap className="w-3 h-3" />
                            <span>{lang === 'en' ? `Apply ${activeDemand.defaultTare || 0.5} {wUnit}` : `${activeDemand.defaultTare || 0.5} {wUnit} সেট করুন`}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => setInspectedCartonId(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  {lang === 'en' ? 'Close' : 'বন্ধ করুন'}
                </button>
                {activeDemand && (
                  <button
                    onClick={() => {
                      handleFixCartonField(inspectedCarton.id, 'wtPerUnit', activeDemand.unitWeightGm);
                      handleFixCartonField(inspectedCarton.id, 'tareWt', activeDemand.defaultTare || 0.5);
                      setInspectedCartonId(null);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Align All Fields to Demand' : 'চাহিদা অনুযায়ী সব ঠিক করুন'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      </div>
    </div>
  );
};
