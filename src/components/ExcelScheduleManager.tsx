import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Plus,
  Trash2,
  Copy,
  Download,
  Save,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  FolderOpen,
  Filter,
  ChevronDown,
  Sparkles,
  Edit3,
  CheckSquare,
  Square,
  Tag,
  Zap,
  X,
  Printer,
  FileText,
  Truck,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Layers,
  LayoutGrid,
  List,
} from 'lucide-react';
import { ScheduleItem, TrackedExcelFile } from '../types/schedule';
import {
  fetchAllTrackedExcelFiles,
  getLocalTrackedFiles,
  saveTrackedExcelFile,
  updateTrackedExcelFile,
  deleteTrackedExcelFile,
  exportTrackedFileToExcel,
  exportSingleOrderToExcel,
  parseUploadedExcelFile,
  getActiveTrackedFileId,
  setActiveTrackedFileId,
  SAMPLE_EXCEL_SCHEDULE,
} from '../utils/excelFileTrackerService';

interface ExcelScheduleManagerProps {
  lang: 'en' | 'bn';
  onLoadRowToPackingSheet?: (item: ScheduleItem) => void;
  onNavigateToTab?: (tab: 'table' | 'sheet' | 'stickers' | 'analytics' | 'tracker' | 'challan' | 'upload') => void;
  onDirectOutput?: (target: 'table' | 'sheet' | 'stickers' | 'print_stickers' | 'print_sheet' | 'challan', item: ScheduleItem) => void;
}

export const ExcelScheduleManager: React.FC<ExcelScheduleManagerProps> = ({
  lang,
  onLoadRowToPackingSheet,
  onNavigateToTab,
  onDirectOutput,
}) => {
  // Tracked Files State - Initialize synchronously from local cache so screen opens instantly
  const [trackedFiles, setTrackedFiles] = useState<TrackedExcelFile[]>(() => getLocalTrackedFiles());
  const [activeFileId, setActiveFileId] = useState<string>(() => {
    const saved = getActiveTrackedFileId();
    const files = getLocalTrackedFiles();
    if (files.some(f => f.id === saved)) return saved;
    return files[0]?.id || '';
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFileDrawer, setShowFileDrawer] = useState<boolean>(false); // collapsed by default to save mobile screen space

  // View Mode: Table vs Card (Cards are super fast and touch-friendly on mobile phones)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'cards';
    }
    return 'table';
  });

  // Pagination State - CRITICAL to prevent mobile browser freeze / DOM overloading!
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 15;
    }
    return 25;
  });

  // Bulk Selection and Editing State
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ScheduleItem['status']>('in-progress');
  const [bulkChallanRef, setBulkChallanRef] = useState<string>('');
  const [isBulkApplying, setIsBulkApplying] = useState<boolean>(false);

  // Single Row Edit Modal State (Zero DOM Thrashing!)
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

  // New Row Modal State
  const [isAddRowModalOpen, setIsAddRowModalOpen] = useState<boolean>(false);
  const [newRowData, setNewRowData] = useState<Partial<ScheduleItem>>({
    buyer: '',
    customer: '',
    jobNo: '',
    customerRefPO: '',
    woNumber: '',
    itemDescription: '',
    color: '',
    size: '',
    orderQty: 1000,
    demandQty: 1000,
    unit: 'Mtr',
    status: 'pending',
    challanRef: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Background sync on mount without blocking render
  useEffect(() => {
    let isMounted = true;
    fetchAllTrackedExcelFiles()
      .then(files => {
        if (!isMounted || !files || files.length === 0) return;
        setTrackedFiles(files);
        const savedActiveId = getActiveTrackedFileId();
        const matched = files.find(f => f.id === savedActiveId);
        if (matched) {
          setActiveFileId(matched.id);
        } else if (files.length > 0) {
          setActiveFileId(files[0].id);
        }
      })
      .catch(err => {
        console.warn('Background sync failed:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Get currently selected file
  const activeFile = useMemo(() => {
    return trackedFiles.find(f => f.id === activeFileId) || trackedFiles[0] || null;
  }, [trackedFiles, activeFileId]);

  const handleSelectFile = (fileId: string) => {
    setActiveFileId(fileId);
    setActiveTrackedFileId(fileId);
    setSelectedItemIds([]);
    setStatusMessage(null);
    setCurrentPage(1);
  };

  // Upload & Parse Excel File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setStatusMessage(null);
    try {
      const parsedTrackedFile = await parseUploadedExcelFile(file, 'Factory User');
      await saveTrackedExcelFile(parsedTrackedFile);
      setTrackedFiles(prev => [parsedTrackedFile, ...prev.filter(f => f.id !== parsedTrackedFile.id)]);
      setActiveFileId(parsedTrackedFile.id);
      setActiveTrackedFileId(parsedTrackedFile.id);
      setSelectedItemIds([]);
      setCurrentPage(1);

      setStatusMessage({
        type: 'success',
        text: lang === 'en'
          ? `✅ Successfully imported "${file.name}" with ${parsedTrackedFile.totalRows} orders!`
          : `✅ সফলভাবে "${file.name}" এর ${parsedTrackedFile.totalRows}টি অর্ডার লোড হয়েছে!`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: lang === 'en' ? `❌ Import failed: ${err.message}` : `❌ এক্সেল ফাইল রিড করা যায়নি: ${err.message}`,
      });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Load default sample file
  const handleLoadSample = async () => {
    setIsLoading(true);
    try {
      await saveTrackedExcelFile(SAMPLE_EXCEL_SCHEDULE);
      setTrackedFiles(prev => {
        const filtered = prev.filter(f => f.id !== SAMPLE_EXCEL_SCHEDULE.id);
        return [SAMPLE_EXCEL_SCHEDULE, ...filtered];
      });
      setActiveFileId(SAMPLE_EXCEL_SCHEDULE.id);
      setActiveTrackedFileId(SAMPLE_EXCEL_SCHEDULE.id);
      setSelectedItemIds([]);
      setCurrentPage(1);
      setStatusMessage({
        type: 'success',
        text: lang === 'en' ? 'Loaded sample European export schedule!' : 'নমুনা গার্মেন্টস শিডিউল লোড করা হয়েছে!',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Tracked File
  const handleDeleteFile = async (fileId: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmMsg = lang === 'en'
      ? `Are you sure you want to delete "${fileName}" from tracking?`
      : `আপনি কি "${fileName}" ফাইলটি ট্র্যাকিং থেকে ডিলিট করতে চান?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteTrackedExcelFile(fileId);
      const remaining = trackedFiles.filter(f => f.id !== fileId);
      setTrackedFiles(remaining);
      if (activeFileId === fileId) {
        const nextId = remaining[0]?.id || '';
        setActiveFileId(nextId);
        setActiveTrackedFileId(nextId);
      }
      setSelectedItemIds([]);
      setCurrentPage(1);
      setStatusMessage({
        type: 'success',
        text: lang === 'en' ? 'File removed from tracking.' : 'ফাইলটি ট্র্যাকিং থেকে মুছে ফেলা হয়েছে।',
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered rows for active file
  const filteredRows = useMemo(() => {
    if (!activeFile) return [];
    const term = searchTerm.trim().toLowerCase();
    return activeFile.items.filter(item => {
      const matchSearch =
        !term ||
        (item.buyer && item.buyer.toLowerCase().includes(term)) ||
        (item.customer && item.customer.toLowerCase().includes(term)) ||
        (item.customerRefPO && item.customerRefPO.toLowerCase().includes(term)) ||
        (item.jobNo && item.jobNo.toLowerCase().includes(term)) ||
        (item.itemDescription && item.itemDescription.toLowerCase().includes(term)) ||
        (item.color && item.color.toLowerCase().includes(term)) ||
        (item.size && item.size.toLowerCase().includes(term)) ||
        (item.challanRef && item.challanRef.toLowerCase().includes(term));

      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [activeFile, searchTerm, statusFilter]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, activeFileId]);

  // Paginated Rows - ONLY renders active slice in DOM!
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safeCurrentPage, pageSize]);

  // Multi-select helpers
  const isAllVisibleSelected = useMemo(() => {
    if (paginatedRows.length === 0) return false;
    return paginatedRows.every(r => selectedItemIds.includes(r.id));
  }, [paginatedRows, selectedItemIds]);

  const handleToggleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      const visibleIdSet = new Set(paginatedRows.map(r => r.id));
      setSelectedItemIds(prev => prev.filter(id => !visibleIdSet.has(id)));
    } else {
      const newSelected = Array.from(new Set([...selectedItemIds, ...paginatedRows.map(r => r.id)]));
      setSelectedItemIds(newSelected);
    }
  };

  const handleToggleSelectRow = (itemId: string) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleClearSelection = () => {
    setSelectedItemIds([]);
  };

  // Bulk Apply Status
  const handleApplyBulkStatus = () => {
    if (!activeFile || selectedItemIds.length === 0) return;
    setIsBulkApplying(true);

    const updatedItems = activeFile.items.map(it => {
      if (selectedItemIds.includes(it.id)) {
        return {
          ...it,
          status: bulkStatus,
          updatedAt: new Date(),
        };
      }
      return it;
    });

    const updatedFile: TrackedExcelFile = {
      ...activeFile,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };

    setTrackedFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
    setIsBulkApplying(false);
    setStatusMessage({
      type: 'success',
      text: lang === 'en'
        ? `Applied status "${bulkStatus}" to ${selectedItemIds.length} orders!`
        : `${selectedItemIds.length}টি অর্ডারে স্ট্যাটাস "${bulkStatus}" আপডেট হয়েছে!`,
    });
  };

  // Bulk Apply Challan Ref
  const handleApplyBulkChallanRef = () => {
    if (!activeFile || selectedItemIds.length === 0 || !bulkChallanRef.trim()) return;
    setIsBulkApplying(true);

    const cleanRef = bulkChallanRef.trim();
    const updatedItems = activeFile.items.map(it => {
      if (selectedItemIds.includes(it.id)) {
        return {
          ...it,
          challanRef: cleanRef,
          status: it.status === 'pending' ? 'in-progress' : it.status,
          updatedAt: new Date(),
        };
      }
      return it;
    });

    const updatedFile: TrackedExcelFile = {
      ...activeFile,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };

    setTrackedFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
    setIsBulkApplying(false);
    setStatusMessage({
      type: 'success',
      text: lang === 'en'
        ? `Applied Challan Ref "${cleanRef}" to ${selectedItemIds.length} orders!`
        : `${selectedItemIds.length}টি অর্ডারে চালান রেফারেন্স "${cleanRef}" যুক্ত হয়েছে!`,
    });
  };

  // Bulk Complete 100%
  const handleBulkComplete100 = () => {
    if (!activeFile || selectedItemIds.length === 0) return;

    const updatedItems = activeFile.items.map(it => {
      if (selectedItemIds.includes(it.id)) {
        const fullQty = Number(it.demandQty) || Number(it.orderQty) || 0;
        return {
          ...it,
          completedQty: fullQty,
          progress: 100,
          status: 'completed' as const,
          updatedAt: new Date(),
        };
      }
      return it;
    });

    const updatedFile: TrackedExcelFile = {
      ...activeFile,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };

    setTrackedFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
    setStatusMessage({
      type: 'success',
      text: lang === 'en'
        ? `Marked ${selectedItemIds.length} orders as 100% Completed!`
        : `${selectedItemIds.length}টি অর্ডার ১০০% সম্পন্ন হিসেবে চিহ্নিত করা হয়েছে!`,
    });
  };

  // Bulk Delete
  const handleBulkDeleteSelected = () => {
    if (!activeFile || selectedItemIds.length === 0) return;
    const confirmMsg = lang === 'en'
      ? `Are you sure you want to delete ${selectedItemIds.length} selected orders from the Excel schedule?`
      : `আপনি কি সিলেক্ট করা ${selectedItemIds.length}টি অর্ডার ডিলিট করতে চান?`;

    if (!window.confirm(confirmMsg)) return;

    const selectedSet = new Set(selectedItemIds);
    const updatedItems = activeFile.items.filter(it => !selectedSet.has(it.id));
    const updatedFile: TrackedExcelFile = {
      ...activeFile,
      items: updatedItems,
      totalRows: updatedItems.length,
      totalDemand: updatedItems.reduce((sum, it) => sum + (Number(it.demandQty) || 0), 0),
      updatedAt: new Date().toISOString(),
    };

    setTrackedFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
    setSelectedItemIds([]);
    setStatusMessage({
      type: 'success',
      text: lang === 'en' ? 'Selected orders deleted from schedule.' : 'অর্ডারগুলো মুছে ফেলা হয়েছে।',
    });
  };

  // Delete Single Row
  const handleDeleteRow = (itemId: string) => {
    if (!activeFile) return;
    if (!window.confirm(lang === 'en' ? 'Delete this order row from the Excel schedule?' : 'এই অর্ডার রো-টি ডিলিট করবেন?')) {
      return;
    }

    const updatedItems = activeFile.items.filter(it => it.id !== itemId);
    const updatedFile: TrackedExcelFile = {
      ...activeFile,
      items: updatedItems,
      totalRows: updatedItems.length,
      totalDemand: updatedItems.reduce((sum, it) => sum + (Number(it.demandQty) || 0), 0),
      updatedAt: new Date().toISOString(),
    };

    setTrackedFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
    setSelectedItemIds(prev => prev.filter(id => id !== itemId));
  };

  // Duplicate Single Row
  const handleDuplicateRow = (item: ScheduleItem) => {
    if (!activeFile) return;

    const duplicatedItem: ScheduleItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      completedQty: 0,
      progress: 0,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedItems = [...activeFile.items, duplicatedItem];
    const updatedFile: TrackedExcelFile = {
      ...activeFile,
      items: updatedItems,
      totalRows: updatedItems.length,
      totalDemand: updatedItems.reduce((sum, it) => sum + (Number(it.demandQty) || 0), 0),
      updatedAt: new Date().toISOString(),
    };

    setTrackedFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
    setStatusMessage({
      type: 'success',
      text: lang === 'en' ? 'Row duplicated!' : 'অর্ডার রো ডুপ্লিকেট করা হয়েছে!',
    });
  };

  // Save changes to Cloud and LocalStorage
  const handleSaveChanges = async () => {
    if (!activeFile) return;

    setIsSaving(true);
    setStatusMessage(null);
    try {
      await updateTrackedExcelFile(activeFile.id, {
        items: activeFile.items,
        status: activeFile.status,
        notes: activeFile.notes,
      });

      setStatusMessage({
        type: 'success',
        text: lang === 'en'
          ? '✅ All Excel file edits successfully saved to Cloud Firestore and local device!'
          : '✅ এক্সেল ফাইলের সমস্ত এডিট ক্লাউড ফায়ারবেস এবং লোকাল স্টোরেজে সেভ হয়েছে!',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: lang === 'en' ? `❌ Save failed: ${err.message}` : `❌ সেভ করা যায়নি: ${err.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Export current edited Excel file
  const handleExportExcel = () => {
    if (!activeFile) return;
    try {
      exportTrackedFileToExcel(activeFile);
      setStatusMessage({
        type: 'success',
        text: lang === 'en'
          ? `📥 Exported "${activeFile.fileName}" with latest modifications and Challan References!`
          : `📥 এডিট করা এক্সেল ফাইল সফলভাবে ডাউনলোড হয়েছে!`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Export failed: ${err.message}`,
      });
    }
  };

  // 1-Click Complete Toggle for single order row
  const handleToggleComplete = (item: ScheduleItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeFile) return;

    const isAlreadyComplete = item.status === 'completed';
    const nextStatus: ScheduleItem['status'] = isAlreadyComplete ? 'in-progress' : 'completed';
    const fullDemand = Number(item.demandQty) || Number(item.orderQty) || 0;
    const nextCompletedQty = isAlreadyComplete ? 0 : fullDemand;
    const nextProgress = isAlreadyComplete ? 0 : 100;

    const updatedItem: ScheduleItem = {
      ...item,
      status: nextStatus,
      completedQty: nextCompletedQty,
      progress: nextProgress,
      updatedAt: new Date(),
    };

    const updatedItems = activeFile.items.map(it => it.id === item.id ? updatedItem : it);
    const updatedFile: TrackedExcelFile = {
      ...activeFile,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };

    setTrackedFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
    setStatusMessage({
      type: 'success',
      text: nextStatus === 'completed'
        ? (lang === 'en' ? `Order #${item.customerRefPO || item.buyer} marked as COMPLETED!` : `অর্ডার #${item.customerRefPO || item.buyer} সম্পন্ন (Complete) হয়েছে!`)
        : (lang === 'en' ? `Order marked as IN PROGRESS` : `অর্ডার স্ট্যাটাস ইন-প্রগ্রেস করা হয়েছে`),
    });
  };

  // 1-Click Excel Download for a single order
  const handleDownloadSingleOrder = (item: ScheduleItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const filePrefix = activeFile?.fileName ? activeFile.fileName.replace(/\.[^/.]+$/, '') : 'Order';
      exportSingleOrderToExcel(item, filePrefix);
      setStatusMessage({
        type: 'success',
        text: lang === 'en'
          ? `📥 Downloaded Excel for PO: ${item.customerRefPO || item.buyer}!`
          : `📥 অর্ডার #${item.customerRefPO || item.buyer} এর এক্সেল ফাইল ডাউনলোড সম্পন্ন!`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Download failed: ${err.message}`,
      });
    }
  };

  // Download all selected orders to Excel
  const handleDownloadSelectedOrders = () => {
    if (!activeFile || selectedItemIds.length === 0) return;
    try {
      const selectedItems = activeFile.items.filter(it => selectedItemIds.includes(it.id));
      const tempFile: TrackedExcelFile = {
        ...activeFile,
        fileName: `Selected_${selectedItems.length}_Orders.xlsx`,
        items: selectedItems,
        totalRows: selectedItems.length,
      };
      exportTrackedFileToExcel(tempFile);
      setStatusMessage({
        type: 'success',
        text: lang === 'en'
          ? `📥 Exported ${selectedItems.length} selected orders to Excel!`
          : `📥 নির্বাচিত ${selectedItems.length}টি অর্ডারের এক্সেল ডাউনলোড সম্পন্ন!`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Export failed: ${err.message}`,
      });
    }
  };

  // Save from Single Item Edit Modal
  const handleSaveItemEdit = (updatedItem: ScheduleItem) => {
    if (!activeFile) return;

    const updatedItems = activeFile.items.map(it => it.id === updatedItem.id ? updatedItem : it);
    const updatedFile: TrackedExcelFile = {
      ...activeFile,
      items: updatedItems,
      totalDemand: updatedItems.reduce((sum, it) => sum + (Number(it.demandQty) || 0), 0),
      updatedAt: new Date().toISOString(),
    };

    setTrackedFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
    setEditingItem(null);
    setStatusMessage({
      type: 'success',
      text: lang === 'en' ? 'Order updated successfully!' : 'অর্ডারের তথ্য সফলভাবে আপডেট হয়েছে!',
    });
  };

  // Add Row Modal Submit
  const handleAddNewRowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFile) return;

    const orderQtyNum = Number(newRowData.orderQty) || 0;
    const demandQtyNum = Number(newRowData.demandQty) || orderQtyNum;

    const newItem: ScheduleItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      date: new Date().toISOString().split('T')[0],
      buyer: newRowData.buyer || 'Unknown Buyer',
      customer: newRowData.customer || '',
      jobNo: newRowData.jobNo || '',
      customerRefPO: newRowData.customerRefPO || '',
      woNumber: newRowData.woNumber || '',
      itemDescription: newRowData.itemDescription || '',
      color: newRowData.color || '',
      size: newRowData.size || '',
      orderQty: orderQtyNum,
      unit: newRowData.unit || 'Mtr',
      balanceQty: orderQtyNum,
      demandQty: demandQtyNum,
      completedQty: 0,
      status: 'pending',
      progress: 0,
      challanRef: newRowData.challanRef || '',
      notes: newRowData.notes || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedItems = [newItem, ...activeFile.items];
    const updatedFile: TrackedExcelFile = {
      ...activeFile,
      items: updatedItems,
      totalRows: updatedItems.length,
      totalDemand: updatedItems.reduce((sum, it) => sum + (Number(it.demandQty) || 0), 0),
      updatedAt: new Date().toISOString(),
    };

    setTrackedFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
    setIsAddRowModalOpen(false);
    setNewRowData({
      buyer: '',
      customer: '',
      jobNo: '',
      customerRefPO: '',
      woNumber: '',
      itemDescription: '',
      color: '',
      size: '',
      orderQty: 1000,
      demandQty: 1000,
      unit: 'Mtr',
      status: 'pending',
      challanRef: '',
    });

    setStatusMessage({
      type: 'success',
      text: lang === 'en' ? 'New order row added to schedule!' : 'নতুন অর্ডার রো শিডিউলে যোগ করা হয়েছে!',
    });
  };

  // Direct Output Trigger
  const handleTriggerOutput = (
    target: 'table' | 'sheet' | 'stickers' | 'print_stickers' | 'print_sheet' | 'challan',
    item: ScheduleItem
  ) => {
    if (onDirectOutput) {
      onDirectOutput(target, item);
    } else if (onLoadRowToPackingSheet) {
      onLoadRowToPackingSheet(item);
      if (onNavigateToTab) {
        if (target === 'stickers' || target === 'print_stickers') onNavigateToTab('stickers');
        else if (target === 'sheet' || target === 'print_sheet') onNavigateToTab('sheet');
        else if (target === 'challan') onNavigateToTab('challan');
        else onNavigateToTab('table');
      }
    }
  };

  // Aggregate Metrics for active file
  const metrics = useMemo(() => {
    if (!activeFile) return { totalDemand: 0, totalCompleted: 0, pct: 0, completedCount: 0, pendingCount: 0 };
    const totalDemand = activeFile.items.reduce((s, it) => s + (Number(it.demandQty) || 0), 0);
    const totalCompleted = activeFile.items.reduce((s, it) => s + (Number(it.completedQty) || 0), 0);
    const pct = totalDemand > 0 ? Math.min(100, Math.round((totalCompleted / totalDemand) * 100)) : 0;
    const completedCount = activeFile.items.filter(it => it.status === 'completed').length;
    const pendingCount = activeFile.items.filter(it => it.status === 'pending').length;
    return { totalDemand, totalCompleted, pct, completedCount, pendingCount };
  }, [activeFile]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 animate-in fade-in duration-150">
      {/* 1. TOP HUB BANNER & CONTROLS */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl shadow-lg p-4 sm:p-6 text-white border border-blue-600/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="p-2 rounded-xl bg-white/10 backdrop-blur-xs text-blue-200 border border-white/10 shrink-0">
                <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
              </span>
              <div>
                <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 flex-wrap">
                  <span>
                    {lang === 'en'
                      ? 'Excel Schedule & Production Output Hub'
                      : 'এক্সেল শিডিউল ও প্রোডাকশন আউটপুট হাব'}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    ⚡ Fast Mobile Sync
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-blue-100/90 font-normal">
                  {lang === 'en'
                    ? 'All outputs originate here: select any order below to generate Packing Sheets, Stickers, Challans, or Excel exports.'
                    : 'সকল আউটপুটের মূল কেন্দ্র: যেকোনো অর্ডার থেকে সরাসরি প্যাকিং শিট, কার্টন স্টিকার, চালান বা এক্সেল ফাইল তৈরি করুন।'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Upload File Input Button */}
            <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-blue-800 hover:bg-blue-50 font-bold text-xs shadow-sm transition cursor-pointer border border-white">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Upload className="w-4 h-4 text-blue-600" />}
              <span>{lang === 'en' ? 'Upload Excel (.xlsx)' : 'এক্সেল আপলোড'}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Load Sample Button */}
            <button
              onClick={handleLoadSample}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/60 hover:bg-blue-600 text-white font-semibold text-xs border border-white/20 transition cursor-pointer"
              title="Load standard European export schedule"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">{lang === 'en' ? 'Sample Schedule' : 'নমুনা শিডিউল'}</span>
              <span className="sm:hidden">{lang === 'en' ? 'Sample' : 'নমুনা'}</span>
            </button>

            {/* Export Current File to Excel */}
            {activeFile && (
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm border border-emerald-400 transition cursor-pointer"
                title="Download edited schedule back to .xlsx"
              >
                <Download className="w-4 h-4" />
                <span>{lang === 'en' ? 'Export .xlsx' : 'এক্সেল ডাউনলোড'}</span>
              </button>
            )}

            {/* Save Edits Button */}
            {activeFile && (
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm border border-amber-300 transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{lang === 'en' ? 'Save Changes' : 'সেভ করুন'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div
            className={`mt-3 p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-700/60'
                : 'bg-rose-950/80 text-rose-200 border border-rose-700/60'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs opacity-70 hover:opacity-100 p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 2. TRACKED FILES DRAWER (COLLAPSIBLE) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-3.5 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-xs font-bold text-slate-800">
              {lang === 'en' ? 'Tracked Files Shelf:' : 'ট্র্যাক করা ফাইলসমূহ:'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {trackedFiles.length} {lang === 'en' ? 'Files' : 'ফাইল'}
            </span>
            {activeFile && (
              <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200 truncate max-w-[160px] sm:max-w-[280px]">
                {activeFile.fileName}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowFileDrawer(!showFileDrawer)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer px-2 py-1 rounded hover:bg-blue-50"
          >
            <span>{showFileDrawer ? (lang === 'en' ? 'Hide Files' : 'লুকান') : (lang === 'en' ? 'Switch File' : 'ফাইল পরিবর্তন')}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFileDrawer ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFileDrawer && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-3 border-t border-slate-100 mt-3 animate-in fade-in">
            {trackedFiles.map(file => {
              const isSelected = file.id === activeFileId;
              return (
                <div
                  key={file.id}
                  onClick={() => handleSelectFile(file.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-50/90 border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                      : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileSpreadsheet
                          className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}
                        />
                        <span
                          className={`text-xs font-bold truncate max-w-[160px] ${
                            isSelected ? 'text-blue-950' : 'text-slate-800'
                          }`}
                          title={file.fileName}
                        >
                          {file.fileName}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          file.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : file.status === 'in-progress'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {file.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 my-1.5">
                      <div>
                        <span className="text-slate-400">{lang === 'en' ? 'Orders: ' : 'অর্ডার: '}</span>
                        <span className="font-bold text-slate-700">{file.totalRows}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">{lang === 'en' ? 'Demand: ' : 'চাহিদা: '}</span>
                        <span className="font-bold text-slate-700">
                          {file.totalDemand?.toLocaleString()} {file.unit || 'Mtr'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-[10px] text-slate-400">
                    <span>
                      {new Date(file.uploadedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <button
                      onClick={e => handleDeleteFile(file.id, file.fileName, e)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                      title="Delete file tracking"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. ACTIVE FILE DETAILS, METRICS & FAST ORDERS TABLE */}
      {activeFile ? (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          {/* Active File Header bar */}
          <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  {lang === 'en' ? 'Active File' : 'সক্রিয় ফাইল'}
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 truncate max-w-[220px] sm:max-w-md">
                  {activeFile.fileName}
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lang === 'en'
                  ? `${activeFile.items.length} orders loaded • Fast pagination enabled for smooth mobile performance`
                  : `${activeFile.items.length}টি অর্ডার • স্মুথ পারফরম্যান্সের জন্য পেজিনেশন ও ইনস্ট্যান্ট আউটপুট বাটন যুক্ত`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* View Mode Toggle (Table vs Mobile Cards) */}
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                    viewMode === 'table' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Table View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{lang === 'en' ? 'Table' : 'টেবিল'}</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                    viewMode === 'cards' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Mobile Card View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{lang === 'en' ? 'Cards' : 'কার্ড'}</span>
                </button>
              </div>

              <button
                onClick={() => setIsAddRowModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Add Order' : 'অর্ডার যোগ'}</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-4 bg-white border-b border-slate-200">
            <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50/70 border border-blue-200/80">
              <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">
                {lang === 'en' ? 'Total Orders' : 'মোট অর্ডার'}
              </p>
              <p className="text-lg sm:text-xl font-black text-blue-950 mt-0.5">{activeFile.items.length}</p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
              <p className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider">
                {lang === 'en' ? 'Total Demand' : 'মোট চাহিদা'}
              </p>
              <p className="text-lg sm:text-xl font-black text-indigo-950 mt-0.5">
                {metrics.totalDemand.toLocaleString()}{' '}
                <span className="text-xs font-medium text-indigo-600">{activeFile.unit || 'Mtr'}</span>
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
              <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                {lang === 'en' ? 'Completed Qty' : 'সম্পন্ন পরিমাণ'}
              </p>
              <p className="text-lg sm:text-xl font-black text-emerald-950 mt-0.5">
                {metrics.totalCompleted.toLocaleString()}{' '}
                <span className="text-xs font-medium text-emerald-600">({metrics.pct}%)</span>
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-purple-50/70 border border-purple-200/80">
              <p className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider">
                {lang === 'en' ? 'Unique Buyers' : 'বায়ার সংখ্যা'}
              </p>
              <p className="text-lg sm:text-xl font-black text-purple-950 mt-0.5">
                {new Set(activeFile.items.map(it => it.buyer).filter(Boolean)).size}
              </p>
            </div>
          </div>

          {/* Search, Filter & Pagination Bar */}
          <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={lang === 'en' ? 'Search Buyer, PO#, Style, Color, Challan...' : 'বায়ার, PO#, স্টাইল, কালার খুঁজুন...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 text-xs">
                {['all', 'pending', 'in-progress', 'completed'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2 py-0.5 rounded font-medium text-[11px] transition cursor-pointer capitalize ${
                      statusFilter === st
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {st === 'all' ? (lang === 'en' ? 'All' : 'সব') : st}
                  </button>
                ))}
              </div>

              {/* Rows Per Page Selector */}
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <span>{lang === 'en' ? 'Page size:' : 'প্রতি পেজ:'}</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold text-slate-700"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          {/* BULK ACTIONS FLOATING COMMAND BAR */}
          {selectedItemIds.length > 0 && (
            <div className="p-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-y border-indigo-700/50 flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500 text-white font-black text-xs flex items-center gap-1 shadow-xs">
                  <Zap className="w-3 h-3 text-amber-300" />
                  <span>
                    {selectedItemIds.length}{' '}
                    {lang === 'en' ? 'Selected' : 'সিলেক্টেড'}
                  </span>
                </span>
              </div>

              {/* Bulk Controls Group */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Bulk Status Control */}
                <div className="flex items-center gap-1 bg-white/10 backdrop-blur-xs p-1 rounded-lg border border-white/15">
                  <select
                    value={bulkStatus}
                    onChange={e => setBulkStatus(e.target.value as any)}
                    className="bg-slate-800 text-white text-[11px] font-bold px-2 py-0.5 rounded border border-slate-600 focus:outline-hidden"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                  </select>
                  <button
                    onClick={handleApplyBulkStatus}
                    disabled={isBulkApplying}
                    className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded transition cursor-pointer"
                  >
                    {lang === 'en' ? 'Set Status' : 'স্ট্যাটাস দিন'}
                  </button>
                </div>

                {/* 2. Bulk Challan Reference Control */}
                <div className="flex items-center gap-1 bg-white/10 backdrop-blur-xs p-1 rounded-lg border border-white/15">
                  <input
                    type="text"
                    placeholder="Challan #"
                    value={bulkChallanRef}
                    onChange={e => setBulkChallanRef(e.target.value)}
                    className="bg-slate-800 text-white placeholder:text-slate-400 font-mono text-[11px] px-2 py-0.5 rounded border border-slate-600 w-24 focus:outline-hidden"
                  />
                  <button
                    onClick={handleApplyBulkChallanRef}
                    disabled={isBulkApplying}
                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded transition cursor-pointer"
                  >
                    {lang === 'en' ? 'Set Challan' : 'চালান দিন'}
                  </button>
                </div>

                {/* 3. Quick 100% Done */}
                <button
                  onClick={handleBulkComplete100}
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold transition cursor-pointer border border-emerald-500/50"
                  title="Mark 100% completed"
                >
                  ✓ 100%
                </button>

                {/* 3.5. Bulk Download Selected */}
                <button
                  onClick={handleDownloadSelectedOrders}
                  className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-[11px] font-bold transition cursor-pointer border border-blue-500/50 flex items-center gap-1"
                  title="Download all selected orders to Excel"
                >
                  <Download className="w-3 h-3" />
                  <span>{lang === 'en' ? 'Download' : 'ডাউনলোড'}</span>
                </button>

                {/* 4. Bulk Delete */}
                <button
                  onClick={handleBulkDeleteSelected}
                  className="px-2 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-[11px] font-bold transition cursor-pointer border border-rose-500/50"
                >
                  <Trash2 className="w-3 h-3 inline mr-0.5" />
                  <span>{lang === 'en' ? 'Delete' : 'মুছুন'}</span>
                </button>

                {/* Deselect All */}
                <button
                  onClick={handleClearSelection}
                  className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
                  title="Deselect all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW MODE 1: ULTRA-FAST PAGINATED TABLE */}
          {/* ======================================================== */}
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    {/* Master Checkbox */}
                    <th className="px-3 py-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllVisibleSelected}
                        onChange={handleToggleSelectAllVisible}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title="Select visible rows"
                      />
                    </th>
                    <th className="px-2 py-2.5 w-8 text-center">#</th>

                    {/* এই option থিকেই সকল output চাচ্ছি এইটা সবার প্রথমে নিয়ে আসো */}
                    <th className="px-3 py-2.5 min-w-[210px] text-center bg-blue-50 text-blue-900 border-x border-blue-200">
                      <span className="font-bold flex items-center justify-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                        <span>{lang === 'en' ? '🚀 Direct Outputs Hub' : '🚀 সকল আউটপুট (ডাইরেক্ট)'}</span>
                      </span>
                    </th>

                    <th className="px-3 py-2.5 min-w-[120px]">{lang === 'en' ? 'Buyer / Customer' : 'বায়ার / কাস্টমার'}</th>
                    <th className="px-3 py-2.5 min-w-[110px]">{lang === 'en' ? 'Ref PO / Job' : 'PO / জব নং'}</th>
                    <th className="px-3 py-2.5 min-w-[130px]">{lang === 'en' ? 'Item / Style' : 'আইটেম / স্টাইল'}</th>
                    <th className="px-3 py-2.5 min-w-[70px]">{lang === 'en' ? 'Color' : 'রং'}</th>
                    <th className="px-3 py-2.5 min-w-[60px]">{lang === 'en' ? 'Size' : 'সাইজ'}</th>
                    <th className="px-3 py-2.5 min-w-[80px] text-right">{lang === 'en' ? 'Demand' : 'চাহিদা'}</th>
                    <th className="px-3 py-2.5 min-w-[70px] text-right">{lang === 'en' ? 'Done' : 'সম্পন্ন'}</th>
                    <th className="px-3 py-2.5 min-w-[95px]">{lang === 'en' ? 'Challan Ref' : 'চালান নং'}</th>
                    {/* সব শেষে status option থাকবে complete ar sathe download option ও লাগবে */}
                    <th className="px-3 py-2.5 min-w-[220px] text-center bg-slate-200/80 border-l border-slate-300">
                      <span className="text-slate-900 font-bold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{lang === 'en' ? 'Status & Download' : 'স্ট্যাটাস ও ডাউনলোড'}</span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-8 text-center text-slate-500">
                        {lang === 'en' ? 'No orders match your filter.' : 'কোনো অর্ডার খুঁজে পাওয়া যায়নি।'}
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((item, idx) => {
                      const isSelected = selectedItemIds.includes(item.id);
                      const globalIndex = (safeCurrentPage - 1) * pageSize + idx + 1;
                      // Pack is complete if status is completed or full demand has been completed
                      const isPackCompleted =
                        item.status === 'completed' ||
                        (Number(item.demandQty) > 0 && Number(item.completedQty || 0) >= Number(item.demandQty));

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors group ${
                            isSelected
                              ? 'bg-blue-50/90 hover:bg-blue-100/80 ring-1 ring-blue-300/50'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectRow(item.id)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>

                          {/* Serial */}
                          <td className="px-2 py-2 text-center text-slate-400 font-mono text-[11px]">
                            {globalIndex}
                          </td>

                          {/* DIRECT OUTPUTS ACTION BUTTONS - সবার প্রথমে আনা হয়েছে */}
                          <td className="px-2 py-2 bg-blue-50/60 border-x border-blue-200">
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              {/* 1. Pack & Calculate (To Packing Sheet Table) */}
                              <button
                                onClick={() => handleTriggerOutput('table', item)}
                                className={`px-2 py-1 rounded text-white font-bold text-[10px] flex items-center gap-0.5 shadow-2xs transition cursor-pointer ${
                                  isPackCompleted ? 'bg-slate-600 hover:bg-slate-700' : 'bg-blue-600 hover:bg-blue-700 ring-1 ring-blue-400'
                                }`}
                                title={lang === 'en' ? 'Load this order into live Packing Table' : 'এই অর্ডারটি দিয়ে প্যাকিং টেবিল ও ক্যালকুলেশন শুরু করুন'}
                              >
                                <span>🚀 {isPackCompleted ? (lang === 'en' ? 'Re-Pack' : 'রি-প্যাক') : (lang === 'en' ? 'Pack' : 'প্যাক')}</span>
                              </button>

                              {/* 2. Print/Download Stickers Output - ONLY IF PACK IS COMPLETED */}
                              {isPackCompleted && (
                                <button
                                  onClick={() => handleTriggerOutput('stickers', item)}
                                  className="px-1.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] flex items-center gap-0.5 shadow-2xs transition cursor-pointer animate-in fade-in"
                                  title={lang === 'en' ? 'Download / View Carton Stickers' : 'এই অর্ডারের কার্টন স্টিকার তৈরি ও ডাউনলোড করুন'}
                                >
                                  <span>🏷️ {lang === 'en' ? 'Stickers' : 'স্টিকার'}</span>
                                </button>
                              )}

                              {/* 3. Factory Sheet View Output */}
                              <button
                                onClick={() => handleTriggerOutput('sheet', item)}
                                className="px-1.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-0.5 shadow-2xs transition cursor-pointer"
                                title={lang === 'en' ? 'View Exact Factory Packing Sheet' : 'ফ্যাক্টরি প্যাকিং শিট ভিউ দেখুন'}
                              >
                                <span>📄 {lang === 'en' ? 'Sheet' : 'শিট'}</span>
                              </button>

                              {/* Edit Modal Button */}
                              <button
                                onClick={() => setEditingItem(item)}
                                className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
                                title="Edit this order"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Duplicate */}
                              <button
                                onClick={() => handleDuplicateRow(item)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                                title="Duplicate order row"
                              >
                                <Copy className="w-3 h-3" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteRow(item.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Delete order row"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Buyer & Customer */}
                          <td className="px-3 py-2">
                            <p className="font-bold text-slate-900 truncate max-w-[130px]">{item.buyer}</p>
                            {item.customer && (
                              <p className="text-[10px] text-slate-500 truncate max-w-[130px]">{item.customer}</p>
                            )}
                          </td>

                          {/* Ref PO & Job */}
                          <td className="px-3 py-2">
                            <p className="font-mono font-semibold text-slate-800 text-[11px] truncate max-w-[120px]">
                              {item.customerRefPO || '-'}
                            </p>
                            {item.jobNo && (
                              <p className="text-[10px] text-slate-400 font-mono">{item.jobNo}</p>
                            )}
                          </td>

                          {/* Item Description */}
                          <td className="px-3 py-2">
                            <p className="font-medium text-slate-800 truncate max-w-[140px]" title={item.itemDescription}>
                              {item.itemDescription || '-'}
                            </p>
                          </td>

                          {/* Color */}
                          <td className="px-3 py-2">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium truncate max-w-[80px]">
                              {item.color || '-'}
                            </span>
                          </td>

                          {/* Size */}
                          <td className="px-3 py-2">
                            <span className="font-mono font-bold text-slate-800 text-xs">
                              {item.size || '-'}
                            </span>
                          </td>

                          {/* Demand Qty */}
                          <td className="px-3 py-2 text-right">
                            <span className="font-bold text-blue-700 font-mono text-xs">
                              {Number(item.demandQty || 0).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">{item.unit || 'Mtr'}</span>
                          </td>

                          {/* Completed Qty */}
                          <td className="px-3 py-2 text-right">
                            <span className="font-semibold text-emerald-700 font-mono text-xs">
                              {Number(item.completedQty || 0).toLocaleString()}
                            </span>
                          </td>

                          {/* Challan Ref */}
                          <td className="px-3 py-2">
                            {item.challanRef ? (
                              <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 truncate inline-block max-w-[95px]">
                                {item.challanRef}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-[10px] italic">None</span>
                            )}
                          </td>

                          {/* সব শেষে status option থাকবে complete ar sathe download option ও লাগবে */}
                          <td className="px-2.5 py-2 bg-slate-50/80 border-l border-slate-200 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Status Badge */}
                              <span
                                onClick={e => handleToggleComplete(item, e)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none transition shadow-2xs ${
                                  isPackCompleted
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                    : item.status === 'in-progress'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                                    : 'bg-slate-200 text-slate-700 border border-slate-300 hover:bg-slate-300'
                                }`}
                                title={lang === 'en' ? 'Click to toggle Complete' : 'ক্লিক করে কমপ্লিট টগল করুন'}
                              >
                                {isPackCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                <span>{item.status}</span>
                              </span>

                              {/* Complete Button */}
                              <button
                                onClick={e => handleToggleComplete(item, e)}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer ${
                                  isPackCompleted
                                    ? 'bg-emerald-700 text-white hover:bg-emerald-800 ring-1 ring-emerald-500'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                }`}
                                title={isPackCompleted ? 'Click to mark In-Progress' : 'Mark 100% Completed'}
                              >
                                <CheckCircle2 className="w-3 h-3 text-white" />
                                <span>{isPackCompleted ? (lang === 'en' ? 'Completed ✓' : 'সম্পন্ন ✓') : (lang === 'en' ? 'Complete' : 'কমপ্লিট')}</span>
                              </button>

                              {/* "যদি Pack সম্পুর্ন হয়, তহলেই একমাত্র Sticker download option ta asbe" */}
                              {isPackCompleted ? (
                                <button
                                  onClick={() => handleTriggerOutput('stickers', item)}
                                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer border border-indigo-500 animate-in fade-in"
                                  title={lang === 'en' ? 'Download Carton Stickers for this order' : 'এই অর্ডারের কার্টন স্টিকার ডাউনলোড করুন'}
                                >
                                  <Download className="w-3 h-3" />
                                  <span>{lang === 'en' ? 'Sticker Download' : 'স্টিকার ডাউনলোড'}</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic px-1">
                                  {lang === 'en' ? 'Pack pending' : 'প্যাক বাকি'}
                                </span>
                              )}

                              {/* Excel Download Icon */}
                              <button
                                onClick={e => handleDownloadSingleOrder(item, e)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                                title={lang === 'en' ? 'Download Excel (.xlsx) for this order' : 'এই অর্ডারের এক্সেল ডাউনলোড করুন'}
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* ======================================================== */
            /* VIEW MODE 2: RESPONSIVE MOBILE CARDS */
            /* ======================================================== */
            <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {paginatedRows.length === 0 ? (
                <div className="col-span-full py-8 text-center text-slate-500">
                  {lang === 'en' ? 'No orders match your filter.' : 'কোনো অর্ডার খুঁজে পাওয়া যায়নি।'}
                </div>
              ) : (
                paginatedRows.map((item, idx) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  const globalIndex = (safeCurrentPage - 1) * pageSize + idx + 1;
                  // Pack is complete if status is completed or full demand has been completed
                  const isPackCompleted =
                    item.status === 'completed' ||
                    (Number(item.demandQty) > 0 && Number(item.completedQty || 0) >= Number(item.demandQty));

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-50/90 border-blue-500 shadow-sm ring-1 ring-blue-400'
                          : 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-2xs'
                      }`}
                    >
                      <div>
                        {/* Header line with Checkbox, Buyer */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectRow(item.id)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-[11px] font-mono text-slate-400 font-bold">#{globalIndex}</span>
                            <span className="font-bold text-slate-900 text-sm truncate max-w-[150px]">
                              {item.buyer}
                            </span>
                          </div>
                        </div>

                        {/* Direct Outputs (সকল আউটপুট) - সবার প্রথমে আনা হয়েছে */}
                        <div className="mb-3 p-2 bg-blue-50/80 rounded-lg border border-blue-200 flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleTriggerOutput('table', item)}
                              className={`px-2.5 py-1 rounded text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer ${
                                isPackCompleted ? 'bg-slate-600 hover:bg-slate-700' : 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-400'
                              }`}
                              title={lang === 'en' ? 'Pack & Calculate cartons' : 'প্যাকিং ও কার্টন ক্যালকুলেট করুন'}
                            >
                              <span>🚀 {isPackCompleted ? (lang === 'en' ? 'Re-Pack' : 'রি-প্যাক') : (lang === 'en' ? 'Pack' : 'প্যাক')}</span>
                            </button>

                            {/* "যদি Pack সম্পুর্ন হয়, তহলেই একমাত্র Sticker download option ta asbe" */}
                            {isPackCompleted && (
                              <button
                                onClick={() => handleTriggerOutput('stickers', item)}
                                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer animate-in fade-in"
                                title={lang === 'en' ? 'Download / View Carton Stickers' : 'কার্টন স্টিকার ডাউনলোড ও প্রিন্ট করুন'}
                              >
                                <Tag className="w-3 h-3" />
                                <span>🏷️ {lang === 'en' ? 'Stickers' : 'স্টিকার'}</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleTriggerOutput('sheet', item)}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
                            >
                              <span>📄 {lang === 'en' ? 'Sheet' : 'শিট'}</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingItem(item)}
                              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-white transition"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicateRow(item)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-white transition"
                              title="Duplicate"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRow(item.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Order Specifics */}
                        <div className="space-y-1 mb-2.5 text-xs">
                          <div className="flex items-center justify-between text-slate-600">
                            <span>PO / Ref:</span>
                            <span className="font-mono font-bold text-slate-800">{item.customerRefPO || item.jobNo || '-'}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Item / Style:</span>
                            <span className="font-medium text-slate-800 truncate max-w-[160px]">{item.itemDescription || '-'}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Color & Size:</span>
                            <span className="font-medium text-slate-800">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] mr-1">{item.color || '-'}</span>
                              <span className="font-mono font-bold text-indigo-700">{item.size || '-'}</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Demand / Done:</span>
                            <span className="font-bold text-blue-900">
                              {Number(item.demandQty || 0).toLocaleString()} {item.unit || 'Mtr'}{' '}
                              <span className="text-emerald-600 font-normal">
                                ({Number(item.completedQty || 0).toLocaleString()} done)
                              </span>
                            </span>
                          </div>
                          {item.challanRef && (
                            <div className="flex items-center justify-between text-slate-600">
                              <span>Challan Ref:</span>
                              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                {item.challanRef}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Row 2 (সব শেষে): Status, Complete & Sticker Download */}
                      <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-200/70 bg-slate-50/90 -mx-3.5 -mb-3.5 p-2.5 rounded-b-xl">
                        <span
                          onClick={e => handleToggleComplete(item, e)}
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider cursor-pointer ${
                            isPackCompleted
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : item.status === 'in-progress'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-200 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {item.status}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={e => handleToggleComplete(item, e)}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer ${
                              isPackCompleted
                                ? 'bg-emerald-700 text-white hover:bg-emerald-800 ring-1 ring-emerald-500'
                                : 'bg-emerald-600 text-white hover:bg-emerald-500'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            <span>{isPackCompleted ? (lang === 'en' ? 'Completed ✓' : 'সম্পন্ন ✓') : (lang === 'en' ? 'Complete' : 'কমপ্লিট')}</span>
                          </button>

                          {/* "যদি Pack সম্পুর্ন হয়, তহলেই একমাত্র Sticker download option ta asbe" */}
                          {isPackCompleted ? (
                            <button
                              onClick={() => handleTriggerOutput('stickers', item)}
                              className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer animate-in fade-in"
                              title={lang === 'en' ? 'Download Carton Stickers' : 'কার্টন স্টিকার ডাউনলোড করুন'}
                            >
                              <Download className="w-3 h-3 text-white" />
                              <span>{lang === 'en' ? 'Sticker Download' : 'স্টিকার ডাউনলোড'}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic px-1.5 py-0.5">
                              {lang === 'en' ? 'Pack to unlock stickers' : 'প্যাক হলে স্টিকার আসবে'}
                            </span>
                          )}

                          {/* Optional Excel export icon */}
                          <button
                            onClick={e => handleDownloadSingleOrder(item, e)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                            title={lang === 'en' ? 'Download Excel (.xlsx)' : 'এক্সেল ফাইল ডাউনলোড'}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 4. PAGINATION FOOTER - PREVENTS MOBILE OVERHEATING */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2.5">
            <div>
              {lang === 'en'
                ? `Showing ${paginatedRows.length} of ${filteredRows.length} orders (Page ${safeCurrentPage} of ${totalPages})`
                : `${filteredRows.length}টি অর্ডারের মধ্যে ${paginatedRows.length}টি প্রদর্শিত (পেজ ${safeCurrentPage} / ${totalPages})`}
              {selectedItemIds.length > 0 && (
                <span className="ml-2 font-bold text-blue-700">
                  • {selectedItemIds.length} {lang === 'en' ? 'selected' : 'সিলেক্টেড'}
                </span>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={safeCurrentPage <= 1}
                className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Prev' : 'পূর্ববর্তী'}</span>
              </button>

              <span className="px-3 py-1 font-bold font-mono bg-white border border-slate-300 rounded text-xs text-blue-900">
                {safeCurrentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <span>{lang === 'en' ? 'Next' : 'পরবর্তী'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 sm:p-12 text-center">
          <FileSpreadsheet className="w-14 h-14 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base sm:text-lg font-bold text-slate-800">
            {lang === 'en' ? 'No Excel Files Tracked Yet' : 'কোনো এক্সেল ফাইল ট্র্যাক করা হয়নি'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {lang === 'en'
              ? 'Upload your buyer production schedule (.xlsx) or load our sample schedule to track orders and generate packing sheets.'
              : 'বায়ার প্রোডাকশন শিডিউল (.xlsx) আপলোড করুন অথবা নমুনা শিডিউল লোড করে সরাসরি প্যাকিং ও স্টিকার প্রিন্ট করুন।'}
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{lang === 'en' ? 'Upload Excel (.xlsx)' : 'এক্সেল আপলোড করুন'}</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={handleLoadSample}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
            >
              {lang === 'en' ? 'Load Sample Schedule' : 'নমুনা শিডিউল লোড'}
            </button>
          </div>
        </div>
      )}

      {/* SINGLE ORDER EDIT MODAL (Zero-Lag Modal Editing!) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-3.5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                <Edit3 className="w-4 h-4" />
                <span>{lang === 'en' ? 'Edit Order Details' : 'অর্ডার এডিট করুন'}</span>
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleSaveItemEdit(editingItem);
              }}
              className="p-4 space-y-3"
            >
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Buyer Name' : 'বায়ার'}
                  </label>
                  <input
                    type="text"
                    value={editingItem.buyer}
                    onChange={e => setEditingItem({ ...editingItem, buyer: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Customer Ref / PO' : 'PO / রেফারেন্স'}
                  </label>
                  <input
                    type="text"
                    value={editingItem.customerRefPO}
                    onChange={e => setEditingItem({ ...editingItem, customerRefPO: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Job No / Client' : 'জব নং'}
                  </label>
                  <input
                    type="text"
                    value={editingItem.jobNo || ''}
                    onChange={e => setEditingItem({ ...editingItem, jobNo: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Item / Style' : 'আইটেম / স্টাইল'}
                  </label>
                  <input
                    type="text"
                    value={editingItem.itemDescription}
                    onChange={e => setEditingItem({ ...editingItem, itemDescription: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Color' : 'কালার'}
                  </label>
                  <input
                    type="text"
                    value={editingItem.color}
                    onChange={e => setEditingItem({ ...editingItem, color: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Size' : 'সাইজ'}
                  </label>
                  <input
                    type="text"
                    value={editingItem.size}
                    onChange={e => setEditingItem({ ...editingItem, size: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Unit' : 'একক'}
                  </label>
                  <select
                    value={editingItem.unit || 'Mtr'}
                    onChange={e => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Mtr">Mtr</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Yds">Yds</option>
                    <option value="Kg">Kg</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Demand Qty' : 'চাহিদা পরিমাণ'}
                  </label>
                  <input
                    type="number"
                    value={editingItem.demandQty}
                    onChange={e => setEditingItem({ ...editingItem, demandQty: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-xs border border-blue-400 bg-blue-50/40 rounded-lg font-bold text-blue-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Completed Qty' : 'সম্পন্ন পরিমাণ'}
                  </label>
                  <input
                    type="number"
                    value={editingItem.completedQty}
                    onChange={e => setEditingItem({ ...editingItem, completedQty: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-xs border border-emerald-400 bg-emerald-50/40 rounded-lg font-bold text-emerald-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Status' : 'স্ট্যাটাস'}
                  </label>
                  <select
                    value={editingItem.status}
                    onChange={e => setEditingItem({ ...editingItem, status: e.target.value as any })}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Challan Ref' : 'চালান নং'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CH-2026-0881"
                    value={editingItem.challanRef || ''}
                    onChange={e => setEditingItem({ ...editingItem, challanRef: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {lang === 'en' ? 'Cancel' : 'বাতিল'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  {lang === 'en' ? 'Save Changes' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW ROW MODAL */}
      {isAddRowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-3.5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                <span>{lang === 'en' ? 'Add Order to Schedule' : 'শিডিউলে নতুন অর্ডার যোগ'}</span>
              </h3>
              <button
                onClick={() => setIsAddRowModalOpen(false)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewRowSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Buyer Name *' : 'বায়ার নাম *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. H&M, Zara"
                    value={newRowData.buyer}
                    onChange={e => setNewRowData({ ...newRowData, buyer: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Customer Ref / PO *' : 'PO বা রেফারেন্স *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PO-889104"
                    value={newRowData.customerRefPO}
                    onChange={e => setNewRowData({ ...newRowData, customerRefPO: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Job No / Client' : 'জব নং'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JB-8822"
                    value={newRowData.jobNo}
                    onChange={e => setNewRowData({ ...newRowData, jobNo: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Item / Style' : 'আইটেম / স্টাইল'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Denim Pant"
                    value={newRowData.itemDescription}
                    onChange={e => setNewRowData({ ...newRowData, itemDescription: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Color' : 'কালার'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Navy"
                    value={newRowData.color}
                    onChange={e => setNewRowData({ ...newRowData, color: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Size' : 'সাইজ'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 32/34, L"
                    value={newRowData.size}
                    onChange={e => setNewRowData({ ...newRowData, size: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Unit' : 'একক'}
                  </label>
                  <select
                    value={newRowData.unit}
                    onChange={e => setNewRowData({ ...newRowData, unit: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Mtr">Mtr</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Yds">Yds</option>
                    <option value="Kg">Kg</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Demand Qty *' : 'চাহিদা পরিমাণ *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newRowData.demandQty}
                    onChange={e => setNewRowData({ ...newRowData, demandQty: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-xs border border-blue-400 bg-blue-50/50 rounded-lg font-bold text-blue-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    {lang === 'en' ? 'Challan Ref' : 'চালান রেফারেন্স'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CH-2026-0881"
                    value={newRowData.challanRef}
                    onChange={e => setNewRowData({ ...newRowData, challanRef: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddRowModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {lang === 'en' ? 'Cancel' : 'বাতিল'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
                >
                  {lang === 'en' ? 'Add to Schedule' : 'যুক্ত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
