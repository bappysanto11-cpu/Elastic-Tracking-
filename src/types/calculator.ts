
export interface ActivityLog {
  id: string;
  timestamp: string;
  action: 'ADD' | 'UPDATE' | 'DELETE' | 'BATCH' | 'SYSTEM';
  details: string;
}
export interface CartonRow {
  id: string;
  cartonNo: number;
  grossWt: number; // in Kg
  tareWt: number; // in Kg (default usually 0.50)
  netWt: number; // in Kg
  wtPerUnit: number; // in gm (grams per meter)
  lengthMtr: number; // in Meters
  lengthGry: number; // in Gross Yards
  lengthYds?: number; // in Yards
  notes?: string;
}

export interface PackingSheetData {
  companyName: string;
  ref: string;
  customer: string;
  buyer: string;
  size: string;
  color: string;
  defaultTare: number;
  defaultWtPerUnit: number;
  unitSystem: 'metric' | 'yards';
  cartons: CartonRow[];
  createdAt: string;
  logs?: ActivityLog[];
}

export interface SummaryStats {
  totalGrossWt: number;
  totalTareWt: number;
  totalNetWt: number;
  totalNetWtLbs: number;
  totalNetWtGm: number;
  totalMtr: number;
  totalGry: number;
  totalYds: number;
  totalCtn: number;
  activeNetCartonCount: number;
  avgNetWtPerCtn: number;
  avgMtrPerCtn: number;
  stdDevNetWt: number;
  minNetWt: number;
  maxNetWt: number;
  netGrossRatio: number;
}

export interface OrderPreset {
  id: string;
  name: string;
  companyName: string;
  ref: string;
  customer: string;
  buyer: string;
  size: string;
  color: string;
  defaultTare: number;
  defaultWtPerUnit: number;
}
