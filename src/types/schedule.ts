// ==========================================
// SCHEDULE TYPES
// ==========================================

export interface ScheduleItem {
  id: string;
  date: string;
  
  // Customer & Order Info
  buyer: string;
  customer: string;
  jobNo: string;
  customerRefPO: string;
  woNumber: string;
  itemDescription: string;
  color: string;
  size: string;
  
  // Quantities
  orderQty: number;
  unit: string;
  balanceQty: number;
  demandQty: number;
  
  // Progress Tracking
  completedQty: number;
  status: 'pending' | 'in-progress' | 'completed' | 'paused';
  progress: number;
  
  // Timing
  startedAt?: Date;
  pausedAt?: Date;
  completedAt?: Date;
  totalTimeSpent?: number;
  
  // Additional
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProgressLog {
  id: string;
  scheduleItemId: string;
  eventType: 'started' | 'paused' | 'resumed' | 'completed' | 'updated';
  completedQty: number;
  timeSpent?: number;
  notes?: string;
  timestamp: Date;
}

export interface StickerStatus {
  id: string;
  scheduleItemId: string;
  status: 'pending' | 'in-design' | 'printed' | 'done';
  totalStickers: number;
  stickersApplied: number;
  appliedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChallanDetail {
  id: string;
  challanNo: string;
  date: string;
  scheduleItemId: string;
  
  // Order Info
  buyer: string;
  customerRefPO: string;
  
  // Carton Info
  totalCartons: number;
  totalWeight: number;
  weightPerCarton: number;
  
  // Truck Info
  truckRequired: number;
  truckCapacity: number;
  truckDistribution: number[];
  
  // Status
  status: 'draft' | 'ready_for_dispatch' | 'dispatching' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface TruckDispatch {
  id: string;
  challanId: string;
  truckNo: number;
  cartons: number;
  weight: number;
  driver?: string;
  driverPhone?: string;
  status: 'waiting' | 'loading' | 'loaded' | 'in_transit' | 'delivered';
  departureTime?: Date;
  deliveryTime?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyReport {
  id: string;
  date: string;
  
  // Statistics
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalDemandQty: number;
  totalCompletedQty: number;
  completionRate: number;
  
  // Sticker Stats
  totalStickered: number;
  pendingSticker: number;
  
  // Delivery Stats
  totalTrucksDispatched: number;
  totalTrucksDelivered: number;
  totalCartonsDelivered: number;
  
  // Time Stats
  totalHours: number;
  avgTimePerOrder: number;
  
  // Alerts
  alerts: string[];
  
  generatedAt: Date;
}
