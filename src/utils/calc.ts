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
 * Recompute carton values given gross weight, tare weight, and unit weight
 */
export function recomputeCarton(
  carton: Partial<CartonRow>,
  index: number,
  defaultTare: number = 0.50,
  defaultWtPerUnit: number = 30.00
): CartonRow {
  const grossWt = typeof carton.grossWt === 'number' && !isNaN(carton.grossWt) ? carton.grossWt : 0;
  const tareWt = typeof carton.tareWt === 'number' && !isNaN(carton.tareWt) ? carton.tareWt : defaultTare;
  
  // If gross weight is entered (> 0), compute net weight as (grossWt - tareWt).
  // Note: if grossWt < tareWt, netWt becomes negative to indicate an input error.
  let netWt = 0;
  if (grossWt > 0) {
    netWt = Number((grossWt - tareWt).toFixed(2));
  } else if (typeof carton.netWt === 'number' && !isNaN(carton.netWt)) {
    netWt = carton.netWt;
  }

  const wtPerUnit = typeof carton.wtPerUnit === 'number' && carton.wtPerUnit > 0 ? carton.wtPerUnit : defaultWtPerUnit;
  const lengthMtr = netWt > 0 ? calculateLengthMeters(netWt, wtPerUnit) : 0;
  const lengthGry = netWt > 0 ? calculateLengthGry(lengthMtr) : 0;
  const lengthYds = netWt > 0 ? calculateLengthYards(lengthMtr) : 0;

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
    notes: carton.notes || '',
  };
}

/**
 * Compute overall summary statistics for active cartons (non-zero weight)
 */
export function calculateSummary(cartons: CartonRow[]): SummaryStats {
  const activeCartons = cartons.filter(c => c.netWt !== 0 || c.grossWt > 0 || c.lengthMtr > 0);
  const count = activeCartons.length;

  let totalGrossWt = 0;
  let totalTareWt = 0;
  let totalNetWt = 0;
  let totalMtr = 0;
  let totalGry = 0;
  let totalYds = 0;
  let minNetWt = Infinity;
  let maxNetWt = -Infinity;
  let validNetCount = 0;

  for (const c of activeCartons) {
    totalGrossWt += c.grossWt;
    totalTareWt += c.tareWt;
    totalNetWt += c.netWt;
    totalMtr += c.lengthMtr;
    totalGry += c.lengthGry;
    totalYds += c.lengthYds || 0;

    if (c.netWt > 0) {
      validNetCount++;
      if (c.netWt < minNetWt) minNetWt = c.netWt;
      if (c.netWt > maxNetWt) maxNetWt = c.netWt;
    }
  }

  const roundedNetWt = Number(totalNetWt.toFixed(2));
  const roundedGrossWt = Number(totalGrossWt.toFixed(2));
  const netGrossRatio = roundedGrossWt > 0 ? Number(((roundedNetWt / roundedGrossWt) * 100).toFixed(1)) : 0;
  const avgNetWt = count > 0 ? totalNetWt / count : 0;

  let variance = 0;
  if (count > 0) {
    let sumSqDiff = 0;
    for (const c of activeCartons) {
      const diff = c.netWt - avgNetWt;
      sumSqDiff += diff * diff;
    }
    variance = sumSqDiff / count;
  }
  const stdDevNetWt = Number(Math.sqrt(variance).toFixed(2));

  return {
    totalGrossWt: roundedGrossWt,
    totalTareWt: Number(totalTareWt.toFixed(2)),
    totalNetWt: roundedNetWt,
    totalNetWtLbs: Number((roundedNetWt * 2.20462).toFixed(2)),
    totalNetWtGm: Number((roundedNetWt * 1000).toFixed(0)),
    totalMtr: Number(totalMtr.toFixed(1)),
    totalGry: Number(totalGry.toFixed(2)),
    totalYds: Number(totalYds.toFixed(1)),
    totalCtn: count,
    activeNetCartonCount: validNetCount,
    avgNetWtPerCtn: count > 0 ? Number(avgNetWt.toFixed(2)) : 0,
    avgMtrPerCtn: count > 0 ? Number((totalMtr / count).toFixed(1)) : 0,
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
