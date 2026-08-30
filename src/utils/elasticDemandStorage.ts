import { ElasticDemand, DemandSummaryStats, SAMPLE_INITIAL_DEMANDS } from '../types/elasticDemand';
import { PackingSheetData } from '../types/calculator';

const STORAGE_KEY = 'garment_elastic_demands_v1';

export function loadDemands(): ElasticDemand[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Save and return initial sample demands
      saveDemands(SAMPLE_INITIAL_DEMANDS);
      return SAMPLE_INITIAL_DEMANDS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return SAMPLE_INITIAL_DEMANDS;
  } catch (err) {
    console.error('Failed to load elastic demands from storage', err);
    return SAMPLE_INITIAL_DEMANDS;
  }
}

export function saveDemands(demands: ElasticDemand[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demands));
  } catch (err) {
    console.error('Failed to save elastic demands to storage', err);
  }
}

export function calculateDemandStats(demands: ElasticDemand[]): DemandSummaryStats {
  let pendingCount = 0;
  let inProductionCount = 0;
  let packedCount = 0;
  let completedCount = 0;
  let urgentCount = 0;
  let totalRequiredMeters = 0;
  let totalPackedMeters = 0;
  let totalEstimatedKg = 0;

  demands.forEach(d => {
    if (d.status === 'pending') pendingCount++;
    if (d.status === 'in_production') inProductionCount++;
    if (d.status === 'packed') packedCount++;
    if (d.status === 'completed') completedCount++;
    if (d.priority === 'urgent' && d.status !== 'completed' && d.status !== 'cancelled') urgentCount++;

    if (d.status !== 'cancelled') {
      totalRequiredMeters += Number(d.requiredQtyMtr) || 0;
      totalPackedMeters += Number(d.packedQtyMtr) || 0;
      totalEstimatedKg += Number(d.requiredQtyKg) || 0;
    }
  });

  const fulfillmentPercentage = totalRequiredMeters > 0 
    ? Math.min(100, Math.round((totalPackedMeters / totalRequiredMeters) * 100)) 
    : 0;

  return {
    totalDemandsCount: demands.length,
    pendingCount,
    inProductionCount,
    packedCount,
    completedCount,
    urgentCount,
    totalRequiredMeters,
    totalPackedMeters,
    fulfillmentPercentage,
    totalEstimatedKg,
  };
}

export function computeEstimatedKgAndGry(
  meters: number,
  unitWeightGm: number
): { gry: number; kg: number } {
  const mtr = Number(meters) || 0;
  const wt = Number(unitWeightGm) || 8.0;

  // Formula: Mtr = (NetKg * 1000) / wtPerUnit => NetKg = (Mtr * wtPerUnit) / 1000
  const kg = Number(((mtr * wt) / 1000).toFixed(2));

  // Formula: Gry = (Mtr / 0.9144) / 144
  const gry = Number(((mtr / 0.9144) / 144).toFixed(2));

  return { gry, kg };
}

export function syncDemandWithCurrentSheet(
  demand: ElasticDemand,
  sheetData: PackingSheetData
): ElasticDemand {
  // If the sheet matches this demand's REF or Buyer & Size
  const isMatchingRef = sheetData.ref && demand.ref && 
    sheetData.ref.trim().toLowerCase() === demand.ref.trim().toLowerCase();

  if (!isMatchingRef) {
    return demand;
  }

  // Calculate current sheet packed meters & cartons
  const packedMetersInSheet = sheetData.cartons.reduce((sum, c) => sum + (c.lengthMtr || 0), 0);
  const packedCartonsInSheet = sheetData.cartons.filter(c => c.lengthMtr > 0 || c.netWt > 0).length;

  let newStatus = demand.status;
  if (packedMetersInSheet >= demand.requiredQtyMtr && demand.requiredQtyMtr > 0) {
    newStatus = 'packed';
  } else if (packedMetersInSheet > 0) {
    newStatus = 'in_production';
  }

  return {
    ...demand,
    packedQtyMtr: Math.round(packedMetersInSheet),
    packedCartonsCount: packedCartonsInSheet,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
}

export function exportDemandsToCsv(demands: ElasticDemand[]): string {
  const headers = [
    'Demand Date',
    'Target Delivery Date',
    'Buyer',
    'Customer',
    'Ref / Style',
    'Size',
    'Color',
    'Required (Mtr)',
    'Packed (Mtr)',
    'Fulfillment (%)',
    'Est. Net Wt (Kg)',
    'Est. Gross Yards (Gry)',
    'Unit Wt (gm/m)',
    'Priority',
    'Status',
    'PO Number',
    'Notes'
  ];

  const rows = demands.map(d => {
    const progress = d.requiredQtyMtr > 0 ? Math.round((d.packedQtyMtr / d.requiredQtyMtr) * 100) : 0;
    return [
      `"${d.demandDate || ''}"`,
      `"${d.deliveryDate || ''}"`,
      `"${d.buyer || ''}"`,
      `"${d.customer || ''}"`,
      `"${d.ref || ''}"`,
      `"${d.size || ''}"`,
      `"${d.color || ''}"`,
      d.requiredQtyMtr,
      d.packedQtyMtr || 0,
      `${progress}%`,
      d.requiredQtyKg || 0,
      d.requiredQtyGry || 0,
      d.unitWeightGm || 8.0,
      `"${d.priority}"`,
      `"${d.status}"`,
      `"${d.poNumber || ''}"`,
      `"${(d.notes || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
