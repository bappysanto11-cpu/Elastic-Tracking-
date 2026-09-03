
export type ItemType = 'elastic' | 'drawstring' | 'bow' | 'tape' | 'custom' | string;
export type DeliveryUnit = 'mtr' | 'pcs' | 'yds';

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
  wtPerUnit: number; // in gm (grams per meter or grams per piece)
  lengthMtr: number; // in Meters
  lengthGry: number; // in Gross Yards
  lengthYds?: number; // in Yards
  qtyPcs?: number; // in Pieces (Pcs) for Drawstring / Bow delivery
  pkts?: number; // Packets / Bundles count
  notes?: string;
}

export interface PackingSheetData {
  companyName: string;
  ref: string;
  customer: string;
  buyer: string;
  size: string;
  color: string;
  itemType?: ItemType; // 'elastic' | 'drawstring' | 'bow' | 'tape'
  customItemName?: string;
  deliveryUnit?: DeliveryUnit; // 'mtr' | 'pcs' | 'yds'
  pcsPerPkt?: number; // e.g. 50 pcs/packet or 100 pcs/packet for Drawstring & Bow
  defaultTare: number;
  defaultWtPerUnit: number;
  unitSystem: 'metric' | 'yards';
  // Dynamic Item Technical Specs (e.g., Elastic vs Bow vs Drawstring)
  style?: string; // e.g. "Woven Jacquard" (elastic), "Satin Ribbon Bow" (bow), "Braided Round Cord" (drawstring)
  gsm?: string; // e.g. "240 GSM" (elastic), "320 GSM" (tape)
  stretch?: string; // e.g. "140% - 160% High Recovery" (elastic)
  tipping?: string; // e.g. "Clear Film Aglet 15mm" (drawstring)
  finish?: string; // e.g. "Bar-Tack Ultrasonic" (bow), "Heat-Set Calendered" (tape)
  pattern?: string; // e.g. "3MM Ribbon | 45MM Span" (bow), "Ø 5MM × 120 CM Cut" (drawstring)
  technicalSpecs?: Record<string, string>;
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
  totalQtyPcs?: number;
  avgQtyPcsPerCtn?: number;
  totalPkts?: number;
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
  itemType?: ItemType;
  deliveryUnit?: DeliveryUnit;
  defaultTare: number;
  defaultWtPerUnit: number;
}
