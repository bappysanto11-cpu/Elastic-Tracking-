import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  getDoc, 
  updateDoc, 
  doc,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { ScheduleItem, ProgressLog } from '../types/schedule';

// ==========================================
// SAVE SCHEDULE ITEMS
// ==========================================
export async function saveDailySchedule(items: ScheduleItem[]) {
  try {
    const scheduleRef = collection(db, 'scheduleItems');
    const today = new Date().toISOString().split('T')[0];

    const savedIds: string[] = [];

    for (const item of items) {
      const docRef = await addDoc(scheduleRef, {
        ...item,
        date: today,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      savedIds.push(docRef.id);
    }

    console.log(`✅ Saved ${savedIds.length} schedule items`);
    return savedIds;
  } catch (error) {
    console.error('❌ Error saving schedule:', error);
    throw error;
  }
}

// ==========================================
// GET TODAY'S SCHEDULE
// ==========================================
export async function getTodaySchedule(): Promise<ScheduleItem[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const q = query(collection(db, 'scheduleItems'), where('date', '==', today));
    const snapshot = await getDocs(q);

    const items: ScheduleItem[] = [];
    snapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as ScheduleItem);
    });

    return items;
  } catch (error) {
    console.error('❌ Error fetching schedule:', error);
    throw error;
  }
}

// ==========================================
// REAL-TIME LISTENER
// ==========================================
export function onScheduleUpdate(callback: (items: ScheduleItem[]) => void) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const q = query(collection(db, 'scheduleItems'), where('date', '==', today));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: ScheduleItem[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as ScheduleItem);
        });
        callback(items);
      },
      (err) => {
        console.warn('⚠️ Schedule real-time sync error (fallback):', err);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up listener:', error);
    return () => {};
  }
}

// ==========================================
// UPDATE SCHEDULE ITEM
// ==========================================
export async function updateScheduleItem(
  id: string,
  updates: Partial<ScheduleItem>
) {
  try {
    const itemRef = doc(db, 'scheduleItems', id);
    await updateDoc(itemRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Updated schedule item: ${id}`);
  } catch (error) {
    console.error('❌ Error updating item:', error);
    throw error;
  }
}

// ==========================================
// LOG PROGRESS
// ==========================================
export async function logProgress(log: ProgressLog) {
  try {
    const logsRef = collection(db, 'progressLogs');
    const docRef = await addDoc(logsRef, {
      ...log,
      timestamp: serverTimestamp(),
    });

    console.log(`✅ Logged progress: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error logging progress:', error);
    throw error;
  }
}

// ==========================================
// START JOB
// ==========================================
export async function startJob(scheduleItemId: string) {
  try {
    await updateScheduleItem(scheduleItemId, {
      status: 'in-progress',
      startedAt: new Date(),
    });

    await logProgress({
      id: `log-${Date.now()}`,
      scheduleItemId,
      eventType: 'started',
      completedQty: 0,
      timestamp: new Date(),
    });

    console.log(`✅ Job started: ${scheduleItemId}`);
  } catch (error) {
    console.error('❌ Error starting job:', error);
    throw error;
  }
}

// ==========================================
// UPDATE QUANTITY
// ==========================================
export async function updateJobQuantity(
  scheduleItemId: string,
  newQty: number
) {
  try {
    // Get current item
    const itemRef = doc(db, 'scheduleItems', scheduleItemId);
    const itemSnap = await getDoc(itemRef);

    if (!itemSnap.exists()) throw new Error('Item not found');

    const item = itemSnap.data() as ScheduleItem;
    const progress = (newQty / item.demandQty) * 100;

    // Update item
    await updateScheduleItem(scheduleItemId, {
      completedQty: newQty,
      progress: Math.min(100, Math.round(progress)),
    });

    // Log progress
    await logProgress({
      id: `log-${Date.now()}`,
      scheduleItemId,
      eventType: 'updated',
      completedQty: newQty,
      timestamp: new Date(),
    });

    console.log(`✅ Updated quantity: ${newQty}/${item.demandQty}`);
  } catch (error) {
    console.error('❌ Error updating quantity:', error);
    throw error;
  }
}

// ==========================================
// COMPLETE JOB
// ==========================================
export async function completeJob(scheduleItemId: string) {
  try {
    // Get current item
    const itemRef = doc(db, 'scheduleItems', scheduleItemId);
    const itemSnap = await getDoc(itemRef);

    if (!itemSnap.exists()) throw new Error('Item not found');

    const item = itemSnap.data() as ScheduleItem;

    // Update item
    await updateScheduleItem(scheduleItemId, {
      status: 'completed',
      completedQty: item.demandQty,
      progress: 100,
      completedAt: new Date(),
    });

    // Log completion
    await logProgress({
      id: `log-${Date.now()}`,
      scheduleItemId,
      eventType: 'completed',
      completedQty: item.demandQty,
      timestamp: new Date(),
    });

    console.log(`✅ Job completed: ${scheduleItemId}`);
  } catch (error) {
    console.error('❌ Error completing job:', error);
    throw error;
  }
}
