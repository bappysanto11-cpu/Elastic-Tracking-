import React, { useState, useEffect } from 'react';
import { PackingSheetData, CartonRow } from './types/calculator';
import { 
  INITIAL_IMAGE_DATA, 
  recomputeCarton, 
  calculateSummary 
} from './utils/calc';
import { exportPackingSheetToCsv } from './utils/export';
import { Language, translations } from './utils/translations';
import { parseCartonFromUrl, CartonQrPayload } from './utils/qrCarton';
import { Header } from './components/Header';
import { ActivitySidebar } from './components/ActivitySidebar';
import { OrderHeaderForm } from './components/OrderHeaderForm';
import { SummaryCards } from './components/SummaryCards';
import { CartonTable } from './components/CartonTable';
import { FactorySheetView } from './components/FactorySheetView';
import { StickerLabelsView } from './components/StickerLabelsView';
import { ToolsModal } from './components/ToolsModal';
import { AiScanModal } from './components/AiScanModal';
import { FormulaHelpModal } from './components/FormulaHelpModal';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { PrintToast } from './components/PrintToast';
import { ExcelDriveModal } from './components/ExcelDriveModal';
import { CartonQrDetailModal } from './components/CartonQrDetailModal';
import { ApkDownloadModal } from './components/ApkDownloadModal';
import { IndexedDbBackupModal } from './components/IndexedDbBackupModal';
import { AuthModal } from './components/AuthModal';
import { triggerIndexedDbBackup, openIndexedDB } from './utils/indexedDbBackup';
import { FloatingSummaryBadge } from './components/FloatingSummaryBadge';
import { WorkspaceModal } from './components/WorkspaceModal';
import { DEFAULT_WORKSPACE_ID, loadWorkspaceData, saveWorkspaceData } from './utils/workspaceManager';
import { AnalyticsView } from './components/AnalyticsView';
import { ElasticDemandView } from './components/ElasticDemandView';
import { ElasticDemandModal } from './components/ElasticDemandModal';
import { ElasticDemand } from './types/elasticDemand';
import { loadDemands, saveDemands } from './utils/elasticDemandStorage';
import { useHistory } from './utils/useHistory';
import { useAuth } from './context/AuthContext';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { Table, LayoutGrid, Tag, Layers, Check, QrCode, BarChart3, Undo2, Redo2, Search, RotateCcw, ClipboardList, Maximize2, Minimize2, Upload, FileText, Truck, Package } from 'lucide-react';
import { ScheduleUploader } from './components/ScheduleUploader';
import { ScheduleTracker } from './components/ScheduleTracker';
import { ChallanGenerator } from './components/ChallanGenerator';
import { TruckManager } from './components/TruckManager';
import { DailyReportView } from './components/DailyReportView';

const STORAGE_KEY = 'garment_elastic_calculator_v1';

// Added workspace state to App component

export default function App() {
  const [lang, setLang] = useState<Language>('bn');
  const [activeTab, setActiveTab] = useState<'table' | 'sheet' | 'stickers' | 'analytics' | 'demands' | 'upload' | 'tracker' | 'challan' | 'truck' | 'report'>('table');
  const [isAddDemandModalOpen, setIsAddDemandModalOpen] = useState(false);

  // Elastic Demands State
  const [demands, setDemands] = useState<ElasticDemand[]>(() => loadDemands());

  // Save demands to storage on change
  useEffect(() => {
    saveDemands(demands);
  }, [demands]);

  // Modals
  const [isAiScanOpen, setIsAiScanOpen] = useState<boolean>(false);
  const [isToolsOpen, setIsToolsOpen] = useState<boolean>(false);
  const [isExcelDriveOpen, setIsExcelDriveOpen] = useState<boolean>(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState<boolean>(false);
  const [isIndexedDbModalOpen, setIsIndexedDbModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState<boolean>(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState<boolean>(false);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => localStorage.getItem('garment_active_workspace') || DEFAULT_WORKSPACE_ID);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [isPrintToastVisible, setIsPrintToastVisible] = useState<boolean>(false);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  // QR Code Carton Inspection Modal
  const [isCartonQrModalOpen, setIsCartonQrModalOpen] = useState<boolean>(false);
  const [selectedCartonForQr, setSelectedCartonForQr] = useState<CartonRow | null>(null);
  const [directQrPayload, setDirectQrPayload] = useState<CartonQrPayload | null>(null);

  // Auth & Real-Time Sync
  const { user } = useAuth();

  // Sheet State
  const { state: sheetData, set: setSheetData, undo: undoSheetData, redo: redoSheetData, reset: resetSheetData, canUndo, canRedo } = useHistory<PackingSheetData>(() => {
    const loaded = loadWorkspaceData(localStorage.getItem('garment_active_workspace') || DEFAULT_WORKSPACE_ID);
    return loaded || INITIAL_IMAGE_DATA;
  });

  // Real-Time Cloud Synchronization Engine
  const {
    isOnline,
    syncStatus,
    lastCloudSyncTime,
    pendingOfflineChanges,
    triggerManualSync,
  } = useRealtimeSync(sheetData, user);

  // Local storage last saved tracking
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(() => {
    try {
      const savedTime = localStorage.getItem(`${STORAGE_KEY}_timestamp`);
      if (savedTime) {
        return new Date(savedTime);
      }
    } catch {
      // fallback
    }
    return new Date();
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Save to localStorage and automatic IndexedDB backup
  useEffect(() => {
    try {
      setIsSaving(true);
      const now = new Date();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sheetData));
      localStorage.setItem(`${STORAGE_KEY}_timestamp`, now.toISOString());
      setLastSavedTime(now);
      const timer = setTimeout(() => {
        setIsSaving(false);
      }, 500);
      return () => clearTimeout(timer);
    } catch (e) {
      console.error('Error saving state', e);
      setIsSaving(false);
    }
  }, [sheetData]);

  // Debounced Automatic Backup to IndexedDB (runs in background)
  useEffect(() => {
    const backupTimer = setTimeout(() => {
      triggerIndexedDbBackup(sheetData, 'auto').catch(err => {
        console.error('Automatic IndexedDB backup failed:', err);
      });
    }, 1500);

    return () => clearTimeout(backupTimer);
  }, [sheetData]);


  const createLog = (action: 'ADD' | 'UPDATE' | 'DELETE' | 'BATCH' | 'SYSTEM', details: string) => ({
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    action,
    details
  });

  // Handle scanned QR Code redirection from URL parameters
  useEffect(() => {
    const scanned = parseCartonFromUrl();
    if (scanned) {
      setDirectQrPayload(scanned);
      setIsCartonQrModalOpen(true);
    }
  }, []);

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          if (canRedo) redoSheetData();
        } else {
          e.preventDefault();
          if (canUndo) undoSheetData();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        if (canRedo) redoSheetData();
      } else if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undoSheetData, redoSheetData, isFocusMode]);

  // Compute live summary
  const summary = calculateSummary(sheetData.cartons);

  const filteredCartons = sheetData.cartons;

  const filteredSheetData = {
    ...sheetData,
    cartons: filteredCartons
  };

  const filteredSummary = calculateSummary(filteredCartons);

  // QR Modal opening & navigation
  const handleOpenCartonQr = (carton: CartonRow) => {
    setSelectedCartonForQr(carton);
    setDirectQrPayload(null);
    setIsCartonQrModalOpen(true);
  };

  const currentCartonIndex = selectedCartonForQr 
    ? sheetData.cartons.findIndex(c => c.id === selectedCartonForQr.id) 
    : -1;

  const handleNavigateCarton = (direction: 'prev' | 'next') => {
    if (currentCartonIndex === -1) return;
    if (direction === 'prev' && currentCartonIndex > 0) {
      setSelectedCartonForQr(sheetData.cartons[currentCartonIndex - 1]);
    } else if (direction === 'next' && currentCartonIndex < sheetData.cartons.length - 1) {
      setSelectedCartonForQr(sheetData.cartons[currentCartonIndex + 1]);
    }
  };

  // Update order header fields
  const handleUpdateHeader = (updated: Partial<PackingSheetData>) => {
    setSheetData(prev => ({
      ...prev,
      ...updated,
    }));
  };

  // Demand handlers
  const handleSaveDemand = (demand: ElasticDemand) => {
    setDemands(prev => {
      const idx = prev.findIndex(d => d.id === demand.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = demand;
        return next;
      }
      return [demand, ...prev];
    });
  };

  const handleDeleteDemand = (id: string) => {
    setDemands(prev => prev.filter(d => d.id !== id));
  };

  const handleLoadDemandIntoSheet = (demand: ElasticDemand) => {
    setSheetData(prev => {
      const defaultTare = demand.defaultTare || prev.defaultTare || 0.5;
      const defaultWtPerUnit = demand.unitWeightGm || prev.defaultWtPerUnit || 8.0;
      
      const updatedCartons = prev.cartons.map((c, idx) =>
        recomputeCarton(
          {
            ...c,
            tareWt: defaultTare,
            wtPerUnit: defaultWtPerUnit,
          },
          idx,
          defaultTare,
          defaultWtPerUnit
        )
      );

      return {
        ...prev,
        buyer: demand.buyer,
        customer: demand.customer,
        ref: demand.ref,
        size: demand.size,
        color: demand.color,
        defaultTare,
        defaultWtPerUnit,
        cartons: updatedCartons,
        logs: [...(prev.logs || []), createLog('SYSTEM', `Loaded Demand for ${demand.buyer} (${demand.ref} - ${demand.requiredQtyMtr} Mtr)`)].slice(-50),
      };
    });

    setActiveTab('table');
  };

  // Cascade default tare & unit weight to cartons
  const handleApplyDefaultWeights = () => {
    setSheetData(prev => {
      const updatedCartons = prev.cartons.map((c, idx) =>
        recomputeCarton(
          {
            ...c,
            tareWt: prev.defaultTare,
            wtPerUnit: prev.defaultWtPerUnit,
          },
          idx,
          prev.defaultTare,
          prev.defaultWtPerUnit
        )
      );
      return {
        ...prev,
        cartons: updatedCartons,
        logs: [...(prev.logs || []), createLog('SYSTEM', `Applied default weights to all cartons`)].slice(-50),
      };
    });
  };

  // Update single carton
  const handleUpdateCarton = (id: string, updated: Partial<CartonRow>) => {
    setSheetData(prev => {
      const cTarget = prev.cartons.find(c => c.id === id);
      const updatedCartons = prev.cartons.map((c, idx) => {
        if (c.id === id) {
          return recomputeCarton(
            {
              ...c,
              ...updated,
            },
            idx,
            prev.defaultTare,
            prev.defaultWtPerUnit
          );
        }
        return c;
      });
      return {
        ...prev,
        cartons: updatedCartons,
        logs: [...(prev.logs || []), createLog('UPDATE', `Updated Carton #${cTarget?.cartonNo}`)].slice(-50),
      };
    });
  };

  // Add 1 carton
  const handleAddCarton = () => {
    setSheetData(prev => {
      const nextNo = prev.cartons.length + 1;
      const newCarton = recomputeCarton(
        {
          cartonNo: nextNo,
          grossWt: 0,
          tareWt: prev.defaultTare,
          wtPerUnit: prev.defaultWtPerUnit,
        },
        prev.cartons.length,
        prev.defaultTare,
        prev.defaultWtPerUnit
      );
      return {
        ...prev,
        cartons: [...prev.cartons, newCarton],
        logs: [...(prev.logs || []), createLog('ADD', `Added new Carton #${newCarton.cartonNo}`)].slice(-50),
      };
    });
  };

  // Add bulk cartons
  const handleAddBulk = (count: number) => {
    setSheetData(prev => {
      const newCartons = [...prev.cartons];
      const startNo = newCartons.length + 1;
      for (let i = 0; i < count; i++) {
        newCartons.push(
          recomputeCarton(
            {
              cartonNo: startNo + i,
              grossWt: 0,
              tareWt: prev.defaultTare,
              wtPerUnit: prev.defaultWtPerUnit,
            },
            newCartons.length + i,
            prev.defaultTare,
            prev.defaultWtPerUnit
          )
        );
      }
      return {
        ...prev,
        cartons: newCartons,
      };
    });
  };

  // Delete carton
  const handleDeleteCarton = (id: string) => {
    setSheetData(prev => {
      const cTarget = prev.cartons.find(c => c.id === id);
      const filtered = prev.cartons.filter(c => c.id !== id);
      // Renumber cartons cleanly
      const renumbered = filtered.map((c, idx) => ({
        ...c,
        cartonNo: idx + 1,
      }));
      return {
        ...prev,
        cartons: renumbered,
      };
    });
  };

  // Duplicate carton
  const handleDuplicateCarton = (carton: CartonRow) => {
    setSheetData(prev => {
      const nextNo = prev.cartons.length + 1;
      const duplicated = recomputeCarton(
        {
          ...carton,
          id: undefined,
          cartonNo: nextNo,
        },
        prev.cartons.length,
        prev.defaultTare,
        prev.defaultWtPerUnit
      );
      return {
        ...prev,
        cartons: [...prev.cartons, duplicated],
      };
    });
  };

  // Batch update multiple cartons simultaneously
  const handleBatchUpdateCartons = (ids: string[], updated: Partial<CartonRow>) => {
    setSheetData(prev => {
      const updatedCartons = prev.cartons.map((c, idx) => {
        if (ids.includes(c.id)) {
          return recomputeCarton(
            {
              ...c,
              ...updated,
            },
            idx,
            prev.defaultTare,
            prev.defaultWtPerUnit
          );
        }
        return c;
      });
      return {
        ...prev,
        cartons: updatedCartons,
        logs: [...(prev.logs || []), createLog('BATCH', `Batch updated ${ids.length} cartons`)].slice(-50),
      };
    });
  };

  // Batch delete multiple cartons simultaneously
  const handleBatchDeleteCartons = (ids: string[]) => {
    setSheetData(prev => {
      const filtered = prev.cartons.filter(c => !ids.includes(c.id));
      const renumbered = (filtered.length > 0 ? filtered : [
        recomputeCarton({ cartonNo: 1, grossWt: 0 }, 0, prev.defaultTare, prev.defaultWtPerUnit)
      ]).map((c, idx) => ({
        ...c,
        cartonNo: idx + 1,
      }));
      return {
        ...prev,
        cartons: renumbered,
      };
    });
  };

  // Batch duplicate multiple cartons
  const handleBatchDuplicateCartons = (ids: string[]) => {
    setSheetData(prev => {
      const toDuplicate = prev.cartons.filter(c => ids.includes(c.id));
      if (toDuplicate.length === 0) return prev;
      const duplicatedCartons = toDuplicate.map((c) => ({
        ...c,
        id: undefined,
      }));
      const combined = [...prev.cartons, ...duplicatedCartons];
      const renumbered = combined.map((c, idx) =>
        recomputeCarton(
          { ...c, cartonNo: idx + 1 },
          idx,
          prev.defaultTare,
          prev.defaultWtPerUnit
        )
      );
      return {
        ...prev,
        cartons: renumbered,
      };
    });
  };

  // Remove empty rows
  const handleClearEmpty = () => {
    setSheetData(prev => {
      const filtered = prev.cartons.filter(c => c.grossWt > 0 || c.netWt > 0 || c.lengthMtr > 0);
      const renumbered = filtered.map((c, idx) => ({
        ...c,
        cartonNo: idx + 1,
      }));
      return {
        ...prev,
        cartons: renumbered.length > 0 ? renumbered : [
          recomputeCarton({ cartonNo: 1, grossWt: 0 }, 0, prev.defaultTare, prev.defaultWtPerUnit)
        ],
      };
    });
  };

  // Reset to initial dataset matching user photo
  const handleReset = () => {
    if (window.confirm(lang === 'en' ? 'Reset to sample sheet data from image?' : 'ছবির স্যাম্পল ডাটাতে রিসেট করবেন?')) {
      setSheetData(INITIAL_IMAGE_DATA);
    }
  };


  const handleConvertWeights = (multiplier: number, target: 'cartons' | 'unit') => {
    setSheetData(prev => {
      if (target === 'cartons') {
        const newCartons = prev.cartons.map((c, idx) => {
          return recomputeCarton(
            {
              ...c,
              grossWt: c.grossWt > 0 ? c.grossWt * multiplier : 0,
              tareWt: c.tareWt * multiplier,
            },
            idx,
            prev.defaultTare * multiplier,
            prev.defaultWtPerUnit
          );
        });
        return {
          ...prev,
          defaultTare: Number((prev.defaultTare * multiplier).toFixed(3)),
          cartons: newCartons,
          logs: [...(prev.logs || []), createLog('SYSTEM', `Converted carton weights by ${multiplier}`)].slice(-50),
        };
      } else {
        // Convert unit weight
        const newUnit = Number((prev.defaultWtPerUnit * multiplier).toFixed(2));
        const newCartons = prev.cartons.map((c, idx) => {
          return recomputeCarton(
            {
              ...c,
              wtPerUnit: c.wtPerUnit * multiplier,
            },
            idx,
            prev.defaultTare,
            newUnit
          );
        });
        return {
          ...prev,
          defaultWtPerUnit: newUnit,
          cartons: newCartons,
          logs: [...(prev.logs || []), createLog('SYSTEM', `Converted unit weight by ${multiplier}`)].slice(-50),
        };
      }
    });
  };

  // Bulk paste weights handler
  const handleBulkPasteWeights = (weights: number[]) => {
    setSheetData(prev => {
      const newCartons = weights.map((grossWt, idx) => {
        return recomputeCarton(
          {
            cartonNo: idx + 1,
            grossWt,
            tareWt: prev.defaultTare,
            wtPerUnit: prev.defaultWtPerUnit,
          },
          idx,
          prev.defaultTare,
          prev.defaultWtPerUnit
        );
      });

      return {
        ...prev,
        cartons: newCartons,
      };
    });
  };

  // Apply extracted AI data
  const handleApplyExtractedData = (data: Partial<PackingSheetData>) => {
    setSheetData(prev => ({
      ...prev,
      ...data,
      cartons: data.cartons || prev.cartons,
    }));
  };

  // Import data from Excel / OneDrive
  const handleImportExcelData = (importedCartons: CartonRow[], importedHeader?: Partial<PackingSheetData>) => {
    setSheetData(prev => ({
      ...prev,
      ...(importedHeader || {}),
      cartons: importedCartons.length > 0 ? importedCartons : prev.cartons,
    }));
  };

  // Printing engine with orientation & settings support
  const executePrint = (orientation: 'landscape' | 'portrait') => {
    setPrintOrientation(orientation);
    document.body.classList.remove('print-landscape', 'print-portrait');
    document.body.classList.add(orientation === 'landscape' ? 'print-landscape' : 'print-portrait');
    
    // Trigger visual toast notification
    setIsPrintToastVisible(true);

    // Open browser native print dialog after short tick for styles to settle
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleRequestPrint = (targetOrientation?: 'landscape' | 'portrait', forcePrompt?: boolean) => {
    const orientation = targetOrientation || (activeTab === 'stickers' ? 'portrait' : 'landscape');
    setPrintOrientation(orientation);
    setIsPreviewModalOpen(true);
  };

  const t = translations[lang];

  return (
    <div className={`min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white ${isFocusMode ? 'focus-mode-active' : ''}`}>
      {/* Header Bar - Collapsed in Focus Mode */}
      {!isFocusMode && (
        <Header
          lang={lang}
          setLang={setLang}
          onOpenAiScan={() => setIsAiScanOpen(true)}
          onOpenHelp={() => setIsHelpOpen(true)}
          onOpenActivityLog={() => setIsActivityLogOpen(true)}
          onOpenTools={() => setIsToolsOpen(true)}
          onOpenExcelDrive={() => setIsExcelDriveOpen(true)}
          onOpenApk={() => setIsApkModalOpen(true)}
          onOpenIndexedDbBackups={() => setIsIndexedDbModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onPrint={() => handleRequestPrint(activeTab === 'stickers' ? 'portrait' : 'landscape')}
          onExportCsv={() => exportPackingSheetToCsv(sheetData, summary)}
          onReset={handleReset}
          onImportData={handleImportExcelData}
          onUndo={undoSheetData}
          onRedo={redoSheetData}
          canUndo={canUndo}
          canRedo={canRedo}
          sheetData={sheetData}
          summary={summary}
          lastSavedTime={lastSavedTime}
          isSaving={isSaving}
          isOnline={isOnline}
          syncStatus={syncStatus}
          lastCloudSyncTime={lastCloudSyncTime}
          pendingOfflineChanges={pendingOfflineChanges}
          onManualSync={triggerManualSync}
        />
      )}

      {/* Focus Mode Floating Top Bar */}
      {isFocusMode && (
        <div className="sticky top-0 z-40 bg-slate-900 text-white px-4 py-2.5 shadow-md flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>{t.focusMode || 'Focus Mode'}</span>
            </div>
            <div className="text-xs text-slate-300 font-medium hidden sm:flex items-center gap-2">
              <span>{sheetData.companyName || 'Packing Sheet'}</span>
              <span>•</span>
              <span>Buyer: <strong className="text-white">{sheetData.buyer || 'N/A'}</strong></span>
              <span>•</span>
              <span>Ref: <strong className="text-white">{sheetData.ref || 'N/A'}</strong></span>
              <span>•</span>
              <span>Size: <strong className="text-white">{sheetData.size || 'N/A'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs bg-slate-800 text-slate-200 px-3 py-1 rounded-lg border border-slate-700 font-mono hidden md:flex items-center gap-3">
              <span>Cartons: <strong className="text-white">{summary.totalCtn}</strong></span>
              <span>•</span>
              <span>Net: <strong className="text-emerald-400">{summary.totalNetWt.toFixed(2)} Kg</strong></span>
              <span>•</span>
              <span>Mtr: <strong className="text-indigo-400">{Math.round(summary.totalMtr).toLocaleString()} m</strong></span>
            </div>

            <button
              onClick={() => setIsFocusMode(false)}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition cursor-pointer shadow-sm"
              title="Exit Focus Mode (Restore full UI) [Esc]"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>{t.exitFocusMode || 'Exit Focus Mode'}</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 bg-slate-950/20 text-slate-950 rounded text-[10px] font-mono">
                Esc
              </kbd>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 max-w-7xl w-full mx-auto ${isFocusMode ? 'p-2 sm:p-4' : 'p-4 sm:p-6'}`}>
        {/* Order Header Input Form - Collapsed in Focus Mode */}
        {!isFocusMode && (
          <div className="print:hidden">
            <OrderHeaderForm
              sheetData={sheetData}
              onChange={handleUpdateHeader}
              onApplyDefaultWeights={handleApplyDefaultWeights}
              lang={lang}
              demands={demands}
              onSelectDemand={handleLoadDemandIntoSheet}
              onOpenDemandsView={() => setActiveTab('demands')}
            />
          </div>
        )}

        {/* Real-time Summary Cards - Collapsed in Focus Mode */}
        {!isFocusMode && (
          <div className="print:hidden">
            <SummaryCards 
              summary={summary} 
              sheetData={sheetData}
              lang={lang} 
            />
          </div>
        )}

        {/* View Switcher Tabs - Collapsed in Focus Mode */}
        {!isFocusMode && (
          <div className="flex items-center gap-2 mb-4 border-b border-slate-300 pb-2 print:hidden overflow-x-auto">
            {/* Table View Tab */}
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
                activeTab === 'table'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>{t.tableView}</span>
              <span className="text-[10px] bg-slate-700 text-slate-200 px-1.5 py-0.2 rounded font-mono">
                {filteredCartons.length}
              </span>
            </button>

            {/* Factory Sheet (Exact Photo Replica) Tab */}
            <button
              onClick={() => setActiveTab('sheet')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
                activeTab === 'sheet'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-emerald-400" />
              <span>{t.exactSheetView}</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">
                Photo Grid
              </span>
            </button>

            {/* Sticker Labels Tab */}
            <button
              onClick={() => setActiveTab('stickers')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
                activeTab === 'stickers'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Tag className="w-4 h-4 text-indigo-400" />
              <span>{t.stickerLabels}</span>
            </button>

            {/* Analytics Tab */}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
                activeTab === 'analytics'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-rose-400" />
              <span>{t.analyticsTab || 'Analytics'}</span>
            </button>

            <div className="w-px h-6 bg-slate-300 mx-2 self-center shrink-0"></div>

            {/* Tracker - Upload Tab */}
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-blue-600 hover:bg-blue-50 border border-blue-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Schedule</span>
            </button>

            {/* Tracker - Tracker Tab */}
            <button
              onClick={() => setActiveTab('tracker')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
                activeTab === 'tracker'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-blue-600 hover:bg-blue-50 border border-blue-200'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Tracker</span>
            </button>

            {/* Tracker - Challan Tab */}
            <button
              onClick={() => setActiveTab('challan')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
                activeTab === 'challan'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-blue-600 hover:bg-blue-50 border border-blue-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Challans</span>
            </button>

            {/* Tracker - Truck Tab */}
            <button
              onClick={() => setActiveTab('truck')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
                activeTab === 'truck'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-blue-600 hover:bg-blue-50 border border-blue-200'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Trucks</span>
            </button>

            {/* Tracker - Report Tab */}
            <button
              onClick={() => setActiveTab('report')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
                activeTab === 'report'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-blue-600 hover:bg-blue-50 border border-blue-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Daily Report</span>
            </button>
          </div>
        )}

        {/* Tab Views */}
        {(!isFocusMode && activeTab === 'demands') && (
          <div className="print:hidden">
            <ElasticDemandView
              demands={demands}
              onSaveDemand={handleSaveDemand}
              onDeleteDemand={handleDeleteDemand}
              onLoadDemandIntoSheet={handleLoadDemandIntoSheet}
              currentSheetData={sheetData}
              lang={lang}
            />
          </div>
        )}

        {(isFocusMode || activeTab === 'table') && (
          <div className="print:hidden">
            <CartonTable
              sheetData={filteredSheetData}
              onUpdateCarton={handleUpdateCarton}
              onBatchUpdateCartons={handleBatchUpdateCartons}
              onBatchDeleteCartons={handleBatchDeleteCartons}
              onBatchDuplicateCartons={handleBatchDuplicateCartons}
              onAddCarton={handleAddCarton}
              onAddBulk={handleAddBulk}
              onDeleteCarton={handleDeleteCarton}
              onDuplicateCarton={handleDuplicateCarton}
              onClearEmpty={handleClearEmpty}
              onOpenCartonQr={handleOpenCartonQr}
              lang={lang}
              demands={demands}
              onSelectDemand={(demand) => {
                if (demand) {
                  handleLoadDemandIntoSheet(demand);
                }
              }}
              isFocusMode={isFocusMode}
              onToggleFocusMode={() => setIsFocusMode(prev => !prev)}
            />
          </div>
        )}

        {(!isFocusMode && activeTab === 'sheet') && (
          <div>
            <FactorySheetView
              sheetData={filteredSheetData}
              summary={filteredSummary}
              lang={lang}
              onUpdateCarton={handleUpdateCarton}
              onUpdateHeader={handleUpdateHeader}
              onRequestPrint={orientation => handleRequestPrint(orientation)}
            />
          </div>
        )}

        {(!isFocusMode && activeTab === 'stickers') && (
          <div>
            <StickerLabelsView
              sheetData={filteredSheetData}
              summary={filteredSummary}
              lang={lang}
              onRequestPrint={orientation => handleRequestPrint(orientation || 'portrait')}
              onOpenCartonQr={handleOpenCartonQr}
            />
          </div>
        )}

        {(!isFocusMode && activeTab === 'analytics') && (
          <div className="print:hidden">
            <AnalyticsView
              sheetData={filteredSheetData}
              lang={lang}
            />
          </div>
        )}

        {/* Tracker Views */}
        {(!isFocusMode && activeTab === 'upload') && (
          <div className="print:hidden">
            <ScheduleUploader />
          </div>
        )}
        {(!isFocusMode && activeTab === 'tracker') && (
          <div className="print:hidden">
            <ScheduleTracker />
          </div>
        )}
        {(!isFocusMode && activeTab === 'challan') && (
          <div className="print:hidden">
            <ChallanGenerator />
          </div>
        )}
        {(!isFocusMode && activeTab === 'truck') && (
          <div className="print:hidden">
            <TruckManager />
          </div>
        )}
        {(!isFocusMode && activeTab === 'report') && (
          <div className="print:hidden">
            <DailyReportView />
          </div>
        )}

        {/* When printing from table view, automatically render factory sheet */}
        <div className="hidden print:block">
          {activeTab === 'stickers' ? (
            <StickerLabelsView
              sheetData={filteredSheetData}
              summary={filteredSummary}
              lang={lang}
              onOpenCartonQr={handleOpenCartonQr}
            />
          ) : (
            <FactorySheetView
              sheetData={filteredSheetData}
              summary={filteredSummary}
              lang={lang}
              onUpdateCarton={handleUpdateCarton}
              onUpdateHeader={handleUpdateHeader}
            />
          )}
        </div>
      </main>

      {/* Floating summary badge - Collapsed in Focus Mode */}
      {!isFocusMode && <FloatingSummaryBadge summary={summary} lang={lang} />}

      {/* Footer - Collapsed in Focus Mode */}
      {!isFocusMode && (
        <footer className="bg-white border-t border-slate-200 py-3 px-4 text-center text-xs text-slate-500 print:hidden">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>
              {sheetData.companyName || 'GOOD & FAST Pa. Co. Ltd'} — Export Garment Packing & Elastic Calculation System
            </p>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span>Net Wt = Gross − Tare</span>
              <span>•</span>
              <span>Mtr = (Net × 1000) / Wt/unit</span>
              <span>•</span>
              <span>Gry = (Mtr / 0.9144) / 144</span>
            </div>
          </div>
        </footer>
      )}

      {/* Modals */}
      <CartonQrDetailModal
        isOpen={isCartonQrModalOpen}
        onClose={() => {
          setIsCartonQrModalOpen(false);
          setDirectQrPayload(null);
        }}
        carton={selectedCartonForQr}
        sheetData={sheetData}
        totalCtn={summary.totalCtn}
        lang={lang}
        onNavigateCarton={handleNavigateCarton}
        hasPrevCarton={currentCartonIndex > 0}
        hasNextCarton={currentCartonIndex >= 0 && currentCartonIndex < sheetData.cartons.length - 1}
        directQrPayload={directQrPayload}
      />

      <ToolsModal
        isOpen={isToolsOpen}
        onClose={() => setIsToolsOpen(false)}
        lang={lang}
        defaultWtPerUnit={sheetData.defaultWtPerUnit}
        onApplyUnitWeight={wt => {
          handleUpdateHeader({ defaultWtPerUnit: wt });
          handleApplyDefaultWeights();
        }}
        onBulkPasteWeights={handleBulkPasteWeights}
        onConvertWeights={handleConvertWeights}
      />

      <ExcelDriveModal
        isOpen={isExcelDriveOpen}
        onClose={() => setIsExcelDriveOpen(false)}
        sheetData={sheetData}
        summary={summary}
        lang={lang}
        onImportData={handleImportExcelData}
      />

      <ApkDownloadModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
        lang={lang}
      />

      <IndexedDbBackupModal
        isOpen={isIndexedDbModalOpen}
        onClose={() => setIsIndexedDbModalOpen(false)}
        lang={lang}
        currentSheetData={sheetData}
        onRestoreBackup={restored => {
          setSheetData(restored);
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentSheetData={sheetData}
        onLoadSheetData={loaded => {
          setSheetData(loaded);
        }}
        lang={lang}
      />

      <AiScanModal
        isOpen={isAiScanOpen}
        onClose={() => setIsAiScanOpen(false)}
        onApplyExtractedData={handleApplyExtractedData}
        lang={lang}
      />

      <ElasticDemandModal
        isOpen={isAddDemandModalOpen}
        onClose={() => setIsAddDemandModalOpen(false)}
        onSave={(newDemand) => {
          handleSaveDemand(newDemand);
          setIsAddDemandModalOpen(false);
          setActiveTab('demands');
        }}
        lang={lang}
      />

      <FormulaHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        lang={lang}
      />

      <PrintPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        onProceed={(orientation) => {
          setIsPreviewModalOpen(false);
          executePrint(orientation);
        }}
        activeTab={activeTab}
        sheetData={sheetData}
        summary={summary}
        lang={lang}
      />

      <PrintToast
        isVisible={isPrintToastVisible}
        onClose={() => setIsPrintToastVisible(false)}
        orientation={printOrientation}
        lang={lang}
      />
    </div>
  );
}
