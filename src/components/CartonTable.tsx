import React, { useState, useEffect, useRef } from 'react';
import { CartonRow, PackingSheetData } from '../types/calculator';
import { ElasticDemand } from '../types/elasticDemand';
import { Language, translations } from '../utils/translations';
import { QuickFillModal, QuickFillPreset } from './QuickFillModal';
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
  Maximize2,
  Minimize2,
  LocateFixed
} from 'lucide-react';

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
  lang: Language;
  demands?: ElasticDemand[];
  activeDemandId?: string;
  onSelectDemand?: (demand: ElasticDemand | null) => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
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
  lang,
  demands = [],
  activeDemandId,
  onSelectDemand,
  isFocusMode = false,
  onToggleFocusMode,
}) => {
  const t = translations[lang];
  const [bulkCount, setBulkCount] = useState(5);
  
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

  const [showShortcutsBar, setShowShortcutsBar] = useState(true);

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

  const scrollToActiveRow = (id?: string) => {
    const targetId = id || selectedRowId;
    if (!targetId) return;
    const rowEl = rowRefs.current[targetId];
    if (rowEl) {
      rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Elastic Demand Benchmark & Deviation State
  const [selectedDemandIdState, setSelectedDemandIdState] = useState<string | null>(activeDemandId || null);
  const [tolerancePercent, setTolerancePercent] = useState<number>(5);
  const [filterOnlyDeviations, setFilterOnlyDeviations] = useState<boolean>(false);
  const [inspectedCartonId, setInspectedCartonId] = useState<string | null>(null);

  // Sync selected demand with prop or auto-match
  const activeDemand = findMatchingDemand(sheetData, demands, selectedDemandIdState);

  // Run deviation detector against active demand
  const complianceReport: DemandComplianceReport = analyzeCartonDeviations(sheetData, activeDemand, {
    unitWeightTolerancePercent: tolerancePercent,
  });

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

  // References to gross weight input elements for auto-focusing
  const grossInputRefs = useRef<{ [id: string]: HTMLInputElement | null }>({});
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
        ? `Applied Tare Weight ${val.toFixed(2)} Kg to ${ids.length} selected cartons!`
        : `${ids.length}টি কার্টনে ট্যার ওজন ${val.toFixed(2)} Kg সেট করা হয়েছে!`
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
        ? `Applied Gross Weight ${val.toFixed(2)} Kg to ${ids.length} selected cartons!`
        : `${ids.length}টি কার্টনে গ্রস ওজন ${val.toFixed(2)} Kg সেট করা হয়েছে!`
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
          ? `Reset Tare (${sheetData.defaultTare} Kg) and Unit Weight (${sheetData.defaultWtPerUnit} gm) for ${ids.length} selected cartons?`
          : `সিলেক্টেড ${ids.length}টি কার্টনের ট্যার (${sheetData.defaultTare} Kg) ও ইউনিট ওজন (${sheetData.defaultWtPerUnit} gm) অর্ডারের ডিফল্ট মানে রিসেট করবেন?`
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
        ? `Aligned ${idsToFix.length} cartons to ${activeDemand.buyer} spec (${targetUnitWt} gm/m, ${targetTare} Kg tare)!`
        : `${idsToFix.length}টি কার্টনে ${activeDemand.buyer}-এর স্পেসিফিকেশন (${targetUnitWt} gm/m, ${targetTare} Kg) সেট করা হয়েছে!`,
      'success'
    );
  };

  const handleFixCartonField = (cartonId: string, field: 'wtPerUnit' | 'tareWt', value: number) => {
    onUpdateCarton(cartonId, { [field]: value });
    showFeedback(
      lang === 'en'
        ? `Aligned ${field === 'wtPerUnit' ? 'Unit Weight' : 'Tare'} to ${value} ${field === 'wtPerUnit' ? 'gm/m' : 'Kg'}!`
        : `কার্টনে মান সেট করা হয়েছে!`,
      'success'
    );
  };

  const filteredCartons = sheetData.cartons.filter(c => {
    if (filterOnlyDeviations) {
      const devs = complianceReport.deviationsByCartonId[c.id];
      if (!devs || devs.length === 0) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.cartonNo.toString().includes(q) || (c.notes && c.notes.toLowerCase().includes(q));
  });
  const displayedCount = filteredCartons.length;
  const activeEditingCarton = sheetData.cartons.find(c => c.id === selectedRowId) || null;

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

          {/* Active Editing Carton Quick Jump / Status Chip */}
          {activeEditingCarton && (
            <button
              onClick={() => scrollToActiveRow(activeEditingCarton.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 shadow-2xs group"
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

          {/* Clear Empty Rows */}
          <button
            onClick={onClearEmpty}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium transition cursor-pointer"
            title="Remove all rows with 0 weight"
          >
            {lang === 'en' ? 'Clean Empty' : 'খালি সারি মুছুন'}
          </button>

          {/* Focus Mode Toggle */}
          {onToggleFocusMode && (
            <button
              onClick={onToggleFocusMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                isFocusMode
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-600 shadow-sm ring-2 ring-amber-300 animate-pulse'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 hover:text-indigo-600 shadow-xs'
              }`}
              title={
                isFocusMode
                  ? (lang === 'en' ? 'Exit Focus Mode (Restore full UI)' : 'ফোকাস মোড থেকে প্রস্থান')
                  : (lang === 'en' ? 'Enter Focus Mode (Collapse header, summary cards, and tabs for distraction-free entry)' : 'ফোকাস মোড চালু করুন (ঝামেলামুক্ত দ্রুত এন্ট্রি)')
              }
            >
              {isFocusMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-slate-950" />
                  <span>{t.exitFocusMode || 'Exit Focus Mode'}</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{t.focusMode || 'Focus Mode'}</span>
                </>
              )}
            </button>
          )}
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
              
              {/* 1. Global Tare Weight (Kg) */}
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

              {/* 3. Global Gross Weight (Kg) */}
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-200 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-emerald-400" />
                      {t.grossWeight}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Kg</span>
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
      {/* Keyboard Shortcuts Helper Bar */}
      {showShortcutsBar && (
        <div className="px-4 py-2 bg-slate-900 text-slate-300 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="font-bold text-slate-200 flex items-center gap-1">
              <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">{lang === 'en' ? 'Shortcuts:' : 'শর্টকাট:'}</span>
            </span>

            <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              <kbd className="font-mono font-bold text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded text-[10px]">
                Ctrl + Enter
              </kbd>
              <span className="text-slate-300">{lang === 'en' ? 'Add Empty Row' : 'নতুন সারি যোগ'}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              <kbd className="font-mono font-bold text-rose-400 bg-slate-950 px-1.5 py-0.5 rounded text-[10px]">
                Ctrl + Del
              </kbd>
              <span className="text-slate-300">{lang === 'en' ? 'Delete Row/Batch' : 'সারি/ব্যাচ মুছুন'}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              <kbd className="font-mono font-bold text-amber-400 bg-slate-950 px-1.5 py-0.5 rounded text-[10px]">
                Ctrl + D
              </kbd>
              <span className="text-slate-300">{lang === 'en' ? 'Duplicate Row/Batch' : 'ডুপ্লিকেট'}</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              <kbd className="font-mono font-bold text-sky-400 bg-slate-950 px-1.5 py-0.5 rounded text-[10px]">
                Alt + ↑ / ↓
              </kbd>
              <span className="text-slate-300">{lang === 'en' ? 'Navigate Rows' : 'সারি নেভিগেট'}</span>
            </div>
          </div>

          <button
            onClick={() => setShowShortcutsBar(false)}
            className="text-[10px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
            title="Hide keyboard shortcuts bar"
          >
            {lang === 'en' ? 'Dismiss' : 'লুকান'}
          </button>
        </div>
      )}

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

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
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
            {filteredCartons.map((carton, index) => {
              const isNegativeNet = (carton.grossWt > 0 && carton.netWt < 0) || carton.netWt < 0;
              const isActive = carton.netWt !== 0 || carton.grossWt > 0;
              const isFocused = selectedRowId === carton.id;
              const isChecked = selectedIds.has(carton.id);

              // Deviation analysis for this carton
              const cartonDevs = complianceReport.deviationsByCartonId[carton.id] || [];
              const hasCriticalDev = cartonDevs.some(d => d.severity === 'critical') || isNegativeNet;
              const hasWarningDev = !hasCriticalDev && cartonDevs.some(d => d.severity === 'warning');
              const unitWtDev = cartonDevs.find(d => d.type === 'unit_weight');
              const tareDev = cartonDevs.find(d => d.type === 'tare_weight');
              const underpackDev = cartonDevs.find(d => d.type === 'underpack');
              const overpackDev = cartonDevs.find(d => d.type === 'overpack');
              const isCompliantWithDemand = activeDemand && isActive && !isNegativeNet && cartonDevs.length === 0;

              return (
                <tr 
                  key={carton.id}
                  ref={el => { rowRefs.current[carton.id] = el; }}
                  onClick={(e) => {
                    // Check if Shift click on row
                    if (e.shiftKey) {
                      handleToggleRowSelection(carton.id, true);
                    } else {
                      setSelectedRowId(carton.id);
                    }
                  }}
                  className={`transition-all duration-150 cursor-pointer relative ${
                    isFocused
                      ? hasCriticalDev
                        ? 'bg-red-100/95 text-red-950 border-l-4 border-l-red-600 ring-2 ring-inset ring-red-500/80 shadow-xs z-10'
                        : hasWarningDev
                        ? 'bg-amber-100/95 text-amber-950 border-l-4 border-l-amber-500 ring-2 ring-inset ring-amber-500/80 shadow-xs z-10'
                        : isChecked
                        ? 'bg-indigo-100/95 font-medium border-l-4 border-l-indigo-600 ring-2 ring-inset ring-indigo-500/80 shadow-xs z-10'
                        : 'bg-blue-50/95 text-slate-950 font-medium border-l-4 border-l-blue-600 ring-2 ring-inset ring-blue-500/80 shadow-xs z-10'
                      : hasCriticalDev
                      ? 'bg-red-50/90 hover:bg-red-100/90 text-red-950 border-l-4 border-l-red-600'
                      : hasWarningDev
                      ? 'bg-amber-50/80 hover:bg-amber-100/80 text-amber-950 border-l-4 border-l-amber-500'
                      : isChecked
                      ? 'bg-indigo-50/90 font-medium border-l-4 border-l-indigo-600 ring-1 ring-inset ring-indigo-200'
                      : isCompliantWithDemand
                      ? 'bg-emerald-50/30 hover:bg-emerald-50/60 font-medium border-l-4 border-l-emerald-500'
                      : isActive 
                      ? 'bg-white font-medium hover:bg-slate-50/80 border-l-4 border-l-transparent' 
                      : 'bg-slate-50/50 text-slate-400 hover:bg-slate-100/60 border-l-4 border-l-transparent'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <td 
                    className={`py-2 px-3 text-center border-r border-slate-200 ${
                      isChecked ? 'bg-indigo-100/60' : isFocused ? 'bg-blue-100/40' : 'bg-transparent'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleRowSelection(carton.id, e.shiftKey);
                    }}
                  >
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by container td click
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                  </td>

                  {/* CTN # with Active/Editing Beacon and Quality Flag */}
                  <td className={`py-2 px-2 text-center font-bold border-r ${
                    isFocused
                      ? 'bg-blue-100/90 text-blue-950 border-blue-300 font-black'
                      : hasCriticalDev
                      ? 'bg-red-100/80 text-red-900 border-red-200'
                      : hasWarningDev
                      ? 'bg-amber-100/80 text-amber-950 border-amber-200'
                      : isChecked
                      ? 'bg-indigo-100/80 text-indigo-950 border-indigo-200 font-black'
                      : 'text-slate-800 border-slate-200 bg-slate-100/60'
                  }`}>
                    <div className="flex items-center justify-center gap-1">
                      {/* Active Editing Row Pulse Beacon */}
                      {isFocused && (
                        <span 
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white shrink-0 shadow-2xs animate-pulse"
                          title={lang === 'en' ? 'Active / Editing Carton' : 'সক্রিয় / এডিটিং কার্টন'}
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                        </span>
                      )}

                      {/* Quality Flag Beacon */}
                      {hasCriticalDev ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedCartonId(carton.id);
                          }}
                          className="p-0.5 text-red-600 hover:bg-red-200 rounded shrink-0 transition"
                          title={lang === 'en' ? 'Click to inspect critical packing deviation!' : 'প্যাকিং ত্রুটি বিস্তারিত দেখতে ক্লিক করুন!'}
                        >
                          <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
                        </button>
                      ) : hasWarningDev ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedCartonId(carton.id);
                          }}
                          className="p-0.5 text-amber-600 hover:bg-amber-200 rounded shrink-0 transition"
                          title={lang === 'en' ? 'Click to inspect packing warning!' : 'প্যাকিং সতর্কতা বিস্তারিত দেখতে ক্লিক করুন!'}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                      ) : isCompliantWithDemand ? (
                        <span 
                          className="p-0.5 text-emerald-600 shrink-0 inline-block"
                          title={lang === 'en' ? '100% Demand Compliant' : 'চাহিদার সাথে শতভাগ সামঞ্জস্যপূর্ণ'}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </span>
                      ) : null}

                      <input
                        type="number"
                        value={carton.cartonNo}
                        onFocus={() => setSelectedRowId(carton.id)}
                        onChange={e => onUpdateCarton(carton.id, { cartonNo: parseInt(e.target.value) || index + 1 })}
                        className={`w-10 text-center font-bold focus:outline-none rounded ${
                          isFocused ? 'bg-white shadow-2xs border border-blue-400 text-blue-950 font-black' : 'bg-transparent'
                        }`}
                      />
                    </div>
                  </td>

                  {/* Gross Wt (Kg) */}
                  <td className="py-1.5 px-2 text-right border-r border-slate-200">
                    {converterState?.id === carton.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-1 py-0.5 rounded uppercase leading-none shadow-xs border border-orange-200">
                          {converterState.mode} → Kg
                        </span>
                        <input
                          autoFocus
                          type="number"
                          step="any"
                          value={converterState.value}
                          onChange={e => setConverterState({ ...converterState, value: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              applyConversion();
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              setConverterState(null);
                              setTimeout(() => grossInputRefs.current[carton.id]?.focus(), 10);
                            }
                          }}
                          onBlur={applyConversion}
                          className="w-16 sm:w-20 text-right px-1.5 py-1 text-xs font-bold rounded focus:outline-none border-2 border-orange-400 bg-orange-50 text-orange-950 shadow-inner"
                          placeholder={converterState.mode}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-0.5">
                        {isFocused && (
                          <div className="flex flex-col justify-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity pr-1 border-r border-slate-200 mr-1">
                            <button tabIndex={-1} onMouseDown={(e) => { e.preventDefault(); startConversion(carton.id, 'yds'); }} className="text-[7px] leading-none tracking-tighter bg-slate-200 hover:bg-slate-300 hover:text-indigo-700 px-1 py-0.5 rounded font-bold text-slate-600 cursor-pointer uppercase" title="Calculate Gross Kg from Yards">Yds</button>
                            <button tabIndex={-1} onMouseDown={(e) => { e.preventDefault(); startConversion(carton.id, 'mtr'); }} className="text-[7px] leading-none tracking-tighter bg-slate-200 hover:bg-slate-300 hover:text-indigo-700 px-1 py-0.5 rounded font-bold text-slate-600 cursor-pointer uppercase" title="Calculate Gross Kg from Meters">Mtr</button>
                            <button tabIndex={-1} onMouseDown={(e) => { e.preventDefault(); startConversion(carton.id, 'lb'); }} className="text-[7px] leading-none tracking-tighter bg-slate-200 hover:bg-slate-300 hover:text-indigo-700 px-1 py-0.5 rounded font-bold text-slate-600 cursor-pointer uppercase" title="Convert Lbs to Gross Kg">Lbs</button>
                          </div>
                        )}
                        <input
                          ref={el => (grossInputRefs.current[carton.id] = el)}
                          type="number"
                          step="0.01"
                          min="0"
                          value={carton.grossWt === 0 ? '' : carton.grossWt}
                          onFocus={() => setSelectedRowId(carton.id)}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            onUpdateCarton(carton.id, { grossWt: val });
                          }}
                          placeholder="0.00"
                          className={`w-20 sm:w-24 text-right px-2 py-1 font-bold rounded focus:outline-none transition ${
                            isNegativeNet
                              ? 'bg-white border-2 border-red-500 text-red-900 focus:ring-2 focus:ring-red-500'
                              : isFocused
                              ? 'text-slate-950 bg-white border-2 border-blue-500 shadow-xs focus:ring-2 focus:ring-blue-400 font-black'
                              : isChecked
                              ? 'text-slate-950 bg-white border border-indigo-400 shadow-xs focus:ring-2 focus:ring-indigo-400'
                              : 'text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                          }`}
                        />
                      </div>
                    )}
                  </td>

                  {/* Tare Wt (Kg) */}
                  <td className="py-1.5 px-2 text-right border-r border-slate-200">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={carton.tareWt}
                        onFocus={() => setSelectedRowId(carton.id)}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          onUpdateCarton(carton.id, { tareWt: val });
                        }}
                        className={`w-16 text-right px-2 py-1 text-slate-600 border rounded focus:bg-white focus:border-slate-400 focus:outline-none ${
                          tareDev 
                            ? 'border-amber-400 bg-amber-50/50 text-amber-900 font-bold' 
                            : isFocused
                            ? 'bg-white border-blue-300 text-slate-900 shadow-2xs font-semibold'
                            : 'bg-transparent border-transparent hover:border-slate-200'
                        }`}
                      />
                      {tareDev && activeDemand?.defaultTare !== undefined && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFixCartonField(carton.id, 'tareWt', activeDemand.defaultTare || 0.5);
                          }}
                          className="text-[10px] bg-amber-200 hover:bg-amber-300 text-amber-900 font-sans font-bold px-1 py-0.5 rounded shrink-0 cursor-pointer"
                          title={lang === 'en' ? `Set Tare to demand standard: ${activeDemand.defaultTare} Kg` : `ট্যার চাহিদার মান ${activeDemand.defaultTare} Kg সেট করুন`}
                        >
                          Fix
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Net Wt (Kg) */}
                  <td className={`py-1.5 px-3 text-right font-bold border-r border-slate-200 text-xs ${
                    isNegativeNet
                      ? 'bg-red-100 text-red-700 font-black'
                      : underpackDev || overpackDev
                      ? 'bg-amber-100/70 text-amber-950 font-black'
                      : isChecked
                      ? 'text-emerald-900 bg-emerald-100/70 font-black'
                      : isFocused
                      ? 'text-emerald-900 bg-emerald-100/70 font-black'
                      : 'text-emerald-700 bg-emerald-50/30'
                  }`}>
                    <div className="flex items-center justify-end gap-1">
                      {isNegativeNet && (
                        <span title={lang === 'en' ? 'Gross weight is less than tare weight!' : 'গ্রস ওজন ট্যার ওজনের চেয়ে কম!'}>
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 inline" />
                        </span>
                      )}
                      <span>{carton.netWt.toFixed(2)}</span>
                    </div>
                    {isNegativeNet ? (
                      <div className="text-[9px] font-sans font-bold text-red-600 tracking-tight leading-none mt-0.5">
                        {lang === 'en' ? 'Gross < Tare' : 'গ্রস < ট্যার'}
                      </div>
                    ) : underpackDev ? (
                      <div className="text-[9px] font-sans font-bold text-amber-700 tracking-tight leading-none mt-0.5">
                        {lang === 'en' ? '⚠️ Underpacked' : '⚠️ কম প্যাক'}
                      </div>
                    ) : overpackDev ? (
                      <div className="text-[9px] font-sans font-bold text-amber-700 tracking-tight leading-none mt-0.5">
                        {lang === 'en' ? '⚠️ Overpacked' : '⚠️ অতিরিক্ত প্যাক'}
                      </div>
                    ) : null}
                  </td>

                  {/* Wt/Unit (gm) with Flag & Inline Quick-Fix */}
                  <td className="py-1.5 px-2 text-right border-r border-slate-200">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={carton.wtPerUnit}
                        onFocus={() => setSelectedRowId(carton.id)}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || sheetData.defaultWtPerUnit;
                          onUpdateCarton(carton.id, { wtPerUnit: val });
                        }}
                        className={`w-16 sm:w-20 text-right px-2 py-1 font-semibold rounded focus:bg-white focus:outline-none ${
                          unitWtDev
                            ? 'border-2 border-red-500 bg-red-100/70 text-red-950 font-bold focus:ring-1 focus:ring-red-500'
                            : isFocused
                            ? 'bg-white border-blue-300 text-slate-900 shadow-2xs font-bold'
                            : 'text-slate-800 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500'
                        }`}
                      />
                      {unitWtDev && activeDemand?.unitWeightGm !== undefined && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFixCartonField(carton.id, 'wtPerUnit', activeDemand.unitWeightGm);
                          }}
                          className="text-[10px] bg-red-600 hover:bg-red-700 text-white font-sans font-bold px-1.5 py-0.5 rounded shadow-xs shrink-0 cursor-pointer transition flex items-center gap-0.5"
                          title={lang === 'en' ? `Fix Unit Wt to Demand Requirement: ${activeDemand.unitWeightGm} gm/m` : `চাহিদা অনুযায়ী ইউনিট ওজন ${activeDemand.unitWeightGm} gm/m সেট করুন`}
                        >
                          <Zap className="w-2.5 h-2.5" />
                          <span>Fix</span>
                        </button>
                      )}
                    </div>
                    {unitWtDev && (
                      <div className="text-[9px] font-sans font-bold text-red-700 tracking-tight leading-none mt-0.5 text-right">
                        Exp: {activeDemand?.unitWeightGm}g ({unitWtDev.percentDiff !== undefined ? `${unitWtDev.percentDiff > 0 ? '+' : ''}${unitWtDev.percentDiff.toFixed(0)}%` : ''})
                      </div>
                    )}
                  </td>

                  {/* Length (Mtr) - Auto calculated */}
                  <td className={`py-1.5 px-3 text-right font-black border-r border-slate-200 text-xs ${
                    isChecked ? 'text-indigo-950 bg-indigo-100/80' : isFocused ? 'text-indigo-950 bg-indigo-100/70 font-black' : 'text-indigo-700 bg-indigo-50/40'
                  }`}>
                    {carton.lengthMtr.toFixed(2)}
                  </td>

                  {/* Length (Gry) - Auto calculated */}
                  <td className={`py-1.5 px-3 text-right font-black border-r border-slate-200 text-xs ${
                    isChecked ? 'text-purple-950 bg-purple-100/80' : isFocused ? 'text-purple-950 bg-purple-100/70 font-black' : 'text-purple-700 bg-purple-50/40'
                  }`}>
                    {carton.lengthGry.toFixed(2)}
                  </td>

                  {/* Length (Yds) */}
                  <td className="py-1.5 px-3 text-right text-slate-500 border-r border-slate-200 text-xs">
                    {carton.lengthYds ? carton.lengthYds.toFixed(2) : '0.00'}
                  </td>

                  {/* Notes */}
                  <td className="py-1.5 px-2 border-r border-slate-200">
                    <input
                      type="text"
                      value={carton.notes || ''}
                      onFocus={() => setSelectedRowId(carton.id)}
                      onChange={e => onUpdateCarton(carton.id, { notes: e.target.value })}
                      placeholder="..."
                      className={`w-full px-2 py-1 text-slate-700 font-sans text-xs rounded focus:bg-white focus:border-slate-300 focus:outline-none ${
                        isFocused ? 'bg-white border border-blue-200 shadow-2xs' : 'bg-transparent border border-transparent hover:border-slate-200'
                      }`}
                    />
                  </td>

                  {/* Actions */}
                  <td className="py-1.5 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {onOpenCartonQr && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCartonQr(carton);
                          }}
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition cursor-pointer"
                          title={lang === 'en' ? 'Scan & Preview Carton QR' : 'কার্টন কিউআর কোড দেখুন'}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRowId(carton.id);
                          shouldFocusNewRow.current = true;
                          onDuplicateCarton(carton);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded transition cursor-pointer"
                        title={lang === 'en' ? 'Duplicate (Ctrl+D)' : 'ডুপ্লিকেট (Ctrl+D)'}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCarton(carton.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                        title={lang === 'en' ? 'Delete Row (Ctrl+Delete)' : 'সারি মুছুন (Ctrl+Delete)'}
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
        {filteredCartons.length === 0 && searchQuery.trim() !== '' && (
          <div className="py-12 text-center text-slate-500 text-sm">
            {lang === 'en' ? 'No cartons match your search.' : 'আপনার অনুসন্ধানের সাথে কোনো কার্টন মেলেনি।'}
          </div>
        )}
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
          {!showShortcutsBar && (
            <button
              onClick={() => setShowShortcutsBar(true)}
              className="text-indigo-600 hover:text-indigo-800 font-semibold underline text-[11px] cursor-pointer ml-1"
            >
              {lang === 'en' ? 'Show Shortcuts' : 'শর্টকাট দেখুন'}
            </button>
          )}
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
                          {lang === 'en' ? 'Tare Weight (Kg)' : 'ট্যার ওজন (কেজি)'}
                        </span>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="font-mono font-bold text-slate-900">{inspectedCarton.tareWt} Kg</span>
                          <span className="text-[11px] text-slate-500 font-mono">Demand: {activeDemand.defaultTare || 0.5} Kg</span>
                        </div>
                        {inspectedCarton.tareWt !== (activeDemand.defaultTare || 0.5) && (
                          <button
                            onClick={() => handleFixCartonField(inspectedCarton.id, 'tareWt', activeDemand.defaultTare || 0.5)}
                            className="mt-2 w-full py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[11px] rounded transition cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Zap className="w-3 h-3" />
                            <span>{lang === 'en' ? `Apply ${activeDemand.defaultTare || 0.5} Kg` : `${activeDemand.defaultTare || 0.5} Kg সেট করুন`}</span>
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
