import { PackingSheetData, SummaryStats } from '../types/calculator';
import { calculateSummary } from './calc';

const DB_NAME = 'ElasticPackingCalculatorDB';
const DB_VERSION = 1;
const STORE_BACKUPS = 'backup_history';
const STORE_SNAPSHOT = 'latest_snapshot';
const MAX_BACKUP_ENTRIES = 35;

export interface BackupRecord {
  id?: number;
  timestamp: number;
  dateFormatted: string;
  ref: string;
  buyer: string;
  companyName: string;
  size: string;
  color: string;
  totalCtn: number;
  totalNetWt: number;
  totalMtr: number;
  totalGry: number;
  sheetData: PackingSheetData;
  source: 'auto' | 'manual';
  label?: string;
}

let dbInstance: IDBDatabase | null = null;

/**
 * Open or initialize the IndexedDB database instance safely
 */
export function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // History store with auto-increment ID
      if (!db.objectStoreNames.contains(STORE_BACKUPS)) {
        const backupStore = db.createObjectStore(STORE_BACKUPS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        backupStore.createIndex('timestamp', 'timestamp', { unique: false });
        backupStore.createIndex('ref', 'ref', { unique: false });
      }

      // Latest snapshot store with fixed key
      if (!db.objectStoreNames.contains(STORE_SNAPSHOT)) {
        db.createObjectStore(STORE_SNAPSHOT, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event: Event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event: Event) => {
      console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Automatically triggers an IndexedDB backup of current sheet data
 */
export async function triggerIndexedDbBackup(
  sheetData: PackingSheetData,
  source: 'auto' | 'manual' = 'auto',
  customLabel?: string
): Promise<BackupRecord | null> {
  try {
    const db = await openIndexedDB();
    const summary = calculateSummary(sheetData.cartons);
    const now = new Date();

    const backupRecord: BackupRecord = {
      timestamp: now.getTime(),
      dateFormatted: now.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      ref: sheetData.ref || 'Untitled',
      buyer: sheetData.buyer || 'N/A',
      companyName: sheetData.companyName || 'Elastic Factory',
      size: sheetData.size || '',
      color: sheetData.color || '',
      totalCtn: summary.totalCtn,
      totalNetWt: summary.totalNetWt,
      totalMtr: summary.totalMtr,
      totalGry: summary.totalGry,
      sheetData: JSON.parse(JSON.stringify(sheetData)),
      source,
      label: customLabel,
    };

    // 1. Save latest snapshot
    const txSnapshot = db.transaction([STORE_SNAPSHOT], 'readwrite');
    const snapshotStore = txSnapshot.objectStore(STORE_SNAPSHOT);
    snapshotStore.put({ key: 'auto_latest', record: backupRecord, timestamp: now.getTime() });

    // 2. Append to backup history
    const txHistory = db.transaction([STORE_BACKUPS], 'readwrite');
    const historyStore = txHistory.objectStore(STORE_BACKUPS);
    const addReq = historyStore.add(backupRecord);

    return new Promise((resolve) => {
      addReq.onsuccess = async (e: any) => {
        backupRecord.id = e.target.result;
        // Trim older entries if beyond limit
        await cleanupOldBackups(db);
        resolve(backupRecord);
      };
      addReq.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.error('Failed to trigger IndexedDB backup:', err);
    return null;
  }
}

/**
 * Clean up old backup records beyond MAX_BACKUP_ENTRIES
 */
async function cleanupOldBackups(db: IDBDatabase): Promise<void> {
  try {
    const tx = db.transaction([STORE_BACKUPS], 'readwrite');
    const store = tx.objectStore(STORE_BACKUPS);
    const countReq = store.count();

    countReq.onsuccess = () => {
      const count = countReq.result;
      if (count > MAX_BACKUP_ENTRIES) {
        const deleteCount = count - MAX_BACKUP_ENTRIES;
        const cursorReq = store.openCursor();
        let deleted = 0;
        cursorReq.onsuccess = (e: any) => {
          const cursor = e.target.result;
          if (cursor && deleted < deleteCount) {
            cursor.delete();
            deleted++;
            cursor.continue();
          }
        };
      }
    };
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Get all backup history records from IndexedDB sorted from newest to oldest
 */
export async function getAllIndexedDbBackups(): Promise<BackupRecord[]> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_BACKUPS], 'readonly');
      const store = tx.objectStore(STORE_BACKUPS);
      const req = store.getAll();

      req.onsuccess = () => {
        const records: BackupRecord[] = req.result || [];
        // Sort descending by timestamp
        records.sort((a, b) => b.timestamp - a.timestamp);
        resolve(records);
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error reading IndexedDB backups:', err);
    return [];
  }
}

/**
 * Delete a specific backup by ID
 */
export async function deleteIndexedDbBackup(id: number): Promise<boolean> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_BACKUPS], 'readwrite');
      const store = tx.objectStore(STORE_BACKUPS);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Clear all backups from IndexedDB
 */
export async function clearAllIndexedDbBackups(): Promise<boolean> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_BACKUPS, STORE_SNAPSHOT], 'readwrite');
      tx.objectStore(STORE_BACKUPS).clear();
      tx.objectStore(STORE_SNAPSHOT).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Get storage statistics (backup count, estimated size, last backup timestamp)
 */
export async function getIndexedDbStats(): Promise<{
  count: number;
  lastBackupDate: Date | null;
  estimatedSizeKb: number;
}> {
  try {
    const records = await getAllIndexedDbBackups();
    const count = records.length;
    const lastBackupDate = records.length > 0 ? new Date(records[0].timestamp) : null;
    const jsonStr = JSON.stringify(records);
    const estimatedSizeKb = Math.round((jsonStr.length * 2) / 1024);

    return {
      count,
      lastBackupDate,
      estimatedSizeKb,
    };
  } catch {
    return {
      count: 0,
      lastBackupDate: null,
      estimatedSizeKb: 0,
    };
  }
}
