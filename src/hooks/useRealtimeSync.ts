import { useState, useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import { PackingSheetData } from '../types/calculator';
import { saveSheetToCloud } from '../utils/cloudSync';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'local_only' | 'error';

export interface RealtimeSyncResult {
  isOnline: boolean;
  syncStatus: SyncStatus;
  lastCloudSyncTime: Date | null;
  syncError: string | null;
  pendingOfflineChanges: boolean;
  triggerManualSync: () => Promise<boolean>;
}

export function useRealtimeSync(
  sheetData: PackingSheetData,
  user: User | null
): RealtimeSyncResult {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true;
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => {
    if (!user) return 'local_only';
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
    return 'synced';
  });

  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<Date | null>(() => {
    try {
      const saved = localStorage.getItem('garment_last_cloud_sync');
      return saved ? new Date(saved) : null;
    } catch {
      return null;
    }
  });

  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingOfflineChanges, setPendingOfflineChanges] = useState<boolean>(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef<boolean>(true);
  const latestSheetDataRef = useRef<PackingSheetData>(sheetData);
  latestSheetDataRef.current = sheetData;

  // Listen to browser online / offline network events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (user) {
        // Immediately sync pending or latest changes when reconnecting
        doSync(latestSheetDataRef.current, user);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (user) {
        setSyncStatus('offline');
        setPendingOfflineChanges(true);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  // Core sync function
  const doSync = useCallback(async (dataToSync: PackingSheetData, currentUser: User): Promise<boolean> => {
    if (!navigator.onLine) {
      setIsOnline(false);
      setSyncStatus('offline');
      setPendingOfflineChanges(true);
      return false;
    }

    setSyncStatus('syncing');
    setSyncError(null);

    try {
      const result = await saveSheetToCloud(currentUser.uid, dataToSync);
      if (result.success) {
        const now = new Date();
        setSyncStatus('synced');
        setLastCloudSyncTime(now);
        setPendingOfflineChanges(false);
        try {
          localStorage.setItem('garment_last_cloud_sync', now.toISOString());
        } catch {
          // ignore
        }
        return true;
      } else {
        console.warn('Realtime cloud sync error:', result.error);
        setSyncStatus('error');
        setSyncError(result.error || 'Failed to sync with cloud');
        return false;
      }
    } catch (err: any) {
      console.error('Realtime cloud sync exception:', err);
      // If error indicates offline/network connectivity issue
      if (!navigator.onLine || err?.message?.toLowerCase().includes('offline') || err?.message?.toLowerCase().includes('network')) {
        setIsOnline(false);
        setSyncStatus('offline');
        setPendingOfflineChanges(true);
      } else {
        setSyncStatus('error');
        setSyncError(err?.message || 'Sync failed');
      }
      return false;
    }
  }, []);

  // Real-time synchronization triggered immediately on user edits (debounced 600ms)
  useEffect(() => {
    // If not logged in, keep local_only
    if (!user) {
      setSyncStatus('local_only');
      return;
    }

    // Skip redundant sync on very first mount if no edits occurred
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!isOnline) {
      setSyncStatus('offline');
      setPendingOfflineChanges(true);
      return;
    }

    // Debounce to allow smooth typing while still guaranteeing real-time push to Firestore
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setSyncStatus('syncing');

    debounceTimerRef.current = setTimeout(() => {
      doSync(sheetData, user);
    }, 600);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [sheetData, user, isOnline, doSync]);

  // Manual sync trigger
  const triggerManualSync = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setSyncStatus('local_only');
      return false;
    }
    return doSync(latestSheetDataRef.current, user);
  }, [user, doSync]);

  return {
    isOnline,
    syncStatus,
    lastCloudSyncTime,
    syncError,
    pendingOfflineChanges,
    triggerManualSync,
  };
}
