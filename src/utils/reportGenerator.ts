import { ScheduleItem, DailyReport } from '../types/schedule';

// ==========================================
// GENERATE DAILY REPORT
// ==========================================
export function generateDailyReport(
  scheduleItems: ScheduleItem[],
  truckStats?: { totalDispatched: number; totalDelivered: number; totalCartons: number }
): DailyReport {
  const today = new Date().toISOString().split('T')[0];

  const completedItems = scheduleItems.filter((item) => item.status === 'completed');
  const pendingItems = scheduleItems.filter((item) => item.status === 'pending');

  const totalDemand = scheduleItems.reduce((sum, item) => sum + item.demandQty, 0);
  const totalCompleted = scheduleItems.reduce((sum, item) => sum + item.completedQty, 0);
  const completionRate = totalDemand > 0 ? (totalCompleted / totalDemand) * 100 : 0;

  const totalTimeSpent = scheduleItems.reduce((sum, item) => sum + (item.totalTimeSpent || 0), 0);
  const avgTimePerOrder =
    scheduleItems.length > 0 ? totalTimeSpent / scheduleItems.length : 0;

  const alerts: string[] = [];

  // Alert: Pending items
  if (pendingItems.length > 0) {
    alerts.push(`⚠️ ${pendingItems.length} orders still pending`);
  }

  // Alert: Low completion rate
  if (completionRate < 50 && scheduleItems.length > 0) {
    alerts.push('⚠️ Completion rate is below 50%');
  }

  // Alert: Delivery issues
  if (truckStats && truckStats.totalDispatched > truckStats.totalDelivered) {
    alerts.push(
      `⚠️ ${truckStats.totalDispatched - truckStats.totalDelivered} trucks not yet delivered`
    );
  }

  return {
    id: `report-${today}-${Date.now()}`,
    date: today,
    totalOrders: scheduleItems.length,
    completedOrders: completedItems.length,
    pendingOrders: pendingItems.length,
    totalDemandQty: totalDemand,
    totalCompletedQty: totalCompleted,
    completionRate: Math.round(completionRate),
    totalStickered: 0,
    pendingSticker: 0,
    totalTrucksDispatched: truckStats?.totalDispatched || 0,
    totalTrucksDelivered: truckStats?.totalDelivered || 0,
    totalCartonsDelivered: truckStats?.totalCartons || 0,
    totalHours: Math.round(totalTimeSpent / 60),
    avgTimePerOrder: Math.round(avgTimePerOrder),
    alerts,
    generatedAt: new Date(),
  };
}

// ==========================================
// FORMAT REPORT FOR EMAIL
// ==========================================
export function formatReportForEmail(report: DailyReport): string {
  return `
DAILY PRODUCTION REPORT
Date: ${report.date}
Generated: ${report.generatedAt.toLocaleString()}

═══════════════════════════════════════════════

📊 SCHEDULE STATUS
• Total Orders: ${report.totalOrders}
• Completed: ${report.completedOrders} (${report.completionRate}%)
• Pending: ${report.pendingOrders}

🏷️  STICKER STATUS
• Total Stickered: ${report.totalStickered}
• Pending: ${report.pendingSticker}

🚚 DELIVERY STATUS
• Trucks Dispatched: ${report.totalTrucksDispatched}
• Trucks Delivered: ${report.totalTrucksDelivered}
• Total Cartons Delivered: ${report.totalCartonsDelivered}

⏱️  TIME STATISTICS
• Total Hours: ${report.totalHours}
• Avg per Order: ${report.avgTimePerOrder} min

${report.alerts.length > 0 ? `⚠️  ALERTS\n${report.alerts.map((a) => '• ' + a).join('\n')}` : ''}

═══════════════════════════════════════════════
  `;
}

// ==========================================
// EXPORT REPORT TO CSV
// ==========================================
export function exportReportToCSV(report: DailyReport): string {
  const headers = [
    'Date',
    'Total Orders',
    'Completed',
    'Pending',
    'Completion Rate',
    'Total Stickered',
    'Trucks Dispatched',
    'Trucks Delivered',
    'Total Hours',
  ];

  const values = [
    report.date,
    report.totalOrders,
    report.completedOrders,
    report.pendingOrders,
    `${report.completionRate}%`,
    report.totalStickered,
    report.totalTrucksDispatched,
    report.totalTrucksDelivered,
    report.totalHours,
  ];

  return `${headers.join(',')}\n${values.join(',')}`;
}
