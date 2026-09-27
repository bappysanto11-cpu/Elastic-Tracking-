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
      return { label: `${Math.abs(diffDays)}d Overdue`, color: 'bg-neutral-900 text-white border-neutral-900' };
    }
    if (diffDays === 0) {
      return { label: 'Due Today', color: 'bg-neutral-200 text-neutral-950 border-neutral-400 font-extrabold' };
    }
    if (diffDays <= 3) {
      return { label: `Due in ${diffDays}d`, color: 'bg-neutral-100 text-neutral-800 border-neutral-300' };
    }
    return { label: `In ${diffDays} days`, color: 'bg-neutral-50 text-neutral-600 border-neutral-200' };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-5 transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-neutral-900 text-white">
                <Tag className="w-5 h-5" />
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
                {lang === 'en' ? 'Buyer & Customer Elastic Demands' : 'বায়ার ও কাস্টমার ইলাস্টিক চাহিদা ট্র্যাকার'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-900 border border-neutral-300">
                {demands.length} {lang === 'en' ? 'Records' : 'এন্ট্রি'}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
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
              className="px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-neutral-900" />
              <span>{lang === 'en' ? 'Export CSV' : 'এক্সপোর্ট CSV'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4 text-neutral-700" />
              <span>{lang === 'en' ? 'Print Schedule' : 'প্রিন্ট শিডিউল'}</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black active:scale-[0.98] text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'en' ? '+ New Elastic Demand' : '+ নতুন চাহিদা এন্ট্রি'}</span>
            </button>
          </div>
        </div>

        {/* Live Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 pt-4 border-t border-neutral-100">
          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
              {lang === 'en' ? 'Total Demand (Mtr)' : 'মোট চাহিদা (মিটার)'}
            </span>
            <span className="text-lg font-mono font-extrabold text-neutral-900">
              {stats.totalRequiredMeters.toLocaleString()} <span className="text-xs font-normal text-neutral-500">m</span>
            </span>
            <span className="block text-[10px] text-neutral-500 mt-0.5">
              ~{stats.totalEstimatedKg.toFixed(1)} Kg Est. Net
            </span>
          </div>

          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
            <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider block">
              {lang === 'en' ? 'Packed (Mtr)' : 'প্যাকিং সম্পন্ন (মিটার)'}
            </span>
            <span className="text-lg font-mono font-extrabold text-neutral-900">
              {stats.totalPackedMeters.toLocaleString()} <span className="text-xs font-normal text-neutral-500">m</span>
            </span>
            <div className="w-full bg-neutral-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-neutral-900 h-full rounded-full transition-all duration-500" 
                style={{ width: `${stats.fulfillmentPercentage}%` }}
              />
            </div>
          </div>

          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
            <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider block">
              {lang === 'en' ? 'Fulfillment %' : 'অগ্রগতি হার'}
            </span>
            <span className="text-lg font-mono font-extrabold text-neutral-900">
              {stats.fulfillmentPercentage}%
            </span>
            <span className="block text-[10px] text-neutral-500 mt-0.5 font-medium">
              {stats.packedCount + stats.completedCount} / {stats.totalDemandsCount} {lang === 'en' ? 'Orders' : 'অর্ডার'}
            </span>
          </div>

          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
            <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider block">
              {lang === 'en' ? 'Pending / Production' : 'অপেক্ষমাণ ও চলমান'}
            </span>
            <span className="text-lg font-mono font-extrabold text-neutral-900">
              {stats.pendingCount + stats.inProductionCount}
            </span>
            <span className="block text-[10px] text-neutral-500 mt-0.5">
              {stats.inProductionCount} in active run
            </span>
          </div>

          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider block">
              {lang === 'en' ? 'Completed Orders' : 'সম্পন্ন অর্ডার'}
            </span>
            <span className="text-lg font-mono font-extrabold text-neutral-900">
              {stats.completedCount + stats.packedCount}
            </span>
            <span className="block text-[10px] text-neutral-500 mt-0.5">
              {stats.completedCount} dispatched
            </span>
          </div>
        </div>
      </div>

      {/* Controls: Search, Filters & View Toggle */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={lang === 'en' ? 'Search buyer, ref, size, color, po...' : 'বায়ার, রেফারেন্স, সাইজ, কালার খুঁজুন...'}
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:bg-white"
            />
          </div>

          {/* Right Controls: Sort & View Toggle */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-neutral-500 font-bold hidden sm:inline">{lang === 'en' ? 'Sort:' : 'সর্ট:'}</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-800"
              >
                <option value="delivery_asc">📅 Delivery Date (Soonest)</option>
                <option value="date_desc">🕒 Demand Date (Newest)</option>
                <option value="date_asc">🕒 Demand Date (Oldest)</option>
                <option value="qty_desc">📦 Quantity (High to Low)</option>
                <option value="priority">🔥 Priority (Urgent First)</option>
              </select>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center border border-neutral-200 rounded-xl p-0.5 bg-neutral-50">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white shadow-2xs text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-white shadow-2xs text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Badges Bar */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-neutral-100 text-xs">
          <span className="font-bold text-neutral-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-neutral-600" />
            {lang === 'en' ? 'Date:' : 'তারিখ:'}
          </span>
          {(['all', 'today', 'week', 'overdue'] as const).map(df => (
            <button
              key={df}
              onClick={() => setSelectedDateFilter(df)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                selectedDateFilter === df
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
              }`}
            >
              {df === 'all' && (lang === 'en' ? 'All Dates' : 'সব তারিখ')}
              {df === 'today' && (lang === 'en' ? 'Today' : 'আজকের')}
              {df === 'week' && (lang === 'en' ? 'Due This Week' : 'এই সপ্তাহে')}
              {df === 'overdue' && (lang === 'en' ? 'Overdue' : 'দেরি হওয়া')}
            </button>
          ))}

          <span className="text-neutral-300 mx-1">|</span>

          <span className="font-bold text-neutral-500 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-neutral-600" />
            {lang === 'en' ? 'Buyer:' : 'বায়ার:'}
          </span>
          <button
            onClick={() => setSelectedBuyer('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              selectedBuyer === 'all'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
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
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
              }`}
            >
              {b}
            </button>
          ))}

          <span className="text-neutral-300 mx-1">|</span>

          <span className="font-bold text-neutral-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-neutral-600" />
            {lang === 'en' ? 'Status:' : 'স্ট্যাটাস:'}
          </span>
          {(['all', 'pending', 'in_production', 'packed', 'completed'] as const).map(st => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                selectedStatus === st
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
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
        <div className="bg-white rounded-2xl border border-dashed border-neutral-300 p-12 text-center">
          <div className="w-16 h-16 bg-neutral-100 text-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-neutral-200">
            <Tag className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">
            {lang === 'en' ? 'No Elastic Demands Found' : 'কোনো ইলাস্টিক চাহিদা পাওয়া যায়নি'}
          </h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1 mb-5">
            {searchQuery || selectedBuyer !== 'all' || selectedStatus !== 'all'
              ? (lang === 'en' ? 'Try adjusting your filters or search keywords.' : 'আপনার ফিল্টার বা সার্চ কীওয়ার্ড পরিবর্তন করে দেখুন।')
              : (lang === 'en' ? 'Start recording buyer elastic requirements with dates, sizes, and references.' : 'তারিখ, সাইজ ও রেফারেন্স সহ বায়ারদের ইলাস্টিক চাহিদা যুক্ত করুন।')
            }
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-black transition inline-flex items-center gap-2 shadow-xs cursor-pointer"
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

            return (
              <div
                key={demand.id}
                className="bg-white rounded-2xl border border-neutral-200 shadow-xs hover:border-neutral-400 hover:shadow-md transition-all overflow-hidden flex flex-col"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-neutral-100 bg-neutral-50/70">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md font-extrabold text-xs bg-neutral-900 text-white">
                          {demand.buyer}
                        </span>
                        {demand.customer && (
                          <span className="text-[11px] font-semibold text-neutral-600 truncate">
                            / {demand.customer}
                          </span>
                        )}
                        {demand.priority === 'urgent' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-200 text-neutral-900 border border-neutral-400">
                            URGENT
                          </span>
                        )}
                      </div>
                      <h3 className="font-mono font-bold text-sm text-neutral-900 mt-1 truncate" title={demand.ref}>
                        {demand.ref}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-neutral-600 mt-0.5 font-medium">
                        <span>Size: <strong className="text-neutral-900">{demand.size}</strong></span>
                        {demand.poNumber && <span>· PO: <strong className="font-mono">{demand.poNumber}</strong></span>}
                      </div>
                    </div>

                    {/* Status dropdown */}
                    <div className="shrink-0 text-right">
                      <select
                        value={demand.status}
                        onChange={e => handleStatusChange(demand, e.target.value as DemandStatus)}
                        className="text-[10.5px] font-bold rounded-lg px-2 py-1 border border-neutral-300 bg-white text-neutral-900 cursor-pointer"
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
                  <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-700 bg-neutral-50 p-2 rounded-xl border border-neutral-200">
                    <div className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{demand.demandDate || 'N/A'}</span>
                    </div>
                    {deliveryInfo && (
                      <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${deliveryInfo.color}`}>
                        {deliveryInfo.label}
                      </span>
                    )}
                  </div>

                  {/* Meter Requirements & Progress */}
                  <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] font-bold text-neutral-700 uppercase">
                        {lang === 'en' ? 'Demand Quantity:' : 'চাহিদা পরিমাণ:'}
                      </span>
                      <span className="text-base font-mono font-extrabold text-neutral-950">
                        {demand.requiredQtyMtr.toLocaleString()} <span className="text-xs font-bold text-neutral-600">MTR</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[11px] text-neutral-700 font-semibold mb-1">
                        <span>Packed: <strong className="font-mono text-neutral-900">{demand.packedQtyMtr.toLocaleString()} m</strong></span>
                        <span className="font-mono font-bold text-neutral-900">{progress}%</span>
                      </div>
                      <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300 bg-neutral-900"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      {remainingMtr > 0 && (
                        <p className="text-[10px] text-neutral-600 mt-1 text-right font-medium">
                          Remaining: <strong className="font-mono text-neutral-900">{remainingMtr.toLocaleString()} m</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Secondary Specs Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[10.5px]">
                    <div className="bg-neutral-50 p-1.5 rounded-lg border border-neutral-200">
                      <span className="text-neutral-500 block font-bold">Color</span>
                      <span className="font-bold text-neutral-900 truncate block">{demand.color || 'BLACK'}</span>
                    </div>
                    <div className="bg-neutral-50 p-1.5 rounded-lg border border-neutral-200">
                      <span className="text-neutral-500 block font-bold">Unit Wt</span>
                      <span className="font-mono font-bold text-neutral-900">{demand.unitWeightGm || 8} gm/m</span>
                    </div>
                    <div className="bg-neutral-50 p-1.5 rounded-lg border border-neutral-200">
                      <span className="text-neutral-500 block font-bold">Est. Wt</span>
                      <span className="font-mono font-bold text-neutral-900">{demand.requiredQtyKg || 0} Kg</span>
                    </div>
                  </div>

                  {/* Notes / Customer Instructions */}
                  {demand.notes && (
                    <div className="text-[11px] text-neutral-700 bg-neutral-100 p-2 rounded-lg border border-neutral-200 line-clamp-2">
                      <span className="font-bold text-neutral-900">Need: </span>{demand.notes}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopySpec(demand)}
                      title="Copy Spec text"
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-white rounded-lg transition cursor-pointer border border-transparent hover:border-neutral-200"
                    >
                      {copiedId === demand.id ? <Check className="w-3.5 h-3.5 text-neutral-900" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleSyncWithSheet(demand)}
                      title="Sync packed meters with current active sheet"
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-white rounded-lg transition cursor-pointer border border-transparent hover:border-neutral-200"
                    >
                      {syncedId === demand.id ? <Check className="w-3.5 h-3.5 text-neutral-900" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(demand)}
                      title="Edit demand details"
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-white rounded-lg transition cursor-pointer border border-transparent hover:border-neutral-200"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteDemand(demand.id)}
                      title="Delete demand"
                      className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-white rounded-lg transition cursor-pointer border border-transparent hover:border-neutral-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Direct Load into Packing Calculator button */}
                  <button
                    onClick={() => onLoadDemandIntoSheet(demand)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-black active:scale-[0.98] text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
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
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-900 text-white font-bold uppercase tracking-wider text-[11px]">
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
              <tbody className="divide-y divide-neutral-200 font-medium">
                {filteredDemands.map(demand => {
                  const progress = demand.requiredQtyMtr > 0
                    ? Math.min(100, Math.round((demand.packedQtyMtr / demand.requiredQtyMtr) * 100))
                    : 0;
                  const deliveryInfo = getDeliveryStatus(demand.deliveryDate);

                  return (
                    <tr key={demand.id} className="hover:bg-neutral-50 transition">
                      <td className="p-3 font-mono text-neutral-700 whitespace-nowrap">
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
                        <span className="px-2 py-0.5 rounded font-extrabold text-[11px] bg-neutral-900 text-white">
                          {demand.buyer}
                        </span>
                        {demand.customer && (
                          <span className="block text-[10px] text-neutral-500 truncate max-w-[120px] mt-0.5">
                            {demand.customer}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-neutral-900 whitespace-nowrap">
                        {demand.ref}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-bold text-neutral-900">{demand.size}</span>
                        <span className="text-neutral-400 mx-1">·</span>
                        <span className="text-neutral-700">{demand.color || 'BLACK'}</span>
                      </td>
                      <td className="p-3 text-right font-mono font-extrabold text-neutral-900 whitespace-nowrap">
                        {demand.requiredQtyMtr.toLocaleString()} m
                      </td>
                      <td className="p-3 text-right font-mono text-neutral-800 whitespace-nowrap font-bold">
                        {demand.packedQtyMtr.toLocaleString()} m
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-16 bg-neutral-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-neutral-900 h-full rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-[10.5px] text-neutral-800">{progress}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <select
                          value={demand.status}
                          onChange={e => handleStatusChange(demand, e.target.value as DemandStatus)}
                          className="text-[10.5px] font-bold rounded-lg px-2 py-1 border border-neutral-300 bg-white"
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
                            className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-black text-white font-bold text-[10.5px] flex items-center gap-1 cursor-pointer"
                          >
                            <span>Load</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(demand)}
                            className="p-1 text-neutral-500 hover:text-neutral-900 rounded hover:bg-neutral-100"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteDemand(demand.id)}
                            className="p-1 text-neutral-500 hover:text-neutral-800 rounded hover:bg-neutral-100"
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
