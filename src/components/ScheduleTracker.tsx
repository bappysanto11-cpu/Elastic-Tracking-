import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  CheckCircle2,
  Loader2,
  Clock,
  TrendingUp,
  Zap,
  Tag,
  FileText,
  X,
  Trash2,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { ScheduleItem } from '../types/schedule';
import {
  onScheduleUpdate,
  startJob,
  updateJobQuantity,
  completeJob,
  updateScheduleItem,
  bulkUpdateScheduleItems,
} from '../utils/scheduleStorage';

export const ScheduleTracker: React.FC = () => {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQty, setEditingQty] = useState<{ [key: string]: string }>({});

  // Bulk Edit State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ScheduleItem['status']>('in-progress');
  const [bulkChallanRef, setBulkChallanRef] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onScheduleUpdate((updatedItems) => {
      setItems(updatedItems);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStartJob = async (id: string) => {
    try {
      await startJob(id);
    } catch (error) {
      console.error('Error starting job:', error);
    }
  };

  const handleUpdateQty = async (id: string) => {
    const qty = Number(editingQty[id]);
    if (isNaN(qty) || qty < 0) {
      alert('Please enter a valid quantity');
      return;
    }

    try {
      await updateJobQuantity(id, qty);
      setEditingQty({ ...editingQty, [id]: '' });
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleCompleteJob = async (id: string) => {
    if (window.confirm('Mark this job as complete?')) {
      try {
        await completeJob(id);
      } catch (error) {
        console.error('Error completing job:', error);
      }
    }
  };

  const handleUpdateItemChallan = async (id: string, challanRef: string) => {
    try {
      await updateScheduleItem(id, { challanRef });
    } catch (error) {
      console.error('Error updating challan:', error);
    }
  };

  // Selection handlers
  const isAllSelected = items.length > 0 && items.every((it) => selectedIds.includes(it.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((it) => it.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk Apply Status
  const handleApplyBulkStatus = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkUpdating(true);
    try {
      const updates: Partial<ScheduleItem> = { status: bulkStatus };
      if (bulkStatus === 'completed') {
        // Find demand quantity for items or let Firestore update status
        updates.progress = 100;
      }
      await bulkUpdateScheduleItems(selectedIds, updates);
      setFeedbackMsg(`⚡ Updated status to "${bulkStatus}" for ${selectedIds.length} orders!`);
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err) {
      console.error('Failed bulk status update:', err);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Bulk Apply Challan Reference
  const handleApplyBulkChallan = async () => {
    const refToApply = bulkChallanRef.trim();
    if (!refToApply) {
      alert('Please enter a Challan Reference');
      return;
    }
    if (selectedIds.length === 0) return;

    setIsBulkUpdating(true);
    try {
      await bulkUpdateScheduleItems(selectedIds, { challanRef: refToApply });
      setFeedbackMsg(`📄 Applied Challan Ref "${refToApply}" to ${selectedIds.length} orders!`);
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err) {
      console.error('Failed bulk challan update:', err);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleAutoGenerateChallan = () => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randId = Math.floor(1000 + Math.random() * 9000);
    setBulkChallanRef(`CH-${todayStr}-${randId}`);
  };

  // Export to Excel (CSV format)
  const handleExportToExcelCSV = () => {
    if (items.length === 0) {
      alert('No tracked schedule items to export.');
      return;
    }

    const headers = [
      'Date',
      'Buyer',
      'Customer',
      'Job No',
      'Customer Ref / PO',
      'Item / Style Description',
      'Color',
      'Size',
      'Order Qty',
      'Demand Qty',
      'Completed Qty',
      'Unit',
      'Progress (%)',
      'Status',
      'Challan Ref',
      'Notes',
    ];

    const csvRows = items.map((item) => {
      const rowValues = [
        item.date || '',
        item.buyer || '',
        item.customer || '',
        item.jobNo || '',
        item.customerRefPO || '',
        item.itemDescription || '',
        item.color || '',
        item.size || '',
        item.orderQty ?? '',
        item.demandQty ?? '',
        item.completedQty ?? '',
        item.unit || 'Mtr',
        `${item.progress ?? 0}%`,
        item.status || '',
        item.challanRef || '',
        item.notes || '',
      ];

      return rowValues
        .map((val) => {
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `Schedule_Tracker_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setFeedbackMsg(`📥 Successfully exported ${items.length} schedule items to Excel CSV!`);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const totalDemand = items.reduce((sum, item) => sum + item.demandQty, 0);
  const totalCompleted = items.reduce((sum, item) => sum + item.completedQty, 0);
  const overallProgress = totalDemand > 0 ? (totalCompleted / totalDemand) * 100 : 0;
  const completedCount = items.filter((item) => item.status === 'completed').length;
  const inProgressCount = items.filter((item) => item.status === 'in-progress').length;
  const pendingCount = items.filter((item) => item.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span>📊 Schedule Tracker</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              Real-Time Sync
            </span>
          </h1>
          <p className="text-gray-600 text-sm mt-0.5">
            Track production progress, inspect quantities, and update statuses or Challan References in bulk.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportToExcelCSV}
            disabled={items.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md border border-emerald-400 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export tracked schedule items to Excel (.csv)"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-900 text-emerald-100 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="p-1 opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-xs">
          <p className="text-xs opacity-90 font-medium">Total Orders</p>
          <p className="text-2xl sm:text-3xl font-black mt-1">{items.length}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-4 rounded-xl shadow-xs">
          <p className="text-xs opacity-90 font-medium">In-Progress</p>
          <p className="text-2xl sm:text-3xl font-black mt-1">{inProgressCount}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl shadow-xs">
          <p className="text-xs opacity-90 font-medium">Completed</p>
          <p className="text-2xl sm:text-3xl font-black mt-1">{completedCount}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-xl shadow-xs">
          <p className="text-xs opacity-90 font-medium">Total Demand</p>
          <p className="text-xl sm:text-2xl font-black mt-1">
            {totalDemand.toLocaleString()} <span className="text-xs font-medium">{items[0]?.unit || 'Mtr'}</span>
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-xl shadow-xs col-span-2 md:col-span-1">
          <p className="text-xs opacity-90 font-medium">Overall Progress</p>
          <p className="text-2xl sm:text-3xl font-black mt-1">{overallProgress.toFixed(0)}%</p>
          <div className="w-full bg-white bg-opacity-30 rounded-full h-1.5 mt-2">
            <div
              className="bg-white h-1.5 rounded-full transition-all"
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Schedule Table */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-gray-600 text-base font-semibold">
            📋 No schedule items found for today. Upload an Excel schedule to get started!
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Bulk Action Sticky Bar */}
          {selectedIds.length > 0 && (
            <div className="p-3.5 bg-slate-900 text-white border-b border-indigo-700/60 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-500 text-white font-black text-xs flex items-center gap-1.5 shadow-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>{selectedIds.length} Rows Selected</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Bulk Status */}
                <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-lg border border-white/15">
                  <span className="text-xs text-indigo-200 pl-1 font-semibold">Status:</span>
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value as any)}
                    className="bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded border border-slate-600"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                  </select>
                  <button
                    onClick={handleApplyBulkStatus}
                    disabled={isBulkUpdating}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded cursor-pointer shadow-xs"
                  >
                    Apply Status
                  </button>
                </div>

                {/* Bulk Challan */}
                <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-lg border border-white/15">
                  <span className="text-xs text-emerald-200 pl-1 font-semibold">Challan Ref:</span>
                  <input
                    type="text"
                    placeholder="e.g. CH-2026-0881"
                    value={bulkChallanRef}
                    onChange={(e) => setBulkChallanRef(e.target.value)}
                    className="bg-slate-800 text-white placeholder:text-slate-400 font-mono text-xs px-2 py-1 rounded border border-slate-600 w-32"
                  />
                  <button
                    onClick={handleAutoGenerateChallan}
                    className="px-1.5 py-1 bg-slate-700 hover:bg-slate-600 text-amber-300 text-[10px] font-bold rounded cursor-pointer"
                  >
                    Auto
                  </button>
                  <button
                    onClick={handleApplyBulkChallan}
                    disabled={isBulkUpdating}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded cursor-pointer shadow-xs"
                  >
                    Apply Challan
                  </button>
                </div>

                <button
                  onClick={() => setSelectedIds([])}
                  className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Buyer</th>
                  <th className="px-4 py-3 text-left font-semibold">Job No</th>
                  <th className="px-4 py-3 text-left font-semibold">Ref / PO</th>
                  <th className="px-4 py-3 text-left font-semibold">Color / Size</th>
                  <th className="px-4 py-3 text-right font-semibold">Demand</th>
                  <th className="px-4 py-3 text-right font-semibold">Done</th>
                  <th className="px-4 py-3 text-center font-semibold">Progress</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold min-w-[120px]">Challan Ref</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-blue-50/90 ring-1 ring-blue-300' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(item.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{item.buyer}</td>
                      <td className="px-4 py-3 text-slate-600">{item.jobNo}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{item.customerRefPO}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.color} / {item.size}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600">
                        {item.demandQty}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          value={editingQty[item.id] !== undefined ? editingQty[item.id] : item.completedQty}
                          onChange={(e) => setEditingQty({ ...editingQty, [item.id]: e.target.value })}
                          className="w-16 px-2 py-1 border border-slate-300 rounded text-right text-xs focus:outline-none focus:border-blue-500 font-bold"
                          min="0"
                          max={item.demandQty}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${item.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] font-bold text-slate-700">{item.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block uppercase tracking-wider ${
                            item.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'in-progress'
                              ? 'bg-blue-100 text-blue-800'
                              : item.status === 'paused'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          placeholder="CH-XXXX"
                          value={item.challanRef || ''}
                          onChange={(e) => handleUpdateItemChallan(item.id, e.target.value)}
                          className={`w-full px-2 py-1 font-mono text-[11px] rounded transition border ${
                            item.challanRef
                              ? 'bg-emerald-50 text-emerald-900 font-bold border-emerald-300'
                              : 'border-slate-300 text-slate-600'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1.5 justify-center">
                          {item.status === 'pending' && (
                            <button
                              onClick={() => handleStartJob(item.id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Start Job"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {item.status === 'in-progress' && (
                            <>
                              <button
                                onClick={() => handleUpdateQty(item.id)}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                title="Update Progress"
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleCompleteJob(item.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Complete"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
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
    </div>
  );
};
