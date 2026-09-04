import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { PackingSheetData } from '../types/calculator';

export const sharePackingSheet = async (sheetData: PackingSheetData): Promise<string> => {
  // Generate a random ID (or let Firestore do it, but we'll do it manually for a short URL)
  const shareId = Math.random().toString(36).substring(2, 10);
  
  const shareRef = doc(db, 'sharedSheets', shareId);
  await setDoc(shareRef, {
    data: sheetData,
    createdAt: serverTimestamp(),
  });
  
  return shareId;
};

export const getSharedPackingSheet = async (shareId: string): Promise<PackingSheetData | null> => {
  const shareRef = doc(db, 'sharedSheets', shareId);
  const snapshot = await getDoc(shareRef);
  if (snapshot.exists()) {
    const docData = snapshot.data();
    return docData.data as PackingSheetData;
  }
  return null;
};
