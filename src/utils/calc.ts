import { CartonRow, SummaryStats } from '../types/calculator';

/**
 * 1 Yard = 0.9144 Meters
 * 1 Gross = 144 units (so 1 Gross Yard = 144 yards)
 */
export const YARD_TO_METER = 0.9144;
export const GROSS_UNITS = 144;

/**
 * Calculate length in meters from net weight (Kg) and unit weight (grams/meter)
 * Formula: (Net Wt in Kg * 1000) / Unit Wt (gm)
 */
export function calculateLengthMeters(netWtKg: number, wtPerUnitGm: number): number {
  if (wtPerUnitGm <= 0 || netWtKg <= 0) return 0;
  const meters = (netWtKg * 1000) / wtPerUnitGm;
  return Number(meters.toFixed(2));
}

/**
 * Calculate length in Gross Yards (Gry) from meters
 * Formula: (Length in Meters / 0.9144) / 144
 */
export function calculateLengthGry(lengthMtr: number): number {
  if (lengthMtr <= 0) return 0;
  const yards = lengthMtr / YARD_TO_METER;
  const gry = yards / GROSS_UNITS;
  return Number(gry.toFixed(2));
}

/**
 * Calculate length in Yards from meters
 */
export function calculateLengthYards(lengthMtr: number): number {
  if (lengthMtr <= 0) return 0;
  const yards = lengthMtr / YARD_TO_METER;
  return Number(yards.toFixed(2));
}

/**
 * Item types configuration and defaults for garment trims
 */
export interface ItemConfig {
  id: string;
  name: string;
  nameBn: string;
  defaultDeliveryUnit: 'mtr' | 'pcs';
  unitWeightLabel: string;
  unitWeightLabelBn: string;
  defaultWtPerUnit: number;
  subtitle: string;
  stickerBadge: string;
  iconType: 'elastic' | 'drawstring' | 'bow' | 'tape';
}

export const ITEM_CONFIGS: Record<string, ItemConfig> = {
  elastic: {
    id: 'elastic',
    name: 'Elastic',
    nameBn: 'ইলাস্টিক',
    defaultDeliveryUnit: 'mtr',
    unitWeightLabel: 'gm/m',
    unitWeightLabelBn: 'গ্রাম/মিটার',
    defaultWtPerUnit: 30.00,
    subtitle: 'ELASTIC WEBBING & PACKING SPECIFICATION',
    stickerBadge: 'ELASTIC',
    iconType: 'elastic',
  },
  drawstring: {
    id: 'drawstring',
    name: 'Drawstring',
    nameBn: 'ড্রস্ট্রিং / কড',
    defaultDeliveryUnit: 'pcs',
    unitWeightLabel: 'gm/pc',
    unitWeightLabelBn: 'গ্রাম/পিস',
    defaultWtPerUnit: 12.50,
    subtitle: 'DRAWSTRING & CORD ACCESSORIES PACKING SPECIFICATION',
    stickerBadge: 'DRAWSTRING',
    iconType: 'drawstring',
  },
  bow: {
    id: 'bow',
    name: 'Bow',
    nameBn: 'বো / বো ট্রিম',
    defaultDeliveryUnit: 'pcs',
    unitWeightLabel: 'gm/pc',
    unitWeightLabelBn: 'গ্রাম/পিস',
    defaultWtPerUnit: 2.50,
    subtitle: 'BOW & GARMENT TRIMS PACKING SPECIFICATION',
    stickerBadge: 'BOW',
    iconType: 'bow',
  },
  tape: {
    id: 'tape',
    name: 'Tape / Webbing',
    nameBn: 'টেপ / ফিতা',
    defaultDeliveryUnit: 'mtr',
    unitWeightLabel: 'gm/m',
    unitWeightLabelBn: 'গ্রাম/মিটার',
    defaultWtPerUnit: 20.00,
    subtitle: 'GARMENT TAPE & ACCESSORIES PACKING SPECIFICATION',
    stickerBadge: 'TAPE',
    iconType: 'tape',
  },
};

export function getItemConfig(itemType?: string): ItemConfig {
  const key = (itemType || 'elastic').toLowerCase().trim();
  if (ITEM_CONFIGS[key]) return ITEM_CONFIGS[key];
  // Default fallback for custom items
  return {
    id: key,
    name: itemType ? itemType.toUpperCase() : 'ELASTIC',
    nameBn: itemType || 'ইলাস্টিক',
    defaultDeliveryUnit: key.includes('drawstring') || key.includes('bow') || key.includes('cord') || key.includes('pcs') ? 'pcs' : 'mtr',
    unitWeightLabel: key.includes('drawstring') || key.includes('bow') ? 'gm/pc' : 'gm/m',
    unitWeightLabelBn: key.includes('drawstring') || key.includes('bow') ? 'গ্রাম/পিস' : 'গ্রাম/মিটার',
    defaultWtPerUnit: 30.00,
    subtitle: `${(itemType || 'GARMENT TRIMS').toUpperCase()} PACKING SPECIFICATION`,
    stickerBadge: (itemType || 'TRIM').toUpperCase(),
    iconType: 'elastic',
  };
}

/**
 * Recompute carton values given gross weight, tare weight, and unit weight
 */
export function recomputeCarton(
  carton: Partial<CartonRow>,
  index: number,
  defaultTare: number = 0.50,
  defaultWtPerUnit: number = 30.00,
  deliveryUnit: 'mtr' | 'pcs' | 'yds' = 'mtr',
  pcsPerPkt?: number
): CartonRow {
  const grossWt = typeof carton.grossWt === 'number' && !isNaN(carton.grossWt) ? Math.max(0, carton.grossWt) : 0;
  const tareWt = typeof carton.tareWt === 'number' && !isNaN(carton.tareWt) ? Math.max(0, carton.tareWt) : defaultTare;
  
  // If gross weight is entered (> 0), compute net weight as (grossWt - tareWt).
  // Note: if grossWt < tareWt, netWt becomes negative to indicate an input error.
  // If gross weight is 0, net weight is 0 unless manually specified.
  let netWt = 0;
  if (grossWt > 0) {
    netWt = Number((grossWt - tareWt).toFixed(2));
  } else if (typeof carton.netWt === 'number' && !isNaN(carton.netWt) && carton.netWt !== 0) {
    netWt = carton.netWt;
  }

  const wtPerUnit = typeof carton.wtPerUnit === 'number' && carton.wtPerUnit > 0 ? carton.wtPerUnit : defaultWtPerUnit;
  const lengthMtr = netWt > 0 ? calculateLengthMeters(netWt, wtPerUnit) : 0;
  const lengthGry = netWt > 0 ? calculateLengthGry(lengthMtr) : 0;
  const lengthYds = netWt > 0 ? calculateLengthYards(lengthMtr) : 0;

  // Pieces calculation for Drawstring / Bow / Pcs mode
  // If wtPerUnit is gm/pc: qtyPcs = (netWt * 1000) / wtPerUnit
  let qtyPcs: number = 0;
  if (netWt > 0 && wtPerUnit > 0) {
    qtyPcs = Math.round((netWt * 1000) / wtPerUnit);
  } else if (typeof carton.qtyPcs === 'number') {
    qtyPcs = carton.qtyPcs;
  }

  const pkts = pcsPerPkt && pcsPerPkt > 0 && qtyPcs > 0 ? Math.round((qtyPcs / pcsPerPkt) * 10) / 10 : undefined;

  return {
    id: carton.id || `carton-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    cartonNo: carton.cartonNo || index + 1,
    grossWt: Number(grossWt.toFixed(2)),
    tareWt: Number(tareWt.toFixed(2)),
    netWt: Number(netWt.toFixed(2)),
    wtPerUnit: Number(wtPerUnit.toFixed(2)),
    lengthMtr,
    lengthGry,
    lengthYds,
    qtyPcs,
    pkts,
    notes: carton.notes || '',
  };
}

/**
 * Compute overall summary statistics for active cartons (non-zero weight)
 */
export function calculateSummary(cartons: CartonRow[], pcsPerPkt?: number): SummaryStats {
  const activeCartons = cartons.filter(c => c.grossWt > 0 || c.netWt !== 0 || c.lengthMtr > 0 || (c.qtyPcs && c.qtyPcs > 0));
  const count = activeCartons.length;

  let totalGrossWt = 0;
  let totalTareWt = 0;
  let totalNetWt = 0;
  let totalMtr = 0;
  let totalYds = 0;
  let totalQtyPcs = 0;
  let minNetWt = Infinity;
  let maxNetWt = -Infinity;
  let validNetCount = 0;

  for (const c of activeCartons) {
    totalGrossWt += c.grossWt;
    totalTareWt += c.tareWt;
    totalNetWt += c.netWt;
    totalMtr += c.lengthMtr;
    totalYds += c.lengthYds || (c.lengthMtr > 0 ? c.lengthMtr / YARD_TO_METER : 0);
    totalQtyPcs += c.qtyPcs || (c.netWt > 0 && c.wtPerUnit > 0 ? Math.round((c.netWt * 1000) / c.wtPerUnit) : 0);

    if (c.netWt > 0) {
      validNetCount++;
      if (c.netWt < minNetWt) minNetWt = c.netWt;
      if (c.netWt > maxNetWt) maxNetWt = c.netWt;
    }
  }

  const roundedNetWt = Number(totalNetWt.toFixed(2));
  const roundedGrossWt = Number(totalGrossWt.toFixed(2));
  const roundedTareWt = Number(totalTareWt.toFixed(2));
  const roundedMtr = Number(totalMtr.toFixed(2));
  const roundedYds = Number(totalYds.toFixed(2));
  const totalGry = Number(((totalMtr / YARD_TO_METER) / GROSS_UNITS).toFixed(2));
  const netGrossRatio = roundedGrossWt > 0 ? Number(((roundedNetWt / roundedGrossWt) * 100).toFixed(1)) : 0;
  const avgNetWt = validNetCount > 0 ? roundedNetWt / validNetCount : 0;
  const avgMtr = validNetCount > 0 ? roundedMtr / validNetCount : 0;
  const avgQtyPcs = validNetCount > 0 ? Math.round(totalQtyPcs / validNetCount) : 0;
  const totalPkts = pcsPerPkt && pcsPerPkt > 0 ? Math.round((totalQtyPcs / pcsPerPkt) * 10) / 10 : undefined;

  let variance = 0;
  if (validNetCount > 0) {
    let sumSqDiff = 0;
    for (const c of activeCartons) {
      if (c.netWt > 0) {
        const diff = c.netWt - avgNetWt;
        sumSqDiff += diff * diff;
      }
    }
    variance = sumSqDiff / validNetCount;
  }
  const stdDevNetWt = Number(Math.sqrt(variance).toFixed(2));

  return {
    totalGrossWt: roundedGrossWt,
    totalTareWt: roundedTareWt,
    totalNetWt: roundedNetWt,
    totalNetWtLbs: Number((roundedNetWt * 2.20462).toFixed(2)),
    totalNetWtGm: Math.round(roundedNetWt * 1000),
    totalMtr: roundedMtr,
    totalGry,
    totalYds: roundedYds,
    totalQtyPcs,
    avgQtyPcsPerCtn: avgQtyPcs,
    totalPkts,
    totalCtn: count,
    activeNetCartonCount: validNetCount,
    avgNetWtPerCtn: Number(avgNetWt.toFixed(2)),
    avgMtrPerCtn: Number(avgMtr.toFixed(1)),
    stdDevNetWt,
    minNetWt: minNetWt === Infinity ? 0 : Number(minNetWt.toFixed(2)),
    maxNetWt: maxNetWt === -Infinity ? 0 : Number(maxNetWt.toFixed(2)),
    netGrossRatio,
  };
}

/**
 * Sample weight to unit weight calculator
 * E.g., if a 5 meter sample weighs 150 grams, then unit weight = 150 / 5 = 30 gm/m.
 */
export function calculateUnitWeightFromSample(sampleLengthMtr: number, sampleWeightGm: number): number {
  if (sampleLengthMtr <= 0 || sampleWeightGm <= 0) return 0;
  return Number((sampleWeightGm / sampleLengthMtr).toFixed(2));
}

/**
 * Reverse calculator: Compute required Net Weight from target Length
 */
export function calculateRequiredWeight(targetMtr: number, wtPerUnitGm: number): {
  requiredNetKg: number;
  estimatedCartons: number;
  estMtrPerCarton: number;
} {
  if (targetMtr <= 0 || wtPerUnitGm <= 0) {
    return { requiredNetKg: 0, estimatedCartons: 0, estMtrPerCarton: 0 };
  }
  const requiredNetKg = Number(((targetMtr * wtPerUnitGm) / 1000).toFixed(2));
  // Assuming standard ~10kg net per carton
  const avgCtnNetKg = 10;
  const estimatedCartons = Math.ceil(requiredNetKg / avgCtnNetKg);
  const estMtrPerCarton = estimatedCartons > 0 ? Number((targetMtr / estimatedCartons).toFixed(1)) : 0;
  return { requiredNetKg, estimatedCartons, estMtrPerCarton };
}

/**
 * Initial sample data directly matching the user's uploaded image
 */
export const INITIAL_IMAGE_DATA = {
  companyName: 'GOOD & FAST Pa. Co. Ltd',
  ref: 'LIZ-LO-ELS-26080193',
  customer: 'Liz',
  buyer: 'Sports Direct',
  size: '61 MM',
  color: 'WHITE',
  itemType: 'elastic' as const,
  deliveryUnit: 'mtr' as const,
  defaultTare: 0.50,
  defaultWtPerUnit: 30.00,
  unitSystem: 'metric' as const,
  cartons: [
    {
      id: 'c1',
      cartonNo: 1,
      grossWt: 10.06,
      tareWt: 0.50,
      netWt: 9.56,
      wtPerUnit: 30.00,
      lengthMtr: 318.67,
      lengthGry: 2.42,
      lengthYds: 348.50,
      notes: 'Carton #1',
    },
    {
      id: 'c2',
      cartonNo: 2,
      grossWt: 10.60,
      tareWt: 0.50,
      netWt: 10.10,
      wtPerUnit: 30.00,
      lengthMtr: 336.67,
      lengthGry: 2.56,
      lengthYds: 368.19,
      notes: 'Carton #2',
    },
    {
      id: 'c3',
      cartonNo: 3,
      grossWt: 10.66,
      tareWt: 0.50,
      netWt: 10.16,
      wtPerUnit: 30.00,
      lengthMtr: 338.67,
      lengthGry: 2.57,
      lengthYds: 370.37,
      notes: 'Carton #3',
    },
    // Empty slots matching the 12-block grid format in the printed sticker sheet
    ...Array.from({ length: 9 }).map((_, i) => ({
      id: `c-empty-${i + 4}`,
      cartonNo: i + 4,
      grossWt: 0,
      tareWt: 0.50,
      netWt: 0,
      wtPerUnit: 30.00,
      lengthMtr: 0,
      lengthGry: 0,
      lengthYds: 0,
      notes: '',
    })),
  ],
  createdAt: new Date().toISOString(),
};

/**
 * Parse raw weight text from clipboard, Excel, CSV, or user input.
 * Extracts an array of positive gross weight numbers.
 */
export function parseRawWeightData(text: string): number[] {
  if (!text || typeof text !== 'string') return [];

  const rawLines = text.split(/[\r\n]+/);
  const results: number[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if the line is a header row (e.g. contains words like 'carton', 'gross', 'weight', 'tare')
    const lower = trimmed.toLowerCase();
    if (
      (lower.includes('carton') || lower.includes('gross') || lower.includes('tare') || lower.includes('net') || lower.includes('meter')) &&
      !/\d+\.?\d*/.test(lower)
    ) {
      continue;
    }

    // Split by tabs (from Excel copy-paste)
    if (trimmed.includes('\t')) {
      const parts = trimmed.split('\t');
      for (const part of parts) {
        const clean = part.replace(/[^0-9.]/g, '');
        const num = parseFloat(clean);
        if (!isNaN(num) && num > 0) {
          results.push(Number(num.toFixed(2)));
        }
      }
      continue;
    }

    // If comma separated list: "10.05, 10.20, 10.30"
    if (trimmed.includes(',') && !/^\d+,\d{1,3}$/.test(trimmed)) {
      const parts = trimmed.split(/[,;]+/);
      for (const part of parts) {
        const clean = part.replace(/[^0-9.]/g, '');
        const num = parseFloat(clean);
        if (!isNaN(num) && num > 0) {
          results.push(Number(num.toFixed(2)));
        }
      }
      continue;
    }

    // Check for European single decimal comma e.g. "10,50"
    let normalized = trimmed;
    if (/^\d+,\d+$/.test(normalized)) {
      normalized = normalized.replace(',', '.');
    }

    // Extract numbers or space-separated tokens in the line
    const tokens = normalized.split(/\s+/);
    for (const token of tokens) {
      const clean = token.replace(/[^0-9.]/g, '');
      const num = parseFloat(clean);
      if (!isNaN(num) && num > 0) {
        results.push(Number(num.toFixed(2)));
      }
    }
  }

  // Filter out any zero or NaN
  return results.filter(n => typeof n === 'number' && !isNaN(n) && n > 0);
}

