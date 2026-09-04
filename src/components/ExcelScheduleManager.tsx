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
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  FolderOpen,
  Filter,
  Layers,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Edit3,
  CheckSquare,
  Square,
  FileText,
  Tag,
  Zap,
  X,
} from 'lucide-react';
import { ScheduleItem, TrackedExcelFile } from '../types/schedule';
import {
  fetchAllTrackedExcelFiles,
  getLocalTrackedFiles,
  saveTrackedExcelFile,
  updateTrackedExcelFile,
  deleteTrackedExcelFile,
  exportTrackedFileToExcel,
  parseUploadedExcelFile,
  getActiveTrackedFileId,
  setActiveTrackedFileId,
  SAMPLE_EXCEL_SCHEDULE,
} from '../utils/excelFileTrackerService';

interface ExcelScheduleManagerProps {
  lang: 'en' | 'bn';
  onLoadRowToPackingSheet?: (item: ScheduleItem) => void;
  onNavigateToTab?: (tab: 'table' | 'tracker' | 'challan') => void;
}

export const ExcelScheduleManager: React.FC<ExcelScheduleManagerProps> = ({
  lang,
  onLoadRowToPackingSheet,
  onNavigateToTab,
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
  const [showFileDrawer, setShowFileDrawer] = useState<boolean>(true);

  // Bulk Selection and Editing State
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ScheduleItem['status']>('in-progress');
  const [bulkChallanRef, setBulkChallanRef] = useState<string>('');
  const [isBulkApplying, setIsBulkApplying] = useState<boolean>(false);

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

  // Background sync on mount (does NOT freeze UI)
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

      setStatusMessage({
        type: 'success',
        text: lang === 'en'
          ? `✅ Successfully imported "${file.name}" with ${parsedTrackedFile.totalRows} orders!`
          : `✅ সফলভাবে "${file.name}" এর ${parsedTrackedFile.totalRows}টি অর্ডার ট্র্যাকারে যোগ করা হয়েছে!`,
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
    return activeFile.items.filter(item => {
      const matchSearch =
        !searchTerm ||
        item.buyer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customerRefPO.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.jobNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.itemDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.challanRef && item.challanRef.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [activeFile, searchTerm, statusFilter]);

  // Multi-select helpers
  const isAllFilteredSelected = useMemo(() => {
    if (filteredRows.length === 0) return false;
    return filteredRows.every(r => selectedItemIds.includes(r.id));
  }, [filteredRows, selectedItemIds]);

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      const filteredIdSet = new Set(filteredRows.map(r => r.id));
      setSelectedItemIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    } else {
      const newSelected = Array.from(new Set([...selectedItemIds, ...filteredRows.map(r => r.id)]));
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

  // In-place Row Update
  const handleUpdateRowField = (itemId: string, field: keyof ScheduleItem, value: any) => {
    if (!activeFile) return;

    const updatedItems = activeFile.items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value, updatedAt: new Date() };
        // Recalculate progress if completedQty or demandQty changed
        if (field === 'completedQty' || field === 'demandQty') {
          const demand = Number(field === 'demandQty' ? value : updated.demandQty) || 1;
          const completed = Number(field === 'completedQty' ? value : updated.completedQty) || 0;
          updated.progress = Math.min(100, Math.round((completed / demand) * 100));
          if (updated.progress >= 100) {
            updated.status = 'completed';
          } else if (updated.progress > 0 && updated.status === 'pending') {
            updated.status = 'in-progress';
          }
        }
        return updated;
      }
      return item;
    });

    const updatedFile: TrackedExcelFile = {
      ...activeFile,
      items: updatedItems,
      totalDemand: updatedItems.reduce((sum, it) => sum + (Number(it.demandQty) || 0), 0),
      updatedAt: new Date().toISOString(),
    };

    setTrackedFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
  };

  // ==========================================
  // BULK ACTIONS: STATUS & CHALLAN REFERENCE
  // ==========================================
  const handleApplyBulkStatus = () => {
    if (!activeFile || selectedItemIds.length === 0) return;

    setIsBulkApplying(true);
    const selectedSet = new Set(selectedItemIds);

    const updatedItems = activeFile.items.map(item => {
      if (selectedSet.has(item.id)) {
        const updated: ScheduleItem = {
          ...item,
          status: bulkStatus,
          updatedAt: new Date(),
        };

        if (bulkStatus === 'completed') {
          updated.completedQty = item.demandQty;
          updated.progress = 100;
          updated.completedAt = new Date();
        } else if (bulkStatus === 'pending') {
          updated.completedQty = 0;
          updated.progress = 0;
        }
        return updated;
      }
      return item;
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
        ? `⚡ Updated status to "${bulkStatus}" for ${selectedItemIds.length} orders!`
        : `⚡ ${selectedItemIds.length}টি অর্ডারের স্ট্যাটাস "${bulkStatus}" এ পরিবর্তন করা হয়েছে!`,
    });
  };

  const handleApplyBulkChallanRef = () => {
    if (!activeFile || selectedItemIds.length === 0) return;
    const refToApply = bulkChallanRef.trim();

    if (!refToApply) {
      alert(lang === 'en' ? 'Please enter a Challan Reference' : 'দয়া করে একটি চালান রেফারেন্স লিখুন');
      return;
    }

    setIsBulkApplying(true);
    const selectedSet = new Set(selectedItemIds);

    const updatedItems = activeFile.items.map(item => {
      if (selectedSet.has(item.id)) {
        return {
          ...item,
          challanRef: refToApply,
          updatedAt: new Date(),
        };
      }
      return item;
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
        ? `📄 Applied Challan Ref "${refToApply}" to ${selectedItemIds.length} orders!`
        : `📄 ${selectedItemIds.length}টি অর্ডারে চালান রেফারেন্স "${refToApply}" যুক্ত করা হয়েছে!`,
    });
  };

  const handleAutoGenerateBulkChallan = () => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randId = Math.floor(1000 + Math.random() * 9000);
    const generatedRef = `CH-${todayStr}-${randId}`;
    setBulkChallanRef(generatedRef);
  };

  const handleBulkComplete100 = () => {
    if (!activeFile || selectedItemIds.length === 0) return;

    const selectedSet = new Set(selectedItemIds);
    const updatedItems = activeFile.items.map(item => {
      if (selectedSet.has(item.id)) {
        return {
          ...item,
          status: 'completed' as const,
          completedQty: item.demandQty,
          progress: 100,
          completedAt: new Date(),
          updatedAt: new Date(),
        };
      }
      return item;
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
        ? `✅ Marked ${selectedItemIds.length} orders as 100% Completed!`
        : `✅ ${selectedItemIds.length}টি অর্ডার ১০০% সম্পন্ন মার্ক করা হয়েছে!`,
    });
  };

  const handleBulkDeleteSelected = () => {
    if (!activeFile || selectedItemIds.length === 0) return;

    const confirmMsg = lang === 'en'
      ? `Are you sure you want to delete ${selectedItemIds.length} selected orders?`
      : `আপনি কি সিলেক্টেড ${selectedItemIds.length}টি অর্ডার ডিলিট করতে চান?`;

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
      text: lang === 'en' ? 'Selected orders deleted.' : 'সিলেক্টেড অর্ডারগুলো মুছে ফেলা হয়েছে।',
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
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* 1. TOP HEADER & MAIN CONTROLS */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl shadow-xl p-6 text-white border border-blue-600/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="p-2 rounded-xl bg-white/10 backdrop-blur-xs text-blue-200 border border-white/10">
                <FileSpreadsheet className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>
                    {lang === 'en'
                      ? 'Excel Schedule Tracker & Live Editor'
                      : 'এক্সেল শিডিউল ট্র্যাকিং ও এডিটর'}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Live Sync & Bulk Edit
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-blue-100/90 font-normal">
                  {lang === 'en'
                    ? 'Track imported Excel files, multi-select rows for bulk status & challan updates, and dispatch directly to packing tables.'
                    : 'এক্সেল ফাইল ট্র্যাক করুন, একাধিক অর্ডার সিলেক্ট করে একসাথে স্ট্যাটাস ও চালান রেফারেন্স দিন এবং প্যাকিং শিটে পাঠান।'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Upload File Input Button */}
            <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-blue-800 hover:bg-blue-50 font-bold text-xs shadow-md transition cursor-pointer border border-white">
              <Upload className="w-4 h-4 text-blue-600" />
              <span>{lang === 'en' ? 'Upload Excel (.xlsx)' : 'এক্সেল আপলোড করুন'}</span>
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
              <span>{lang === 'en' ? 'Load Sample' : 'নমুনা শিডিউল'}</span>
            </button>

            {/* Export Current File to Excel */}
            {activeFile && (
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md border border-emerald-400 transition cursor-pointer"
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md border border-amber-300 transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{lang === 'en' ? 'Save Changes' : 'পরিবর্তন সেভ করুন'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
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

      {/* 2. ALL TRACKED EXCEL FILES DRAWER / REGISTRY */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>{lang === 'en' ? 'Tracked Excel Files Shelf' : 'সকল ট্র্যাকিংকৃত এক্সেল ফাইল'}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {trackedFiles.length} {lang === 'en' ? 'Files' : 'ফাইল'}
              </span>
            </h3>
          </div>
          <button
            onClick={() => setShowFileDrawer(!showFileDrawer)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
          >
            <span>{showFileDrawer ? (lang === 'en' ? 'Collapse' : 'সংকুচিত করুন') : (lang === 'en' ? 'Expand' : 'প্রদর্শন করুন')}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showFileDrawer ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFileDrawer && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {trackedFiles.map(file => {
              const isSelected = file.id === activeFileId;
              return (
                <div
                  key={file.id}
                  onClick={() => handleSelectFile(file.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                      : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileSpreadsheet
                          className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}
                        />
                        <span
                          className={`text-xs font-bold truncate max-w-[180px] ${
                            isSelected ? 'text-blue-950' : 'text-slate-800'
                          }`}
                          title={file.fileName}
                        >
                          {file.fileName}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
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

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 my-2">
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

                    {/* Buyer Tags */}
                    {file.uniqueBuyers && file.uniqueBuyers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {file.uniqueBuyers.slice(0, 3).map((b, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-600 font-medium truncate max-w-[90px]"
                          >
                            {b}
                          </span>
                        ))}
                        {file.uniqueBuyers.length > 3 && (
                          <span className="text-[10px] text-slate-400">+{file.uniqueBuyers.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px] text-slate-400">
                    <span title={file.uploadedAt}>
                      {new Date(file.uploadedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => handleDeleteFile(file.id, file.fileName, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                        title="Delete file tracking"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. ACTIVE FILE DETAILS, METRICS & IN-PLACE TABLE */}
      {activeFile ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Active File Header bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  {lang === 'en' ? 'Active File' : 'সক্রিয় ফাইল'}
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">{activeFile.fileName}</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'en'
                  ? `Uploaded on ${new Date(activeFile.uploadedAt).toLocaleString()} • Select multiple rows below to bulk update status or challan`
                  : `${new Date(activeFile.uploadedAt).toLocaleString()} তারিখে আপলোডকৃত • একাধিক অর্ডার সিলেক্ট করে একসাথে স্ট্যাটাস ও চালান আপডেট করুন`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsAddRowModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Add Order Row' : 'নতুন অর্ডার যোগ'}</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>{lang === 'en' ? 'Download Excel' : 'এক্সেল ডাউনলোড'}</span>
              </button>

              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('tracker')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition cursor-pointer"
                >
                  <span>{lang === 'en' ? 'Factory Tracker' : 'ফ্যাক্টরি ট্র্যাকার'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Cards for this file */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-white border-b border-slate-200">
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80">
              <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
                {lang === 'en' ? 'Total Orders' : 'মোট অর্ডার'}
              </p>
              <p className="text-xl sm:text-2xl font-black text-blue-950 mt-1">{activeFile.items.length}</p>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
              <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
                {lang === 'en' ? 'Total Demand' : 'মোট চাহিদা'}
              </p>
              <p className="text-xl sm:text-2xl font-black text-indigo-950 mt-1">
                {metrics.totalDemand.toLocaleString()}{' '}
                <span className="text-xs font-medium text-indigo-600">{activeFile.unit || 'Mtr'}</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
              <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                {lang === 'en' ? 'Completed Quantity' : 'সম্পন্ন পরিমাণ'}
              </p>
              <p className="text-xl sm:text-2xl font-black text-emerald-950 mt-1">
                {metrics.totalCompleted.toLocaleString()}{' '}
                <span className="text-xs font-medium text-emerald-600">({metrics.pct}%)</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/80">
              <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">
                {lang === 'en' ? 'Unique Buyers' : 'বায়ার সংখ্যা'}
              </p>
              <p className="text-xl sm:text-2xl font-black text-purple-950 mt-1">
                {new Set(activeFile.items.map(it => it.buyer).filter(Boolean)).size}
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-4 bg-slate-50/60 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={lang === 'en' ? 'Search Buyer, PO#, Style, Color, Challan...' : 'বায়ার, PO#, স্টাইল, কালার, চালান খুঁজুন...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-1 text-xs">
                <span className="text-slate-400 px-1 text-[11px]">
                  {lang === 'en' ? 'Status:' : 'অবস্থা:'}
                </span>
                {['all', 'pending', 'in-progress', 'completed'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2 py-0.5 rounded font-medium text-xs transition cursor-pointer capitalize ${
                      statusFilter === st
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {st === 'all' ? (lang === 'en' ? 'All' : 'সব') : st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BULK ACTIONS FLOATING / STICKY COMMAND BAR */}
          {/* ======================================================== */}
          {selectedItemIds.length > 0 && (
            <div className="p-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-y border-indigo-700/50 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-blue-500 text-white font-black text-xs flex items-center gap-1.5 shadow-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {selectedItemIds.length}{' '}
                    {lang === 'en'
                      ? selectedItemIds.length === 1 ? 'Row Selected' : 'Rows Selected'
                      : 'টি অর্ডার সিলেক্ট করা হয়েছে'}
                  </span>
                </span>
              </div>

              {/* Bulk Controls Group */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* 1. Bulk Status Control */}
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-xs p-1 rounded-lg border border-white/15">
                  <span className="text-[11px] font-semibold text-indigo-200 pl-1.5">
                    {lang === 'en' ? 'Status:' : 'স্ট্যাটাস:'}
                  </span>
                  <select
                    value={bulkStatus}
                    onChange={e => setBulkStatus(e.target.value as any)}
                    className="bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded border border-slate-600 focus:outline-hidden"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                  </select>
                  <button
                    onClick={handleApplyBulkStatus}
                    disabled={isBulkApplying}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition cursor-pointer shadow-xs"
                    title="Apply selected status to all selected rows"
                  >
                    {lang === 'en' ? 'Apply Status' : 'স্ট্যাটাস দিন'}
                  </button>
                </div>

                {/* 2. Bulk Challan Reference Control */}
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-xs p-1 rounded-lg border border-white/15">
                  <span className="text-[11px] font-semibold text-emerald-200 pl-1.5">
                    {lang === 'en' ? 'Challan Ref:' : 'চালান নং:'}
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. CH-2026-0881"
                    value={bulkChallanRef}
                    onChange={e => setBulkChallanRef(e.target.value)}
                    className="bg-slate-800 text-white placeholder:text-slate-400 font-mono text-xs px-2 py-1 rounded border border-slate-600 w-32 focus:outline-hidden"
                  />
                  <button
                    onClick={handleAutoGenerateBulkChallan}
                    className="px-1.5 py-1 bg-slate-700 hover:bg-slate-600 text-amber-300 text-[10px] font-bold rounded transition cursor-pointer"
                    title="Auto generate timestamped Challan Reference"
                  >
                    Auto
                  </button>
                  <button
                    onClick={handleApplyBulkChallanRef}
                    disabled={isBulkApplying}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded transition cursor-pointer shadow-xs"
                    title="Apply Challan Reference to all selected rows"
                  >
                    {lang === 'en' ? 'Apply Challan' : 'চালান যুক্ত করুন'}
                  </button>
                </div>

                {/* 3. Quick 100% Done */}
                <button
                  onClick={handleBulkComplete100}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold transition cursor-pointer border border-emerald-500/50"
                  title="Set 100% completed on all selected rows"
                >
                  ✓ {lang === 'en' ? 'Mark 100% Done' : '১০০% সম্পন্ন'}
                </button>

                {/* 4. Bulk Delete */}
                <button
                  onClick={handleBulkDeleteSelected}
                  className="px-2 py-1.5 rounded-lg bg-rose-700/80 hover:bg-rose-600 text-white text-xs font-bold transition cursor-pointer border border-rose-500/50"
                  title="Delete all selected rows from this Excel file"
                >
                  <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                  <span>{lang === 'en' ? 'Delete' : 'মুছুন'}</span>
                </button>

                {/* Deselect All */}
                <button
                  onClick={handleClearSelection}
                  className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
                  title="Deselect all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 4. IN-PLACE EDITABLE DATA TABLE WITH MULTI-SELECT */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  {/* Master Checkbox */}
                  <th className="px-3 py-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="Select / Deselect all visible rows"
                    />
                  </th>
                  <th className="px-2 py-2.5 w-8 text-center">#</th>
                  <th className="px-3 py-2.5 min-w-[120px]">{lang === 'en' ? 'Buyer' : 'বায়ার'}</th>
                  <th className="px-3 py-2.5 min-w-[120px]">{lang === 'en' ? 'Customer / Ref PO' : 'কাস্টমার / PO'}</th>
                  <th className="px-3 py-2.5 min-w-[140px]">{lang === 'en' ? 'Item / Style' : 'আইটেম / স্টাইল'}</th>
                  <th className="px-3 py-2.5 min-w-[90px]">{lang === 'en' ? 'Color' : 'রং'}</th>
                  <th className="px-3 py-2.5 min-w-[60px]">{lang === 'en' ? 'Size' : 'সাইজ'}</th>
                  <th className="px-3 py-2.5 min-w-[85px] text-right">{lang === 'en' ? 'Demand' : 'চাহিদা'}</th>
                  <th className="px-3 py-2.5 min-w-[85px] text-right">{lang === 'en' ? 'Completed' : 'সম্পন্ন'}</th>
                  <th className="px-3 py-2.5 min-w-[60px] text-center">{lang === 'en' ? 'Unit' : 'একক'}</th>
                  <th className="px-3 py-2.5 min-w-[100px] text-center">{lang === 'en' ? 'Status' : 'স্ট্যাটাস'}</th>
                  <th className="px-3 py-2.5 min-w-[120px]">{lang === 'en' ? 'Challan Ref' : 'চালান রেফারেন্স'}</th>
                  <th className="px-3 py-2.5 min-w-[140px] text-center">{lang === 'en' ? 'Actions' : 'অ্যাকশন'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-slate-500">
                      {lang === 'en' ? 'No orders match your filter.' : 'কোনো অর্ডার খুঁজে পাওয়া যায়নি।'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((item, idx) => {
                    const isSelected = selectedItemIds.includes(item.id);
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
                          {idx + 1}
                        </td>

                        {/* Buyer */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.buyer}
                            onChange={e => handleUpdateRowField(item.id, 'buyer', e.target.value)}
                            className="w-full px-2 py-1 font-semibold text-slate-800 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-xs transition"
                          />
                        </td>

                        {/* Customer & Ref PO */}
                        <td className="px-3 py-2">
                          <div className="space-y-1">
                            <input
                              type="text"
                              placeholder="Customer Ref / PO"
                              value={item.customerRefPO}
                              onChange={e => handleUpdateRowField(item.id, 'customerRefPO', e.target.value)}
                              className="w-full px-2 py-0.5 font-mono text-slate-700 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-[11px] transition"
                            />
                            <input
                              type="text"
                              placeholder="Job No / Client"
                              value={item.jobNo || item.customer}
                              onChange={e => handleUpdateRowField(item.id, 'jobNo', e.target.value)}
                              className="w-full px-2 py-0.5 text-slate-500 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-[10px] transition"
                            />
                          </div>
                        </td>

                        {/* Item Description */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.itemDescription}
                            onChange={e => handleUpdateRowField(item.id, 'itemDescription', e.target.value)}
                            className="w-full px-2 py-1 text-slate-800 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-xs transition"
                          />
                        </td>

                        {/* Color */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.color}
                            onChange={e => handleUpdateRowField(item.id, 'color', e.target.value)}
                            className="w-full px-2 py-1 text-slate-700 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-xs transition"
                          />
                        </td>

                        {/* Size */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.size}
                            onChange={e => handleUpdateRowField(item.id, 'size', e.target.value)}
                            className="w-full px-2 py-1 font-mono text-slate-700 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-xs transition"
                          />
                        </td>

                        {/* Demand Qty */}
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            value={item.demandQty}
                            onChange={e => handleUpdateRowField(item.id, 'demandQty', Number(e.target.value))}
                            className="w-18 px-2 py-1 text-right font-bold text-blue-700 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-xs transition"
                          />
                        </td>

                        {/* Completed Qty */}
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            value={item.completedQty}
                            onChange={e => handleUpdateRowField(item.id, 'completedQty', Number(e.target.value))}
                            className="w-18 px-2 py-1 text-right font-semibold text-emerald-700 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-xs transition"
                          />
                        </td>

                        {/* Unit */}
                        <td className="px-3 py-2 text-center">
                          <select
                            value={item.unit || 'Mtr'}
                            onChange={e => handleUpdateRowField(item.id, 'unit', e.target.value)}
                            className="px-1 py-1 text-slate-600 font-medium bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 rounded text-[11px]"
                          >
                            <option value="Mtr">Mtr</option>
                            <option value="Pcs">Pcs</option>
                            <option value="Yds">Yds</option>
                            <option value="Kg">Kg</option>
                          </select>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2 text-center">
                          <select
                            value={item.status}
                            onChange={e => handleUpdateRowField(item.id, 'status', e.target.value)}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer border ${
                              item.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : item.status === 'in-progress'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="paused">Paused</option>
                          </select>
                        </td>

                        {/* Challan Ref Column */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            placeholder="CH-XXXX"
                            value={item.challanRef || ''}
                            onChange={e => handleUpdateRowField(item.id, 'challanRef', e.target.value)}
                            className={`w-full px-2 py-0.5 font-mono text-[11px] rounded transition border ${
                              item.challanRef
                                ? 'bg-emerald-50/70 border-emerald-300 font-bold text-emerald-900 focus:bg-white'
                                : 'bg-transparent hover:bg-white focus:bg-white border-transparent hover:border-slate-300 focus:border-blue-500 text-slate-600'
                            }`}
                          />
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Send to Packing Sheet */}
                            {onLoadRowToPackingSheet && (
                              <button
                                onClick={() => onLoadRowToPackingSheet(item)}
                                className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs transition cursor-pointer"
                                title={lang === 'en' ? 'Load this row into Packing Sheet header' : 'এই অর্ডারটি প্যাকিং শিটে পাঠান'}
                              >
                                <span>{lang === 'en' ? 'To Sheet' : 'প্যাকিং শিটে'}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}

                            {/* Duplicate */}
                            <button
                              onClick={() => handleDuplicateRow(item)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                              title="Duplicate order row"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteRow(item.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete order row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* Table Footer */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div>
              {lang === 'en'
                ? `Showing ${filteredRows.length} of ${activeFile.items.length} orders in "${activeFile.fileName}"`
                : `"${activeFile.fileName}" ফাইলের ${activeFile.items.length}টি অর্ডারের মধ্যে ${filteredRows.length}টি প্রদর্শিত`}
              {selectedItemIds.length > 0 && (
                <span className="ml-2 font-bold text-blue-700">
                  ({selectedItemIds.length} {lang === 'en' ? 'selected' : 'সিলেক্টেড'})
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Save All Edits' : 'সকল এডিট সেভ করুন'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
          <FileSpreadsheet className="w-16 h-16 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">
            {lang === 'en' ? 'No Excel Files Tracked Yet' : 'কোনো এক্সেল ফাইল ট্র্যাক করা হয়নি'}
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {lang === 'en'
              ? 'Upload your buyer production schedule (.xlsx) or load our sample schedule to track and edit orders.'
              : 'বায়ার প্রোডাকশন শিডিউল (.xlsx) আপলোড করুন অথবা নমুনা শিডিউল লোড করে অর্ডার ট্র্যাক ও এডিট করুন।'}
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <label className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{lang === 'en' ? 'Upload Excel (.xlsx)' : 'এক্সেল ফাইল আপলোড করুন'}</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={handleLoadSample}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
            >
              {lang === 'en' ? 'Load Sample Schedule' : 'নমুনা শিডিউল লোড'}
            </button>
          </div>
        </div>
      )}

      {/* ADD NEW ROW MODAL */}
      {isAddRowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>{lang === 'en' ? 'Add Order Row to Excel File' : 'এক্সেলে নতুন অর্ডার যোগ করুন'}</span>
              </h3>
              <button
                onClick={() => setIsAddRowModalOpen(false)}
                className="text-white/70 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewRowSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'en' ? 'Buyer Name *' : 'বায়ার নাম *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. H&M, Zara, Next"
                    value={newRowData.buyer}
                    onChange={e => setNewRowData({ ...newRowData, buyer: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'en' ? 'Customer Ref / PO *' : 'PO বা রেফারেন্স *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PO-889104"
                    value={newRowData.customerRefPO}
                    onChange={e => setNewRowData({ ...newRowData, customerRefPO: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'en' ? 'Job No / Client' : 'জব নং / ক্লায়েন্ট'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JB-8822"
                    value={newRowData.jobNo}
                    onChange={e => setNewRowData({ ...newRowData, jobNo: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'en' ? 'Item / Style Description' : 'আইটেম বা স্টাইল'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Stretch Denim Pant"
                    value={newRowData.itemDescription}
                    onChange={e => setNewRowData({ ...newRowData, itemDescription: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'en' ? 'Color' : 'কালার'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Navy"
                    value={newRowData.color}
                    onChange={e => setNewRowData({ ...newRowData, color: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'en' ? 'Size' : 'সাইজ'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 32/34, L"
                    value={newRowData.size}
                    onChange={e => setNewRowData({ ...newRowData, size: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'en' ? 'Unit' : 'একক'}
                  </label>
                  <select
                    value={newRowData.unit}
                    onChange={e => setNewRowData({ ...newRowData, unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  >
                    <option value="Mtr">Mtr</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Yds">Yds</option>
                    <option value="Kg">Kg</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'en' ? 'Order Qty' : 'অর্ডার পরিমাণ'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newRowData.orderQty}
                    onChange={e => setNewRowData({ ...newRowData, orderQty: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'en' ? 'Demand Qty *' : 'চাহিদা পরিমাণ *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newRowData.demandQty}
                    onChange={e => setNewRowData({ ...newRowData, demandQty: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-blue-400 bg-blue-50/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold text-blue-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'en' ? 'Challan Ref' : 'চালান রেফারেন্স'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CH-2026-0881"
                    value={newRowData.challanRef}
                    onChange={e => setNewRowData({ ...newRowData, challanRef: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddRowModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {lang === 'en' ? 'Cancel' : 'বাতিল'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
                >
                  {lang === 'en' ? 'Add to Schedule' : 'শিডিউলে যুক্ত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
