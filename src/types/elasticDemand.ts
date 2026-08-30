export type DemandPriority = 'low' | 'normal' | 'high' | 'urgent';
export type DemandStatus = 'pending' | 'in_production' | 'packed' | 'completed' | 'cancelled';

export interface ElasticDemand {
  id: string;
  demandDate: string; // YYYY-MM-DD (Date when demand was received)
  deliveryDate?: string; // YYYY-MM-DD (Target delivery or export deadline)
  buyer: string; // e.g. "HCF", "H&M", "Zara"
  customer: string; // e.g. "LIZ", "Target", "Decathlon"
  ref: string; // e.g. "LIZ-LO-ELS-26080056"
  size: string; // e.g. "7MM", "25MM"
  color: string; // e.g. "BLACK", "OPTICAL WHITE"
  requiredQtyMtr: number; // e.g. 5000 (Meters)
  requiredQtyGry?: number; // (Calculated Gross Yards)
  requiredQtyKg?: number; // (Estimated Net Weight in Kg)
  unitWeightGm: number; // e.g. 8.00 (gm/m)
  defaultTare: number; // e.g. 0.50 (Kg)
  priority: DemandPriority;
  status: DemandStatus;
  packedQtyMtr: number; // Running packed progress (Meters)
  packedCartonsCount: number; // Running packed cartons count
  poNumber?: string;
  styleNo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DemandSummaryStats {
  totalDemandsCount: number;
  pendingCount: number;
  inProductionCount: number;
  packedCount: number;
  completedCount: number;
  urgentCount: number;
  totalRequiredMeters: number;
  totalPackedMeters: number;
  fulfillmentPercentage: number;
  totalEstimatedKg: number;
}

export const SAMPLE_INITIAL_DEMANDS: ElasticDemand[] = [
  {
    id: 'dem-001',
    demandDate: '2026-08-29',
    deliveryDate: '2026-09-05',
    buyer: 'HCF',
    customer: 'LIZ',
    ref: 'LIZ-LO-ELS-26080056',
    size: '7MM',
    color: 'BLACK',
    requiredQtyMtr: 5000,
    requiredQtyGry: 37.97,
    requiredQtyKg: 40.0,
    unitWeightGm: 8.0,
    defaultTare: 0.5,
    priority: 'urgent',
    status: 'in_production',
    packedQtyMtr: 1800,
    packedCartonsCount: 2,
    poNumber: 'PO-HCF-9921',
    notes: 'Urgent 5000 Mtr requirement for HCF Liza order',
    createdAt: '2026-08-29T08:00:00.000Z',
    updatedAt: '2026-08-29T08:00:00.000Z',
  },
  {
    id: 'dem-002',
    demandDate: '2026-08-28',
    deliveryDate: '2026-09-10',
    buyer: 'H&M',
    customer: 'Global Garments Ltd',
    ref: 'HM-WB-2026-4412',
    size: '32MM',
    color: 'OPTICAL WHITE',
    requiredQtyMtr: 12000,
    requiredQtyGry: 91.13,
    requiredQtyKg: 192.0,
    unitWeightGm: 16.0,
    defaultTare: 0.5,
    priority: 'normal',
    status: 'pending',
    packedQtyMtr: 0,
    packedCartonsCount: 0,
    poNumber: 'PO-HM-88301',
    notes: 'Standard waist elastic packing for Autumn shipment',
    createdAt: '2026-08-28T09:30:00.000Z',
    updatedAt: '2026-08-28T09:30:00.000Z',
  },
  {
    id: 'dem-003',
    demandDate: '2026-08-27',
    deliveryDate: '2026-09-02',
    buyer: 'ZARA',
    customer: 'Inditex Sourcing',
    ref: 'ZR-JK-9088-EX',
    size: '20MM',
    color: 'NAVY BLUE',
    requiredQtyMtr: 8500,
    requiredQtyGry: 64.55,
    requiredQtyKg: 93.5,
    unitWeightGm: 11.0,
    defaultTare: 0.5,
    priority: 'high',
    status: 'packed',
    packedQtyMtr: 8500,
    packedCartonsCount: 9,
    poNumber: 'PO-IND-2026-004',
    notes: 'Ready for final container dispatch and sticker QC inspection',
    createdAt: '2026-08-27T10:15:00.000Z',
    updatedAt: '2026-08-29T07:00:00.000Z',
  }
];
