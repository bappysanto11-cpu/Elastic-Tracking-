// src/workers/excelParser.worker.ts
import * as XLSX from 'xlsx';

// ওয়ার্কারটি মেসেজ পেলে এক্সেল পার্স করবে (মূল UI থ্রেড ফ্রিজ হবে না)
self.onmessage = (e: MessageEvent) => {
  try {
    const { buffer, sheetData } = e.data;
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    const cartons = jsonData.map((row: any, index: number) => ({
      id: `worker-${Date.now()}-${index}`,
      cartonNo: index + 1,
      grossWt: parseFloat(row['Gross Wt'] || row['গ্রস ওজন'] || 0) || 0,
      tareWt: parseFloat(row['Tare'] || row['ট্যার'] || sheetData?.defaultTare) || 0.5,
      wtPerUnit: parseFloat(row['Unit Wt'] || row['ইউনিট ওজন'] || sheetData?.defaultWtPerUnit) || 30,
      netWt: 0, // ক্যালকুলেটর নিজে করবে
      lengthMtr: 0,
      lengthGry: 0,
      notes: row['Notes'] || row['নোট'] || '',
    })).filter((c: any) => c.grossWt > 0);

    self.postMessage({ success: true, cartons, count: cartons.length });
  } catch (error: any) {
    self.postMessage({ success: false, error: error?.message || 'Failed parsing in worker' });
  }
};
