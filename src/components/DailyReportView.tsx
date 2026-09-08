import React, { useState, useEffect } from 'react';
import { Download, Mail, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { ScheduleItem, DailyReport } from '../types/schedule';
import { onScheduleUpdate } from '../utils/scheduleStorage';
import { generateDailyReport, formatReportForEmail, exportReportToCSV } from '../utils/reportGenerator';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';

export const DailyReportView: React.FC = () => {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();

    const unsubscribe = onScheduleUpdate(async () => {
      await loadReport();
    });

    return () => unsubscribe();
  }, []);

  const loadReport = async () => {
    try {
      // Get truck stats
      const truckSnapshot = await getDocs(collection(db, 'truckDispatch'));
      let totalDispatched = 0;
      let totalDelivered = 0;
      let totalCartons = 0;

      truckSnapshot.forEach((doc) => {
        const truck = doc.data();
        if (truck.status !== 'waiting') totalDispatched++;
        if (truck.status === 'delivered') totalDelivered++;
        totalCartons += truck.cartons;
      });

      // Get schedule stats
      const scheduleSnapshot = await getDocs(collection(db, 'scheduleItems'));
      const items: ScheduleItem[] = [];

      scheduleSnapshot.forEach((doc) => {
        const today = new Date().toISOString().split('T')[0];
        const item = { id: doc.id, ...doc.data() } as ScheduleItem;
        if (item.date === today) {
          items.push(item);
        }
      });

      // Generate report
      const generatedReport = generateDailyReport(items, {
        totalDispatched,
        totalDelivered,
        totalCartons,
      });

      setReport(generatedReport);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;

    const csv = exportReportToCSV(report);
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
    element.setAttribute('download', `daily-report-${report.date}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const sendEmail = () => {
    if (!report) return;

    const emailContent = formatReportForEmail(report);
    alert('Email feature coming soon!\n\n' + emailContent);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No data available for report</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">📊 Daily Report</h1>
        <p className="text-gray-600 mt-1">
          Date: {new Date(report.date).toLocaleDateString()} | Generated: {report.generatedAt.toLocaleTimeString()}
        </p>
      </div>

      {/* Main Report Card */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
          <h2 className="text-2xl font-bold">Production Summary</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Schedule Stats */}
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-bold text-gray-800 mb-3">📋 Schedule Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Orders:</span>
                  <span className="font-bold text-gray-800">{report.totalOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-bold text-green-600">{report.completedOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending:</span>
                  <span className="font-bold text-orange-600">{report.pendingOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completion Rate:</span>
                  <span className="font-bold text-blue-600">{report.completionRate}%</span>
                </div>
              </div>
            </div>

            {/* Quantity Stats */}
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-bold text-gray-800 mb-3">📦 Quantity Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Demand:</span>
                  <span className="font-bold text-gray-800">{report.totalDemandQty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-bold text-green-600">{report.totalCompletedQty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending:</span>
                  <span className="font-bold text-orange-600">
                    {report.totalDemandQty - report.totalCompletedQty}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Stats */}
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-bold text-gray-800 mb-3">🚚 Delivery Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Trucks Dispatched:</span>
                  <span className="font-bold text-gray-800">{report.totalTrucksDispatched}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivered:</span>
                  <span className="font-bold text-green-600">{report.totalTrucksDelivered}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Cartons:</span>
                  <span className="font-bold text-gray-800">{report.totalCartonsDelivered}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Time Statistics */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              ⏱️ Time Statistics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Hours Worked</p>
                <p className="text-3xl font-bold text-blue-600">{report.totalHours}h</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Average per Order</p>
                <p className="text-3xl font-bold text-blue-600">{report.avgTimePerOrder}m</p>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {report.alerts.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                ⚠️ Alerts
              </h3>
              <ul className="space-y-2">
                {report.alerts.map((alert, idx) => (
                  <li key={idx} className="text-yellow-700 text-sm">
                    {alert}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="font-semibold text-gray-800">Overall Progress</span>
              <span className="font-bold text-blue-600">{report.completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all"
                style={{ width: `${report.completionRate}%` }}
              ></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={downloadReport}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
            >
              <Download className="w-4 h-4" />
              Download CSV
            </button>
            <button
              onClick={sendEmail}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
            >
              <Mail className="w-4 h-4" />
              Email Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyReportView;
