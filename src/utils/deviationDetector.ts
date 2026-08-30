import { CartonRow, PackingSheetData } from '../types/calculator';
import { ElasticDemand } from '../types/elasticDemand';

export type DeviationSeverity = 'critical' | 'warning' | 'info';

export type DeviationType = 
  | 'unit_weight' 
  | 'tare_weight' 
  | 'negative_net' 
  | 'overpack' 
  | 'underpack' 
  | 'weight_anomaly'
  | 'excess_length';

export interface CartonDeviation {
  cartonId: string;
  cartonNo: number;
  severity: DeviationSeverity;
  type: DeviationType;
  title: string;
  message: string;
  expectedValue: string;
  actualValue: string;
  percentDiff?: number;
  recommendedFix?: {
    field: 'wtPerUnit' | 'tareWt' | 'grossWt';
    value: number;
    label: string;
  };
}

export interface DemandComplianceReport {
  matchedDemand: ElasticDemand | null;
  totalCartonsChecked: number;
  compliantCount: number;
  warningCount: number;
  criticalCount: number;
  deviationsByCartonId: Record<string, CartonDeviation[]>;
  allDeviations: CartonDeviation[];
  overallStatus: 'perfect' | 'has_warnings' | 'has_critical' | 'no_demand';
  totalPackedMtr: number;
  requiredMtr: number;
  fulfillmentPercent: number;
  overpackMeters: number;
  meanCartonNetWt: number;
  expectedCartonNetWtRange: { min: number; max: number };
}

/**
 * Finds the most relevant Elastic Demand for the current packing sheet
 */
export function findMatchingDemand(
  sheetData: PackingSheetData,
  demands: ElasticDemand[],
  selectedDemandId?: string | null
): ElasticDemand | null {
  if (selectedDemandId) {
    const explicit = demands.find(d => d.id === selectedDemandId);
    if (explicit) return explicit;
  }

  if (!demands || demands.length === 0) return null;

  // 1. Match by exact or normalized REF
  if (sheetData.ref && sheetData.ref.trim()) {
    const refClean = sheetData.ref.trim().toLowerCase();
    const byRef = demands.find(d => d.ref && d.ref.trim().toLowerCase() === refClean);
    if (byRef) return byRef;
  }

  // 2. Match by Buyer + Size
  if (sheetData.buyer && sheetData.size) {
    const buyerClean = sheetData.buyer.trim().toLowerCase();
    const sizeClean = sheetData.size.trim().toLowerCase();
    const byBuyerAndSize = demands.find(d => 
      d.buyer.trim().toLowerCase() === buyerClean && 
      d.size.trim().toLowerCase() === sizeClean
    );
    if (byBuyerAndSize) return byBuyerAndSize;
  }

  // 3. Match by Buyer only
  if (sheetData.buyer && sheetData.buyer.trim()) {
    const buyerClean = sheetData.buyer.trim().toLowerCase();
    const byBuyer = demands.find(d => d.buyer.trim().toLowerCase() === buyerClean);
    if (byBuyer) return byBuyer;
  }

  return null;
}

/**
 * Analyzes carton data against demand requirements and returns a comprehensive compliance report
 */
export function analyzeCartonDeviations(
  sheetData: PackingSheetData,
  demand: ElasticDemand | null,
  options: {
    unitWeightTolerancePercent?: number; // e.g. 5%
    tareTolerancePercent?: number; // e.g. 20%
    minExpectedNetWt?: number; // e.g. 2.0 kg
    maxExpectedNetWt?: number; // e.g. 45.0 kg
  } = {}
): DemandComplianceReport {
  const unitWtTol = options.unitWeightTolerancePercent ?? 5; // default 5%
  const tareTol = options.tareTolerancePercent ?? 20; // default 20%
  const minNetWt = options.minExpectedNetWt ?? 1.5;
  const maxNetWt = options.maxExpectedNetWt ?? 45.0;

  const validCartons = sheetData.cartons.filter(c => c.grossWt > 0 || c.netWt !== 0);
  const deviationsByCartonId: Record<string, CartonDeviation[]> = {};
  const allDeviations: CartonDeviation[] = [];

  let criticalCount = 0;
  let warningCount = 0;
  let compliantCount = 0;

  // Calculate batch averages for anomaly detection
  const netWeights = validCartons.map(c => c.netWt).filter(w => w > 0);
  const meanCartonNetWt = netWeights.length > 0
    ? netWeights.reduce((a, b) => a + b, 0) / netWeights.length
    : 0;

  // Calculate cumulative meters
  const totalPackedMtr = sheetData.cartons.reduce((sum, c) => sum + (c.lengthMtr > 0 ? c.lengthMtr : 0), 0);
  const requiredMtr = demand ? demand.requiredQtyMtr : 0;
  const fulfillmentPercent = requiredMtr > 0 ? (totalPackedMtr / requiredMtr) * 100 : 0;
  const overpackMeters = requiredMtr > 0 && totalPackedMtr > requiredMtr ? totalPackedMtr - requiredMtr : 0;

  sheetData.cartons.forEach((carton) => {
    const cartonDevs: CartonDeviation[] = [];

    // 1. Rule: Negative Net Weight Check (Always Critical)
    if ((carton.grossWt > 0 && carton.netWt < 0) || carton.netWt < 0) {
      cartonDevs.push({
        cartonId: carton.id,
        cartonNo: carton.cartonNo,
        severity: 'critical',
        type: 'negative_net',
        title: 'Negative Net Weight Error',
        message: `Gross weight (${carton.grossWt.toFixed(2)} Kg) is lower than tare weight (${carton.tareWt.toFixed(2)} Kg).`,
        expectedValue: `Gross > ${carton.tareWt.toFixed(2)} Kg`,
        actualValue: `${carton.grossWt.toFixed(2)} Kg`,
        recommendedFix: {
          field: 'grossWt',
          value: Number((carton.tareWt + (demand?.defaultTare ? 10 : 5)).toFixed(2)),
          label: 'Fix Gross Wt',
        },
      });
    }

    // If demand exists, perform demand-specific requirement validations
    if (demand && carton.grossWt > 0) {
      const targetUnitWt = demand.unitWeightGm;
      const targetTare = demand.defaultTare || sheetData.defaultTare || 0.5;

      // 2. Rule: Unit Weight Spec Mismatch
      if (targetUnitWt > 0 && carton.wtPerUnit > 0) {
        const diffGm = carton.wtPerUnit - targetUnitWt;
        const diffPercent = (diffGm / targetUnitWt) * 100;
        const absDiffPercent = Math.abs(diffPercent);

        if (absDiffPercent > unitWtTol) {
          const isCritical = absDiffPercent > 12; // >12% is critical, 5-12% is warning
          cartonDevs.push({
            cartonId: carton.id,
            cartonNo: carton.cartonNo,
            severity: isCritical ? 'critical' : 'warning',
            type: 'unit_weight',
            title: `Unit Weight Mismatch (${diffPercent > 0 ? '+' : ''}${diffPercent.toFixed(1)}%)`,
            message: `Carton unit weight (${carton.wtPerUnit.toFixed(2)} gm/m) deviates from ${demand.buyer}'s required specification (${targetUnitWt.toFixed(2)} gm/m).`,
            expectedValue: `${targetUnitWt.toFixed(2)} gm/m`,
            actualValue: `${carton.wtPerUnit.toFixed(2)} gm/m`,
            percentDiff: diffPercent,
            recommendedFix: {
              field: 'wtPerUnit',
              value: targetUnitWt,
              label: `Set to ${targetUnitWt} gm/m`,
            },
          });
        }
      }

      // 3. Rule: Tare Weight Deviation
      if (targetTare > 0 && carton.tareWt >= 0) {
        const tareDiff = Math.abs(carton.tareWt - targetTare);
        const tareDiffPercent = (tareDiff / targetTare) * 100;

        if (tareDiffPercent > tareTol) {
          cartonDevs.push({
            cartonId: carton.id,
            cartonNo: carton.cartonNo,
            severity: 'warning',
            type: 'tare_weight',
            title: `Tare Weight Variance (${carton.tareWt.toFixed(2)} vs ${targetTare.toFixed(2)} Kg)`,
            message: `Box tare differs from standard ${demand.buyer} box weight (${targetTare.toFixed(2)} Kg).`,
            expectedValue: `${targetTare.toFixed(2)} Kg`,
            actualValue: `${carton.tareWt.toFixed(2)} Kg`,
            percentDiff: (carton.tareWt - targetTare) / targetTare * 100,
            recommendedFix: {
              field: 'tareWt',
              value: targetTare,
              label: `Set Tare to ${targetTare} Kg`,
            },
          });
        }
      }

      // 4. Rule: Underpacked / Partial Carton Warning
      if (carton.netWt > 0 && carton.netWt < minNetWt) {
        cartonDevs.push({
          cartonId: carton.id,
          cartonNo: carton.cartonNo,
          severity: 'warning',
          type: 'underpack',
          title: `Underpacked Carton (${carton.netWt.toFixed(2)} Kg)`,
          message: `Carton net weight is unusually low (< ${minNetWt} Kg). May indicate a half-filled carton or entry typo.`,
          expectedValue: `≥ ${minNetWt} Kg`,
          actualValue: `${carton.netWt.toFixed(2)} Kg`,
        });
      }

      // 5. Rule: Overpacked / Exceeding Box Capacity
      if (carton.netWt > maxNetWt) {
        cartonDevs.push({
          cartonId: carton.id,
          cartonNo: carton.cartonNo,
          severity: 'warning',
          type: 'overpack',
          title: `Overpacked Carton (${carton.netWt.toFixed(2)} Kg)`,
          message: `Net weight exceeds standard carton safety threshold (${maxNetWt} Kg). Please verify carton gross weight.`,
          expectedValue: `≤ ${maxNetWt} Kg`,
          actualValue: `${carton.netWt.toFixed(2)} Kg`,
        });
      }

      // 6. Rule: Batch Outlier Anomaly (if at least 4 cartons exist and net weight deviates > 40% from batch average)
      if (netWeights.length >= 4 && meanCartonNetWt > 5 && carton.netWt > 0) {
        const devFromMean = Math.abs(carton.netWt - meanCartonNetWt);
        const devFromMeanPercent = (devFromMean / meanCartonNetWt) * 100;
        if (devFromMeanPercent > 45) {
          cartonDevs.push({
            cartonId: carton.id,
            cartonNo: carton.cartonNo,
            severity: 'info',
            type: 'weight_anomaly',
            title: `Batch Weight Variance (Avg: ${meanCartonNetWt.toFixed(1)} Kg)`,
            message: `This carton's net weight (${carton.netWt.toFixed(2)} Kg) deviates significantly (${devFromMeanPercent.toFixed(0)}%) from the batch average.`,
            expectedValue: `~${meanCartonNetWt.toFixed(1)} Kg`,
            actualValue: `${carton.netWt.toFixed(2)} Kg`,
            percentDiff: (carton.netWt - meanCartonNetWt) / meanCartonNetWt * 100,
          });
        }
      }

      // 7. Rule: Single Carton Meter Exceeds Total Demand
      if (requiredMtr > 0 && carton.lengthMtr > requiredMtr * 1.05) {
        cartonDevs.push({
          cartonId: carton.id,
          cartonNo: carton.cartonNo,
          severity: 'critical',
          type: 'excess_length',
          title: `Single Carton Exceeds Full Demand (${carton.lengthMtr.toFixed(0)}m vs ${requiredMtr}m)`,
          message: `Carton #${carton.cartonNo} contains more meters than the entire required demand for this buyer order.`,
          expectedValue: `≤ ${requiredMtr} Mtr`,
          actualValue: `${carton.lengthMtr.toFixed(2)} Mtr`,
        });
      }
    }

    if (cartonDevs.length > 0) {
      deviationsByCartonId[carton.id] = cartonDevs;
      allDeviations.push(...cartonDevs);

      const hasCrit = cartonDevs.some(d => d.severity === 'critical');
      const hasWarn = cartonDevs.some(d => d.severity === 'warning');

      if (hasCrit) {
        criticalCount++;
      } else if (hasWarn) {
        warningCount++;
      }
    } else if (carton.grossWt > 0) {
      compliantCount++;
    }
  });

  let overallStatus: DemandComplianceReport['overallStatus'] = 'perfect';
  if (!demand) {
    overallStatus = criticalCount > 0 ? 'has_critical' : 'no_demand';
  } else if (criticalCount > 0) {
    overallStatus = 'has_critical';
  } else if (warningCount > 0) {
    overallStatus = 'has_warnings';
  }

  return {
    matchedDemand: demand,
    totalCartonsChecked: sheetData.cartons.length,
    compliantCount,
    warningCount,
    criticalCount,
    deviationsByCartonId,
    allDeviations,
    overallStatus,
    totalPackedMtr,
    requiredMtr,
    fulfillmentPercent,
    overpackMeters,
    meanCartonNetWt,
    expectedCartonNetWtRange: {
      min: minNetWt,
      max: maxNetWt,
    },
  };
}
