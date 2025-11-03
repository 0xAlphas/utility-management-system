import prisma from './prisma';

export interface TariffSlab {
  id: string;
  name: string;
  minUsage: number;
  maxUsage: number | null;
  rate: number;
  fixedCharge: number;
}

export interface BillCalculation {
  consumption: number;
  totalAmount: number;
  breakdown: {
    slabName: string;
    units: number;
    rate: number;
    amount: number;
  }[];
  fixedCharges: number;
}

/**
 * Calculate bill amount based on consumption and tariff slabs
 * Supports slab-based billing (e.g., first 100 units at rate1, next 100 at rate2, etc.)
 */
export async function calculateBillAmount(
  utilityTypeId: string,
  consumption: number
): Promise<BillCalculation> {
  // Get active tariffs for the utility type, ordered by minUsage
  const tariffs = await prisma.tariff.findMany({
    where: {
      utilityTypeId,
      isActive: true,
      effectiveFrom: { lte: new Date() },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: new Date() } },
      ],
    },
    orderBy: { minUsage: 'asc' },
  });

  if (tariffs.length === 0) {
    throw new Error('No active tariffs found for this utility type');
  }

  let remainingConsumption = consumption;
  let totalAmount = 0;
  const breakdown: BillCalculation['breakdown'] = [];
  let totalFixedCharges = 0;

  for (const tariff of tariffs) {
    if (remainingConsumption <= 0) break;

    const slabStart = tariff.minUsage;
    const slabEnd = tariff.maxUsage || Infinity;
    const slabSize = slabEnd - slabStart;

    // Calculate how many units fall in this slab
    let unitsInSlab = 0;
    if (consumption > slabStart) {
      const unitsAboveMin = consumption - slabStart;
      unitsInSlab = Math.min(unitsAboveMin, slabSize);
      unitsInSlab = Math.min(unitsInSlab, remainingConsumption);
    }

    if (unitsInSlab > 0) {
      const slabAmount = unitsInSlab * tariff.rate;
      totalAmount += slabAmount;
      remainingConsumption -= unitsInSlab;

      breakdown.push({
        slabName: tariff.name,
        units: unitsInSlab,
        rate: tariff.rate,
        amount: slabAmount,
      });
    }

    // Add fixed charge (usually only once, from the first applicable tariff)
    if (tariff.fixedCharge > 0 && totalFixedCharges === 0) {
      totalFixedCharges += tariff.fixedCharge;
    }
  }

  totalAmount += totalFixedCharges;

  return {
    consumption,
    totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
    breakdown,
    fixedCharges: totalFixedCharges,
  };
}

/**
 * Generate a unique bill number
 */
export function generateBillNumber(
  year: number,
  month: number,
  customerSequence: number
): string {
  const yearStr = year.toString().substring(2); // Last 2 digits of year
  const monthStr = month.toString().padStart(2, '0');
  const seqStr = customerSequence.toString().padStart(6, '0');
  return `BILL${yearStr}${monthStr}${seqStr}`;
}

/**
 * Get the latest reading for a meter before a specific date
 */
export async function getLatestReading(meterId: string, beforeDate?: Date) {
  const where: any = { meterId };
  if (beforeDate) {
    where.readingDate = { lte: beforeDate };
  }

  const reading = await prisma.meterReading.findFirst({
    where,
    orderBy: { readingDate: 'desc' },
  });

  return reading;
}

/**
 * Calculate consumption between two readings
 */
export function calculateConsumption(
  currentReading: number,
  previousReading: number
): number {
  return Math.max(0, currentReading - previousReading);
}
