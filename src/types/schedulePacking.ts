export interface PackingSchedule {
  id: string;
  scheduleNo: string;
  buyer: string;
  customer: string;
  orderRef: string;
  itemDescription: string;
  color: string;
  size: string;
  targetQty: number;
  unit: 'mtr' | 'pcs' | 'yds' | 'gry';
  unitWeightGm: number;
  defaultTare: number;
  scheduleDate: string; // YYYY-MM-DD
  deliveryDate?: string; // YYYY-MM-DD
  assignedLine?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold';
  completedQty: number;
  balanceQty: number;
  progress: number; // 0 - 100%
  totalCartons: number;
  notes?: string;
  sourceFileId?: string;
  sourceItemId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyPackingCartonSnapshot {
  cartonNo: number;
  grossWt: number;
  tareWt: number;
  netWt: number;
  lengthMtr: number;
  lengthYds?: number;
  lengthGry?: number;
  pieces?: number;
}

export interface DailyPackingLog {
  id: string;
  scheduleId: string;
  scheduleNo: string;
  orderRef: string;
  buyer: string;
  packingDate: string; // YYYY-MM-DD
  cartonsCount: number;
  startCartonNo?: number;
  endCartonNo?: number;
  packedQty: number; // In schedule's unit
  unit: string;
  grossWeightKg?: number;
  netWeightKg?: number;
  operator?: string;
  shift?: 'Morning' | 'Day' | 'Night' | 'General';
  cartonsDetail?: DailyPackingCartonSnapshot[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulePackingStats {
  totalSchedules: number;
  pendingSchedules: number;
  inProgressSchedules: number;
  completedSchedules: number;
  totalTargetQty: number;
  totalPackedQty: number;
  totalBalanceQty: number;
  totalCartons: number;
  overallFulfillment: number; // %
  todayPackedQty: number;
  todayCartons: number;
  todayLogsCount: number;
}

export type DateFilterType = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';

export interface DateFilterConfig {
  type: DateFilterType;
  startDate?: string;
  endDate?: string;
}
