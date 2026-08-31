import React, { useState, useEffect } from 'react';
import { Play, Pause, CheckCircle2, Loader2, Clock, TrendingUp } from 'lucide-react';
import { ScheduleItem } from '../types/schedule';
import {
  onScheduleUpdate,
  startJob,
  updateJobQuantity,
  completeJob,
} from '../utils/scheduleStorage';

export const ScheduleTracker: React.FC = () => {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQty, setEditingQty] = useState<{ [key: string]: string }>({});

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
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">📊 Schedule Tracker</h1>
        <p className="text-gray-600 mt-1">Track production progress in real-time</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow">
          <p className="text-sm opacity-90">Total Orders</p>
          <p className="text-3xl font-bold">{items.length}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-4 rounded-lg shadow">
          <p className="text-sm opacity-90">In-Progress</p>
          <p className="text-3xl font-bold">{inProgressCount}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg shadow">
          <p className="text-sm opacity-90">Completed</p>
          <p className="text-3xl font-bold">{completedCount}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg shadow">
          <p className="text-sm opacity-90">Total Demand</p>
          <p className="text-2xl font-bold">
            {totalDemand} <span className="text-sm">{items[0]?.unit}</span>
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg shadow">
          <p className="text-sm opacity-90">Overall Progress</p>
          <p className="text-3xl font-bold">{overallProgress.toFixed(0)}%</p>
          <div className="w-full bg-white bg-opacity-30 rounded-full h-2 mt-2">
            <div
              className="bg-white h-2 rounded-full transition-all"
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Schedule Table */}
      {items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 text-lg">
            📋 No schedule for today. Upload one to get started!
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-sm">Buyer</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">Job No</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">Ref/PO</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">Color/Size</th>
                  <th className="px-4 py-3 text-right font-semibold text-sm">Demand</th>
                  <th className="px-4 py-3 text-right font-semibold text-sm">Done</th>
                  <th className="px-4 py-3 text-center font-semibold text-sm">Progress</th>
                  <th className="px-4 py-3 text-center font-semibold text-sm">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.buyer}</td>
                    <td className="px-4 py-3 text-sm">{item.jobNo}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {item.customerRefPO}
                    </td>
                    <td className="px-4 py-3 text-sm">
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
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:border-blue-500"
                        min="0"
                        max={item.demandQty}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${item.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-gray-700">{item.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                          item.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : item.status === 'in-progress'
                            ? 'bg-blue-100 text-blue-700'
                            : item.status === 'paused'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {item.status === 'completed' && '✅ Done'}
                        {item.status === 'in-progress' && '🟢 Active'}
                        {item.status === 'paused' && '⏸️ Paused'}
                        {item.status === 'pending' && '⏳ Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        {item.status === 'pending' && (
                          <button
                            onClick={() => handleStartJob(item.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Start Job"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {item.status === 'in-progress' && (
                          <>
                            <button
                              onClick={() => handleUpdateQty(item.id)}
                              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                              title="Update Progress"
                            >
                              <TrendingUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCompleteJob(item.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                              title="Complete"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
