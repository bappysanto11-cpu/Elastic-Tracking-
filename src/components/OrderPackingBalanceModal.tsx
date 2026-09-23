import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Package,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  ArrowRight,
  Download,
  FileSpreadsheet,
  AlertCircle,
  Scale,
  User,
  Hash,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ScheduleItem } from '../types/schedule';
import { DailyPackingLog, PackingSchedule } from '../types/schedulePacking';
import { PackingSheetData } from '../types/calculator';
import {
  getOrCreateScheduleForItem,
  getDailyLogsForOrderItem,
  recordDailyPackingForOrderItem,
  deleteDailyPackingLogForOrderItem,
  getTodayDateStr,
} from '../utils/schedulePackingService';

interface OrderPackingBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ScheduleItem | null;
  fileId: string;
  lang: 'en' | 'bn';
  currentSheetData?: PackingSheetData;
  onLoadRowToPackingSheet?: (item: ScheduleItem) => void;
  onNavigateToTab?: (tab: 'table' | 'sheet' | 'stickers') => void;
  onItemUpdated?: (updatedItem: ScheduleItem) => void;
}

export const OrderPackingBalanceModal: React.FC<OrderPackingBalanceModalProps> = ({
  isOpen,
  onClose,
  item,
  fileId,
  lang,
  currentSheetData,
  onLoadRowToPackingSheet,
  onNavigateToTab,
  onItemUpdated,
}) => {
  if (!isOpen || !item) return null;

  // Local state for current item to reflect instant updates
  const [currentItem, setCurrentItem] = useState<ScheduleItem>(item);
  const [logs, setLogs] = useState<DailyPackingLog[]>([]);
  const [schedule, setSchedule] = useState<PackingSchedule | null>(null);

  // Form State for Adding Today's Packing
  const [showAddForm, setShowAddForm] = useState<boolean>(true);
  const [packingDate, setPackingDate] = useState<string>(getTodayDateStr());
  const [shift, setShift] = useState<'Day' | 'Night' | 'Morning' | 'General'>('Day');
  const [packedQty, setPackedQty] = useState<string>('');
  const [cartonsCount, setCartonsCount] = useState<string>('1');
  const [startCartonNo, setStartCartonNo] = useState<string>('1');
  const [endCartonNo, setEndCartonNo] = useState<string>('1');
  const [netWeightKg, setNetWeightKg] = useState<string>('');
  const [operator, setOperator] = useState<string>('Operator');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load schedule and logs for this order
  const refreshData = () => {
    try {
      const sch = getOrCreateScheduleForItem(currentItem, fileId);
      setSchedule(sch);
      const itemLogs = getDailyLogsForOrderItem(currentItem, sch.id);
      setLogs(itemLogs);

      // Auto-suggest next carton start number
      if (itemLogs.length > 0) {
        const highestEndCarton = Math.max(
          ...itemLogs.map((l) => l.endCartonNo || l.cartonsCount || 0)
        );
        const nextStart = highestEndCarton + 1;
        setStartCartonNo(String(nextStart));
        setEndCartonNo(String(nextStart));
      }
    } catch (err) {
      console.warn('Could not load order daily packing logs:', err);
    }
  };

  useEffect(() => {
    setCurrentItem(item);
    refreshData();
    setMessage(null);
  }, [item, fileId]);

  // Handle carton count change to auto-calculate end carton no
  const handleCartonsCountChange = (val: string) => {
    setCartonsCount(val);
    const count = parseInt(val, 10);
    const start = parseInt(startCartonNo, 10);
    if (!isNaN(count) && count > 0 && !isNaN(start) && start > 0) {
      setEndCartonNo(String(start + count - 1));
    }
  };

  const handleStartCartonChange = (val: string) => {
    setStartCartonNo(val);
    const start = parseInt(val, 10);
    const count = parseInt(cartonsCount, 10);
    if (!isNaN(count) && count > 0 && !isNaN(start) && start > 0) {
      setEndCartonNo(String(start + count - 1));
    }
  };

  // Import from active Carton Table if available
  const handleImportFromLiveTable = () => {
    if (!currentSheetData) return;
    const activeCartons = (currentSheetData.cartons || []).filter(
      (c) => Number(c.netWt) > 0 || Number(c.lengthMtr) > 0
    );
    if (activeCartons.length === 0) {
      setMessage({
        type: 'error',
        text:
          lang === 'en'
            ? 'No packed cartons found in the active live table. Enter quantity manually.'
            : 'লাইভ কার্টন টেবিলে কোনো প্যাকড কার্টন পাওয়া যায়নি। ম্যানুয়ালি পরিমাণ লিখুন।',
      });
      return;
    }

    const totalMtr = activeCartons.reduce((sum, c) => sum + (Number(c.lengthMtr) || 0), 0);
    const totalNetWt = activeCartons.reduce((sum, c) => sum + (Number(c.netWt) || 0), 0);
    const ctnCount = activeCartons.length;
    const firstCtn = activeCartons[0]?.cartonNo || 1;
    const lastCtn = activeCartons[activeCartons.length - 1]?.cartonNo || ctnCount;

    setPackedQty(String(Math.round(totalMtr)));
    setCartonsCount(String(ctnCount));
    setStartCartonNo(String(firstCtn));
    setEndCartonNo(String(lastCtn));
    if (totalNetWt > 0) {
      setNetWeightKg(totalNetWt.toFixed(2));
    }
    setNotes(
      lang === 'en'
        ? `Imported from live table: ${ctnCount} cartons (#${firstCtn}-#${lastCtn})`
        : `লাইভ টেবিল থেকে আমদানি: ${ctnCount} কার্টন (#${firstCtn}-#${lastCtn})`
    );

    setMessage({
      type: 'success',
      text:
        lang === 'en'
          ? `Imported ${totalMtr.toLocaleString()} ${currentItem.unit || 'Mtr'} from ${ctnCount} live cartons!`
          : `লাইভ টেবিল থেকে ${totalMtr.toLocaleString()} ${currentItem.unit || 'মিটার'} ও ${ctnCount} কার্টনের ডাটা লোড হয়েছে!`,
    });
  };

  // Save new daily packing log
  const handleSaveDailyPacking = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = parseFloat(packedQty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setMessage({
        type: 'error',
        text:
          lang === 'en'
            ? 'Please enter a valid packed quantity greater than 0.'
            : 'দয়া করে ০ এর বেশি সঠিক প্যাকড পরিমাণ লিখুন।',
      });
      return;
    }

    const ctnCount = parseInt(cartonsCount, 10) || 1;
    const startCtn = parseInt(startCartonNo, 10) || 1;
    const endCtn = parseInt(endCartonNo, 10) || startCtn + ctnCount - 1;
    const netWt = netWeightKg ? parseFloat(netWeightKg) : undefined;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const { log, updatedItem } = await recordDailyPackingForOrderItem(
        currentItem,
        fileId,
        {
          packingDate,
          packedQty: qtyNum,
          cartonsCount: ctnCount,
          startCartonNo: startCtn,
          endCartonNo: endCtn,
          netWeightKg: netWt,
          operator,
          shift,
          notes,
        }
      );

      setCurrentItem(updatedItem);
      if (onItemUpdated) {
        onItemUpdated(updatedItem);
      }

      refreshData();

      // Reset form fields
      setPackedQty('');
      setNetWeightKg('');
      setNotes('');
      setMessage({
        type: 'success',
        text:
          lang === 'en'
            ? `✅ Successfully logged ${qtyNum.toLocaleString()} ${currentItem.unit || 'Mtr'} (${ctnCount} ctns) for ${packingDate}! Balance updated.`
            : `✅ ${packingDate}-এর জন্য ${qtyNum.toLocaleString()} ${currentItem.unit || 'মিটার'} (${ctnCount} কার্টন) সেভ হয়েছে! অবশিষ্ট ব্যালেন্স আপডেট হয়েছে।`,
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to save daily packing log.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete an existing daily packing log
  const handleDeleteLog = async (logId: string, logDate: string, logQty: number) => {
    const confirmMsg =
      lang === 'en'
        ? `Are you sure you want to delete the packing log of ${logQty.toLocaleString()} ${currentItem.unit || 'Mtr'} on ${logDate}? This will restore the remaining balance.`
        : `আপনি কি ${logDate}-এর ${logQty.toLocaleString()} ${currentItem.unit || 'মিটার'} এর প্যাকিং লগটি ডিলিট করতে চান? এতে অবশিষ্ট ব্যালেন্স আবার যোগ হবে।`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const { updatedItem } = await deleteDailyPackingLogForOrderItem(logId, currentItem, fileId);
      setCurrentItem(updatedItem);
      if (onItemUpdated) {
        onItemUpdated(updatedItem);
      }
      refreshData();
      setMessage({
        type: 'success',
        text:
          lang === 'en'
            ? 'Packing log removed and order balance restored!'
            : 'প্যাকিং লগটি মুছে ফেলা হয়েছে এবং ব্যালেন্স পুনরুদ্ধার করা হয়েছে!',
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: `Delete failed: ${err.message}`,
      });
    }
  };

  // Open this item in Carton Table
  const handleOpenInCartonTable = () => {
    if (onLoadRowToPackingSheet) {
      onLoadRowToPackingSheet(currentItem);
    }
    if (onNavigateToTab) {
      onNavigateToTab('table');
    }
    onClose();
  };

  // Demand, Done and Balance Calculations
  const targetDemand = Number(currentItem.demandQty) || Number(currentItem.orderQty) || 0;
  const totalCompleted = Number(currentItem.completedQty) || 0;
  const balanceRemaining = Math.max(0, targetDemand - totalCompleted);
  const progressPercent =
    targetDemand > 0
      ? Math.min(100, Math.round((totalCompleted / targetDemand) * 100))
      : totalCompleted > 0
      ? 100
      : 0;
  const totalLoggedCartons = logs.reduce((sum, l) => sum + (Number(l.cartonsCount) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/30 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-white truncate">
                  {currentItem.buyer || 'Order'} - {currentItem.customerRefPO || currentItem.jobNo || 'PO'}
                </h3>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    balanceRemaining === 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : currentItem.status === 'in-progress' || totalCompleted > 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-700 text-slate-300 border border-slate-600'
                  }`}
                >
                  {balanceRemaining === 0
                    ? lang === 'en'
                      ? 'Completed'
                      : 'সম্পন্ন'
                    : totalCompleted > 0
                    ? lang === 'en'
                      ? 'In-Progress'
                      : 'চলমান'
                    : lang === 'en'
                    ? 'Pending'
                    : 'অপেক্ষমাণ'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {currentItem.itemDescription || 'Elastic Item'} • Color:{' '}
                <span className="text-slate-200">{currentItem.color || 'Standard'}</span> • Size:{' '}
                <span className="text-indigo-300 font-mono font-bold">{currentItem.size || '-'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0 ml-2"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast / Alert Message */}
        {message && (
          <div
            className={`px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-between border-b ${
              message.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-slate-400 hover:text-white ml-2 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Real-time Order Packing & Balance HUD */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Demand */}
            <div className="bg-slate-800/70 border border-slate-700/60 p-3.5 rounded-xl">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>{lang === 'en' ? 'Total Demand' : 'মোট চাহিদা'}</span>
                <Package className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-lg sm:text-xl font-mono font-bold text-white">
                {targetDemand.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-400">{currentItem.unit || 'Mtr'}</span>
              </div>
            </div>

            {/* Total Completed / Packed */}
            <div className="bg-slate-800/70 border border-slate-700/60 p-3.5 rounded-xl">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>{lang === 'en' ? 'Completed Packed' : 'মোট প্যাকড'}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-lg sm:text-xl font-mono font-bold text-emerald-400">
                {totalCompleted.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-400">{currentItem.unit || 'Mtr'}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {progressPercent}% {lang === 'en' ? 'fulfilled' : 'সম্পূর্ণ'}
              </div>
            </div>

            {/* REMAINING BALANCE - PROMINENT HIGHLIGHT */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                balanceRemaining === 0
                  ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'bg-amber-950/30 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className={balanceRemaining === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                  {lang === 'en' ? 'Remaining Balance' : 'অবশিষ্ট ব্যালেন্স'}
                </span>
                <Clock
                  className={`w-3.5 h-3.5 ${balanceRemaining === 0 ? 'text-emerald-400' : 'text-amber-400'}`}
                />
              </div>
              <div
                className={`text-lg sm:text-2xl font-mono font-black ${
                  balanceRemaining === 0 ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {balanceRemaining.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-300">{currentItem.unit || 'Mtr'}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                {balanceRemaining === 0
                  ? lang === 'en'
                    ? '✓ 100% Packed! Zero balance.'
                    : '✓ সম্পূর্ণ প্যাকড! কোনো ব্যালেন্স নেই।'
                  : lang === 'en'
                  ? 'Pending to pack'
                  : 'প্যাক করা বাকি রয়েছে'}
              </div>
            </div>

            {/* Total Cartons */}
            <div className="bg-slate-800/70 border border-slate-700/60 p-3.5 rounded-xl">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>{lang === 'en' ? 'Total Cartons' : 'মোট কার্টন'}</span>
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-lg sm:text-xl font-mono font-bold text-indigo-300">
                {totalLoggedCartons}{' '}
                <span className="text-xs font-normal text-slate-400">{lang === 'en' ? 'Ctns' : 'টি'}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {logs.length} {lang === 'en' ? 'daily sessions' : 'টি দৈনিক সেশন'}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">
                {lang === 'en' ? 'Packing Progress' : 'প্যাকিং অগ্রগতি'}:{' '}
                <span className="text-white font-bold">{progressPercent}%</span>
              </span>
              <span className="text-slate-400 text-[11px]">
                {totalCompleted.toLocaleString()} / {targetDemand.toLocaleString()}{' '}
                {currentItem.unit || 'Mtr'}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-700/60 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  progressPercent >= 100
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-blue-500 to-emerald-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Action Row: Live Carton Table Link & Form Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenInCartonTable}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                title={
                  lang === 'en'
                    ? 'Load this order into 3-in-1 Carton Table to pack physical cartons'
                    : 'এই অর্ডারটি সরাসরি ৩-ইন-১ কার্টন টেবিলে লোড করে কার্টন প্যাক করুন'
                }
              >
                <Package className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Pack in Carton Table' : 'কার্টন টেবিলে প্যাক করুন'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-200" />
              </button>

              {currentSheetData && (
                <button
                  type="button"
                  onClick={handleImportFromLiveTable}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                  title={
                    lang === 'en'
                      ? 'Import currently active cartons from table into this form'
                      : 'চলতি লাইভ কার্টন টেবিল থেকে ডাটা আমদানি করুন'
                  }
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'en' ? 'Import from Live Table' : 'লাইভ টেবিল থেকে আনুন'}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3.5 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? "Log Today's Packing" : 'আজকের প্যাকিং যোগ করুন'}</span>
              {showAddForm ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Quick Add Daily Packing Log Form */}
          {showAddForm && (
            <form
              onSubmit={handleSaveDailyPacking}
              className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 sm:p-5 space-y-4 shadow-md animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>
                    {lang === 'en'
                      ? "Record Daily Packing & Update Balance"
                      : 'দৈনিক প্যাকিং এন্ট্রি ও ব্যালেন্স আপডেট'}
                  </span>
                </h4>
                <span className="text-[11px] text-slate-400">
                  {lang === 'en' ? 'Auto-calculates remaining balance' : 'স্বয়ংক্রিয়ভাবে ব্যালেন্স হিসাব হবে'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Date */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {lang === 'en' ? 'Packing Date' : 'প্যাকিংয়ের তারিখ'} *
                  </label>
                  <input
                    type="date"
                    value={packingDate}
                    onChange={(e) => setPackingDate(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>

                {/* Shift */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {lang === 'en' ? 'Shift' : 'শিফট'}
                  </label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Day">Day Shift (ডে শিফট)</option>
                    <option value="Night">Night Shift (নাইট শিফট)</option>
                    <option value="Morning">Morning Shift (মর্নিং)</option>
                    <option value="General">General / Overtime</option>
                  </select>
                </div>

                {/* Operator Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {lang === 'en' ? 'Operator / Packer' : 'অপারেটর / প্যাকার'}
                  </label>
                  <input
                    type="text"
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    placeholder="e.g. Bappy"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Packed Quantity */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-emerald-400 mb-1">
                    {lang === 'en' ? `Packed Qty (${currentItem.unit || 'Mtr'})` : `প্যাকড পরিমাণ (${currentItem.unit || 'মিটার'})`} *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={packedQty}
                    onChange={(e) => setPackedQty(e.target.value)}
                    placeholder={
                      balanceRemaining > 0
                        ? `Max: ${balanceRemaining.toLocaleString()}`
                        : 'e.g. 5000'
                    }
                    required
                    className="w-full bg-slate-900 border border-emerald-500/60 text-emerald-300 font-mono font-bold rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Cartons Count */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {lang === 'en' ? 'Carton Count' : 'কার্টন সংখ্যা'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={cartonsCount}
                    onChange={(e) => handleCartonsCountChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Carton Range */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {lang === 'en' ? 'Ctn Range (Start - End)' : 'কার্টন রেঞ্জ (#হতে - #পর্যন্ত)'}
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      value={startCartonNo}
                      onChange={(e) => handleStartCartonChange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-lg px-2 py-1.5 text-xs text-center focus:ring-1 focus:ring-emerald-500"
                      title="Start Carton No"
                    />
                    <span className="text-slate-500 text-xs">-</span>
                    <input
                      type="number"
                      min="1"
                      value={endCartonNo}
                      onChange={(e) => setEndCartonNo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-lg px-2 py-1.5 text-xs text-center focus:ring-1 focus:ring-emerald-500"
                      title="End Carton No"
                    />
                  </div>
                </div>

                {/* Net Weight Kg (Optional) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {lang === 'en' ? 'Net Weight (Kg)' : 'নেট ওজন (কেজি)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={netWeightKg}
                    onChange={(e) => setNetWeightKg(e.target.value)}
                    placeholder="e.g. 42.50"
                    className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Notes / Remarks */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {lang === 'en' ? 'Remarks / Challan Ref' : 'মন্তব্য বা চালান রেফারেন্স'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    lang === 'en'
                      ? 'Optional note, e.g. Challan #CH-902, Lot #2'
                      : 'ঐচ্ছিক নোট, যেমন: চালান #CH-902, লট #২'
                  }
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition"
                >
                  {lang === 'en' ? 'Cancel' : 'বাতিল'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? lang === 'en'
                        ? 'Saving & Updating...'
                        : 'সেভ হচ্ছে...'
                      : lang === 'en'
                      ? 'Save Packing & Update Balance'
                      : 'প্যাকিং সেভ ও ব্যালেন্স আপডেট করুন'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Daily Packing History Table for this specific order */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>
                  {lang === 'en'
                    ? 'Daily Packing Log History for this Order'
                    : 'এই অর্ডারের দৈনিক প্যাকিং লগ হিস্ট্রি'}
                </span>
                <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  {logs.length}
                </span>
              </h4>
              <span className="text-[11px] text-slate-400">
                {lang === 'en'
                  ? 'All records directly linked to this schedule order'
                  : 'এই শিডিউল অর্ডারের সাথে সংযুক্ত সমস্ত রেকর্ড'}
              </span>
            </div>

            {logs.length === 0 ? (
              <div className="bg-slate-800/40 border border-dashed border-slate-700/80 rounded-xl p-6 text-center text-slate-400 text-xs sm:text-sm space-y-2">
                <p>
                  {lang === 'en'
                    ? 'No daily packing logs recorded for this order yet.'
                    : 'এই অর্ডারের জন্য এখনো কোনো দৈনিক প্যাকিং লগ রেকর্ড করা হয়নি।'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {lang === 'en'
                    ? 'Use the form above or pack live in the Carton Table to record today\'s packing.'
                    : 'আজকের প্যাকিং এন্ট্রি করতে উপরের ফর্ম পূরণ করুন অথবা কার্টন টেবিলে প্যাক করুন।'}
                </p>
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700/70 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-200">
                    <thead className="bg-slate-800/90 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-700/80">
                      <tr>
                        <th className="px-3 py-2.5">SL</th>
                        <th className="px-3 py-2.5">{lang === 'en' ? 'Date' : 'তারিখ'}</th>
                        <th className="px-3 py-2.5">{lang === 'en' ? 'Shift / Operator' : 'শিফট / অপারেটর'}</th>
                        <th className="px-3 py-2.5">{lang === 'en' ? 'Cartons' : 'কার্টন'}</th>
                        <th className="px-3 py-2.5 text-right">
                          {lang === 'en' ? `Packed (${currentItem.unit || 'Mtr'})` : `প্যাকড (${currentItem.unit || 'Mtr'})`}
                        </th>
                        <th className="px-3 py-2.5 text-right">{lang === 'en' ? 'Net Wt' : 'নেট ওজন'}</th>
                        <th className="px-3 py-2.5">{lang === 'en' ? 'Notes' : 'মন্তব্য'}</th>
                        <th className="px-3 py-2.5 text-center">{lang === 'en' ? 'Action' : 'অ্যাকশন'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 font-mono text-[12px]">
                      {logs.map((log, idx) => (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-3 py-2.5 text-slate-400 font-sans">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-bold text-white whitespace-nowrap">
                            {log.packingDate || log.createdAt.slice(0, 10)}
                          </td>
                          <td className="px-3 py-2.5 font-sans whitespace-nowrap">
                            <span className="bg-slate-700/80 text-slate-200 text-[10px] px-1.5 py-0.5 rounded mr-1.5">
                              {log.shift || 'Day'}
                            </span>
                            <span className="text-slate-300 text-[11px]">{log.operator || '-'}</span>
                          </td>
                          <td className="px-3 py-2.5 text-indigo-300 whitespace-nowrap">
                            <span className="font-bold">{log.cartonsCount} Ctns</span>{' '}
                            <span className="text-slate-400 text-[11px]">
                              (#{log.startCartonNo || 1} - #{log.endCartonNo || log.cartonsCount})
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-emerald-400 whitespace-nowrap">
                            +{Number(log.packedQty || 0).toLocaleString()} {log.unit || currentItem.unit || 'Mtr'}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-300 whitespace-nowrap">
                            {log.netWeightKg ? `${Number(log.netWeightKg).toFixed(2)} Kg` : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-400 font-sans truncate max-w-[150px]">
                            {log.notes || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteLog(log.id, log.packingDate, log.packedQty)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                              title={
                                lang === 'en'
                                  ? 'Delete this log entry and restore balance'
                                  : 'এই লগটি মুছে ফেলুন ও ব্যালেন্স ফিরিয়ে আনুন'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-900/90 shrink-0">
          <div className="text-xs text-slate-400">
            {lang === 'en' ? 'Remaining Balance:' : 'অবশিষ্ট ব্যালেন্স:'}{' '}
            <span
              className={`font-mono font-bold ${
                balanceRemaining === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {balanceRemaining.toLocaleString()} {currentItem.unit || 'Mtr'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            {lang === 'en' ? 'Done / Close' : 'সম্পন্ন / বন্ধ করুন'}
          </button>
        </div>
      </div>
    </div>
  );
};
