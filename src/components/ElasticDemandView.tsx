import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Tag, 
  Maximize2, 
  Scale, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  Download, 
  FileSpreadsheet, 
  Printer, 
  Filter, 
  SlidersHorizontal, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  Layers, 
  RefreshCw, 
  Sparkles,
  ChevronDown,
  LayoutGrid,
  List,
  AlertCircle,
  Package,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { ElasticDemand, DemandPriority, DemandStatus } from '../types/elasticDemand';
import { PackingSheetData } from '../types/calculator';
import { 
  calculateDemandStats, 
  exportDemandsToCsv, 
  syncDemandWithCurrentSheet 
} from '../utils/elasticDemandStorage';
import { Language, translations } from '../utils/translations';
import { ElasticDemandModal } from './ElasticDemandModal';

interface ElasticDemandViewProps {
  demands: ElasticDemand[];
  onSaveDemand: (demand: ElasticDemand) => void;
  onDeleteDemand: (id: string) => void;
  onBatchUpdateStatus?: (ids: string[], status: DemandStatus) => void;
  onLoadDemandIntoSheet: (demand: ElasticDemand) => void;
  currentSheetData: PackingSheetData;
  lang: Language;
}

export const ElasticDemandView: React.FC<ElasticDemandViewProps> = ({
  demands,
  onSaveDemand,
  onDeleteDemand,
  onLoadDemandIntoSheet,
  currentSheetData,
  lang,
}) => {
  const t = translations[lang];

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBuyer, setSelectedBuyer] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'all' | 'today' | 'week' | 'overdue'>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'delivery_asc' | 'qty_desc' | 'priority'>('delivery_asc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDemand, setEditingDemand] = useState<ElasticDemand | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncedId, setSyncedId] = useState<string | null>(null);

  // Overall statistics
  const stats = useMemo(() => calculateDemandStats(demands), [demands]);

  // Unique buyers list for filters
  const uniqueBuyers = useMemo(() => {
    const buyers = Array.from(new Set(demands.map(d => d.buyer.trim()).filter(Boolean)));
    return buyers.sort();
  }, [demands]);

  // Filter and sort demands
  const filteredDemands = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    return demands.filter(d => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = 
          d.buyer.toLowerCase().includes(q) ||
          d.customer.toLowerCase().includes(q) ||
          d.ref.toLowerCase().includes(q) ||
          d.size.toLowerCase().includes(q) ||
          d.color.toLowerCase().includes(q) ||
          (d.poNumber && d.poNumber.toLowerCase().includes(q)) ||
          (d.notes && d.notes.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Buyer filter
      if (selectedBuyer !== 'all' && d.buyer.trim().toLowerCase() !== selectedBuyer.toLowerCase()) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && d.status !== selectedStatus) {
        return false;
      }

      // Priority filter
      if (selectedPriority !== 'all' && d.priority !== selectedPriority) {
        return false;
      }

      // Date filter
      if (selectedDateFilter === 'today') {
        if (d.demandDate !== today && d.deliveryDate !== today) return false;
      } else if (selectedDateFilter === 'week') {
        if (!d.deliveryDate || d.deliveryDate < today || d.deliveryDate > nextWeekStr) return false;
      } else if (selectedDateFilter === 'overdue') {
        if (!d.deliveryDate || d.deliveryDate >= today || d.status === 'completed') return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') return (b.demandDate || '').localeCompare(a.demandDate || '');
      if (sortBy === 'date_asc') return (a.demandDate || '').localeCompare(b.demandDate || '');
      if (sortBy === 'delivery_asc') return (a.deliveryDate || '9999').localeCompare(b.deliveryDate || '9999');
      if (sortBy === 'qty_desc') return (b.requiredQtyMtr || 0) - (a.requiredQtyMtr || 0);
      if (sortBy === 'priority') {
        const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      }
      return 0;
    });
  }, [demands, searchQuery, selectedBuyer, selectedStatus, selectedDateFilter, selectedPriority, sortBy]);

  const handleOpenAddModal = () => {
    setEditingDemand(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (demand: ElasticDemand) => {
    setEditingDemand(demand);
    setIsModalOpen(true);
  };

  const handleCopySpec = (demand: ElasticDemand) => {
    const text = `BUYER: ${demand.buyer} | SIZE: ${demand.size} | REF: ${demand.ref} | REQ: ${demand.requiredQtyMtr} MTR | COLOR: ${demand.color || 'N/A'} | DELIVERY: ${demand.deliveryDate || 'N/A'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(demand.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSyncWithSheet = (demand: ElasticDemand) => {
    const updated = syncDemandWithCurrentSheet(demand, currentSheetData);
    onSaveDemand(updated);
    setSyncedId(demand.id);
    setTimeout(() => setSyncedId(null), 2000);
  };

  const handleStatusChange = (demand: ElasticDemand, newStatus: DemandStatus) => {
    onSaveDemand({
      ...demand,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleExportCsv = () => {
    const csvData = exportDemandsToCsv(filteredDemands);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Elastic_Demands_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper for delivery status badge
  const getDeliveryStatus = (deliveryDate?: string) => {
    if (!deliveryDate) return null;
    const today = new Date().toISOString().split('T')[0];
    const dDate = new Date(deliveryDate);
    const tDate = new Date(today);
    const diffDays = Math.round((dDate.getTime() - tDate.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return { label: `${Math.abs(diffDays)}d Overdue`, color: 'bg-rose-100 text-rose-800 border-rose-200' };
    }
    if (diffDays === 0) {
      return { label: 'Due Today', color: 'bg-amber-100 text-amber-900 border-amber-300 font-bold animate-pulse' };
    }
    if (diffDays <= 3) {
      return { label: `Due in ${diffDays}d`, color: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    return { label: `In ${diffDays} days`, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                <Tag className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {lang === 'en' ? 'Buyer & Customer Elastic Demands' : 'বায়ার ও কাস্টমার ইলাস্টিক চাহিদা ট্র্যাকার'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {demands.length} {lang === 'en' ? 'Records' : 'এন্ট্রি'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {lang === 'en'
                ? 'Manage date-wise buyer requirements, reference specs, meter demands, and packing fulfillment'
                : 'তারিখ অনুযায়ী বায়ারদের ইলাস্টিক রিকোয়ারমেন্ট, মিটার চাহিদা এবং প্যাকিং অগ্রগতি ট্র্যাক করুন'
              }
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'en' ? 'Export CSV' : 'এক্সপোর্ট CSV'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>{lang === 'en' ? 'Print Schedule' : 'প্রিন্ট শিডিউল'}</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'en' ? '+ New Elastic Demand' : '+ নতুন চাহিদা এন্ট্রি'}</span>
            </button>
          </div>
        </div>

        {/* Live Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {lang === 'en' ? 'Total Demand (Mtr)' : 'মোট চাহিদা (মিটার)'}
            </span>
            <span className="text-lg font-mono font-bold text-slate-900">
              {stats.totalRequiredMeters.toLocaleString()} <span className="text-xs font-normal text-slate-500">m</span>
            </span>
            <span className="block text-[10px] text-slate-400 mt-0.5">
              ~{stats.totalEstimatedKg.toFixed(1)} Kg Est. Net
            </span>
          </div>

          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              {lang === 'en' ? 'Packed (Mtr)' : 'প্যাকিং সম্পন্ন (মিটার)'}
            </span>
            <span className="text-lg font-mono font-bold text-emerald-700">
              {stats.totalPackedMeters.toLocaleString()} <span className="text-xs font-normal text-emerald-600">m</span>
            </span>
            <div className="w-full bg-emerald-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${stats.fulfillmentPercentage}%` }}
              />
            </div>
          </div>

          <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-200">
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">
              {lang === 'en' ? 'Fulfillment %' : 'অগ্রগতি হার'}
            </span>
            <span className="text-lg font-mono font-bold text-indigo-700">
              {stats.fulfillmentPercentage}%
            </span>
            <span className="block text-[10px] text-indigo-600 mt-0.5">
              {stats.packedCount + stats.completedCount} / {stats.totalDemandsCount} {lang === 'en' ? 'Orders' : 'অর্ডার'}
            </span>
          </div>

          <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              {lang === 'en' ? 'Pending / Production' : 'অপেক্ষমাণ ও চলমান'}
            </span>
            <span className="text-lg font-mono font-bold text-amber-800">
              {stats.pendingCount + stats.inProductionCount} <span className="text-xs font-normal text-amber-600">Reqs</span>
            </span>
            <span className="block text-[10px] text-amber-700 mt-0.5">
              {stats.pendingCount} Pending · {stats.inProductionCount} In-Prod
            </span>
          </div>

          <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              {lang === 'en' ? 'Urgent Priority' : 'জরুরি রিকোয়ারমেন্ট'}
            </span>
            <span className="text-lg font-mono font-bold text-rose-700">
              {stats.urgentCount}
            </span>
            <span className="block text-[10px] text-rose-600 mt-0.5">
              {lang === 'en' ? 'Needs immediate packing' : 'দ্রুত প্যাকিং প্রয়োজন'}
            </span>
          </div>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
        {/* Search & Main Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={lang === 'en' 
                ? 'Search buyer (HCF), REF (LIZ-LO-ELS-26080056), size (7MM), color...' 
                : 'সার্চ করুন: বায়ার (HCF), রেফারেন্স, সাইজ (7MM), কালার...'
              }
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode Toggle & Sort */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="delivery_asc">📅 Delivery Date (Soonest first)</option>
              <option value="date_desc">🕒 Demand Date (Newest first)</option>
              <option value="qty_desc">📏 Required Quantity (Highest)</option>
              <option value="priority">🚨 Priority (Urgent first)</option>
            </select>

            <div className="flex items-center border border-slate-300 rounded-xl p-0.5 bg-slate-100">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Table List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Date Filter & Buyer Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            {lang === 'en' ? 'Date:' : 'তারিখ:'}
          </span>
          {(['all', 'today', 'week', 'overdue'] as const).map(df => (
            <button
              key={df}
              onClick={() => setSelectedDateFilter(df)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                selectedDateFilter === df
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {df === 'all' && (lang === 'en' ? 'All Dates' : 'সব তারিখ')}
              {df === 'today' && (lang === 'en' ? 'Today' : 'আজকের')}
              {df === 'week' && (lang === 'en' ? 'Due This Week' : 'এই সপ্তাহে ডেলিভারি')}
              {df === 'overdue' && (lang === 'en' ? 'Overdue' : 'দেরি হওয়া (Overdue)')}
            </button>
          ))}

          <span className="text-slate-300 mx-1">|</span>

          <span className="font-bold text-slate-500 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-500" />
            {lang === 'en' ? 'Buyer:' : 'বায়ার:'}
          </span>
          <button
            onClick={() => setSelectedBuyer('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              selectedBuyer === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'en' ? 'All Buyers' : 'সকল বায়ার'}
          </button>
          {uniqueBuyers.map(b => (
            <button
              key={b}
              onClick={() => setSelectedBuyer(b)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                selectedBuyer.toLowerCase() === b.toLowerCase()
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {b}
            </button>
          ))}

          <span className="text-slate-300 mx-1">|</span>

          <span className="font-bold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            {lang === 'en' ? 'Status:' : 'স্ট্যাটাস:'}
          </span>
          {(['all', 'pending', 'in_production', 'packed', 'completed'] as const).map(st => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                selectedStatus === st
                  ? 'bg-indigo-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all' && (lang === 'en' ? 'All' : 'সকল')}
              {st === 'pending' && (lang === 'en' ? 'Pending' : 'অপেক্ষমাণ')}
              {st === 'in_production' && (lang === 'en' ? 'In Prod' : 'চলমান')}
              {st === 'packed' && (lang === 'en' ? 'Packed' : 'প্যাকড')}
              {st === 'completed' && (lang === 'en' ? 'Completed' : 'সম্পন্ন')}
            </button>
          ))}
        </div>
      </div>

      {/* Demands Listing (Grid Mode or Table Mode) */}
      {filteredDemands.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
            <Tag className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {lang === 'en' ? 'No Elastic Demands Found' : 'কোনো ইলাস্টিক চাহিদা পাওয়া যায়নি'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            {searchQuery || selectedBuyer !== 'all' || selectedStatus !== 'all'
              ? (lang === 'en' ? 'Try adjusting your filters or search keywords.' : 'আপনার ফিল্টার বা সার্চ কীওয়ার্ড পরিবর্তন করে দেখুন।')
              : (lang === 'en' ? 'Start recording buyer elastic requirements with dates, sizes, and references.' : 'তারিখ, সাইজ ও রেফারেন্স সহ বায়ারদের ইলাস্টিক চাহিদা যুক্ত করুন।')
            }
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition inline-flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'en' ? '+ Input First Elastic Demand' : '+ প্রথম চাহিদা এন্ট্রি করুন'}</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDemands.map(demand => {
            const progress = demand.requiredQtyMtr > 0
              ? Math.min(100, Math.round((demand.packedQtyMtr / demand.requiredQtyMtr) * 100))
              : 0;
            const remainingMtr = Math.max(0, demand.requiredQtyMtr - demand.packedQtyMtr);
            const deliveryInfo = getDeliveryStatus(demand.deliveryDate);
            const isCurrentlyActiveInSheet = currentSheetData.ref && demand.ref && 
              currentSheetData.ref.trim().toLowerCase() === demand.ref.trim().toLowerCase();

            return (
              <div
                key={demand.id}
                className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-md overflow-hidden flex flex-col justify-between ${
                  demand.priority === 'urgent'
                    ? 'border-rose-300 shadow-xs'
                    : demand.status === 'completed'
                    ? 'border-slate-200 opacity-90'
                    : isCurrentlyActiveInSheet
                    ? 'border-indigo-400 ring-2 ring-indigo-500/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Card Header Ribbon */}
                <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase bg-amber-400 text-slate-950 tracking-wider">
                          {demand.buyer}
                        </span>
                        {demand.size && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/20 text-white font-mono">
                            {demand.size}
                          </span>
                        )}
                        {demand.priority === 'urgent' && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                            URGENT
                          </span>
                        )}
                      </div>
                      <h4 className="font-mono font-bold text-sm sm:text-base text-white mt-1.5 truncate flex items-center gap-1.5">
                        <span>{demand.ref}</span>
                      </h4>
                      {demand.customer && (
                        <p className="text-[11px] text-indigo-200 truncate">
                          Cust: <span className="font-medium text-white">{demand.customer}</span>
                        </p>
                      )}
                    </div>

                    {/* Status badge & Quick dropdown */}
                    <div className="shrink-0 text-right">
                      <select
                        value={demand.status}
                        onChange={e => handleStatusChange(demand, e.target.value as DemandStatus)}
                        className={`text-[10.5px] font-bold rounded-lg px-2 py-1 border transition cursor-pointer ${
                          demand.status === 'completed'
                            ? 'bg-emerald-500 text-white border-emerald-400'
                            : demand.status === 'packed'
                            ? 'bg-indigo-500 text-white border-indigo-400'
                            : demand.status === 'in_production'
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-800 text-slate-200 border-slate-700'
                        }`}
                      >
                        <option value="pending">⏳ Pending</option>
                        <option value="in_production">⚙️ In Prod</option>
                        <option value="packed">📦 Packed</option>
                        <option value="completed">✅ Done</option>
                        <option value="cancelled">❌ Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3 flex-1">
                  {/* Date Metadata Pills */}
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{demand.demandDate || 'N/A'}</span>
                    </div>
                    {deliveryInfo && (
                      <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${deliveryInfo.color}`}>
                        {deliveryInfo.label}
                      </span>
                    )}
                  </div>

                  {/* Meter Requirements & Progress */}
                  <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/80 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] font-bold text-indigo-900 uppercase">
                        {lang === 'en' ? 'Demand Quantity:' : 'চাহিদা পরিমাণ:'}
                      </span>
                      <span className="text-base font-mono font-extrabold text-indigo-950">
                        {demand.requiredQtyMtr.toLocaleString()} <span className="text-xs font-bold text-indigo-700">MTR</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-600 font-semibold mb-1">
                        <span>Packed: <strong className="font-mono text-slate-900">{demand.packedQtyMtr.toLocaleString()} m</strong></span>
                        <span className="font-mono font-bold text-indigo-700">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            progress >= 100 ? 'bg-emerald-600' : progress > 0 ? 'bg-indigo-600' : 'bg-slate-300'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      {remainingMtr > 0 && (
                        <p className="text-[10px] text-slate-500 mt-1 text-right">
                          Remaining: <strong className="font-mono text-amber-700">{remainingMtr.toLocaleString()} m</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Secondary Specs Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[10.5px]">
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block font-bold">Color</span>
                      <span className="font-bold text-slate-800 truncate block">{demand.color || 'BLACK'}</span>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block font-bold">Unit Wt</span>
                      <span className="font-mono font-bold text-slate-800">{demand.unitWeightGm || 8} gm/m</span>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block font-bold">Est. Wt</span>
                      <span className="font-mono font-bold text-slate-800">{demand.requiredQtyKg || 0} Kg</span>
                    </div>
                  </div>

                  {/* Notes / Customer Instructions */}
                  {demand.notes && (
                    <div className="text-[11px] text-slate-600 bg-amber-50/50 p-2 rounded-lg border border-amber-100/60 line-clamp-2">
                      <span className="font-bold text-amber-900">Need: </span>{demand.notes}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopySpec(demand)}
                      title="Copy Spec text"
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition cursor-pointer border border-transparent hover:border-slate-200"
                    >
                      {copiedId === demand.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleSyncWithSheet(demand)}
                      title="Sync packed meters with current active sheet"
                      className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-white rounded-lg transition cursor-pointer border border-transparent hover:border-slate-200"
                    >
                      {syncedId === demand.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(demand)}
                      title="Edit demand details"
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition cursor-pointer border border-transparent hover:border-slate-200"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteDemand(demand.id)}
                      title="Delete demand"
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-lg transition cursor-pointer border border-transparent hover:border-slate-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Direct Load into Packing Calculator button */}
                  <button
                    onClick={() => onLoadDemandIntoSheet(demand)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-700 active:bg-indigo-800 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <span>{lang === 'en' ? 'Load to Calculator' : 'ক্যালকুলেটরে লোড'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Dense Table List View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3">Demand Date</th>
                  <th className="p-3">Delivery Date</th>
                  <th className="p-3">Buyer</th>
                  <th className="p-3">REF / Item</th>
                  <th className="p-3">Size & Color</th>
                  <th className="p-3 text-right">Required (Mtr)</th>
                  <th className="p-3 text-right">Packed (Mtr)</th>
                  <th className="p-3 text-center">Progress</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {filteredDemands.map(demand => {
                  const progress = demand.requiredQtyMtr > 0
                    ? Math.min(100, Math.round((demand.packedQtyMtr / demand.requiredQtyMtr) * 100))
                    : 0;
                  const deliveryInfo = getDeliveryStatus(demand.deliveryDate);

                  return (
                    <tr key={demand.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono text-slate-700 whitespace-nowrap">
                        {demand.demandDate}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono">{demand.deliveryDate || '-'}</span>
                          {deliveryInfo && (
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${deliveryInfo.color}`}>
                              {deliveryInfo.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded font-extrabold text-[11px] bg-amber-100 text-amber-950 border border-amber-200">
                          {demand.buyer}
                        </span>
                        {demand.customer && (
                          <span className="block text-[10px] text-slate-400 truncate max-w-[120px] mt-0.5">
                            {demand.customer}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-indigo-950 whitespace-nowrap">
                        {demand.ref}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-bold text-slate-800">{demand.size}</span>
                        <span className="text-slate-400 mx-1">·</span>
                        <span className="text-slate-600">{demand.color || 'BLACK'}</span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-indigo-700 whitespace-nowrap">
                        {demand.requiredQtyMtr.toLocaleString()} m
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                        {demand.packedQtyMtr.toLocaleString()} m
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-[10.5px] text-slate-700">{progress}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <select
                          value={demand.status}
                          onChange={e => handleStatusChange(demand, e.target.value as DemandStatus)}
                          className="text-[10.5px] font-bold rounded-lg px-2 py-1 border border-slate-300 bg-white"
                        >
                          <option value="pending">⏳ Pending</option>
                          <option value="in_production">⚙️ In Prod</option>
                          <option value="packed">📦 Packed</option>
                          <option value="completed">✅ Done</option>
                          <option value="cancelled">❌ Cancelled</option>
                        </select>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onLoadDemandIntoSheet(demand)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10.5px] flex items-center gap-1 cursor-pointer"
                          >
                            <span>Load</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(demand)}
                            className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteDemand(demand.id)}
                            className="p-1 text-slate-500 hover:text-rose-600 rounded hover:bg-slate-100"
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
        </div>
      )}

      {/* Add / Edit Demand Modal */}
      <ElasticDemandModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDemand(null);
        }}
        onSave={onSaveDemand}
        editingDemand={editingDemand}
        lang={lang}
      />
    </div>
  );
};
