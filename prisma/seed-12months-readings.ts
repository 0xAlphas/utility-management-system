import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting 12-month meter readings seed...');

  // Get all active meters
  const meters = await prisma.meter.findMany({
    where: {
      status: 'ACTIVE',
    },
    include: {
      utilityType: true,
      customer: true,
    },
  });

  if (meters.length === 0) {
    console.log('⚠️  No meters found. Please run the main seed first.');
    return;
  }

  console.log(`📊 Found ${meters.length} meters`);

  // Get existing meter reader
  const meterReader = await prisma.staff.findFirst({
    where: { role: 'METER_READER' },
  });

  const recordedBy = meterReader?.username || 'system';

  // Clear existing meter readings
  console.log('🗑️  Clearing existing meter readings...');
  await prisma.meterReading.deleteMany();

  console.log('📈 Creating 12 months of meter readings...');

  const now = new Date();
  const readingsCreated: number[] = [];

  for (const meter of meters) {
    // Determine base reading and monthly increment based on utility type and customer type
    let baseReading = 0;
    let monthlyIncrement = 0;
    let variability = 0;

    if (meter.utilityType.name === 'Electricity') {
      if (meter.customer.type === 'HOUSEHOLD') {
        baseReading = 1000;
        monthlyIncrement = 250; // Average 250 kWh per month
        variability = 50; // ±50 kWh variation
      } else if (meter.customer.type === 'BUSINESS') {
        baseReading = 5000;
        monthlyIncrement = 800; // Average 800 kWh per month
        variability = 200; // ±200 kWh variation
      } else {
        baseReading = 10000;
        monthlyIncrement = 1500; // Average 1500 kWh per month
        variability = 300; // ±300 kWh variation
      }
    } else if (meter.utilityType.name === 'Water') {
      if (meter.customer.type === 'HOUSEHOLD') {
        baseReading = 500;
        monthlyIncrement = 35; // Average 35 m³ per month
        variability = 10; // ±10 m³ variation
      } else if (meter.customer.type === 'BUSINESS') {
        baseReading = 2000;
        monthlyIncrement = 150; // Average 150 m³ per month
        variability = 40; // ±40 m³ variation
      } else {
        baseReading = 5000;
        monthlyIncrement = 300; // Average 300 m³ per month
        variability = 80; // ±80 m³ variation
      }
    } else if (meter.utilityType.name === 'Gas') {
      if (meter.customer.type === 'HOUSEHOLD') {
        baseReading = 200;
        monthlyIncrement = 25; // Average 25 m³ per month
        variability = 8; // ±8 m³ variation
      } else if (meter.customer.type === 'BUSINESS') {
        baseReading = 1000;
        monthlyIncrement = 100; // Average 100 m³ per month
        variability = 25; // ±25 m³ variation
      } else {
        baseReading = 3000;
        monthlyIncrement = 250; // Average 250 m³ per month
        variability = 60; // ±60 m³ variation
      }
    }

    const readings = [];
    let cumulativeReading = baseReading;

    // Create readings for the past 12 months
    for (let i = 12; i >= 0; i--) {
      const readingDate = new Date(now.getFullYear(), now.getMonth() - i, 1);

      // Add some seasonal variation (higher in summer for electricity AC, higher in winter for gas heating)
      const month = readingDate.getMonth();
      let seasonalMultiplier = 1.0;

      if (meter.utilityType.name === 'Electricity') {
        // Higher in summer (June-August) for AC
        if (month >= 5 && month <= 7) {
          seasonalMultiplier = 1.3;
        } else if (month === 4 || month === 8) {
          seasonalMultiplier = 1.15;
        }
      } else if (meter.utilityType.name === 'Gas') {
        // Higher in winter (December-February) for heating
        if (month === 11 || month === 0 || month === 1) {
          seasonalMultiplier = 1.4;
        } else if (month === 10 || month === 2) {
          seasonalMultiplier = 1.2;
        } else if (month >= 5 && month <= 7) {
          seasonalMultiplier = 0.6; // Much lower in summer
        }
      } else if (meter.utilityType.name === 'Water') {
        // Slightly higher in summer for lawn/garden
        if (month >= 5 && month <= 8) {
          seasonalMultiplier = 1.15;
        }
      }

      // Calculate consumption with seasonal variation and randomness
      const randomVariation = (Math.random() - 0.5) * 2 * variability;
      const consumption = Math.round(monthlyIncrement * seasonalMultiplier + randomVariation);
      cumulativeReading += consumption;

      readings.push({
        meterId: meter.id,
        readingValue: Math.round(cumulativeReading),
        readingDate: readingDate,
        recordedBy: recordedBy,
        remarks: i === 0 ? 'Current reading' : null,
      });
    }

    await prisma.meterReading.createMany({
      data: readings,
    });

    readingsCreated.push(readings.length);
    console.log(`  ✅ Created ${readings.length} readings for meter ${meter.meterNumber} (${meter.utilityType.name})`);
  }

  // Update lastReadingDate for all meters
  const latestDate = new Date();
  for (const meter of meters) {
    await prisma.meter.update({
      where: { id: meter.id },
      data: { lastReadingDate: latestDate },
    });
  }

  console.log('\n🎉 12-month readings seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   - Total meters: ${meters.length}`);
  console.log(`   - Total readings created: ${readingsCreated.reduce((a, b) => a + b, 0)}`);
  console.log(`   - Readings per meter: 13 (12 months + current)`);
  console.log(`   - Date range: ${new Date(now.getFullYear(), now.getMonth() - 12, 1).toLocaleDateString()} to ${now.toLocaleDateString()}`);
  console.log('\n📊 Features:');
  console.log('   - Realistic consumption patterns based on customer type');
  console.log('   - Seasonal variations (AC in summer, heating in winter)');
  console.log('   - Random monthly variations for realistic data');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding 12-month readings:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
