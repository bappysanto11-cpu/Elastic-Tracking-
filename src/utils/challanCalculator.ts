import { ChallanDetail, TruckDispatch } from '../types/schedule';

// ==========================================
// CALCULATE TRUCKS NEEDED
// ==========================================
export function calculateTrucksNeeded(
  totalCartons: number,
  truckCapacity: number = 120
): {
  trucksNeeded: number;
  distribution: number[];
} {
  const trucksNeeded = Math.ceil(totalCartons / truckCapacity);
  const distribution: number[] = [];

  let remaining = totalCartons;
  for (let i = 0; i < trucksNeeded; i++) {
    const cartons = Math.min(truckCapacity, remaining);
    distribution.push(cartons);
    remaining -= cartons;
  }

  return { trucksNeeded, distribution };
}

// ==========================================
// GENERATE CHALLAN NUMBER
// ==========================================
export function generateChallanNo(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');

  return `CHL-${year}${month}${day}-${random}`;
}

// ==========================================
// CREATE TRUCK DISPATCH LIST
// ==========================================
export function createTruckDispatchList(
  challanId: string,
  cartonDistribution: number[],
  weightPerCarton: number = 2
): Partial<TruckDispatch>[] {
  return cartonDistribution.map((cartons, index) => ({
    challanId,
    truckNo: index + 1,
    cartons,
    weight: cartons * weightPerCarton,
    status: 'waiting' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

// ==========================================
// FORMAT CHALLAN FOR DISPLAY
// ==========================================
export function formatChallanForDisplay(challan: ChallanDetail): string {
  const trucks = challan.truckDistribution
    .map(
      (cartons, i) =>
        `🚚 Truck #${i + 1}: ${cartons} Cartons (${cartons * challan.weightPerCarton} Kg)`
    )
    .join('\n');

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                   DELIVERY CHALLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Challan No: ${challan.challanNo}
Date: ${challan.date}
Reference: ${challan.customerRefPO}

BUYER DETAILS:
Buyer: ${challan.buyer}

ORDER DETAILS:
Total Cartons: ${challan.totalCartons}
Total Weight: ${challan.totalWeight} Kg
Reference: ${challan.customerRefPO}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TRUCK INFORMATION:

${trucks}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY:
Total Trucks: ${challan.truckRequired}
Total Cartons: ${challan.totalCartons}
Total Weight: ${challan.totalWeight} Kg

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}
