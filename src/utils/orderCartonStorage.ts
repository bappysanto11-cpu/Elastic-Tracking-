import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { CartonRow, PackingSheetData } from '../types/calculator';
import { ScheduleItem, TrackedExcelFile } from '../types/schedule';
import { recomputeCarton } from './calc';
import { getLocalTrackedFiles } from './excelFileTrackerService';

export interface OrderPackingData {
  orderId: string;
  fileId?: string;
  buyer: string;
  customer: string;
  customerRefPO: string;
  jobNo: string;
  woNumber?: string;
  itemDescription: string;
  color: string;
  size: string;
  demandQty: number;
  completedQty?: number;
  unit: string;
  cartonCapacity: number;
  totalCartons: number;
  cartons: CartonRow[];
  defaultTare: number;
  defaultWtPerUnit: number;
  updatedAt: string;
}

const LOCAL_STORAGE_KEY = 'garment_order_cartons_v1';
const FIRESTORE_COLLECTION = 'order_packing_sheets';

/**
 * Read the entire local cache dictionary of order packing data
 */
export function getLocalOrderCartonsMap(): Record<string, OrderPackingData> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Save dictionary to local storage
 */
export function saveLocalOrderCartonsMap(map: Record<string, OrderPackingData>): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Could not save order cartons map to localStorage:', err);
  }
}

/**
 * Synchronous local retrieval of order packing data
 */
export function getLocalOrderPackingData(orderId: string): OrderPackingData | null {
  if (!orderId) return null;
  const map = getLocalOrderCartonsMap();
  return map[orderId] || null;
}

/**
 * Save single order packing data to local cache
 */
export function saveLocalOrderPackingData(data: OrderPackingData): void {
  if (!data || !data.orderId) return;
  const map = getLocalOrderCartonsMap();
  map[data.orderId] = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  saveLocalOrderCartonsMap(map);
}

/**
 * Fetch order packing data from Firestore cloud backend
 */
export async function fetchOrderPackingDataFromCloud(orderId: string): Promise<OrderPackingData | null> {
  if (!orderId) return null;
  try {
    const safeDocId = orderId.replace(/[\/\\]/g, '_');
    const docRef = doc(db, FIRESTORE_COLLECTION, safeDocId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as OrderPackingData;
      // sync to local cache
      saveLocalOrderPackingData(data);
      return data;
    }
  } catch (err) {
    console.warn(`Firestore read failed for order ${orderId}:`, err);
  }
  return null;
}

/**
 * Save order packing data to Cloud Firestore and local cache
 */
export async function saveOrderPackingData(data: OrderPackingData): Promise<void> {
  if (!data || !data.orderId) return;
  // 1. Instant local persistence
  saveLocalOrderPackingData(data);

  // 2. Cloud Firestore persistence (async non-blocking)
  try {
    const safeDocId = data.orderId.replace(/[\/\\]/g, '_');
    const docRef = doc(db, FIRESTORE_COLLECTION, safeDocId);
    await setDoc(docRef, {
      ...data,
      serverSyncedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn(`Firestore write failed for order ${data.orderId}:`, err);
  }
}

/**
 * Determine default capacity per carton based on order unit
 */
export function getDefaultCartonCapacity(order: ScheduleItem): number {
  const unit = (order.unit || 'mtr').toLowerCase();
  const demand = Number(order.demandQty) || Number(order.orderQty) || 1000;

  if (unit.includes('pc')) {
    // For pieces: default 100 or 200 pcs per carton
    if (demand <= 200) return demand;
    if (demand <= 1000) return 100;
    return 200;
  }

  // For meters or yards: default 500 meters per carton
  if (demand <= 500) return demand;
  if (demand <= 2500) return 500;
  if (demand <= 10000) return 1000;
  return 1000;
}

/**
 * Automatically generate pristine cartons based on order demand quantity and carton capacity
 */
export function generateCartonsForOrder(
  order: ScheduleItem,
  customCapacity?: number,
  defaultTare: number = 0.50,
  defaultWtPerUnit: number = 30.00
): CartonRow[] {
  const demand = Math.max(1, Number(order.demandQty) || Number(order.orderQty) || 1000);
  const capacity = customCapacity && customCapacity > 0 ? customCapacity : getDefaultCartonCapacity(order);
  const unit = (order.unit || 'mtr').toLowerCase();
  const isPcs = unit.includes('pc');
  const deliveryUnit: 'mtr' | 'pcs' = isPcs ? 'pcs' : 'mtr';

  const totalCartons = Math.max(1, Math.ceil(demand / capacity));
  const cartons: CartonRow[] = [];

  let remaining = demand;

  for (let i = 0; i < totalCartons; i++) {
    const cartonNo = i + 1;
    const ctnQty = Math.min(capacity, remaining);
    remaining = Math.max(0, remaining - ctnQty);

    // Compute net weight in kg: (Quantity * grams per unit) / 1000
    const netWt = Number(((ctnQty * defaultWtPerUnit) / 1000).toFixed(3));
    const grossWt = Number((netWt + defaultTare).toFixed(3));

    const baseCarton: Partial<CartonRow> = {
      id: `${order.id}-ctn-${cartonNo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      cartonNo,
      grossWt,
      tareWt: defaultTare,
      netWt,
      wtPerUnit: defaultWtPerUnit,
      color: order.color || '',
      size: order.size || '',
      notes: `${order.buyer || ''} ${order.customerRefPO ? `PO: ${order.customerRefPO}` : ''}`.trim(),
    };

    if (isPcs) {
      baseCarton.qtyPcs = Math.round(ctnQty);
    } else {
      baseCarton.lengthMtr = Number(ctnQty.toFixed(2));
    }

    const computed = recomputeCarton(
      baseCarton,
      i,
      defaultTare,
      defaultWtPerUnit,
      deliveryUnit,
      undefined,
      'kg'
    );

    cartons.push(computed);
  }

  return cartons;
}

/**
 * Get or create order packing data (Check local, then cloud, then auto-generate)
 */
export async function getOrCreateOrderCartons(
  order: ScheduleItem,
  customCapacity?: number
): Promise<{ data: OrderPackingData; isNew: boolean }> {
  // 1. Check local cache
  const local = getLocalOrderPackingData(order.id);
  if (local && Array.isArray(local.cartons) && local.cartons.length > 0) {
    return { data: local, isNew: false };
  }

  // 2. Check Cloud Firestore
  const cloud = await fetchOrderPackingDataFromCloud(order.id);
  if (cloud && Array.isArray(cloud.cartons) && cloud.cartons.length > 0) {
    return { data: cloud, isNew: false };
  }

  // 3. Auto-generate based on order demand and capacity
  const capacity = customCapacity || getDefaultCartonCapacity(order);
  const defaultTare = 0.50;
  const defaultWtPerUnit = 30.00;
  const cartons = generateCartonsForOrder(order, capacity, defaultTare, defaultWtPerUnit);

  const newData: OrderPackingData = {
    orderId: order.id,
    buyer: order.buyer || 'Unknown Buyer',
    customer: order.customer || '',
    customerRefPO: order.customerRefPO || '',
    jobNo: order.jobNo || '',
    woNumber: order.woNumber || '',
    itemDescription: order.itemDescription || 'Elastic Trim',
    color: order.color || '',
    size: order.size || '',
    demandQty: Number(order.demandQty) || Number(order.orderQty) || 1000,
    completedQty: Number(order.completedQty) || 0,
    unit: order.unit || 'mtr',
    cartonCapacity: capacity,
    totalCartons: cartons.length,
    cartons,
    defaultTare,
    defaultWtPerUnit,
    updatedAt: new Date().toISOString(),
  };

  // Persist locally & to cloud
  await saveOrderPackingData(newData);

  return { data: newData, isNew: true };
}

/**
 * Convert OrderPackingData to standard PackingSheetData
 */
export function orderDataToPackingSheetData(orderData: OrderPackingData, baseSheetData?: PackingSheetData): PackingSheetData {
  return {
    companyName: baseSheetData?.companyName || 'GOOD & FAST Pa. Co. Ltd',
    ref: orderData.customerRefPO || orderData.jobNo || orderData.orderId,
    customer: orderData.customer || '',
    buyer: orderData.buyer || '',
    size: orderData.size || '',
    color: orderData.color || '',
    customItemName: orderData.itemDescription || '',
    itemType: orderData.itemDescription?.toLowerCase().includes('drawstring')
      ? 'drawstring'
      : orderData.itemDescription?.toLowerCase().includes('bow')
      ? 'bow'
      : 'elastic',
    deliveryUnit: (orderData.unit?.toLowerCase().includes('pc') ? 'pcs' : 'mtr') as any,
    defaultTare: orderData.defaultTare || 0.50,
    defaultWtPerUnit: orderData.defaultWtPerUnit || 30.00,
    unitSystem: 'metric',
    weightUnit: 'kg',
    cartons: orderData.cartons,
    createdAt: orderData.updatedAt || new Date().toISOString(),
  };
}

/**
 * Extract all unique schedule orders across tracked excel files for the order selector
 */
export function getAllAvailableScheduleOrders(): ScheduleItem[] {
  const files: TrackedExcelFile[] = getLocalTrackedFiles();
  const map = new Map<string, ScheduleItem>();

  for (const file of files) {
    if (Array.isArray(file.items)) {
      for (const item of file.items) {
        if (item && item.id && !map.has(item.id)) {
          map.set(item.id, item);
        }
      }
    }
  }

  return Array.from(map.values());
}
