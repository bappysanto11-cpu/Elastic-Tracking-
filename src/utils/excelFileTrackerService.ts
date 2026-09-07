import * as XLSX from 'xlsx';
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { ScheduleItem, TrackedExcelFile } from '../types/schedule';

const LOCAL_STORAGE_KEY = 'garment_tracked_excel_files_v1';
const ACTIVE_FILE_ID_KEY = 'garment_active_excel_file_id';

// Initial sample data if no tracked files exist
export const SAMPLE_EXCEL_SCHEDULE: TrackedExcelFile = {
  id: 'excel-sample-hm-zara-2026',
  fileName: 'Buyer_Target_Schedule_Sample.xlsx',
  fileSize: 18450,
  uploadedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  updatedAt: new Date().toISOString(),
  uploadedBy: 'Floor Planner (ফ্যাক্টরি প্ল্যানার)',
  totalRows: 4,
  totalDemand: 15900,
  unit: 'Mtr',
  uniqueBuyers: ['H&M', 'Zara Inditex', 'Next UK', 'Marks & Spencer'],
  status: 'active',
  notes: 'High-priority export target for European delivery',
  items: [
    {
      id: 'item-sample-1',
      date: new Date().toISOString().split('T')[0],
      buyer: 'H&M',
      customer: 'Hennes & Mauritz Sweden',
      jobNo: 'JB-8821',
      customerRefPO: 'PO-450921',
      woNumber: 'WO-1011',
      itemDescription: 'Stretch Twill Trousers',
      color: 'Navy Blue',
      size: '32/34',
      orderQty: 4500,
      unit: 'Mtr',
      balanceQty: 4500,
      demandQty: 4500,
      completedQty: 1800,
      status: 'in-progress',
      progress: 40,
      challanRef: 'CH-2026-0881',
      notes: 'Line 04 Running smoothly',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'item-sample-2',
      date: new Date().toISOString().split('T')[0],
      buyer: 'Zara Inditex',
      customer: 'Zara Spain Logistics',
      jobNo: 'JB-8822',
      customerRefPO: 'PO-889104',
      woNumber: 'WO-1012',
      itemDescription: 'Slim Fit Chino Pant',
      color: 'Khaki Beige',
      size: '34/32',
      orderQty: 3200,
      unit: 'Mtr',
      balanceQty: 3200,
      demandQty: 3200,
      completedQty: 3200,
      status: 'completed',
      progress: 100,
      challanRef: 'CH-2026-0882',
      notes: 'All 3200m inspected and packed',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'item-sample-3',
      date: new Date().toISOString().split('T')[0],
      buyer: 'Next UK',
      customer: 'Next Sourcing Ltd',
      jobNo: 'JB-8823',
      customerRefPO: 'PO-231109',
      woNumber: 'WO-1013',
      itemDescription: 'Linen Blend Casual Shirt',
      color: 'Optic White',
      size: 'L',
      orderQty: 2800,
      unit: 'Pcs',
      balanceQty: 2800,
      demandQty: 2800,
      completedQty: 0,
      status: 'pending',
      progress: 0,
      notes: 'Waiting for collar interlining inspection',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'item-sample-4',
      date: new Date().toISOString().split('T')[0],
      buyer: 'Marks & Spencer',
      customer: 'M&S London',
      jobNo: 'JB-8824',
      customerRefPO: 'PO-990142',
      woNumber: 'WO-1014',
      itemDescription: 'Regular Fit Denim Trouser',
      color: 'Vintage Wash',
      size: '36/32',
      orderQty: 5400,
      unit: 'Mtr',
      balanceQty: 5400,
      demandQty: 5400,
      completedQty: 0,
      status: 'pending',
      progress: 0,
      notes: 'Fabric received in finishing section',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ]
};

// ==========================================
// LOCAL STORAGE CACHE HELPERS
// ==========================================
export function getLocalTrackedFiles(): TrackedExcelFile[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [SAMPLE_EXCEL_SCHEDULE];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [SAMPLE_EXCEL_SCHEDULE];
    }
    return parsed;
  } catch {
    return [SAMPLE_EXCEL_SCHEDULE];
  }
}

export function saveLocalTrackedFiles(files: TrackedExcelFile[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(files));
  } catch (err) {
    console.warn('LocalStorage save failed:', err);
  }
}

export function getActiveTrackedFileId(): string {
  try {
    return localStorage.getItem(ACTIVE_FILE_ID_KEY) || SAMPLE_EXCEL_SCHEDULE.id;
  } catch {
    return SAMPLE_EXCEL_SCHEDULE.id;
  }
}

export function setActiveTrackedFileId(fileId: string): void {
  try {
    localStorage.setItem(ACTIVE_FILE_ID_KEY, fileId);
  } catch (err) {
    console.warn('Could not set active file id:', err);
  }
}

// ==========================================
// LOAD ALL TRACKED FILES (Firestore + Local)
// ==========================================
export async function fetchAllTrackedExcelFiles(): Promise<TrackedExcelFile[]> {
  const local = getLocalTrackedFiles();
  try {
    const fetchPromise = (async () => {
      const filesCol = collection(db, 'excelScheduleFiles');
      const q = query(filesCol, orderBy('uploadedAt', 'desc'));
      const snap = await getDocs(q);

      if (snap.empty) {
        // If Firestore is empty, seed asynchronously without blocking
        if (local.length > 0) {
          Promise.all(local.map(file => 
            setDoc(doc(db, 'excelScheduleFiles', file.id), {
              ...file,
              updatedAt: serverTimestamp(),
            }).catch(() => {})
          )).catch(() => {});
        }
        return local;
      }

      const files: TrackedExcelFile[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data() as TrackedExcelFile;
        files.push({
          ...data,
          id: docSnap.id,
        });
      });

      // Save fresh snapshot to local cache
      saveLocalTrackedFiles(files);
      return files;
    })();

    // Timeout protection: if network or Firestore takes >1800ms, immediately resolve local files so UI never freezes!
    const timeoutPromise = new Promise<TrackedExcelFile[]>((resolve) => 
      setTimeout(() => resolve(local), 1800)
    );

    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (err) {
    console.warn('Firestore fetch failed, falling back to local storage:', err);
    return local;
  }
}

// ==========================================
// SAVE OR CREATE TRACKED EXCEL FILE
// ==========================================
export async function saveTrackedExcelFile(file: TrackedExcelFile): Promise<void> {
  // Update local cache immediately
  const existing = getLocalTrackedFiles();
  const idx = existing.findIndex(f => f.id === file.id);
  let updatedList: TrackedExcelFile[];

  if (idx >= 0) {
    updatedList = [...existing];
    updatedList[idx] = file;
  } else {
    updatedList = [file, ...existing];
  }
  saveLocalTrackedFiles(updatedList);
  setActiveTrackedFileId(file.id);

  // Sync with Firestore
  try {
    const docRef = doc(db, 'excelScheduleFiles', file.id);
    await setDoc(docRef, {
      ...file,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Cloud sync of Excel file failed (cached locally):', err);
  }
}

// ==========================================
// UPDATE TRACKED EXCEL FILE (e.g. after edit)
// ==========================================
export async function updateTrackedExcelFile(
  fileId: string,
  updates: Partial<TrackedExcelFile>
): Promise<TrackedExcelFile | null> {
  const existing = getLocalTrackedFiles();
  const idx = existing.findIndex(f => f.id === fileId);
  if (idx < 0) return null;

  const current = existing[idx];
  const updatedFile: TrackedExcelFile = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // Re-calculate metadata if items changed
  if (updates.items) {
    updatedFile.totalRows = updates.items.length;
    updatedFile.totalDemand = updates.items.reduce((sum, it) => sum + (Number(it.demandQty) || 0), 0);
    updatedFile.uniqueBuyers = Array.from(new Set(updates.items.map(it => it.buyer).filter(Boolean)));
  }

  existing[idx] = updatedFile;
  saveLocalTrackedFiles(existing);

  // Cloud sync
  try {
    const docRef = doc(db, 'excelScheduleFiles', fileId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not update file in Firestore:', err);
  }

  return updatedFile;
}

// ==========================================
// DELETE TRACKED EXCEL FILE
// ==========================================
export async function deleteTrackedExcelFile(fileId: string): Promise<void> {
  const existing = getLocalTrackedFiles();
  const filtered = existing.filter(f => f.id !== fileId);
  saveLocalTrackedFiles(filtered.length > 0 ? filtered : [SAMPLE_EXCEL_SCHEDULE]);

  try {
    const docRef = doc(db, 'excelScheduleFiles', fileId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Could not delete file from Firestore:', err);
  }
}

// ==========================================
// EXPORT EDITED FILE TO .XLSX
// ==========================================
export function exportTrackedFileToExcel(file: TrackedExcelFile): void {
  const exportRows = file.items.map((item, idx) => ({
    'SL': idx + 1,
    'Buyer': item.buyer || '',
    'Customer': item.customer || '',
    'Job No': item.jobNo || '',
    'Customer Ref / PO': item.customerRefPO || '',
    'WO Number': item.woNumber || '',
    'Item Description': item.itemDescription || '',
    'Color': item.color || '',
    'Size': item.size || '',
    'Order Qty': Number(item.orderQty) || 0,
    'Unit': item.unit || 'Mtr',
    'Balance Qty': Number(item.balanceQty) || 0,
    'Demand Qty': Number(item.demandQty) || 0,
    'Completed Qty': Number(item.completedQty) || 0,
    'Status': item.status || 'pending',
    'Progress (%)': `${item.progress || 0}%`,
    'Challan Ref': item.challanRef || '',
    'Notes': item.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  // Auto column widths
  const colWidths = [
    { wch: 6 },  // SL
    { wch: 18 }, // Buyer
    { wch: 22 }, // Customer
    { wch: 14 }, // Job No
    { wch: 18 }, // Customer Ref / PO
    { wch: 14 }, // WO Number
    { wch: 26 }, // Item Description
    { wch: 16 }, // Color
    { wch: 10 }, // Size
    { wch: 12 }, // Order Qty
    { wch: 8 },  // Unit
    { wch: 12 }, // Balance Qty
    { wch: 12 }, // Demand Qty
    { wch: 14 }, // Completed Qty
    { wch: 12 }, // Status
    { wch: 14 }, // Progress
    { wch: 18 }, // Challan Ref
    { wch: 28 }, // Notes
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Production Schedule');

  const cleanName = file.fileName.replace(/\.xlsx$/i, '');
  const outName = `${cleanName}_Edited_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, outName);
}

// ==========================================
// PARSE RAW EXCEL FILE TO TRACKED FILE
// ==========================================
export async function parseUploadedExcelFile(
  file: File,
  uploadedBy?: string
): Promise<TrackedExcelFile> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

  if (!rawRows || rawRows.length === 0) {
    throw new Error('The uploaded Excel file contains no readable data.');
  }

  // Normalize field names flexibly
  const items: ScheduleItem[] = rawRows.map((row, idx) => {
    const buyer = String(
      row['Buyer'] || row['BUYER'] || row['Buyer Name'] || row['buyer'] || ''
    ).trim();

    const customer = String(
      row['Customer'] || row['CUSTOMER'] || row['Customer Name'] || row['Client'] || ''
    ).trim();

    const jobNo = String(
      row['Job No'] || row['JOB NO'] || row['Job #'] || row['JobNo'] || ''
    ).trim();

    const customerRefPO = String(
      row['Customer Ref/PO'] ||
      row['Customer Ref / PO'] ||
      row['Ref/PO'] ||
      row['PO'] ||
      row['PO No'] ||
      row['PO#'] ||
      row['Order Ref'] ||
      ''
    ).trim();

    const woNumber = String(
      row['WO Number'] || row['WO'] || row['Work Order'] || row['W.O.'] || ''
    ).trim();

    const itemDescription = String(
      row['Item Description'] ||
      row['Item'] ||
      row['Style'] ||
      row['Style Description'] ||
      row['Description'] ||
      row['Garment'] ||
      ''
    ).trim();

    const color = String(
      row['Color'] || row['COLOR'] || row['Colour'] || row['Shade'] || ''
    ).trim();

    const size = String(
      row['Size'] || row['SIZE'] || row['Sizes'] || ''
    ).trim();

    const orderQty = Number(
      row['Order Qty'] || row['ORDER QTY'] || row['Order Quantity'] || row['Qty'] || 0
    ) || 0;

    const unit = String(
      row['Unit'] || row['UNIT'] || row['UOM'] || 'Mtr'
    ).trim();

    const balanceQty = Number(
      row['Balance qty'] || row['Balance Qty'] || row['Balance'] || orderQty
    ) || orderQty;

    const demandQty = Number(
      row['Demand Qty'] || row['Demand'] || row['DEMAND QTY'] || orderQty
    ) || orderQty;

    const challanRef = String(
      row['Challan Ref'] ||
      row['Challan Reference'] ||
      row['Challan No'] ||
      row['Challan'] ||
      row['Challan#'] ||
      ''
    ).trim();

    return {
      id: `item-${Date.now()}-${idx}`,
      date: new Date().toISOString().split('T')[0],
      buyer,
      customer,
      jobNo,
      customerRefPO,
      woNumber,
      itemDescription,
      color,
      size,
      orderQty,
      unit,
      balanceQty,
      demandQty,
      completedQty: 0,
      status: 'pending' as const,
      progress: 0,
      challanRef,
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  const totalDemand = items.reduce((sum, it) => sum + it.demandQty, 0);
  const uniqueBuyers = Array.from(new Set(items.map(it => it.buyer).filter(Boolean)));
  const primaryUnit = items[0]?.unit || 'Mtr';

  const trackedFile: TrackedExcelFile = {
    id: `excel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    fileName: file.name,
    fileSize: file.size,
    uploadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    uploadedBy: uploadedBy || 'Garment Staff',
    totalRows: items.length,
    totalDemand,
    unit: primaryUnit,
    uniqueBuyers,
    status: 'active',
    items,
  };

  return trackedFile;
}

// ==========================================
// EXPORT SINGLE ORDER TO .XLSX
// ==========================================
export function exportSingleOrderToExcel(item: ScheduleItem, fileNamePrefix?: string): void {
  const exportRows = [{
    'Date': item.date || new Date().toISOString().split('T')[0],
    'Buyer': item.buyer || '',
    'Customer': item.customer || '',
    'Job No': item.jobNo || '',
    'Customer Ref / PO': item.customerRefPO || '',
    'WO Number': item.woNumber || '',
    'Item Description': item.itemDescription || '',
    'Color': item.color || '',
    'Size': item.size || '',
    'Order Qty': Number(item.orderQty) || 0,
    'Unit': item.unit || 'Mtr',
    'Demand Qty': Number(item.demandQty) || 0,
    'Completed Qty': Number(item.completedQty) || 0,
    'Status': item.status || 'pending',
    'Progress (%)': `${item.progress || 0}%`,
    'Challan Ref': item.challanRef || '',
    'Notes': item.notes || '',
  }];

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const colWidths = [
    { wch: 12 }, // Date
    { wch: 20 }, // Buyer
    { wch: 20 }, // Customer
    { wch: 14 }, // Job No
    { wch: 20 }, // Customer Ref / PO
    { wch: 14 }, // WO Number
    { wch: 26 }, // Item Description
    { wch: 14 }, // Color
    { wch: 10 }, // Size
    { wch: 12 }, // Order Qty
    { wch: 8 },  // Unit
    { wch: 12 }, // Demand Qty
    { wch: 14 }, // Completed Qty
    { wch: 14 }, // Status
    { wch: 14 }, // Progress
    { wch: 18 }, // Challan Ref
    { wch: 25 }, // Notes
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Order_Details');
  const safeName = (item.customerRefPO || item.buyer || 'Order').replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(workbook, `${fileNamePrefix || 'Order'}_${safeName}.xlsx`);
}

// ==========================================
// COMPLETE SCHEDULE ITEM IN TRACKER
// ==========================================
export async function completeScheduleItemInTracker(
  itemIdOrRef: string,
  actualPackedQty?: number
): Promise<{ success: boolean; item?: ScheduleItem; file?: TrackedExcelFile }> {
  const existingFiles = getLocalTrackedFiles();
  let targetFile: TrackedExcelFile | null = null;
  let targetItem: ScheduleItem | null = null;

  for (const file of existingFiles) {
    const itemIndex = file.items.findIndex(
      it =>
        it.id === itemIdOrRef ||
        (it.customerRefPO && it.customerRefPO.trim().toLowerCase() === itemIdOrRef.trim().toLowerCase()) ||
        (it.jobNo && it.jobNo.trim().toLowerCase() === itemIdOrRef.trim().toLowerCase())
    );
    if (itemIndex >= 0) {
      const it = file.items[itemIndex];
      const completedQty =
        actualPackedQty !== undefined && actualPackedQty > 0
          ? Number(actualPackedQty.toFixed(2))
          : Number(it.demandQty) || Number(it.orderQty) || 0;
      const demand = Number(it.demandQty) || Number(it.orderQty) || 1;
      const progress = Math.min(100, Math.round((completedQty / demand) * 100));

      const updatedItem: ScheduleItem = {
        ...it,
        status: 'completed',
        completedQty,
        progress: progress > 0 ? progress : 100,
        completedAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedItems = [...file.items];
      updatedItems[itemIndex] = updatedItem;

      targetFile = {
        ...file,
        items: updatedItems,
        updatedAt: new Date().toISOString(),
      };
      targetItem = updatedItem;
      break;
    }
  }

  if (targetFile && targetItem) {
    await saveTrackedExcelFile(targetFile);
    return { success: true, item: targetItem, file: targetFile };
  }
  return { success: false };
}
