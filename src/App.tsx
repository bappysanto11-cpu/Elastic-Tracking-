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
import { FormulaHelpModal } from './components/FormulaHelpModal';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { PrintToast } from './components/PrintToast';
import { ExcelDriveModal } from './components/ExcelDriveModal';
import { ShareSheetModal } from './components/ShareSheetModal';
import { CartonQrDetailModal } from './components/CartonQrDetailModal';
import { ApkDownloadModal } from './components/ApkDownloadModal';
import { IndexedDbBackupModal } from './components/IndexedDbBackupModal';
import { AuthModal } from './components/AuthModal';
import { triggerIndexedDbBackup, openIndexedDB } from './utils/indexedDbBackup';
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
import { Table, LayoutGrid, Tag, Layers, Check, QrCode, BarChart3, Undo2, Redo2, Search, RotateCcw, ClipboardList, Upload, FileText, Truck, Package, FileSpreadsheet, SlidersHorizontal } from 'lucide-react';
import { ExcelScheduleManager } from './components/ExcelScheduleManager';
import { ScheduleUploader } from './components/ScheduleUploader';
import { ScheduleTracker } from './components/ScheduleTracker';
import { ChallanGenerator } from './components/ChallanGenerator';
import { TruckManager } from './components/TruckManager';
import { DailyReportView } from './components/DailyReportView';
import { ScheduleItem } from './types/schedule';
import { completeScheduleItemInTracker } from './utils/excelFileTrackerService';
import { getSharedPackingSheet } from './utils/shareSheet';

const STORAGE_KEY = 'garment_elastic_calculator_v1';

// Added workspace state to App component

export default function App() {
  const [lang, setLang] = useState<Language>('bn');
  const [activeTab, setActiveTab] = useState<'upload' | 'table' | 'sheet' | 'stickers' | 'analytics' | 'demands' | 'tracker' | 'challan' | 'truck' | 'report'>('upload');
  const [isAddDemandModalOpen, setIsAddDemandModalOpen] = useState(false);

  // Elastic Demands State
  const [demands, setDemands] = useState<ElasticDemand[]>(() => loadDemands());

  // Save demands to storage on change
  useEffect(() => {
    saveDemands(demands);
  }, [demands]);

  // Modals
  const [isToolsOpen, setIsToolsOpen] = useState<boolean>(false);
  const [toolsModalTab, setToolsModalTab] = useState<'tools' | 'security'>('tools');
  const [isViewOnlyMode, setIsViewOnlyMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') === 'view-only' || params.get('viewOnly') === 'true';
    }
    return false;
  });
  const [isExcelDriveOpen, setIsExcelDriveOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
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
  const [isOrderHeaderVisible, setIsOrderHeaderVisible] = useState<boolean>(false);

  // QR Code Carton Inspection Modal
  const [isCartonQrModalOpen, setIsCartonQrModalOpen] = useState<boolean>(false);
  const [selectedCartonForQr, setSelectedCartonForQr] = useState<CartonRow | null>(null);
  const [directQrPayload, setDirectQrPayload] = useState<CartonQrPayload | null>(null);

  // Active Schedule Item being packed from Excel Schedule Manager
  const [activePackingScheduleItem, setActivePackingScheduleItem] = useState<ScheduleItem | null>(() => {
    try {
      const saved = localStorage.getItem('garment_active_packing_schedule_item');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [previousActiveTab, setPreviousActiveTab] = useState<'upload' | 'table' | 'sheet' | 'stickers' | 'analytics' | 'demands' | 'tracker' | 'challan' | 'truck' | 'report'>('upload');
  const [packingCompleteToast, setPackingCompleteToast] = useState<{ show: boolean; message: string } | null>(null);

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

  // Handle scanned QR Code redirection and Share URL from URL parameters
  useEffect(() => {
    const scanned = parseCartonFromUrl();
    if (scanned) {
      setDirectQrPayload(scanned);
      setIsCartonQrModalOpen(true);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('shareId');
    if (shareId) {
      getSharedPackingSheet(shareId)
        .then(sharedData => {
          if (sharedData) {
            setSheetData(sharedData);
            const url = new URL(window.location.href);
            url.searchParams.delete('shareId');
            window.history.replaceState({}, '', url.toString());
          } else {
            alert(lang === 'en' ? 'Shared sheet not found.' : 'শেয়ার করা শীট পাওয়া যায়নি।');
          }
        })
        .catch(err => {
          console.error('Failed to load shared sheet:', err);
        });
    }
  }, [lang]);

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undoSheetData, redoSheetData]);

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

  const handleToggleWeightUnit = () => {
    setSheetData(prev => {
      const currentUnit = prev.weightUnit || 'kg';
      const isToGm = currentUnit === 'kg';
      const nextUnit = isToGm ? 'gm' : 'kg';
      const factor = isToGm ? 1000 : 0.001;

      const tare = Number((prev.defaultTare * factor).toFixed(3));
      
      const newCartons = prev.cartons.map((c, idx) => {
        const newGross = Number((c.grossWt * factor).toFixed(3));
        const newTare = Number((c.tareWt * factor).toFixed(3));
        return recomputeCarton(
          { ...c, grossWt: newGross, tareWt: newTare },
          idx,
          tare,
          c.wtPerUnit,
          prev.deliveryUnit || 'mtr',
          prev.pcsPerPkt,
          nextUnit
        );
      });

      return {
        ...prev,
        weightUnit: nextUnit,
        defaultTare: tare,
        cartons: newCartons,
      };
    });
  };

  // Update order header fields
  const handleUpdateHeader = (updated: Partial<PackingSheetData>) => {
    setSheetData(prev => {
      const nextData = {
        ...prev,
        ...updated,
      };

      // If itemType, deliveryUnit, pcsPerPkt, defaultTare, or defaultWtPerUnit changed, recompute cartons
      const shouldRecompute = 
        updated.itemType !== undefined || 
        updated.deliveryUnit !== undefined || 
        updated.pcsPerPkt !== undefined ||
        updated.defaultTare !== undefined ||
        updated.defaultWtPerUnit !== undefined;

      if (shouldRecompute) {
        const tare = nextData.defaultTare || 0.5;
        const unitWt = nextData.defaultWtPerUnit || 8.0;
        const delivUnit = nextData.deliveryUnit || 'mtr';
        const pcsPerPkt = nextData.pcsPerPkt;

        const recomputedCartons = nextData.cartons.map((c, idx) =>
          recomputeCarton(
            {
              ...c,
              tareWt: c.tareWt !== undefined && c.tareWt > 0 ? c.tareWt : tare,
              wtPerUnit: c.wtPerUnit !== undefined && c.wtPerUnit > 0 ? c.wtPerUnit : unitWt,
            },
            idx,
            tare,
            unitWt,
            delivUnit,
            pcsPerPkt,
            nextData.weightUnit || 'kg'
          )
        );

        return {
          ...nextData,
          cartons: recomputedCartons,
        };
      }

      return nextData;
    });
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
          defaultWtPerUnit,
          'mtr',
          undefined,
          prev.weightUnit || 'kg'
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

  const handleLoadScheduleItemIntoSheet = (item: ScheduleItem) => {
    setActivePackingScheduleItem(item);
    try {
      localStorage.setItem('garment_active_packing_schedule_item', JSON.stringify(item));
    } catch {}
    setPreviousActiveTab(activeTab === 'table' ? 'upload' : activeTab);
    setSheetData(prev => ({
      ...prev,
      buyer: item.buyer || prev.buyer,
      customer: item.customer || prev.customer,
      ref: item.customerRefPO || item.jobNo || prev.ref,
      item: item.itemDescription || prev.item,
      color: item.color || prev.color,
      size: item.size || prev.size,
      logs: [
        ...(prev.logs || []),
        createLog('SYSTEM', `Loaded Schedule Order for ${item.buyer} (${item.customerRefPO || item.jobNo} - ${item.demandQty} ${item.unit})`),
      ].slice(-50),
    }));

    setActiveTab('table');
  };

  const handleCompletePackingAndReturn = async (packedTotalQty?: number) => {
    const targetRef = activePackingScheduleItem?.id || activePackingScheduleItem?.customerRefPO || activePackingScheduleItem?.jobNo || sheetData.ref || sheetData.buyer;
    if (targetRef) {
      await completeScheduleItemInTracker(targetRef, packedTotalQty);
    }
    const completedBuyer = activePackingScheduleItem?.buyer || sheetData.buyer || 'Order';
    const completedRef = activePackingScheduleItem?.customerRefPO || activePackingScheduleItem?.jobNo || sheetData.ref || '';
    setActivePackingScheduleItem(null);
    try {
      localStorage.removeItem('garment_active_packing_schedule_item');
    } catch {}

    setPackingCompleteToast({
      show: true,
      message: lang === 'en'
        ? `✅ Packing successfully completed for ${completedBuyer} (${completedRef})! Returned to schedule.`
        : `✅ ${completedBuyer} (${completedRef})-এর প্যাকিং সম্পূর্ণ হয়েছে! শিডিউল তালিকায় ফিরে আসা হয়েছে।`,
    });
    setTimeout(() => {
      setPackingCompleteToast(null);
    }, 4500);

    const returnTarget = (previousActiveTab && previousActiveTab !== 'table' ? previousActiveTab : 'upload');
    setActiveTab(returnTarget);
  };

  const handleReturnToPreviousTab = () => {
    const returnTarget = (previousActiveTab && previousActiveTab !== 'table' ? previousActiveTab : 'upload');
    setActiveTab(returnTarget);
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
          prev.defaultWtPerUnit,
          prev.deliveryUnit || 'mtr',
          prev.pcsPerPkt
        , prev.weightUnit || 'kg')
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
            prev.defaultWtPerUnit,
            prev.deliveryUnit || 'mtr',
            prev.pcsPerPkt,
            prev.weightUnit || 'kg'
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
        prev.defaultWtPerUnit,
        prev.deliveryUnit || 'mtr',
        prev.pcsPerPkt
      , prev.weightUnit || 'kg');
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
            prev.defaultWtPerUnit,
            prev.deliveryUnit || 'mtr',
            prev.pcsPerPkt
          , prev.weightUnit || 'kg')
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
        prev.defaultWtPerUnit,
        prev.deliveryUnit || 'mtr',
        prev.pcsPerPkt,
        prev.weightUnit || 'kg'
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
            prev.defaultWtPerUnit,
            prev.deliveryUnit || 'mtr',
            prev.pcsPerPkt
          , prev.weightUnit || 'kg');
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
        recomputeCarton({ cartonNo: 1, grossWt: 0 }, 0, prev.defaultTare, prev.defaultWtPerUnit, prev.deliveryUnit || 'mtr', prev.pcsPerPkt, prev.weightUnit || 'kg')
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
          prev.defaultWtPerUnit,
          prev.deliveryUnit || 'mtr',
          prev.pcsPerPkt,
          prev.weightUnit || 'kg'
        )
      );
      return {
        ...prev,
        cartons: renumbered,
      };
    });
  };

  // Reorder cartons sequence (from drag-and-drop or sort tools)
  const handleReorderCartons = (newCartons: CartonRow[]) => {
    setSheetData(prev => {
      const nonReordered = prev.cartons.filter(c => !newCartons.some(nc => nc.id === c.id));
      const combined = [...newCartons, ...nonReordered];
      const renumbered = combined.map((c, idx) => ({
        ...c,
        cartonNo: idx + 1,
      }));
      return {
        ...prev,
        cartons: renumbered,
        logs: [...(prev.logs || []), createLog('BATCH', `Reordered printing sequence of ${newCartons.length} cartons`)].slice(-50),
      };
    });
  };

  // Remove empty rows
  const handleClearEmpty = () => {
    setSheetData(prev => {
      const filtered = prev.cartons.filter(c => c.grossWt > 0 || c.netWt > 0 || c.lengthMtr > 0 || (c.qtyPcs && c.qtyPcs > 0));
      const renumbered = filtered.map((c, idx) => ({
        ...c,
        cartonNo: idx + 1,
      }));
      return {
        ...prev,
        cartons: renumbered.length > 0 ? renumbered : [
          recomputeCarton({ cartonNo: 1, grossWt: 0 }, 0, prev.defaultTare, prev.defaultWtPerUnit, prev.deliveryUnit || 'mtr', prev.pcsPerPkt, prev.weightUnit || 'kg')
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
            prev.defaultWtPerUnit,
            prev.deliveryUnit || 'mtr',
            prev.pcsPerPkt,
            prev.weightUnit || 'kg'
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
            newUnit,
            prev.deliveryUnit || 'mtr',
            prev.pcsPerPkt,
            prev.weightUnit || 'kg'
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
  const handleBulkPasteWeights = (
    weights: number[],
    mode: 'append' | 'replace' | 'fromIndex' = 'replace',
    startIndex: number = 0,
    customTare?: number,
    customUnitWt?: number
  ) => {
    setSheetData(prev => {
      const tare = customTare !== undefined ? customTare : prev.defaultTare;
      const unitWt = customUnitWt !== undefined ? customUnitWt : prev.defaultWtPerUnit;
      const delivUnit = prev.deliveryUnit || 'mtr';
      const pcsPerPkt = prev.pcsPerPkt;

      let updatedCartons: CartonRow[] = [];

      if (mode === 'replace') {
        updatedCartons = weights.map((grossWt, idx) => {
          return recomputeCarton(
            {
              cartonNo: idx + 1,
              grossWt,
              tareWt: tare,
              wtPerUnit: unitWt,
            },
            idx,
            tare,
            unitWt,
            delivUnit,
            pcsPerPkt
          , prev.weightUnit || 'kg');
        });
      } else if (mode === 'append') {
        const existing = [...prev.cartons];
        const newRows = weights.map((grossWt, idx) => {
          return recomputeCarton(
            {
              cartonNo: existing.length + idx + 1,
              grossWt,
              tareWt: tare,
              wtPerUnit: unitWt,
            },
            existing.length + idx,
            tare,
            unitWt,
            delivUnit,
            pcsPerPkt
          , prev.weightUnit || 'kg');
        });
        updatedCartons = [...existing, ...newRows];
      } else if (mode === 'fromIndex') {
        const existing = [...prev.cartons];
        const sIdx = Math.max(0, startIndex);

        // Ensure array is long enough
        while (existing.length < sIdx + weights.length) {
          existing.push(
            recomputeCarton(
              {
                cartonNo: existing.length + 1,
                grossWt: 0,
                tareWt: tare,
                wtPerUnit: unitWt,
              },
              existing.length,
              tare,
              unitWt,
              delivUnit,
              pcsPerPkt
            , prev.weightUnit || 'kg')
          );
        }

        weights.forEach((grossWt, wIdx) => {
          const targetIdx = sIdx + wIdx;
          existing[targetIdx] = recomputeCarton(
            {
              ...existing[targetIdx],
              cartonNo: targetIdx + 1,
              grossWt,
              tareWt: tare,
              wtPerUnit: unitWt,
            },
            targetIdx,
            tare,
            unitWt,
            delivUnit,
            pcsPerPkt
          , prev.weightUnit || 'kg');
        });

        updatedCartons = existing.map((c, i) => ({ ...c, cartonNo: i + 1 }));
      }

      return {
        ...prev,
        defaultTare: tare,
        defaultWtPerUnit: unitWt,
        cartons: updatedCartons,
        logs: [...(prev.logs || []), createLog('UPDATE', `Imported ${weights.length} carton weights (${mode})`)].slice(-50),
      };
    });
  };

  // Apply extracted AI data
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
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header Bar */}
      <Header
        lang={lang}
        setLang={setLang}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenActivityLog={() => setIsActivityLogOpen(true)}
        onOpenTools={() => setIsToolsOpen(true)}
        onOpenScheduleUpload={() => setActiveTab('upload')}
        onOpenExcelDrive={() => setIsExcelDriveOpen(true)}
        onOpenShareSheet={() => setIsShareModalOpen(true)}
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
        onToggleWeightUnit={handleToggleWeightUnit}
        weightUnit={sheetData.weightUnit || 'kg'}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* Packing Complete Feedback Notification Toast */}
        {packingCompleteToast && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-900 text-emerald-100 border border-emerald-500 shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🎉</span>
              <span className="text-sm font-bold text-white">{packingCompleteToast.message}</span>
            </div>
            <button
              onClick={() => setPackingCompleteToast(null)}
              className="text-emerald-300 hover:text-white text-xs font-bold px-2 py-1 rounded hover:bg-emerald-800 transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* View-Only Security Mode Banner */}
        {isViewOnlyMode && (
          <div className="mb-4 p-3 sm:p-3.5 rounded-xl bg-indigo-950 text-white border border-indigo-800 flex items-center justify-between shadow-lg print:hidden animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-900 border border-indigo-700 flex items-center justify-center text-indigo-300 shrink-0">
                <span className="text-sm">🔒</span>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span>{lang === 'en' ? 'View-Only Access Enforced' : 'টিম ভিউ-অনলি মোড সক্রিয়'}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-500/40">
                    Firebase Auth
                  </span>
                </p>
                <p className="text-[11px] text-indigo-200">
                  {lang === 'en' 
                    ? 'Read-only access level active for this team session. Weight modifications are restricted.' 
                    : 'এই সেশনের জন্য শুধুমাত্র দেখার অনুমতি দেওয়া হয়েছে। কোনো পরিমাপ পরিবর্তন করা যাবে না।'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setToolsModalTab('security');
                  setIsToolsOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition shadow-xs cursor-pointer"
              >
                {lang === 'en' ? 'Security Settings' : 'সিকিউরিটি সেটিংস'}
              </button>
              <button
                onClick={() => setIsViewOnlyMode(false)}
                className="p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-900 transition cursor-pointer"
                title="Dismiss Banner"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Real-time Summary Cards */}
        <div className="print:hidden">
          <SummaryCards 
            summary={summary} 
            sheetData={sheetData}
            lang={lang} 
          />
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 mb-4 border-b border-slate-300 pb-2 print:hidden overflow-x-auto">
            {/* Primary Tab 1: Upload Schedule & Production Output Hub */}
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/40'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <Upload className="w-4 h-4 text-blue-500" />
              <span>{lang === 'en' ? 'Excel Schedule & Outputs' : 'শিডিউল ও আউটপুট হাব'}</span>
              <span className="text-[10px] bg-blue-700 text-white px-1.5 py-0.2 rounded font-mono font-bold">
                1st Hub
              </span>
            </button>

            {/* Tab 2: Table View Tab */}
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
          </div>

        {/* Tab Views */}
        {activeTab === 'demands' && (
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

        {activeTab === 'table' && (
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
              onBulkPasteWeights={handleBulkPasteWeights}
              onSelectDemand={(demand) => {
                if (demand) {
                  handleLoadDemandIntoSheet(demand);
                }
              }}
              activeScheduleItem={activePackingScheduleItem}
              onCompletePackingAndReturn={handleCompletePackingAndReturn}
              onReturnToPreviousTab={handleReturnToPreviousTab}
              onUpdateHeader={handleUpdateHeader}
              onApplyDefaultWeights={handleApplyDefaultWeights}
              onOpenDemandsView={() => setActiveTab('demands')}
            />
          </div>
        )}

        {activeTab === 'sheet' && (
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

        {activeTab === 'stickers' && (
          <div>
            <StickerLabelsView
              sheetData={filteredSheetData}
              summary={filteredSummary}
              lang={lang}
              onRequestPrint={orientation => handleRequestPrint(orientation || 'portrait')}
              onOpenCartonQr={handleOpenCartonQr}
              onUpdateHeader={handleUpdateHeader}
              onUpdateCarton={handleUpdateCarton}
              onAddCarton={handleAddCarton}
              onDeleteCarton={handleDeleteCarton}
              onDuplicateCarton={handleDuplicateCarton}
              onAddBulk={handleAddBulk}
              onReorderCartons={handleReorderCartons}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="print:hidden">
            <AnalyticsView
              sheetData={filteredSheetData}
              lang={lang}
            />
          </div>
        )}

        {/* Tracker Views */}
        {activeTab === 'upload' && (
          <div className="print:hidden">
            <ExcelScheduleManager
              lang={lang}
              onLoadRowToPackingSheet={handleLoadScheduleItemIntoSheet}
              onNavigateToTab={tab => setActiveTab(tab)}
              onDirectOutput={(target, item) => {
                handleLoadScheduleItemIntoSheet(item);
                if (target === 'table') {
                  setActiveTab('table');
                } else if (target === 'sheet') {
                  setActiveTab('sheet');
                } else if (target === 'stickers') {
                  setActiveTab('stickers');
                } else if (target === 'print_stickers') {
                  setActiveTab('stickers');
                  setTimeout(() => handleRequestPrint('portrait'), 200);
                } else if (target === 'print_sheet') {
                  setActiveTab('sheet');
                  setTimeout(() => handleRequestPrint('landscape'), 200);
                } else if (target === 'challan') {
                  setActiveTab('challan');
                }
              }}
            />
          </div>
        )}
        {activeTab === 'tracker' && (
          <div className="print:hidden">
            <ScheduleTracker />
          </div>
        )}
        {activeTab === 'challan' && (
          <div className="print:hidden">
            <ChallanGenerator />
          </div>
        )}
        {activeTab === 'truck' && (
          <div className="print:hidden">
            <TruckManager />
          </div>
        )}
        {activeTab === 'report' && (
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

      {/* Footer */}
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
        onClose={() => {
          setIsToolsOpen(false);
          setToolsModalTab('tools');
        }}
        lang={lang}
        initialTab={toolsModalTab}
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

      <ShareSheetModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        sheetData={sheetData}
        lang={lang}
      />
    </div>
  );
}
