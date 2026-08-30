import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  getDoc 
} from 'firebase/firestore';
import { db } from './firebase';
import { PackingSheetData } from '../types/calculator';
import { calculateSummary } from './calc';

export interface CloudSheetRecord {
  id: string;
  userId: string;
  ref: string;
  buyer: string;
  customer: string;
  companyName: string;
  size: string;
  color: string;
  totalCtn: number;
  totalNetWt: number;
  totalMtr: number;
  totalGry: number;
  sheetData: PackingSheetData;
  updatedAt: any;
  createdAt: any;
}

/**
 * Save packing sheet to Firestore under /users/{userId}/sheets/{sheetId}
 */
export async function saveSheetToCloud(
  userId: string,
  sheetData: PackingSheetData,
  customSheetId?: string
): Promise<{ success: boolean; id: string; error?: string }> {
  try {
    const sheetId = customSheetId || sheetData.ref.replace(/[^a-zA-Z0-9_-]/g, '_') || `sheet_${Date.now()}`;
    const summary = calculateSummary(sheetData.cartons);
    const sheetDocRef = doc(db, 'users', userId, 'sheets', sheetId);

    const dataToSave = {
      id: sheetId,
      userId,
      ref: sheetData.ref || 'Untitled',
      buyer: sheetData.buyer || 'N/A',
      customer: sheetData.customer || 'N/A',
      companyName: sheetData.companyName || '',
      size: sheetData.size || '',
      color: sheetData.color || '',
      totalCtn: summary.totalCtn,
      totalNetWt: summary.totalNetWt,
      totalMtr: summary.totalMtr,
      totalGry: summary.totalGry,
      sheetData: JSON.parse(JSON.stringify(sheetData)),
      updatedAt: serverTimestamp(),
    };

    await setDoc(sheetDocRef, dataToSave, { merge: true });

    return { success: true, id: sheetId };
  } catch (err: any) {
    console.error('Error saving to cloud Firestore:', err);
    return { success: false, id: '', error: err.message || 'Failed to save to cloud' };
  }
}

/**
 * Fetch all cloud saved sheets for a user
 */
export async function fetchUserCloudSheets(userId: string): Promise<CloudSheetRecord[]> {
  try {
    const sheetsRef = collection(db, 'users', userId, 'sheets');
    const q = query(sheetsRef);
    const snapshot = await getDocs(q);

    const list: CloudSheetRecord[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as CloudSheetRecord);
    });

    return list;
  } catch (err) {
    console.error('Error fetching user cloud sheets:', err);
    return [];
  }
}

/**
 * Delete a cloud sheet record
 */
export async function deleteCloudSheet(userId: string, sheetId: string): Promise<boolean> {
  try {
    const sheetDocRef = doc(db, 'users', userId, 'sheets', sheetId);
    await deleteDoc(sheetDocRef);
    return true;
  } catch (err) {
    console.error('Error deleting cloud sheet:', err);
    return false;
  }
}
