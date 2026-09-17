import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Calendar,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Boxes,
  FileSpreadsheet,
  Download,
  Trash2,
  Edit3,
  RefreshCw,
  X,
  Filter,
  Layers,
  ArrowRight,
  User,
  Zap,
  Check,
  ChevronRight,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import {
  PackingSchedule,
  DailyPackingLog,
  DateFilterConfig,
  DateFilterType,
} from '../types/schedulePacking';
import { PackingSheetData } from '../types/calculator';
import {
  loadPackingSchedules,
  loadDailyPackingLogs,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  addDailyPackingLog,
  updateDailyPackingLog,
  deleteDailyPackingLog,
  commitCurrentCartonsToSchedule,
  calculateSchedulePackingStats,
  matchesDateFilter,
  getTodayDateStr,
  exportPackingLogsToCsv,
  downloadCsvFile,
  syncSchedulesFromExcelTracker,
} from '../utils/schedulePackingService';

interface SchedulePackingViewProps {
  lang: 'en' | 'bn';
  currentSheetData?: PackingSheetData;
  liveSheetData?: PackingSheetData;
  onLoadScheduleToTable?: (schedule: PackingSchedule) => void;
  onLoadScheduleToSheet?: (schedule: PackingSchedule) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const SchedulePackingView: React.FC<SchedulePackingViewProps> = ({
  lang,
  currentSheetData,
  liveSheetData,
  onLoadScheduleToTable,
  onLoadScheduleToSheet,
  onNavigateToTab,
}) => {
  const activeSheetData = currentSheetData || liveSheetData || ({ cartons: [] } as unknown as PackingSheetData);

  const handleLoadSchedule = (schedule: PackingSchedule) => {
    if (onLoadScheduleToTable) {
      onLoadScheduleToTable(schedule);
    } else if (onLoadScheduleToSheet) {
      onLoadScheduleToSheet(schedule);
    }
  };
  // State
  const [schedules, setSchedules] = useState<PackingSchedule[]>(() => loadPackingSchedules());
  const [logs, setLogs] = useState<DailyPackingLog[]>(() => loadDailyPackingLogs());
  const [activeSubTab, setActiveSubTab] = useState<'schedules' | 'history'>('schedules');
  const [viewLayout, setViewLayout] = useState<'cards' | 'table'>('cards');

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [buyerFilter, setBuyerFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterConfig>({ type: 'all' });

  // Modals
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState<boolean>(false);
  const [isDailyPackingModalOpen, setIsDailyPackingModalOpen] = useState<boolean>(false);
  const [selectedScheduleForPacking, setSelectedScheduleForPacking] = useState<PackingSchedule | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<PackingSchedule | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [selectedScheduleForHistory, setSelectedScheduleForHistory] = useState<PackingSchedule | null>(null);

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Daily packing form state
  const [packingDate, setPackingDate] = useState<string>(getTodayDateStr());
  const [packedQty, setPackedQty] = useState<string>('');
  const [cartonsCount, setCartonsCount] = useState<string>('');
  const [startCartonNo, setStartCartonNo] = useState<string>('1');
  const [endCartonNo, setEndCartonNo] = useState<string>('1');
  const [grossWeightKg, setGrossWeightKg] = useState<string>('');
  const [netWeightKg, setNetWeightKg] = useState<string>('');
  const [operator, setOperator] = useState<string>('Operator-1');
  const [shift, setShift] = useState<'Morning' | 'Day' | 'Night' | 'General'>('Day');
  const [packingNotes, setPackingNotes] = useState<string>('');
  const [isSubmittingLog, setIsSubmittingLog] = useState<boolean>(false);

  // New Schedule form state
  const [newOrderRef, setNewOrderRef] = useState<string>('');
  const [newBuyer, setNewBuyer] = useState<string>('');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newItemDescription, setNewItemDescription] = useState<string>('Elastic');
  const [newColor, setNewColor] = useState<string>('');
  const [newSize, setNewSize] = useState<string>('');
  const [newTargetQty, setNewTargetQty] = useState<string>('');
  const [newUnit, setNewUnit] = useState<'mtr' | 'pcs' | 'yds' | 'gry'>('mtr');
  const [newUnitWeightGm, setNewUnitWeightGm] = useState<string>('8.0');
  const [newDefaultTare, setNewDefaultTare] = useState<string>('0.5');
  const [newDeliveryDate, setNewDeliveryDate] = useState<string>('');
  const [newAssignedLine, setNewAssignedLine] = useState<string>('');

  // Reload data
  const refreshData = () => {
    setSchedules(loadPackingSchedules());
    setLogs(loadDailyPackingLogs());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Compute Dashboard Statistics
  const stats = useMemo(() => {
    return calculateSchedulePackingStats(schedules, logs);
  }, [schedules, logs]);

  // Unique buyers list
  const uniqueBuyers = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach((s) => {
      if (s.buyer) set.add(s.buyer);
    });
    return Array.from(set).sort();
  }, [schedules]);

  // Filtered Schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          s.scheduleNo.toLowerCase().includes(q) ||
          s.orderRef.toLowerCase().includes(q) ||
          s.buyer.toLowerCase().includes(q) ||
          s.customer.toLowerCase().includes(q) ||
          s.color.toLowerCase().includes(q) ||
          s.size.toLowerCase().includes(q) ||
          s.itemDescription.toLowerCase().includes(q);
        if (!matchSearch) return false;
      }

      // Status
      if (statusFilter !== 'all' && s.status !== statusFilter) {
        return false;
      }

      // Buyer
      if (buyerFilter !== 'all' && s.buyer !== buyerFilter) {
        return false;
      }

      // Date
      if (dateFilter.type !== 'all') {
        return matchesDateFilter(s.scheduleDate, dateFilter);
      }

      return true;
    });
  }, [schedules, searchQuery, statusFilter, buyerFilter, dateFilter]);

  // Filtered Daily Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          l.scheduleNo.toLowerCase().includes(q) ||
          l.orderRef.toLowerCase().includes(q) ||
          l.buyer.toLowerCase().includes(q) ||
          (l.operator && l.operator.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Date
      if (dateFilter.type !== 'all') {
        return matchesDateFilter(l.packingDate, dateFilter);
      }

      return true;
    });
  }, [logs, searchQuery, dateFilter]);

  // Open Daily Packing Modal for a schedule
  const handleOpenDailyPacking = (schedule: PackingSchedule) => {
    setSelectedScheduleForPacking(schedule);
    setPackingDate(getTodayDateStr());
    setPackedQty('');
    setCartonsCount('1');
    const nextStartCtn = (schedule.totalCartons || 0) + 1;
    setStartCartonNo(String(nextStartCtn));
    setEndCartonNo(String(nextStartCtn));
    setGrossWeightKg('');
    setNetWeightKg('');
    setPackingNotes('');
    setIsDailyPackingModalOpen(true);
  };

  // Import Active Cartons from live Carton Table into Daily Packing Form
  const handleImportCurrentCartons = () => {
    const activeCartons = (activeSheetData.cartons || []).filter((c) => c.netWt > 0 || c.lengthMtr > 0);
    if (activeCartons.length === 0) {
      alert(
        lang === 'en'
          ? 'No cartons found with weight/length in the current Packing Sheet.'
          : 'বর্তমান প্যাকিং শিটে কোনো ওজনের কার্টন পাওয়া যায়নি।'
      );
      return;
    }

    const ctnCount = activeCartons.length;
    const startNo = Math.min(...activeCartons.map((c) => c.cartonNo));
    const endNo = Math.max(...activeCartons.map((c) => c.cartonNo));
    const totalQty = activeCartons.reduce((sum, c) => sum + (c.lengthMtr || 0), 0);
    const totalGross = activeCartons.reduce((sum, c) => sum + (c.grossWt || 0), 0);
    const totalNet = activeCartons.reduce((sum, c) => sum + (c.netWt || 0), 0);

    setCartonsCount(String(ctnCount));
    setStartCartonNo(String(startNo));
    setEndCartonNo(String(endNo));
    setPackedQty(String(Math.round(totalQty)));
    setGrossWeightKg(totalGross.toFixed(2));
    setNetWeightKg(totalNet.toFixed(2));
    setPackingNotes(
      `Imported from live table: ${ctnCount} cartons (#${startNo} - #${endNo}), Net ${totalNet.toFixed(2)} Kg`
    );
  };

  // Submit Daily Packing Log
  const handleSubmitDailyPacking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheduleForPacking) return;

    const qty = Number(packedQty);
    const ctns = Number(cartonsCount) || 1;

    if (isNaN(qty) || qty <= 0) {
      alert(lang === 'en' ? 'Please enter a valid packed quantity.' : 'সঠিক প্যাকিং পরিমাণ দিন।');
      return;
    }

    setIsSubmittingLog(true);
    setStatusMessage(null);

    try {
      const { schedule } = await addDailyPackingLog({
        scheduleId: selectedScheduleForPacking.id,
        scheduleNo: selectedScheduleForPacking.scheduleNo,
        orderRef: selectedScheduleForPacking.orderRef,
        buyer: selectedScheduleForPacking.buyer,
        packingDate,
        cartonsCount: ctns,
        startCartonNo: Number(startCartonNo) || 1,
        endCartonNo: Number(endCartonNo) || ctns,
        packedQty: qty,
        unit: selectedScheduleForPacking.unit,
        grossWeightKg: Number(grossWeightKg) || undefined,
        netWeightKg: Number(netWeightKg) || undefined,
        operator,
        shift,
        notes: packingNotes,
      });

      refreshData();
      setIsDailyPackingModalOpen(false);
      setStatusMessage({
        type: 'success',
        text:
          lang === 'en'
            ? `✅ Successfully logged ${qty} ${selectedScheduleForPacking.unit} (${ctns} ctns) for ${schedule.scheduleNo}! Remaining balance: ${schedule.balanceQty} ${schedule.unit}.`
            : `✅ সফলভাবে ${qty} ${selectedScheduleForPacking.unit} (${ctns} কার্টন) এন্ট্রি হয়েছে! অবশিষ্ট ব্যালেন্স: ${schedule.balanceQty} ${schedule.unit}।`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to submit packing log.',
      });
    } finally {
      setIsSubmittingLog(false);
    }
  };

  // Handle Delete Daily Log
  const handleDeleteLog = async (logId: string) => {
    if (
      !window.confirm(
        lang === 'en'
          ? 'Are you sure you want to delete this daily packing entry? Schedule balance will be automatically recalculated.'
          : 'আপনি কি নিশ্চিত এই প্যাকিং এন্ট্রি মুছে ফেলতে চান? শিডিউল ব্যালেন্স স্বয়ংক্রিয়ভাবে পুনর্গণনা হবে।'
      )
    ) {
      return;
    }

    try {
      const updatedSchedule = await deleteDailyPackingLog(logId);
      refreshData();
      setStatusMessage({
        type: 'success',
        text:
          lang === 'en'
            ? `Deleted entry. Updated schedule balance: ${updatedSchedule.balanceQty}`
            : `এন্ট্রি মোছা হয়েছে। শিডিউলের বর্তমান ব্যালেন্স: ${updatedSchedule.balanceQty}`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message,
      });
    }
  };

  // Handle Create New Schedule
  const handleCreateScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuyer.trim() || !newOrderRef.trim() || !newTargetQty) {
      alert(lang === 'en' ? 'Please fill all required fields.' : 'প্রয়োজনীয় ফিল্ডগুলো পূরণ করুন।');
      return;
    }

    try {
      const created = await createSchedule({
        buyer: newBuyer.trim(),
        customer: newCustomer.trim() || 'Factory',
        orderRef: newOrderRef.trim(),
        itemDescription: newItemDescription || 'Elastic',
        color: newColor.trim() || 'Standard',
        size: newSize.trim() || 'Standard',
        targetQty: Number(newTargetQty) || 1000,
        unit: newUnit,
        unitWeightGm: Number(newUnitWeightGm) || 8.0,
        defaultTare: Number(newDefaultTare) || 0.5,
        scheduleDate: getTodayDateStr(),
        deliveryDate: newDeliveryDate || undefined,
        assignedLine: newAssignedLine || undefined,
        status: 'pending',
      });

      refreshData();
      setIsAddScheduleOpen(false);

      // Clear fields
      setNewOrderRef('');
      setNewBuyer('');
      setNewCustomer('');
      setNewColor('');
      setNewSize('');
      setNewTargetQty('');

      setStatusMessage({
        type: 'success',
        text:
          lang === 'en'
            ? `✅ New schedule ${created.scheduleNo} (${created.targetQty} ${created.unit}) created successfully!`
            : `✅ নতুন শিডিউল ${created.scheduleNo} (${created.targetQty} ${created.unit}) সফলভাবে তৈরি হয়েছে!`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  // Handle Delete Schedule
  const handleDeleteSchedule = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (
      !window.confirm(
        lang === 'en'
          ? 'Are you sure you want to delete this schedule and all its packing history?'
          : 'আপনি কি নিশ্চিত এই শিডিউল এবং এর সমস্ত প্যাকিং হিস্ট্রি মুছতে চান?'
      )
    ) {
      return;
    }

    try {
      await deleteSchedule(id);
      refreshData();
      setStatusMessage({
        type: 'success',
        text: lang === 'en' ? 'Schedule deleted.' : 'শিডিউল মুছে ফেলা হয়েছে।',
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  // Open Schedule History
  const handleOpenScheduleHistory = (schedule: PackingSchedule) => {
    setSelectedScheduleForHistory(schedule);
    setIsHistoryModalOpen(true);
  };

  // Export History CSV
  const handleExportCsv = () => {
    const csv = exportPackingLogsToCsv(filteredLogs);
    downloadCsvFile(csv, `Packing_Logs_History_${getTodayDateStr()}.csv`);
  };

  // Sync with uploaded Excel Schedules from ExcelFileTracker
  const handleSyncFromExcelTracker = () => {
    const res = syncSchedulesFromExcelTracker();
    refreshData();
    setStatusMessage({
      type: 'success',
      text:
        lang === 'en'
          ? `Synced with Excel Files: ${res.added} new schedules imported, ${res.updated} updated. Total ${res.total} active schedules.`
          : `এক্সেল শিডিউল ফাইল সিঙ্ক সম্পন্ন: ${res.added}টি নতুন শিডিউল যুক্ত, ${res.updated}টি আপডেট। মোট ${res.total}টি সক্রিয় শিডিউল।`,
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 text-slate-100">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & ACTION BAR (Sophisticated Glassmorphism ERP Styling)      */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-slate-900/60 backdrop-blur-2xl border border-slate-700/60 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">
                {lang === 'en' ? 'Schedule-wise Packing & Balance Hub' : 'শিডিউলভিত্তিক প্যাকিং ও ব্যালেন্স হাব'}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-mono border border-blue-400/20">
                ERP Sync
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {lang === 'en'
                ? 'Track production targets, record daily packed cartons, and view automatic remaining balance.'
                : 'টার্গেট ট্র্যাকিং, দৈনিক কার্টন প্যাকিং এন্ট্রি এবং স্বয়ংক্রিয় অবশিষ্ট ব্যালেন্স হিসাব।'}
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSyncFromExcelTracker}
            className="px-3 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white border border-indigo-500/40 font-medium text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            title={lang === 'en' ? 'Sync and import orders from uploaded Excel schedules' : 'আপলোডকৃত এক্সেল ফাইল থেকে শিডিউল সিঙ্ক করুন'}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-300" />
            <span>{lang === 'en' ? 'Sync Excel' : 'এক্সেল সিঙ্ক'}</span>
          </button>

          <button
            onClick={() => setIsAddScheduleOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'en' ? 'New Schedule' : 'নতুন শিডিউল'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>{lang === 'en' ? 'Export CSV' : 'এক্সপোর্ট CSV'}</span>
          </button>

          <button
            onClick={refreshData}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notification banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 border transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
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
            className="p-1 rounded hover:bg-slate-800/40 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DASHBOARD STATISTICS GRID (6 Cohesive Glassmorphic Cards)              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Total Schedules */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{lang === 'en' ? 'Schedules' : 'মোট শিডিউল'}</span>
            <Layers className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{stats.totalSchedules}</div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
            <span className="text-emerald-400">{stats.completedSchedules} done</span>
            <span>•</span>
            <span className="text-amber-400">{stats.inProgressSchedules} active</span>
          </div>
        </div>

        {/* Total Demand Target */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{lang === 'en' ? 'Target Demand' : 'টার্গেট চাহিদা'}</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {stats.totalTargetQty.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {lang === 'en' ? 'Meters / Pcs total' : 'মোট মিটার/পিস'}
          </div>
        </div>

        {/* Total Packed So Far */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{lang === 'en' ? 'Total Packed' : 'মোট প্যাকড'}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            {stats.totalPackedQty.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-1 font-medium">
            {stats.overallFulfillment}% {lang === 'en' ? 'fulfilled' : 'সম্পন্ন'}
          </div>
        </div>

        {/* Remaining Balance */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-amber-500/20 bg-amber-950/10 shadow-lg">
          <div className="flex items-center justify-between text-amber-300 text-xs mb-1">
            <span>{lang === 'en' ? 'Balance Remaining' : 'অবশিষ্ট ব্যালেন্স'}</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono">
            {stats.totalBalanceQty.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-300/70 mt-1">
            {lang === 'en' ? 'To be packed' : 'প্যাকিং বাকি আছে'}
          </div>
        </div>

        {/* Today's Packed Output */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-blue-500/20 bg-blue-950/10 shadow-lg">
          <div className="flex items-center justify-between text-blue-300 text-xs mb-1">
            <span>{lang === 'en' ? "Today's Packed" : 'আজকের প্যাকিং'}</span>
            <Zap className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-blue-400 font-mono">
            {stats.todayPackedQty.toLocaleString()}
          </div>
          <div className="text-[10px] text-blue-300/80 mt-1 font-medium">
            {stats.todayCartons} {lang === 'en' ? 'cartons today' : 'কার্টন আজ'}
          </div>
        </div>

        {/* Total Cartons Packed */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{lang === 'en' ? 'Total Cartons' : 'মোট কার্টন'}</span>
            <Package className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-300 font-mono">
            {stats.totalCartons.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {stats.todayLogsCount} {lang === 'en' ? 'sessions logged' : 'লগ রেকর্ড'}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SUB-NAVIGATION, SEARCH & DATE FILTER TOOLBAR                          */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-2xl bg-slate-900/60 backdrop-blur-2xl border border-slate-800/80 shadow-md flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Sub tabs: Schedules vs Daily Packing History */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/80 border border-slate-700/60 w-fit">
            <button
              onClick={() => setActiveSubTab('schedules')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'schedules'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Production Schedules' : 'প্রোডাকশন শিডিউল'}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-900/60 text-[10px] font-mono">
                {filteredSchedules.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('history')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'history'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Daily Packing Logs' : 'দৈনিক প্যাকিং হিস্ট্রি'}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-900/60 text-[10px] font-mono">
                {filteredLogs.length}
              </span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                lang === 'en'
                  ? 'Search by Order Ref, Buyer, Customer, Item...'
                  : 'অর্ডার রেফারেন্স, বায়ার, কাস্টমার দিয়ে খুঁজুন...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View mode toggle (Cards vs Table) */}
          {activeSubTab === 'schedules' && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/80 border border-slate-700/60 w-fit self-end md:self-auto">
              <button
                onClick={() => setViewLayout('cards')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  viewLayout === 'cards' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Cards layout"
              >
                {lang === 'en' ? 'Cards' : 'কার্ড'}
              </button>
              <button
                onClick={() => setViewLayout('table')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  viewLayout === 'table' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Table layout"
              >
                {lang === 'en' ? 'Table' : 'টেবিল'}
              </button>
            </div>
          )}
        </div>

        {/* Date Filter Quick Chips & Status Selectors */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-1 text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>{lang === 'en' ? 'Date:' : 'তারিখ:'}</span>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {(['all', 'today', 'yesterday', 'this_week', 'this_month'] as DateFilterType[]).map((type) => {
              const isActive = dateFilter.type === type;
              const labels: Record<DateFilterType, { en: string; bn: string }> = {
                all: { en: 'All Dates', bn: 'সকল তারিখ' },
                today: { en: 'Today', bn: 'আজ' },
                yesterday: { en: 'Yesterday', bn: 'গতকাল' },
                this_week: { en: 'This Week', bn: 'এই সপ্তাহ' },
                this_month: { en: 'This Month', bn: 'এই মাস' },
                custom: { en: 'Custom', bn: 'কাস্টম' },
              };

              return (
                <button
                  key={type}
                  onClick={() => setDateFilter({ type })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  {labels[type][lang]}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

          {/* Status filter */}
          {activeSubTab === 'schedules' && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">{lang === 'en' ? 'Status:' : 'স্ট্যাটাস:'}</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-0.8 text-xs focus:outline-hidden"
              >
                <option value="all">{lang === 'en' ? 'All Status' : 'সকল স্ট্যাটাস'}</option>
                <option value="in-progress">{lang === 'en' ? 'In Progress' : 'চলমান'}</option>
                <option value="pending">{lang === 'en' ? 'Pending' : 'পেন্ডিং'}</option>
                <option value="completed">{lang === 'en' ? 'Completed' : 'সম্পন্ন'}</option>
              </select>
            </div>
          )}

          {/* Buyer Filter */}
          {uniqueBuyers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">{lang === 'en' ? 'Buyer:' : 'বায়ার:'}</span>
              <select
                value={buyerFilter}
                onChange={(e) => setBuyerFilter(e.target.value)}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-0.8 text-xs focus:outline-hidden"
              >
                <option value="all">{lang === 'en' ? 'All Buyers' : 'সকল বায়ার'}</option>
                {uniqueBuyers.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MAIN CONTENT VIEW: SCHEDULES (CARDS OR TABLE) OR HISTORY LOGS          */}
      {/* ========================================================================= */}
      {activeSubTab === 'schedules' ? (
        viewLayout === 'cards' ? (
          /* ------------------------------------------------------------- */
          /* SCHEDULE CARDS VIEW                                           */
          /* ------------------------------------------------------------- */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSchedules.length === 0 ? (
              <div className="col-span-full py-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
                <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">
                  {lang === 'en' ? 'No schedules match your filter.' : 'কোনো শিডিউল পাওয়া যায়নি।'}
                </p>
                <button
                  onClick={() => setIsAddScheduleOpen(true)}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer"
                >
                  {lang === 'en' ? '+ Create New Schedule' : '+ নতুন শিডিউল যোগ করুন'}
                </button>
              </div>
            ) : (
              filteredSchedules.map((schedule, idx) => {
                const isComplete = schedule.status === 'completed' || schedule.balanceQty <= 0;
                const progressPct = schedule.progress || 0;

                return (
                  <div
                    key={schedule.id}
                    className="p-4 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 hover:border-blue-500/50 transition-all flex flex-col justify-between shadow-lg group relative overflow-hidden"
                  >
                    {/* Glowing side accent */}
                    <div
                      className={`absolute top-0 left-0 bottom-0 w-1 ${
                        isComplete ? 'bg-emerald-500' : progressPct > 0 ? 'bg-blue-500' : 'bg-slate-600'
                      }`}
                    />

                    <div>
                      {/* Top bar: Schedule #, Status, Actions */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 font-mono text-[11px] font-bold border border-slate-700">
                            {schedule.scheduleNo}
                          </span>
                          <span className="text-xs font-bold text-white truncate max-w-[130px]">
                            {schedule.buyer}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 border ${
                              isComplete
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : progressPct > 0
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isComplete ? 'bg-emerald-400' : progressPct > 0 ? 'bg-blue-400' : 'bg-slate-400'
                              }`}
                            />
                            <span>
                              {isComplete
                                ? lang === 'en' ? 'Completed' : 'সম্পন্ন'
                                : progressPct > 0
                                ? lang === 'en' ? 'In Progress' : 'চলমান'
                                : lang === 'en' ? 'Pending' : 'পেন্ডিং'}
                            </span>
                          </span>

                          <button
                            onClick={(e) => handleDeleteSchedule(schedule.id, e)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded-md transition"
                            title="Delete Schedule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Order Ref & Item Specs */}
                      <div className="mb-3 p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-mono truncate max-w-[170px]" title={schedule.orderRef}>
                            Ref: <strong className="text-slate-200">{schedule.orderRef}</strong>
                          </span>
                          <span className="text-slate-300 text-[11px]">
                            {schedule.customer}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-700/30">
                          <span>
                            {schedule.itemDescription} • {schedule.size} • {schedule.color}
                          </span>
                          {schedule.deliveryDate && (
                            <span className="text-amber-300/80 font-mono">
                              Due: {schedule.deliveryDate}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Metrics: Target vs Packed vs Balance */}
                      <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-slate-800/40 border border-slate-700/40 mb-3 text-center">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                            {lang === 'en' ? 'Target' : 'টার্গেট'}
                          </div>
                          <div className="text-xs font-bold text-slate-200 font-mono">
                            {schedule.targetQty.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-slate-400">{schedule.unit}</div>
                        </div>

                        <div>
                          <div className="text-[10px] text-emerald-400 uppercase tracking-wider">
                            {lang === 'en' ? 'Packed' : 'প্যাকড'}
                          </div>
                          <div className="text-xs font-bold text-emerald-400 font-mono">
                            {schedule.completedQty.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-emerald-400/80">
                            {schedule.totalCartons} ctns
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-amber-400 uppercase tracking-wider">
                            {lang === 'en' ? 'Balance' : 'ব্যালেন্স'}
                          </div>
                          <div
                            className={`text-xs font-bold font-mono ${
                              isComplete ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {schedule.balanceQty.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-amber-400/80">
                            {isComplete ? '0 left' : `${schedule.unit} left`}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">{lang === 'en' ? 'Progress' : 'অগ্রগতি'}</span>
                          <span className="font-mono font-bold text-slate-200">{progressPct}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isComplete
                                ? 'bg-emerald-500'
                                : progressPct > 50
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, progressPct)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        {/* Daily Packing Entry Button */}
                        <button
                          onClick={() => handleOpenDailyPacking(schedule)}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                          title={lang === 'en' ? "Record today's packed cartons" : 'আজকের প্যাকিং এন্ট্রি করুন'}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{lang === 'en' ? 'Pack Today' : 'প্যাকিং দিন'}</span>
                        </button>

                        {/* History Button */}
                        <button
                          onClick={() => handleOpenScheduleHistory(schedule)}
                          className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                          title={lang === 'en' ? 'View packing history' : 'প্যাকিং হিস্ট্রি দেখুন'}
                        >
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{lang === 'en' ? 'Logs' : 'লগ'}</span>
                        </button>
                      </div>

                      {/* Load to Carton Table */}
                      {(onLoadScheduleToTable || onLoadScheduleToSheet) && (
                        <button
                          onClick={() => handleLoadSchedule(schedule)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 font-medium text-xs flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                          title={lang === 'en' ? 'Load order specs into Carton Table' : 'টেবিলে লোড করুন'}
                        >
                          <Package className="w-3.5 h-3.5 text-blue-400" />
                          <span>{lang === 'en' ? 'Open Table' : 'টেবিল'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* SCHEDULE TABLE VIEW                                           */
          /* ------------------------------------------------------------- */
          <div className="overflow-x-auto rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-xl">
            <table className="w-full text-xs text-left text-slate-200">
              <thead className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700/80">
                <tr>
                  <th className="px-3 py-2.5"># Schedule</th>
                  <th className="px-3 py-2.5">Buyer & Customer</th>
                  <th className="px-3 py-2.5">Order Ref</th>
                  <th className="px-3 py-2.5">Item Specs</th>
                  <th className="px-3 py-2.5 text-right">Target</th>
                  <th className="px-3 py-2.5 text-right text-emerald-400">Packed</th>
                  <th className="px-3 py-2.5 text-right text-amber-400">Balance</th>
                  <th className="px-3 py-2.5 text-center">Ctns</th>
                  <th className="px-3 py-2.5 text-center">Progress</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredSchedules.map((s) => {
                  const isComplete = s.status === 'completed' || s.balanceQty <= 0;
                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-200">
                        {s.scheduleNo}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-white">{s.buyer}</div>
                        <div className="text-[10px] text-slate-400">{s.customer}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-300">
                        {s.orderRef}
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">
                        {s.itemDescription} ({s.size}, {s.color})
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-200">
                        {s.targetQty.toLocaleString()} {s.unit}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-400">
                        {s.completedQty.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-400">
                        {s.balanceQty.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono">
                        {s.totalCartons}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="font-mono font-bold">{s.progress}%</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            isComplete
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}
                        >
                          {isComplete ? 'Complete' : 'In Progress'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenDailyPacking(s)}
                            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium"
                          >
                            + Pack
                          </button>
                          {(onLoadScheduleToTable || onLoadScheduleToSheet) && (
                            <button
                              onClick={() => handleLoadSchedule(s)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400"
                              title={lang === 'en' ? 'Open in Carton Table' : 'কার্টন টেবিলে খুলুন'}
                            >
                              <Package className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenScheduleHistory(s)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="Logs"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* ------------------------------------------------------------- */
        /* DAILY PACKING HISTORY (LOGS VIEW)                            */
        /* ------------------------------------------------------------- */
        <div className="overflow-x-auto rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-xl">
          <table className="w-full text-xs text-left text-slate-200">
            <thead className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700/80">
              <tr>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Schedule #</th>
                <th className="px-3 py-2.5">Buyer</th>
                <th className="px-3 py-2.5">Order Ref</th>
                <th className="px-3 py-2.5 text-center">Cartons</th>
                <th className="px-3 py-2.5 text-center">Range</th>
                <th className="px-3 py-2.5 text-right text-emerald-400">Packed Qty</th>
                <th className="px-3 py-2.5 text-right">Net Wt (Kg)</th>
                <th className="px-3 py-2.5">Operator & Shift</th>
                <th className="px-3 py-2.5">Notes</th>
                <th className="px-3 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    {lang === 'en' ? 'No daily packing logs found.' : 'কোনো প্যাকিং হিস্ট্রি পাওয়া যায়নি।'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-3 py-2.5 font-mono text-slate-300">
                      {log.packingDate}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-blue-400">
                      {log.scheduleNo}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-white">
                      {log.buyer}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-300">
                      {log.orderRef}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold">
                      {log.cartonsCount}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-slate-400">
                      #{log.startCartonNo || 1} - #{log.endCartonNo || log.cartonsCount}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-400">
                      {log.packedQty.toLocaleString()} {log.unit}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-300">
                      {log.netWeightKg ? `${log.netWeightKg} Kg` : '-'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-slate-200">{log.operator || 'Operator'}</div>
                      <div className="text-[10px] text-slate-400">{log.shift}</div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 max-w-[150px] truncate" title={log.notes}>
                      {log.notes || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                        title="Delete log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: RECORD DAILY PACKING ENTRY                                     */}
      {/* ========================================================================= */}
      {isDailyPackingModalOpen && selectedScheduleForPacking && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {lang === 'en' ? 'Record Daily Packing' : 'দৈনিক প্যাকিং এন্ট্রি'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedScheduleForPacking.scheduleNo} • {selectedScheduleForPacking.buyer} ({selectedScheduleForPacking.orderRef})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDailyPackingModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Status Pill of Current Balance */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Target</span>
                <span className="font-mono font-bold text-white">
                  {selectedScheduleForPacking.targetQty.toLocaleString()} {selectedScheduleForPacking.unit}
                </span>
              </div>
              <div>
                <span className="text-emerald-400 block text-[10px]">Packed So Far</span>
                <span className="font-mono font-bold text-emerald-400">
                  {selectedScheduleForPacking.completedQty.toLocaleString()} ({selectedScheduleForPacking.totalCartons} ctns)
                </span>
              </div>
              <div>
                <span className="text-amber-400 block text-[10px]">Current Balance</span>
                <span className="font-mono font-bold text-amber-400">
                  {selectedScheduleForPacking.balanceQty.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 1-Click Import From Live Table Button */}
            <button
              type="button"
              onClick={handleImportCurrentCartons}
              className="w-full py-2 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>{lang === 'en' ? '⚡ Auto-Fill From Current Packing Sheet' : '⚡ বর্তমান শিট থেকে অটো-ফিল করুন'}</span>
            </button>

            <form onSubmit={handleSubmitDailyPacking} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === 'en' ? 'Packing Date' : 'প্যাকিং তারিখ'}
                  </label>
                  <input
                    type="date"
                    required
                    value={packingDate}
                    onChange={(e) => setPackingDate(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl px-3 py-1.5 font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === 'en' ? 'Quantity Packed Today' : 'আজকের প্যাকিং পরিমাণ'} ({selectedScheduleForPacking.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 1500"
                    value={packedQty}
                    onChange={(e) => setPackedQty(e.target.value)}
                    className="w-full bg-slate-800 text-emerald-300 border border-slate-700 rounded-xl px-3 py-1.5 font-mono font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Cartons Count & Range */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === 'en' ? 'Cartons Count' : 'কার্টন সংখ্যা'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={cartonsCount}
                    onChange={(e) => setCartonsCount(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl px-3 py-1.5 font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === 'en' ? 'Start Carton #' : 'শুরু কার্টন #'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={startCartonNo}
                    onChange={(e) => setStartCartonNo(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl px-3 py-1.5 font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === 'en' ? 'End Carton #' : 'শেষ কার্টন #'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={endCartonNo}
                    onChange={(e) => setEndCartonNo(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl px-3 py-1.5 font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Net Weight & Gross Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === 'en' ? 'Net Weight (Kg)' : 'নেট ওজন (কেজি)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 12.50"
                    value={netWeightKg}
                    onChange={(e) => setNetWeightKg(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl px-3 py-1.5 font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === 'en' ? 'Gross Weight (Kg)' : 'গ্রস ওজন (কেজি)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 14.00"
                    value={grossWeightKg}
                    onChange={(e) => setGrossWeightKg(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl px-3 py-1.5 font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Operator & Shift */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === 'en' ? 'Operator / Packer' : 'অপারেটর / প্যাকার'}
                  </label>
                  <input
                    type="text"
                    placeholder="Operator name"
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === 'en' ? 'Shift' : 'শিফট'}
                  </label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as any)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="Morning">Morning Shift</option>
                    <option value="Day">Day Shift</option>
                    <option value="Night">Night Shift</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-400 mb-1">
                  {lang === 'en' ? 'Notes / Remarks' : 'নোট / মন্তব্য'}
                </label>
                <input
                  type="text"
                  placeholder="Optional packing remarks..."
                  value={packingNotes}
                  onChange={(e) => setPackingNotes(e.target.value)}
                  className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Real-time Projected Balance Preview */}
              {packedQty && Number(packedQty) > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300 text-xs flex items-center justify-between">
                  <span>{lang === 'en' ? 'New Balance After Entry:' : 'এন্ট্রির পর নতুন ব্যালেন্স:'}</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {Math.max(0, selectedScheduleForPacking.balanceQty - Number(packedQty)).toLocaleString()} {selectedScheduleForPacking.unit}
                  </span>
                </div>
              )}

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDailyPackingModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                >
                  {lang === 'en' ? 'Cancel' : 'বাতিল'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLog}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmittingLog ? 'Saving...' : lang === 'en' ? 'Commit Entry' : 'এন্ট্রি সেভ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: CREATE NEW SCHEDULE                                            */}
      {/* ========================================================================= */}
      {isAddScheduleOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  {lang === 'en' ? 'Create New Production Schedule' : 'নতুন প্রোডাকশন শিডিউল তৈরি করুন'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddScheduleOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateScheduleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === 'en' ? 'Buyer Name' : 'বায়ারের নাম'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HCF, H&M, Zara"
                    value={newBuyer}
                    onChange={(e) => setNewBuyer(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === 'en' ? 'Customer / Factory' : 'কাস্টমার / ফ্যাক্টরি'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LIZ, Target"
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  {lang === 'en' ? 'Order Ref / PO Number' : 'অর্ডার রেফারেন্স / পিও নম্বর'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LIZ-LO-ELS-26080056"
                  value={newOrderRef}
                  onChange={(e) => setNewOrderRef(e.target.value)}
                  className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl px-3 py-1.5 font-mono focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === 'en' ? 'Item' : 'আইটেম'}
                  </label>
                  <input
                    type="text"
                    placeholder="Elastic"
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === 'en' ? 'Size' : 'সাইজ'}
                  </label>
                  <input
                    type="text"
                    placeholder="7MM"
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === 'en' ? 'Color' : 'কালার'}
                  </label>
                  <input
                    type="text"
                    placeholder="BLACK"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Target Qty and Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === 'en' ? 'Target Demand Quantity' : 'টার্গেট চাহিদা পরিমাণ'} *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 5000"
                    value={newTargetQty}
                    onChange={(e) => setNewTargetQty(e.target.value)}
                    className="w-full bg-slate-800 text-blue-300 border border-slate-700 rounded-xl px-3 py-1.5 font-mono font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === 'en' ? 'Unit' : 'ইউনিট'}
                  </label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as any)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="mtr">Meters (Mtr)</option>
                    <option value="pcs">Pieces (Pcs)</option>
                    <option value="yds">Yards (Yds)</option>
                    <option value="gry">Gross Yards (Gry)</option>
                  </select>
                </div>
              </div>

              {/* Delivery Date & Line */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === 'en' ? 'Target Delivery Date' : 'ডেলিভারি তারিখ'}
                  </label>
                  <input
                    type="date"
                    value={newDeliveryDate}
                    onChange={(e) => setNewDeliveryDate(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl px-3 py-1.5 font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === 'en' ? 'Assigned Production Line' : 'প্রোডাকশন লাইন'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Line-01"
                    value={newAssignedLine}
                    onChange={(e) => setNewAssignedLine(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddScheduleOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                >
                  {lang === 'en' ? 'Cancel' : 'বাতিল'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Create Schedule' : 'শিডিউল তৈরি করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: SCHEDULE PACKING LOGS HISTORY                                   */}
      {/* ========================================================================= */}
      {isHistoryModalOpen && selectedScheduleForHistory && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {lang === 'en' ? 'Packing History Logs' : 'প্যাকিং হিস্ট্রি লগ'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedScheduleForHistory.scheduleNo} • {selectedScheduleForHistory.buyer} ({selectedScheduleForHistory.orderRef})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Schedule Summary Bar */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">Target</span>
                <span className="font-mono font-bold text-white">
                  {selectedScheduleForHistory.targetQty.toLocaleString()} {selectedScheduleForHistory.unit}
                </span>
              </div>
              <div>
                <span className="text-emerald-400 text-[10px] block">Packed</span>
                <span className="font-mono font-bold text-emerald-400">
                  {selectedScheduleForHistory.completedQty.toLocaleString()} {selectedScheduleForHistory.unit}
                </span>
              </div>
              <div>
                <span className="text-amber-400 text-[10px] block">Balance</span>
                <span className="font-mono font-bold text-amber-400">
                  {selectedScheduleForHistory.balanceQty.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-purple-400 text-[10px] block">Cartons</span>
                <span className="font-mono font-bold text-purple-300">
                  {selectedScheduleForHistory.totalCartons}
                </span>
              </div>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs text-left text-slate-200">
                <thead className="bg-slate-800 text-slate-400 font-bold">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2 text-center">Cartons</th>
                    <th className="px-3 py-2 text-center">Range</th>
                    <th className="px-3 py-2 text-right text-emerald-400">Packed Qty</th>
                    <th className="px-3 py-2 text-right">Net Wt</th>
                    <th className="px-3 py-2">Operator / Shift</th>
                    <th className="px-3 py-2 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {logs
                    .filter((l) => l.scheduleId === selectedScheduleForHistory.id)
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/50">
                        <td className="px-3 py-2 font-mono text-slate-300">{log.packingDate}</td>
                        <td className="px-3 py-2 text-center font-mono font-bold">{log.cartonsCount}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-400">
                          #{log.startCartonNo || 1} - #{log.endCartonNo || log.cartonsCount}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400">
                          {log.packedQty.toLocaleString()} {log.unit}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-300">
                          {log.netWeightKg ? `${log.netWeightKg} Kg` : '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {log.operator || 'Operator'} ({log.shift})
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  setIsHistoryModalOpen(false);
                  handleOpenDailyPacking(selectedScheduleForHistory);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Add Packing Log' : 'প্যাকিং লগ যোগ করুন'}</span>
              </button>

              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
              >
                {lang === 'en' ? 'Close' : 'বন্ধ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePackingView;
