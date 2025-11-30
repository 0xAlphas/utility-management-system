import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

// Helper function to calculate bill amount based on tariffs (slab-based pricing)
async function calculateBillAmount(
  utilityTypeId: string,
  consumption: number
): Promise<{ totalAmount: number; fixedCharge: number }> {
  const tariffs = await prisma.tariff.findMany({
    where: {
      utilityTypeId,
      isActive: true,
    },
    orderBy: {
      minUsage: 'asc',
    },
  });

  let totalAmount = 0;
  let remainingConsumption = consumption;
  let fixedCharge = 0;

  for (const tariff of tariffs) {
    // Add fixed charge from first applicable tariff only
    if (fixedCharge === 0) {
      fixedCharge = tariff.fixedCharge;
    }

    const slabMin = tariff.minUsage;
    const slabMax = tariff.maxUsage || Infinity;
    const slabSize = slabMax - slabMin;

    if (remainingConsumption > 0 && consumption > slabMin) {
      const unitsInThisSlab = Math.min(remainingConsumption, slabSize);
      totalAmount += unitsInThisSlab * tariff.rate;
      remainingConsumption -= unitsInThisSlab;
    }

    if (remainingConsumption <= 0) break;
  }

  return { totalAmount: totalAmount + fixedCharge, fixedCharge };
}

// Helper function to generate bill number
function generateBillNumber(year: number, month: number, index: number): string {
  const yearStr = year.toString().slice(-2);
  const monthStr = month.toString().padStart(2, '0');
  const indexStr = (index + 1).toString().padStart(5, '0');
  return `BILL${yearStr}${monthStr}${indexStr}`;
}

async function main() {
  console.log('🌱 Starting 12-month bills generation...');

  // Clear existing bills and payments
  console.log('🗑️  Clearing existing bills and payments...');
  await prisma.payment.deleteMany();
  await prisma.bill.deleteMany();

  // Get all customers with their meters
  const customers = await prisma.customer.findMany({
    where: {
      isActive: true,
    },
    include: {
      meters: {
        where: {
          status: 'ACTIVE',
        },
        include: {
          utilityType: true,
          readings: {
            orderBy: {
              readingDate: 'asc',
            },
          },
        },
      },
    },
  });

  console.log(`📊 Found ${customers.length} customers`);

  const now = new Date();
  let totalBills = 0;
  let totalPayments = 0;

  // Generate bills for the past 12 months
  for (let monthOffset = 12; monthOffset >= 1; monthOffset--) {
    const billingDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const billingMonth = billingDate.getMonth() + 1;
    const billingYear = billingDate.getFullYear();

    console.log(`\n📅 Generating bills for ${billingYear}-${billingMonth.toString().padStart(2, '0')}...`);

    let monthBillCount = 0;

    for (const customer of customers) {
      // Combine all meters for this customer into a single bill
      let totalConsumption = 0;
      let totalBillAmount = 0;
      let allPreviousReading = 0;
      let allCurrentReading = 0;
      const meterDetails: string[] = [];

      for (const meter of customer.meters) {
        // Get readings for this month and previous month
        const currentMonthReadings = meter.readings.filter((r: any) => {
          const readingDate = new Date(r.readingDate);
          return readingDate.getMonth() === billingDate.getMonth() &&
                 readingDate.getFullYear() === billingDate.getFullYear();
        });

        const previousMonthDate = new Date(billingDate.getFullYear(), billingDate.getMonth() - 1, 1);
        const previousMonthReadings = meter.readings.filter((r: any) => {
          const readingDate = new Date(r.readingDate);
          return readingDate.getMonth() === previousMonthDate.getMonth() &&
                 readingDate.getFullYear() === previousMonthDate.getFullYear();
        });

        if (currentMonthReadings.length === 0 || previousMonthReadings.length === 0) {
          continue;
        }

        const currentReading = currentMonthReadings[0].readingValue;
        const previousReading = previousMonthReadings[0].readingValue;
        const consumption = currentReading - previousReading;

        if (consumption <= 0) {
          continue;
        }

        allPreviousReading += previousReading;
        allCurrentReading += currentReading;
        totalConsumption += consumption;

        // Calculate bill amount for this meter
        const { totalAmount } = await calculateBillAmount(
          meter.utilityTypeId,
          consumption
        );

        totalBillAmount += totalAmount;
        meterDetails.push(`${meter.utilityType.name} (${meter.meterNumber}): ${consumption.toFixed(2)} ${meter.utilityType.unit}`);
      }

      // Skip if no consumption data
      if (totalConsumption <= 0) {
        continue;
      }

      // Determine bill status and payment (80% paid, 15% partially paid, 5% unpaid)
      const random = Math.random();
      let status = 'UNPAID';
      let paidAmount = 0;
      let outstandingAmount = totalBillAmount;

      if (monthOffset > 1) { // Don't auto-pay current month
        if (random < 0.80) {
          // 80% fully paid
          status = 'PAID';
          paidAmount = totalBillAmount;
          outstandingAmount = 0;
        } else if (random < 0.95) {
          // 15% partially paid
          status = 'PARTIALLY_PAID';
          paidAmount = totalBillAmount * (0.3 + Math.random() * 0.6); // 30-90% paid
          outstandingAmount = totalBillAmount - paidAmount;
        }
        // 5% remain unpaid
      }

      // Create the bill
      const issueDate = new Date(billingYear, billingMonth - 1, 15);
      const dueDate = new Date(billingYear, billingMonth - 1, 28);

      const bill = await prisma.bill.create({
        data: {
          billNumber: generateBillNumber(billingYear, billingMonth, monthBillCount),
          customerId: customer.id,
          billingMonth,
          billingYear,
          issueDate,
          dueDate,
          previousReading: allPreviousReading,
          currentReading: allCurrentReading,
          consumption: totalConsumption,
          totalAmount: Math.round(totalBillAmount * 100) / 100,
          paidAmount: Math.round(paidAmount * 100) / 100,
          outstandingAmount: Math.round(outstandingAmount * 100) / 100,
          status,
          remarks: meterDetails.join(' | '),
        },
      });

      totalBills++;
      monthBillCount++;

      // Create payment records if bill is paid or partially paid
      if (paidAmount > 0) {
        const paymentMethods = ['CASH', 'ONLINE', 'BANK_TRANSFER', 'CHECK'];
        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

        // Payment date is between issue date and due date
        const paymentDate = new Date(
          issueDate.getTime() + Math.random() * (dueDate.getTime() - issueDate.getTime())
        );

        await prisma.payment.create({
          data: {
            billId: bill.id,
            amount: Math.round(paidAmount * 100) / 100,
            paymentMethod,
            paymentDate,
            referenceNumber: `PAY-${billingYear}${billingMonth.toString().padStart(2, '0')}-${(totalPayments + 1).toString().padStart(6, '0')}`,
            recordedBy: 'system',
          },
        });

        totalPayments++;
      }
    }

    console.log(`  ✅ Created ${monthBillCount} bills for ${billingYear}-${billingMonth.toString().padStart(2, '0')}`);
  }

  // Update bill statuses for overdue bills
  const overdueDate = new Date();
  overdueDate.setDate(overdueDate.getDate() - 30);

  await prisma.bill.updateMany({
    where: {
      status: 'UNPAID',
      dueDate: {
        lt: overdueDate,
      },
    },
    data: {
      status: 'OVERDUE',
    },
  });

  console.log('\n🎉 12-month bills generation completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   - Total bills created: ${totalBills}`);
  console.log(`   - Total payments created: ${totalPayments}`);
  console.log(`   - Bill period: 12 months`);
  console.log(`   - Payment distribution: ~80% paid, ~15% partially paid, ~5% unpaid`);
  console.log('\n💰 Bill Status Distribution:');

  const statusCounts = await prisma.bill.groupBy({
    by: ['status'],
    _count: true,
  });

  for (const stat of statusCounts) {
    console.log(`   - ${stat.status}: ${stat._count}`);
  }

  const totalRevenue = await prisma.bill.aggregate({
    _sum: {
      totalAmount: true,
      paidAmount: true,
      outstandingAmount: true,
    },
  });

  console.log('\n💵 Revenue Summary:');
  console.log(`   - Total billed: $${totalRevenue._sum.totalAmount?.toFixed(2) || 0}`);
  console.log(`   - Total collected: $${totalRevenue._sum.paidAmount?.toFixed(2) || 0}`);
  console.log(`   - Total outstanding: $${totalRevenue._sum.outstandingAmount?.toFixed(2) || 0}`);
}

main()
  .catch((e) => {
    console.error('❌ Error generating bills:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
