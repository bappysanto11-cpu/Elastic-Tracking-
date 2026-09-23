import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  PackingSchedule,
  DailyPackingLog,
  SchedulePackingStats,
  DateFilterConfig,
  DailyPackingCartonSnapshot,
} from '../types/schedulePacking';
import { PackingSheetData } from '../types/calculator';
import { ScheduleItem } from '../types/schedule';
import {
  getLocalTrackedFiles,
  saveLocalTrackedFiles,
  updateTrackedExcelFile,
} from './excelFileTrackerService';

// Storage Keys
const SCHEDULES_STORAGE_KEY = 'garment_packing_schedules_v1';
const LOGS_STORAGE_KEY = 'garment_daily_packing_logs_v1';
const LAST_SUBMITTED_HASHES = new Set<string>();

// Helper to get formatted today date
export function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get yesterday date
export function getYesterdayDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get week start (Monday)
export function getThisWeekStartStr(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// Helper to get month start
export function getThisMonthStartStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

// Filter logs or schedules by date
export function matchesDateFilter(dateStr: string, filter: DateFilterConfig): boolean {
  if (!dateStr || filter.type === 'all') return true;

  const today = getTodayDateStr();
  const itemDate = dateStr.slice(0, 10);

  switch (filter.type) {
    case 'today':
      return itemDate === today;
    case 'yesterday':
      return itemDate === getYesterdayDateStr();
    case 'this_week': {
      const weekStart = getThisWeekStartStr();
      return itemDate >= weekStart && itemDate <= today;
    }
    case 'this_month': {
      const monthStart = getThisMonthStartStr();
      return itemDate >= monthStart && itemDate <= today;
    }
    case 'custom': {
      if (filter.startDate && itemDate < filter.startDate) return false;
      if (filter.endDate && itemDate > filter.endDate) return false;
      return true;
    }
    default:
      return true;
  }
}

// Recalculate schedule's automatic balance, cartons and status
export function recalculateScheduleMetrics(
  schedule: PackingSchedule,
  allLogsForSchedule: DailyPackingLog[]
): PackingSchedule {
  const completedQty = allLogsForSchedule.reduce((sum, log) => sum + (Number(log.packedQty) || 0), 0);
  const totalCartons = allLogsForSchedule.reduce((sum, log) => sum + (Number(log.cartonsCount) || 0), 0);
  const targetQty = Number(schedule.targetQty) || 0;
  const balanceQty = Math.max(0, targetQty - completedQty);
  const progress = targetQty > 0 ? Math.min(100, Math.round((completedQty / targetQty) * 100)) : (completedQty > 0 ? 100 : 0);

  let status: PackingSchedule['status'] = schedule.status;
  if (completedQty >= targetQty && targetQty > 0) {
    status = 'completed';
  } else if (completedQty > 0) {
    status = 'in-progress';
  } else if (status === 'completed' && completedQty < targetQty) {
    status = 'in-progress';
  }

  return {
    ...schedule,
    completedQty: Number(completedQty.toFixed(2)),
    balanceQty: Number(balanceQty.toFixed(2)),
    totalCartons,
    progress,
    status,
    updatedAt: new Date().toISOString(),
  };
}

// Initial Sample Seed if empty
export const SAMPLE_PACKING_SCHEDULES: PackingSchedule[] = [
  {
    id: 'sch-001',
    scheduleNo: 'SCH-2026-001',
    buyer: 'HCF',
    customer: 'LIZ',
    orderRef: 'LIZ-LO-ELS-26080056',
    itemDescription: 'Knitted Elastic',
    color: 'BLACK',
    size: '7MM',
    targetQty: 5000,
    unit: 'mtr',
    unitWeightGm: 8.0,
    defaultTare: 0.5,
    scheduleDate: '2026-09-15',
    deliveryDate: '2026-09-20',
    assignedLine: 'Line-01',
    status: 'in-progress',
    completedQty: 1800,
    balanceQty: 3200,
    progress: 36,
    totalCartons: 4,
    notes: 'Urgent delivery for Liza order',
    createdAt: '2026-09-15T08:00:00.000Z',
    updatedAt: '2026-09-16T10:00:00.000Z',
  },
  {
    id: 'sch-002',
    scheduleNo: 'SCH-2026-002',
    buyer: 'H&M',
    customer: 'Global Garments Ltd',
    orderRef: 'HM-WB-2026-4412',
    itemDescription: 'Woven Elastic',
    color: 'OPTICAL WHITE',
    size: '32MM',
    targetQty: 12000,
    unit: 'mtr',
    unitWeightGm: 16.0,
    defaultTare: 0.5,
    scheduleDate: '2026-09-16',
    deliveryDate: '2026-09-25',
    assignedLine: 'Line-03',
    status: 'in-progress',
    completedQty: 4500,
    balanceQty: 7500,
    progress: 38,
    totalCartons: 10,
    notes: 'Autumn shipment order',
    createdAt: '2026-09-16T07:30:00.000Z',
    updatedAt: '2026-09-16T11:00:00.000Z',
  },
  {
    id: 'sch-003',
    scheduleNo: 'SCH-2026-003',
    buyer: 'ZARA',
    customer: 'Inditex Sourcing',
    orderRef: 'ZR-JK-9088-EX',
    itemDescription: 'Drawstring Cord',
    color: 'NAVY BLUE',
    size: '20MM',
    targetQty: 8500,
    unit: 'mtr',
    unitWeightGm: 11.0,
    defaultTare: 0.5,
    scheduleDate: '2026-09-14',
    deliveryDate: '2026-09-18',
    assignedLine: 'Line-02',
    status: 'completed',
    completedQty: 8500,
    balanceQty: 0,
    progress: 100,
    totalCartons: 18,
    notes: 'Container loaded and dispatched',
    createdAt: '2026-09-14T09:00:00.000Z',
    updatedAt: '2026-09-16T09:30:00.000Z',
  }
];

export const SAMPLE_DAILY_PACKING_LOGS: DailyPackingLog[] = [
  {
    id: 'log-001',
    scheduleId: 'sch-001',
    scheduleNo: 'SCH-2026-001',
    orderRef: 'LIZ-LO-ELS-26080056',
    buyer: 'HCF',
    packingDate: '2026-09-15',
    cartonsCount: 2,
    startCartonNo: 1,
    endCartonNo: 2,
    packedQty: 900,
    unit: 'mtr',
    grossWeightKg: 8.2,
    netWeightKg: 7.2,
    operator: 'Rahim',
    shift: 'Morning',
    notes: 'First batch packed cleanly',
    createdAt: '2026-09-15T12:00:00.000Z',
    updatedAt: '2026-09-15T12:00:00.000Z',
  },
  {
    id: 'log-002',
    scheduleId: 'sch-001',
    scheduleNo: 'SCH-2026-001',
    orderRef: 'LIZ-LO-ELS-26080056',
    buyer: 'HCF',
    packingDate: '2026-09-16',
    cartonsCount: 2,
    startCartonNo: 3,
    endCartonNo: 4,
    packedQty: 900,
    unit: 'mtr',
    grossWeightKg: 8.2,
    netWeightKg: 7.2,
    operator: 'Karim',
    shift: 'Day',
    notes: 'Second batch packed',
    createdAt: '2026-09-16T10:00:00.000Z',
    updatedAt: '2026-09-16T10:00:00.000Z',
  },
  {
    id: 'log-003',
    scheduleId: 'sch-002',
    scheduleNo: 'SCH-2026-002',
    orderRef: 'HM-WB-2026-4412',
    buyer: 'H&M',
    packingDate: '2026-09-16',
    cartonsCount: 10,
    startCartonNo: 1,
    endCartonNo: 10,
    packedQty: 4500,
    unit: 'mtr',
    grossWeightKg: 77.0,
    netWeightKg: 72.0,
    operator: 'Bappi',
    shift: 'Morning',
    notes: 'High speed packing run',
    createdAt: '2026-09-16T11:00:00.000Z',
    updatedAt: '2026-09-16T11:00:00.000Z',
  },
  {
    id: 'log-004',
    scheduleId: 'sch-003',
    scheduleNo: 'SCH-2026-003',
    orderRef: 'ZR-JK-9088-EX',
    buyer: 'ZARA',
    packingDate: '2026-09-16',
    cartonsCount: 18,
    startCartonNo: 1,
    endCartonNo: 18,
    packedQty: 8500,
    unit: 'mtr',
    grossWeightKg: 102.5,
    netWeightKg: 93.5,
    operator: 'Sultan',
    shift: 'Day',
    notes: 'Completed entire order packing',
    createdAt: '2026-09-16T09:30:00.000Z',
    updatedAt: '2026-09-16T09:30:00.000Z',
  }
];

// Load Schedules from local storage (with automatic migration from tracked Excel files so existing data is NEVER lost)
export function loadPackingSchedules(): PackingSchedule[] {
  try {
    const raw = localStorage.getItem(SCHEDULES_STORAGE_KEY);
    let schedules: PackingSchedule[] = [];
    if (raw) {
      schedules = JSON.parse(raw);
    }

    if (!Array.isArray(schedules) || schedules.length === 0) {
      // Check existing tracked files to import without losing any data
      const trackedFiles = getLocalTrackedFiles();
      const importedFromFiles: PackingSchedule[] = [];

      trackedFiles.forEach((file) => {
        file.items.forEach((item, index) => {
          const targetQty = Number(item.demandQty) || Number(item.orderQty) || 0;
          const completedQty = Number(item.completedQty) || 0;
          const balance = Math.max(0, targetQty - completedQty);
          importedFromFiles.push({
            id: `sch-imp-${file.id}-${item.id}`,
            scheduleNo: `SCH-${String(importedFromFiles.length + 1).padStart(3, '0')}`,
            buyer: item.buyer || 'General',
            customer: item.customer || 'Factory',
            orderRef: item.customerRefPO || item.jobNo || `ORD-${index + 1}`,
            itemDescription: item.itemDescription || 'Elastic',
            color: item.color || 'White',
            size: item.size || 'Standard',
            targetQty,
            unit: (item.unit?.toLowerCase() === 'pcs' ? 'pcs' : 'mtr'),
            unitWeightGm: 8.0,
            defaultTare: 0.5,
            scheduleDate: item.date ? item.date.slice(0, 10) : getTodayDateStr(),
            status: item.status === 'completed' ? 'completed' : (completedQty > 0 ? 'in-progress' : 'pending'),
            completedQty,
            balanceQty: balance,
            progress: targetQty > 0 ? Math.min(100, Math.round((completedQty / targetQty) * 100)) : 0,
            totalCartons: Math.ceil(completedQty / 400) || 0,
            sourceFileId: file.id,
            sourceItemId: item.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        });
      });

      if (importedFromFiles.length > 0) {
        savePackingSchedules(importedFromFiles);
        return importedFromFiles;
      }

      // Default sample fallback
      savePackingSchedules(SAMPLE_PACKING_SCHEDULES);
      return SAMPLE_PACKING_SCHEDULES;
    }

    return schedules;
  } catch (err) {
    console.error('Failed to load packing schedules:', err);
    return SAMPLE_PACKING_SCHEDULES;
  }
}

// Save Schedules to LocalStorage and trigger async Cloud Sync
export function savePackingSchedules(schedules: PackingSchedule[]): void {
  try {
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(schedules));
  } catch (err) {
    console.error('Failed to save packing schedules to localStorage:', err);
  }
}

// Sync schedules with Excel Tracker files (Ensures newly uploaded files are never lost or omitted)
export function syncSchedulesFromExcelTracker(): { added: number; updated: number; total: number } {
  try {
    const trackedFiles = getLocalTrackedFiles();
    const currentSchedules = loadPackingSchedules();
    const allLogs = loadDailyPackingLogs();

    let addedCount = 0;
    let updatedCount = 0;
    const scheduleMap = new Map<string, PackingSchedule>();

    // Index existing by id and orderRef
    currentSchedules.forEach((s) => {
      scheduleMap.set(s.id, s);
      if (s.orderRef) scheduleMap.set(`ref_${s.orderRef}`, s);
      if (s.sourceItemId) scheduleMap.set(`src_${s.sourceItemId}`, s);
    });

    trackedFiles.forEach((file) => {
      file.items.forEach((item, index) => {
        const targetQty = Number(item.demandQty) || Number(item.orderQty) || 0;
        const orderRef = item.customerRefPO || item.jobNo || `ORD-${file.id}-${index + 1}`;
        const existing =
          scheduleMap.get(`src_${item.id}`) ||
          scheduleMap.get(`ref_${orderRef}`) ||
          scheduleMap.get(`sch-imp-${file.id}-${item.id}`);

        if (existing) {
          // Update targetQty if changed in excel
          if (targetQty > 0 && existing.targetQty !== targetQty) {
            existing.targetQty = targetQty;
            const itemLogs = allLogs.filter((l) => l.scheduleId === existing.id);
            const recalc = recalculateScheduleMetrics(existing, itemLogs);
            Object.assign(existing, recalc);
            updatedCount++;
          }
        } else {
          // New Schedule from Excel item
          const newId = `sch-imp-${file.id}-${item.id}`;
          const newSchedule: PackingSchedule = {
            id: newId,
            scheduleNo: `SCH-${String(currentSchedules.length + addedCount + 1).padStart(3, '0')}`,
            buyer: item.buyer || file.fileName.replace(/\.[^/.]+$/, '') || 'General',
            customer: item.customer || 'Factory Client',
            orderRef,
            itemDescription: item.itemDescription || 'Elastic Item',
            color: item.color || 'Standard',
            size: item.size || 'Standard',
            targetQty,
            unit: item.unit?.toLowerCase() === 'pcs' ? 'pcs' : 'mtr',
            unitWeightGm: 8.0,
            defaultTare: 0.5,
            scheduleDate: item.date ? item.date.slice(0, 10) : getTodayDateStr(),
            status: item.status === 'completed' ? 'completed' : 'pending',
            completedQty: Number(item.completedQty) || 0,
            balanceQty: Math.max(0, targetQty - (Number(item.completedQty) || 0)),
            progress: targetQty > 0 ? Math.min(100, Math.round(((Number(item.completedQty) || 0) / targetQty) * 100)) : 0,
            totalCartons: Math.ceil((Number(item.completedQty) || 0) / 400) || 0,
            sourceFileId: file.id,
            sourceItemId: item.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          currentSchedules.push(newSchedule);
          scheduleMap.set(newSchedule.id, newSchedule);
          if (newSchedule.orderRef) scheduleMap.set(`ref_${newSchedule.orderRef}`, newSchedule);
          scheduleMap.set(`src_${item.id}`, newSchedule);
          addedCount++;
        }
      });
    });

    if (addedCount > 0 || updatedCount > 0) {
      savePackingSchedules(currentSchedules);
    }

    return { added: addedCount, updated: updatedCount, total: currentSchedules.length };
  } catch (err) {
    console.error('Failed to sync schedules with Excel tracker:', err);
    return { added: 0, updated: 0, total: 0 };
  }
}

// Load Daily Packing Logs
export function loadDailyPackingLogs(): DailyPackingLog[] {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (!raw) {
      saveDailyPackingLogs(SAMPLE_DAILY_PACKING_LOGS);
      return SAMPLE_DAILY_PACKING_LOGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    saveDailyPackingLogs(SAMPLE_DAILY_PACKING_LOGS);
    return SAMPLE_DAILY_PACKING_LOGS;
  } catch (err) {
    console.error('Failed to load daily packing logs:', err);
    return SAMPLE_DAILY_PACKING_LOGS;
  }
}

// Save Daily Packing Logs
export function saveDailyPackingLogs(logs: DailyPackingLog[]): void {
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save daily packing logs to localStorage:', err);
  }
}

// ==========================================
// CRUD OPERATIONS FOR SCHEDULES
// ==========================================

export async function createSchedule(
  scheduleInput: Omit<PackingSchedule, 'id' | 'scheduleNo' | 'completedQty' | 'balanceQty' | 'progress' | 'totalCartons' | 'createdAt' | 'updatedAt'>
): Promise<PackingSchedule> {
  const currentSchedules = loadPackingSchedules();
  const nextNum = currentSchedules.length + 1;
  const scheduleNo = `SCH-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;
  const now = new Date().toISOString();

  const targetQty = Number(scheduleInput.targetQty) || 0;
  const newSchedule: PackingSchedule = {
    ...scheduleInput,
    id: `sch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    scheduleNo,
    completedQty: 0,
    balanceQty: targetQty,
    progress: 0,
    totalCartons: 0,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newSchedule, ...currentSchedules];
  savePackingSchedules(updated);

  // Background Cloud Sync to Firestore
  try {
    const docRef = doc(db, 'scheduleItems', newSchedule.id);
    await setDoc(docRef, {
      ...newSchedule,
      cloudSyncedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Firestore cloud sync notice (offline mode active):', e);
  }

  return newSchedule;
}

export async function updateSchedule(
  id: string,
  updates: Partial<PackingSchedule>
): Promise<PackingSchedule> {
  const currentSchedules = loadPackingSchedules();
  const allLogs = loadDailyPackingLogs();
  const existing = currentSchedules.find((s) => s.id === id);
  if (!existing) {
    throw new Error(`Schedule ${id} not found`);
  }

  const merged = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // Recalculate with existing logs
  const scheduleLogs = allLogs.filter((l) => l.scheduleId === id);
  const recalculated = recalculateScheduleMetrics(merged, scheduleLogs);

  const updatedList = currentSchedules.map((s) => (s.id === id ? recalculated : s));
  savePackingSchedules(updatedList);

  // Background sync
  try {
    const docRef = doc(db, 'scheduleItems', id);
    await setDoc(docRef, { ...recalculated, cloudSyncedAt: serverTimestamp() }, { merge: true });
  } catch (e) {
    console.warn('Firestore update sync notice:', e);
  }

  return recalculated;
}

export async function deleteSchedule(id: string): Promise<void> {
  const currentSchedules = loadPackingSchedules();
  const currentLogs = loadDailyPackingLogs();

  const filteredSchedules = currentSchedules.filter((s) => s.id !== id);
  const filteredLogs = currentLogs.filter((l) => l.scheduleId !== id);

  savePackingSchedules(filteredSchedules);
  saveDailyPackingLogs(filteredLogs);

  // Background cloud delete
  try {
    const docRef = doc(db, 'scheduleItems', id);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn('Firestore delete notice:', e);
  }
}

// ==========================================
// CRUD OPERATIONS FOR DAILY PACKING LOGS
// ==========================================

export async function addDailyPackingLog(
  logInput: Omit<DailyPackingLog, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ log: DailyPackingLog; schedule: PackingSchedule }> {
  // Duplicate prevention hash check (5 seconds window)
  const hash = `${logInput.scheduleId}_${logInput.packingDate}_${logInput.packedQty}_${logInput.cartonsCount}`;
  if (LAST_SUBMITTED_HASHES.has(hash)) {
    throw new Error('Duplicate entry prevented: Identical packing session was just recorded.');
  }
  LAST_SUBMITTED_HASHES.add(hash);
  setTimeout(() => LAST_SUBMITTED_HASHES.delete(hash), 10000);

  const currentLogs = loadDailyPackingLogs();
  const currentSchedules = loadPackingSchedules();

  const schedule = currentSchedules.find((s) => s.id === logInput.scheduleId);
  if (!schedule) {
    throw new Error(`Parent Schedule ${logInput.scheduleId} not found.`);
  }

  const now = new Date().toISOString();
  const newLog: DailyPackingLog = {
    ...logInput,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    scheduleNo: schedule.scheduleNo,
    orderRef: schedule.orderRef,
    buyer: schedule.buyer,
    unit: logInput.unit || schedule.unit,
    createdAt: now,
    updatedAt: now,
  };

  const updatedLogs = [newLog, ...currentLogs];
  saveDailyPackingLogs(updatedLogs);

  // Automatically recalculate parent schedule balance & totals
  const allLogsForSchedule = updatedLogs.filter((l) => l.scheduleId === schedule.id);
  const updatedSchedule = recalculateScheduleMetrics(schedule, allLogsForSchedule);

  const updatedSchedules = currentSchedules.map((s) => (s.id === schedule.id ? updatedSchedule : s));
  savePackingSchedules(updatedSchedules);

  // Background cloud sync
  try {
    const logDoc = doc(db, 'dailyPackingLogs', newLog.id);
    await setDoc(logDoc, { ...newLog, cloudSyncedAt: serverTimestamp() });

    const schDoc = doc(db, 'scheduleItems', updatedSchedule.id);
    await setDoc(schDoc, { ...updatedSchedule, cloudSyncedAt: serverTimestamp() }, { merge: true });
  } catch (e) {
    console.warn('Firestore daily log sync notice:', e);
  }

  return { log: newLog, schedule: updatedSchedule };
}

export async function updateDailyPackingLog(
  id: string,
  updates: Partial<DailyPackingLog>
): Promise<{ log: DailyPackingLog; schedule: PackingSchedule }> {
  const currentLogs = loadDailyPackingLogs();
  const currentSchedules = loadPackingSchedules();

  const existing = currentLogs.find((l) => l.id === id);
  if (!existing) {
    throw new Error(`Packing Log ${id} not found.`);
  }

  const mergedLog: DailyPackingLog = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const updatedLogs = currentLogs.map((l) => (l.id === id ? mergedLog : l));
  saveDailyPackingLogs(updatedLogs);

  // Recalculate parent schedule
  const schedule = currentSchedules.find((s) => s.id === mergedLog.scheduleId);
  if (!schedule) {
    throw new Error(`Schedule ${mergedLog.scheduleId} not found.`);
  }

  const allLogsForSchedule = updatedLogs.filter((l) => l.scheduleId === schedule.id);
  const updatedSchedule = recalculateScheduleMetrics(schedule, allLogsForSchedule);

  const updatedSchedules = currentSchedules.map((s) => (s.id === schedule.id ? updatedSchedule : s));
  savePackingSchedules(updatedSchedules);

  // Background sync
  try {
    const logDoc = doc(db, 'dailyPackingLogs', id);
    await setDoc(logDoc, { ...mergedLog, cloudSyncedAt: serverTimestamp() }, { merge: true });

    const schDoc = doc(db, 'scheduleItems', updatedSchedule.id);
    await setDoc(schDoc, { ...updatedSchedule, cloudSyncedAt: serverTimestamp() }, { merge: true });
  } catch (e) {
    console.warn('Firestore update sync notice:', e);
  }

  return { log: mergedLog, schedule: updatedSchedule };
}

export async function deleteDailyPackingLog(id: string): Promise<PackingSchedule> {
  const currentLogs = loadDailyPackingLogs();
  const currentSchedules = loadPackingSchedules();

  const target = currentLogs.find((l) => l.id === id);
  if (!target) {
    throw new Error(`Packing Log ${id} not found.`);
  }

  const filteredLogs = currentLogs.filter((l) => l.id !== id);
  saveDailyPackingLogs(filteredLogs);

  const schedule = currentSchedules.find((s) => s.id === target.scheduleId);
  if (!schedule) {
    throw new Error(`Schedule ${target.scheduleId} not found.`);
  }

  const remainingLogs = filteredLogs.filter((l) => l.scheduleId === schedule.id);
  const updatedSchedule = recalculateScheduleMetrics(schedule, remainingLogs);

  const updatedSchedules = currentSchedules.map((s) => (s.id === schedule.id ? updatedSchedule : s));
  savePackingSchedules(updatedSchedules);

  // Background delete
  try {
    const logDoc = doc(db, 'dailyPackingLogs', id);
    await deleteDoc(logDoc);

    const schDoc = doc(db, 'scheduleItems', updatedSchedule.id);
    await setDoc(schDoc, { ...updatedSchedule, cloudSyncedAt: serverTimestamp() }, { merge: true });
  } catch (e) {
    console.warn('Firestore delete notice:', e);
  }

  return updatedSchedule;
}

// ==========================================
// INTEGRATION: COMMIT LIVE CARTONS TO SCHEDULE
// ==========================================

export async function commitCurrentCartonsToSchedule(
  scheduleId: string,
  sheetData: PackingSheetData,
  operator: string = 'Operator',
  shift: 'Morning' | 'Day' | 'Night' | 'General' = 'Day',
  notes?: string
): Promise<{ log: DailyPackingLog; schedule: PackingSchedule }> {
  const activeCartons = sheetData.cartons.filter((c) => c.netWt > 0 || c.lengthMtr > 0);
  if (activeCartons.length === 0) {
    throw new Error('No cartons with weight or length recorded to commit.');
  }

  const cartonsCount = activeCartons.length;
  const startCartonNo = Math.min(...activeCartons.map((c) => c.cartonNo));
  const endCartonNo = Math.max(...activeCartons.map((c) => c.cartonNo));

  const totalPackedQty = activeCartons.reduce((sum, c) => sum + (c.lengthMtr || 0), 0);
  const totalGrossKg = activeCartons.reduce((sum, c) => sum + (c.grossWt || 0), 0);
  const totalNetKg = activeCartons.reduce((sum, c) => sum + (c.netWt || 0), 0);

  const cartonSnapshots: DailyPackingCartonSnapshot[] = activeCartons.map((c) => ({
    cartonNo: c.cartonNo,
    grossWt: c.grossWt,
    tareWt: c.tareWt,
    netWt: c.netWt,
    lengthMtr: c.lengthMtr,
    lengthYds: c.lengthYds,
    lengthGry: c.lengthGry,
    pieces: c.qtyPcs,
  }));

  const logInput: Omit<DailyPackingLog, 'id' | 'createdAt' | 'updatedAt'> = {
    scheduleId,
    scheduleNo: '',
    orderRef: sheetData.ref || '',
    buyer: sheetData.buyer || '',
    packingDate: getTodayDateStr(),
    cartonsCount,
    startCartonNo,
    endCartonNo,
    packedQty: Number(totalPackedQty.toFixed(2)),
    unit: sheetData.deliveryUnit || 'mtr',
    grossWeightKg: Number(totalGrossKg.toFixed(2)),
    netWeightKg: Number(totalNetKg.toFixed(2)),
    operator,
    shift,
    cartonsDetail: cartonSnapshots,
    notes: notes || `Auto-logged from live table: Cartons #${startCartonNo} to #${endCartonNo}`,
  };

  return await addDailyPackingLog(logInput);
}

// ==========================================
// CALCULATE DASHBOARD STATISTICS
// ==========================================

export function calculateSchedulePackingStats(
  schedules: PackingSchedule[],
  logs: DailyPackingLog[]
): SchedulePackingStats {
  const today = getTodayDateStr();

  let pendingSchedules = 0;
  let inProgressSchedules = 0;
  let completedSchedules = 0;
  let totalTargetQty = 0;
  let totalPackedQty = 0;
  let totalBalanceQty = 0;
  let totalCartons = 0;

  schedules.forEach((s) => {
    if (s.status === 'completed') completedSchedules++;
    else if (s.status === 'in-progress') inProgressSchedules++;
    else pendingSchedules++;

    totalTargetQty += Number(s.targetQty) || 0;
    totalPackedQty += Number(s.completedQty) || 0;
    totalBalanceQty += Number(s.balanceQty) || 0;
    totalCartons += Number(s.totalCartons) || 0;
  });

  const overallFulfillment =
    totalTargetQty > 0
      ? Math.min(100, Math.round((totalPackedQty / totalTargetQty) * 100))
      : 0;

  // Today stats from logs
  const todayLogs = logs.filter((l) => l.packingDate.slice(0, 10) === today);
  const todayPackedQty = todayLogs.reduce((sum, l) => sum + (Number(l.packedQty) || 0), 0);
  const todayCartons = todayLogs.reduce((sum, l) => sum + (Number(l.cartonsCount) || 0), 0);

  return {
    totalSchedules: schedules.length,
    pendingSchedules,
    inProgressSchedules,
    completedSchedules,
    totalTargetQty: Number(totalTargetQty.toFixed(2)),
    totalPackedQty: Number(totalPackedQty.toFixed(2)),
    totalBalanceQty: Number(totalBalanceQty.toFixed(2)),
    totalCartons,
    overallFulfillment,
    todayPackedQty: Number(todayPackedQty.toFixed(2)),
    todayCartons,
    todayLogsCount: todayLogs.length,
  };
}

// ==========================================
// EXPORT PACKING HISTORY TO CSV
// ==========================================

export function exportPackingLogsToCsv(logs: DailyPackingLog[]): string {
  const headers = [
    'Log ID',
    'Date',
    'Schedule No',
    'Buyer',
    'Order Ref',
    'Cartons Packed',
    'Carton Range',
    'Packed Qty',
    'Unit',
    'Net Wt (Kg)',
    'Gross Wt (Kg)',
    'Operator',
    'Shift',
    'Notes',
  ];

  const rows = logs.map((l) => [
    `"${l.id}"`,
    `"${l.packingDate}"`,
    `"${l.scheduleNo}"`,
    `"${l.buyer}"`,
    `"${l.orderRef}"`,
    l.cartonsCount,
    `"CTN #${l.startCartonNo || 1} - #${l.endCartonNo || l.cartonsCount}"`,
    l.packedQty,
    `"${l.unit}"`,
    l.netWeightKg || 0,
    l.grossWeightKg || 0,
    `"${l.operator || ''}"`,
    `"${l.shift || ''}"`,
    `"${(l.notes || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// Download CSV helper
export function downloadCsvFile(content: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ==========================================
// ORDER-SPECIFIC INTEGRATED PACKING HELPERS
// ==========================================

// Get or create a PackingSchedule instance for a given ScheduleItem
export function getOrCreateScheduleForItem(
  item: ScheduleItem,
  fileId?: string,
  fileName?: string
): PackingSchedule {
  const currentSchedules = loadPackingSchedules();
  const orderRef = item.customerRefPO || item.jobNo || `ORD-${item.id}`;

  const existing = currentSchedules.find(
    (s) =>
      s.sourceItemId === item.id ||
      s.id === item.id ||
      s.id === `sch-imp-${fileId}-${item.id}` ||
      (orderRef && s.orderRef && s.orderRef.trim().toLowerCase() === orderRef.trim().toLowerCase())
  );
  if (existing) {
    return existing;
  }

  const targetQty = Number(item.demandQty) || Number(item.orderQty) || 0;
  const newSchedule: PackingSchedule = {
    id: `sch-imp-${fileId || 'active'}-${item.id}`,
    scheduleNo: item.jobNo || `SCH-${String(currentSchedules.length + 1).padStart(3, '0')}`,
    buyer: item.buyer || fileName || 'General',
    customer: item.customer || 'Factory Client',
    orderRef,
    itemDescription: item.itemDescription || 'Elastic Item',
    color: item.color || 'Standard',
    size: item.size || 'Standard',
    targetQty,
    unit: item.unit?.toLowerCase() === 'pcs' ? 'pcs' : 'mtr',
    unitWeightGm: 8.0,
    defaultTare: 0.5,
    scheduleDate: item.date ? item.date.slice(0, 10) : getTodayDateStr(),
    status: item.status === 'completed' ? 'completed' : 'pending',
    completedQty: Number(item.completedQty) || 0,
    balanceQty: Math.max(0, targetQty - (Number(item.completedQty) || 0)),
    progress:
      targetQty > 0
        ? Math.min(100, Math.round(((Number(item.completedQty) || 0) / targetQty) * 100))
        : 0,
    totalCartons: Math.ceil((Number(item.completedQty) || 0) / 400) || 0,
    sourceFileId: fileId,
    sourceItemId: item.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  currentSchedules.push(newSchedule);
  savePackingSchedules(currentSchedules);
  return newSchedule;
}

// Get all daily packing logs for a specific schedule order item
export function getDailyLogsForOrderItem(item: ScheduleItem, scheduleId?: string): DailyPackingLog[] {
  const allLogs = loadDailyPackingLogs();
  const orderRef = (item.customerRefPO || item.jobNo || '').trim().toLowerCase();

  return allLogs
    .filter((l) => {
      if (scheduleId && l.scheduleId === scheduleId) return true;
      if (l.scheduleId === item.id || l.scheduleId.endsWith(item.id)) return true;
      if (orderRef && l.orderRef && l.orderRef.trim().toLowerCase() === orderRef) return true;
      if (item.jobNo && l.scheduleNo && l.scheduleNo.trim().toLowerCase() === item.jobNo.trim().toLowerCase()) return true;
      return false;
    })
    .sort((a, b) => new Date(b.packingDate || b.createdAt).getTime() - new Date(a.packingDate || a.createdAt).getTime());
}

// Record daily packing for an order and auto-sync item balance in Excel Tracker
export async function recordDailyPackingForOrderItem(
  item: ScheduleItem,
  fileId: string,
  logInput: {
    packingDate: string;
    packedQty: number;
    cartonsCount: number;
    startCartonNo?: number;
    endCartonNo?: number;
    grossWeightKg?: number;
    netWeightKg?: number;
    operator?: string;
    shift?: 'Morning' | 'Day' | 'Night' | 'General';
    notes?: string;
    cartonsDetail?: DailyPackingCartonSnapshot[];
  }
): Promise<{ log: DailyPackingLog; updatedSchedule: PackingSchedule; updatedItem: ScheduleItem }> {
  // 1. Get or create PackingSchedule for this item
  const schedule = getOrCreateScheduleForItem(item, fileId);

  // 2. Add daily packing log
  const { log, schedule: updatedSchedule } = await addDailyPackingLog({
    scheduleId: schedule.id,
    scheduleNo: schedule.scheduleNo,
    orderRef: schedule.orderRef,
    buyer: schedule.buyer,
    packingDate: logInput.packingDate,
    cartonsCount: logInput.cartonsCount,
    startCartonNo: logInput.startCartonNo,
    endCartonNo: logInput.endCartonNo,
    packedQty: logInput.packedQty,
    unit: schedule.unit,
    grossWeightKg: logInput.grossWeightKg,
    netWeightKg: logInput.netWeightKg,
    operator: logInput.operator,
    shift: logInput.shift || 'Day',
    cartonsDetail: logInput.cartonsDetail,
    notes: logInput.notes,
  });

  // 3. Compute total completed quantity for this item
  const allItemLogs = getDailyLogsForOrderItem(item, schedule.id);
  const totalCompleted = allItemLogs.reduce((sum, l) => sum + (Number(l.packedQty) || 0), 0);
  const targetQty = Number(item.demandQty) || Number(item.orderQty) || 0;
  const balanceQty = Math.max(0, targetQty - totalCompleted);
  const progress =
    targetQty > 0
      ? Math.min(100, Math.round((totalCompleted / targetQty) * 100))
      : totalCompleted > 0
      ? 100
      : 0;

  let newStatus: ScheduleItem['status'] = item.status;
  if (totalCompleted >= targetQty && targetQty > 0) {
    newStatus = 'completed';
  } else if (totalCompleted > 0) {
    newStatus = 'in-progress';
  }

  const updatedItem: ScheduleItem = {
    ...item,
    completedQty: totalCompleted,
    balanceQty: balanceQty,
    progress: progress,
    status: newStatus,
    updatedAt: new Date(),
  };

  // 4. Update the active file in excelFileTracker
  try {
    const files = getLocalTrackedFiles();
    const currentFile = files.find((f) => f.id === fileId);
    if (currentFile) {
      const updatedItems = currentFile.items.map((it) => (it.id === item.id ? updatedItem : it));
      await updateTrackedExcelFile(fileId, { items: updatedItems });
    }
  } catch (err) {
    console.warn('Could not update Excel file for order packing:', err);
  }

  return { log, updatedSchedule, updatedItem };
}

// Delete daily packing log for an order and auto-restore item balance in Excel Tracker
export async function deleteDailyPackingLogForOrderItem(
  logId: string,
  item: ScheduleItem,
  fileId: string
): Promise<{ updatedSchedule: PackingSchedule; updatedItem: ScheduleItem }> {
  const updatedSchedule = await deleteDailyPackingLog(logId);

  // Recalculate total completed qty for this item
  const allItemLogs = getDailyLogsForOrderItem(item, updatedSchedule.id);
  const totalCompleted = allItemLogs.reduce((sum, l) => sum + (Number(l.packedQty) || 0), 0);
  const targetQty = Number(item.demandQty) || Number(item.orderQty) || 0;
  const balanceQty = Math.max(0, targetQty - totalCompleted);
  const progress =
    targetQty > 0
      ? Math.min(100, Math.round((totalCompleted / targetQty) * 100))
      : totalCompleted > 0
      ? 100
      : 0;

  let newStatus: ScheduleItem['status'] = item.status;
  if (totalCompleted >= targetQty && targetQty > 0) {
    newStatus = 'completed';
  } else if (totalCompleted > 0) {
    newStatus = 'in-progress';
  } else {
    newStatus = 'pending';
  }

  const updatedItem: ScheduleItem = {
    ...item,
    completedQty: totalCompleted,
    balanceQty: balanceQty,
    progress: progress,
    status: newStatus,
    updatedAt: new Date(),
  };

  try {
    const files = getLocalTrackedFiles();
    const currentFile = files.find((f) => f.id === fileId);
    if (currentFile) {
      const updatedItems = currentFile.items.map((it) => (it.id === item.id ? updatedItem : it));
      await updateTrackedExcelFile(fileId, { items: updatedItems });
    }
  } catch (err) {
    console.warn('Could not update Excel file after log deletion:', err);
  }

  return { updatedSchedule, updatedItem };
}
