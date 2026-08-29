import React, { useState, useEffect, useRef } from 'react';
import { CartonRow, PackingSheetData } from '../types/calculator';
import { Language, translations } from '../utils/translations';
import { QuickFillModal, QuickFillPreset } from './QuickFillModal';
import { Zap } from 'lucide-react';
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
  Search
} from 'lucide-react';

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
}) => {
  const t = translations[lang];
  const [bulkCount, setBulkCount] = useState(5);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => sheetData.cartons[0]?.id || null);
  const [showShortcutsBar, setShowShortcutsBar] = useState(true);

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

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

  const filteredCartons = sheetData.cartons.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.cartonNo.toString().includes(q) || (c.notes && c.notes.toLowerCase().includes(q));
  });
  const displayedCount = filteredCartons.length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      
      {/* Table Toolbar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">
            {lang === 'en' ? 'Carton Breakdown & Live Calculation' : 'কার্টন ভিত্তিক ওজন ও দৈর্ঘ্য ক্যালকুলেশন'}
          </h3>
          
          <span className="text-xs bg-slate-200/80 text-slate-700 font-bold px-2 py-0.5 rounded-full font-mono">
            {searchQuery ? `${displayedCount} / ${totalCount}` : totalCount} {lang === 'en' ? 'Rows' : 'সারি'}
          </span>

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

              return (
                <tr 
                  key={carton.id}
                  onClick={(e) => {
                    // Check if Shift click on row
                    if (e.shiftKey) {
                      handleToggleRowSelection(carton.id, true);
                    } else {
                      setSelectedRowId(carton.id);
                    }
                  }}
                  className={`transition-colors cursor-pointer relative ${
                    isNegativeNet
                      ? 'bg-red-50/90 hover:bg-red-100/90 text-red-950 border-l-4 border-l-red-600'
                      : isChecked
                      ? 'bg-indigo-50/90 font-medium border-l-4 border-l-indigo-600 ring-1 ring-inset ring-indigo-200'
                      : isFocused
                      ? 'bg-slate-100 font-medium border-l-4 border-l-slate-400'
                      : isActive 
                      ? 'bg-white font-medium hover:bg-slate-50/80 border-l-4 border-l-transparent' 
                      : 'bg-slate-50/50 text-slate-400 hover:bg-slate-100/60 border-l-4 border-l-transparent'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <td 
                    className={`py-2 px-3 text-center border-r border-slate-200 ${
                      isChecked ? 'bg-indigo-100/60' : 'bg-transparent'
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

                  {/* CTN # */}
                  <td className={`py-2 px-3 text-center font-bold border-r ${
                    isNegativeNet 
                      ? 'bg-red-100/70 text-red-900 border-red-200' 
                      : isChecked
                      ? 'bg-indigo-100/80 text-indigo-950 border-indigo-200 font-black'
                      : isFocused
                      ? 'bg-slate-200/80 text-slate-900 border-slate-300 font-black'
                      : 'text-slate-800 border-slate-200 bg-slate-100/60'
                  }`}>
                    <div className="flex items-center justify-center gap-1">
                      {isFocused && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 inline-block shrink-0" />
                      )}
                      <input
                        type="number"
                        value={carton.cartonNo}
                        onFocus={() => setSelectedRowId(carton.id)}
                        onChange={e => onUpdateCarton(carton.id, { cartonNo: parseInt(e.target.value) || index + 1 })}
                        className="w-10 text-center bg-transparent font-bold focus:outline-none focus:bg-white rounded"
                      />
                    </div>
                  </td>

                  {/* Gross Wt (Kg) */}
                  <td className="py-1.5 px-2 text-right border-r border-slate-200">
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
                      className={`w-24 text-right px-2 py-1 font-bold rounded focus:outline-none transition ${
                        isNegativeNet
                          ? 'bg-white border-2 border-red-500 text-red-900 focus:ring-2 focus:ring-red-500'
                          : isChecked
                          ? 'text-slate-950 bg-white border border-indigo-400 shadow-xs focus:ring-2 focus:ring-indigo-400'
                          : isFocused
                          ? 'text-slate-950 bg-white border-2 border-indigo-500 shadow-xs focus:ring-2 focus:ring-indigo-400'
                          : 'text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      }`}
                    />
                  </td>

                  {/* Tare Wt (Kg) */}
                  <td className="py-1.5 px-2 text-right border-r border-slate-200">
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
                      className="w-16 text-right px-2 py-1 text-slate-600 bg-transparent border border-transparent hover:border-slate-200 rounded focus:bg-white focus:border-slate-400 focus:outline-none"
                    />
                  </td>

                  {/* Net Wt (Kg) */}
                  <td className={`py-1.5 px-3 text-right font-bold border-r border-slate-200 text-xs ${
                    isNegativeNet
                      ? 'bg-red-100 text-red-700 font-black'
                      : isChecked
                      ? 'text-emerald-900 bg-emerald-100/70 font-black'
                      : isFocused
                      ? 'text-emerald-800 bg-emerald-100/50 font-black'
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
                    {isNegativeNet && (
                      <div className="text-[9px] font-sans font-bold text-red-600 tracking-tight leading-none mt-0.5">
                        {lang === 'en' ? 'Gross < Tare' : 'গ্রস < ট্যার'}
                      </div>
                    )}
                  </td>

                  {/* Wt/Unit (gm) */}
                  <td className="py-1.5 px-2 text-right border-r border-slate-200">
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
                      className="w-20 text-right px-2 py-1 font-semibold text-slate-800 bg-transparent border border-transparent hover:border-slate-200 rounded focus:bg-white focus:border-indigo-500 focus:outline-none"
                    />
                  </td>

                  {/* Length (Mtr) - Auto calculated */}
                  <td className={`py-1.5 px-3 text-right font-black border-r border-slate-200 text-xs ${
                    isChecked ? 'text-indigo-950 bg-indigo-100/80' : isFocused ? 'text-indigo-900 bg-indigo-100/60' : 'text-indigo-700 bg-indigo-50/40'
                  }`}>
                    {carton.lengthMtr.toFixed(2)}
                  </td>

                  {/* Length (Gry) - Auto calculated */}
                  <td className={`py-1.5 px-3 text-right font-black border-r border-slate-200 text-xs ${
                    isChecked ? 'text-purple-950 bg-purple-100/80' : isFocused ? 'text-purple-900 bg-purple-100/60' : 'text-purple-700 bg-purple-50/40'
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
                      className="w-full px-2 py-1 text-slate-700 font-sans text-xs bg-transparent border border-transparent hover:border-slate-200 rounded focus:bg-white focus:border-slate-300 focus:outline-none"
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
    </div>
  );
};
