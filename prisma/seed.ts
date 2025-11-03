import { PrismaClient, StaffRole, CustomerType, MeterStatus, BillStatus, PaymentMethod } from '../src/generated/prisma';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data (optional - comment out if you want to preserve data)
  console.log('🗑️  Clearing existing data...');
  await prisma.payment.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.meterReading.deleteMany();
  await prisma.meter.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.tariff.deleteMany();
  await prisma.utilityType.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.staff.deleteMany();

  // Create Staff Users
  console.log('👤 Creating staff members...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.staff.create({
    data: {
      username: 'admin',
      passwordHash,
      name: 'System Administrator',
      email: 'admin@utilityms.com',
      role: StaffRole.ADMIN,
    },
  });

  const meterReader = await prisma.staff.create({
    data: {
      username: 'reader01',
      passwordHash,
      name: 'John Reader',
      email: 'reader@utilityms.com',
      role: StaffRole.METER_READER,
    },
  });

  const clerk = await prisma.staff.create({
    data: {
      username: 'clerk01',
      passwordHash,
      name: 'Sarah Clerk',
      email: 'clerk@utilityms.com',
      role: StaffRole.CLERK,
    },
  });

  const manager = await prisma.staff.create({
    data: {
      username: 'manager01',
      passwordHash,
      name: 'Michael Manager',
      email: 'manager@utilityms.com',
      role: StaffRole.MANAGER,
    },
  });

  console.log('✅ Created 4 staff members');

  // Create Utility Types
  console.log('⚡ Creating utility types...');
  const electricity = await prisma.utilityType.create({
    data: {
      name: 'Electricity',
      description: 'Electrical power supply',
      unit: 'kWh',
    },
  });

  const water = await prisma.utilityType.create({
    data: {
      name: 'Water',
      description: 'Municipal water supply',
      unit: 'm³',
    },
  });

  const gas = await prisma.utilityType.create({
    data: {
      name: 'Gas',
      description: 'Natural gas supply',
      unit: 'm³',
    },
  });

  console.log('✅ Created 3 utility types');

  // Create Tariffs
  console.log('💰 Creating tariffs...');

  // Electricity tariffs (slab-based)
  await prisma.tariff.createMany({
    data: [
      {
        name: 'Electricity - Slab 1',
        utilityTypeId: electricity.id,
        minUsage: 0,
        maxUsage: 100,
        rate: 0.15,
        fixedCharge: 5.0,
      },
      {
        name: 'Electricity - Slab 2',
        utilityTypeId: electricity.id,
        minUsage: 100,
        maxUsage: 300,
        rate: 0.20,
        fixedCharge: 0,
      },
      {
        name: 'Electricity - Slab 3',
        utilityTypeId: electricity.id,
        minUsage: 300,
        maxUsage: null,
        rate: 0.25,
        fixedCharge: 0,
      },
      // Water tariffs
      {
        name: 'Water - Residential',
        utilityTypeId: water.id,
        minUsage: 0,
        maxUsage: 50,
        rate: 0.50,
        fixedCharge: 3.0,
      },
      {
        name: 'Water - High Usage',
        utilityTypeId: water.id,
        minUsage: 50,
        maxUsage: null,
        rate: 0.75,
        fixedCharge: 0,
      },
      // Gas tariffs
      {
        name: 'Gas - Basic',
        utilityTypeId: gas.id,
        minUsage: 0,
        maxUsage: 30,
        rate: 1.20,
        fixedCharge: 8.0,
      },
      {
        name: 'Gas - High Usage',
        utilityTypeId: gas.id,
        minUsage: 30,
        maxUsage: null,
        rate: 1.50,
        fixedCharge: 0,
      },
    ],
  });

  console.log('✅ Created 7 tariffs');

  // Create Customers
  console.log('🏠 Creating customers...');

  const household1 = await prisma.customer.create({
    data: {
      name: 'John Smith',
      type: CustomerType.HOUSEHOLD,
      contact: '+1-555-0101',
      email: 'john.smith@email.com',
      address: '123 Main Street',
      city: 'Springfield',
      postalCode: '12345',
    },
  });

  const household2 = await prisma.customer.create({
    data: {
      name: 'Mary Johnson',
      type: CustomerType.HOUSEHOLD,
      contact: '+1-555-0102',
      email: 'mary.j@email.com',
      address: '456 Oak Avenue',
      city: 'Springfield',
      postalCode: '12346',
    },
  });

  const business1 = await prisma.customer.create({
    data: {
      name: 'ABC Manufacturing Ltd',
      type: CustomerType.BUSINESS,
      contact: '+1-555-0201',
      email: 'contact@abcmfg.com',
      address: '789 Industrial Park',
      city: 'Springfield',
      postalCode: '12347',
    },
  });

  const government1 = await prisma.customer.create({
    data: {
      name: 'City Hall',
      type: CustomerType.GOVERNMENT,
      contact: '+1-555-0301',
      email: 'utilities@cityhall.gov',
      address: '1 Government Plaza',
      city: 'Springfield',
      postalCode: '12348',
    },
  });

  console.log('✅ Created 4 customers');

  // Create Meters
  console.log('📊 Creating meters...');

  // Household 1 meters (all three utilities)
  const meter1 = await prisma.meter.create({
    data: {
      meterNumber: 'EL-001-2024',
      customerId: household1.id,
      utilityTypeId: electricity.id,
      installationDate: new Date('2024-01-15'),
      status: MeterStatus.ACTIVE,
    },
  });

  const meter2 = await prisma.meter.create({
    data: {
      meterNumber: 'WT-001-2024',
      customerId: household1.id,
      utilityTypeId: water.id,
      installationDate: new Date('2024-01-15'),
      status: MeterStatus.ACTIVE,
    },
  });

  const meter3 = await prisma.meter.create({
    data: {
      meterNumber: 'GS-001-2024',
      customerId: household1.id,
      utilityTypeId: gas.id,
      installationDate: new Date('2024-01-15'),
      status: MeterStatus.ACTIVE,
    },
  });

  // Household 2 meters
  const meter4 = await prisma.meter.create({
    data: {
      meterNumber: 'EL-002-2024',
      customerId: household2.id,
      utilityTypeId: electricity.id,
      installationDate: new Date('2024-02-01'),
      status: MeterStatus.ACTIVE,
    },
  });

  // Business meters
  const meter5 = await prisma.meter.create({
    data: {
      meterNumber: 'EL-003-2024',
      customerId: business1.id,
      utilityTypeId: electricity.id,
      installationDate: new Date('2024-01-10'),
      status: MeterStatus.ACTIVE,
    },
  });

  const meter6 = await prisma.meter.create({
    data: {
      meterNumber: 'WT-002-2024',
      customerId: business1.id,
      utilityTypeId: water.id,
      installationDate: new Date('2024-01-10'),
      status: MeterStatus.ACTIVE,
    },
  });

  console.log('✅ Created 6 meters');

  // Create Meter Readings
  console.log('📈 Creating meter readings...');

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  // Readings for meter1 (Electricity - Household 1)
  await prisma.meterReading.createMany({
    data: [
      {
        meterId: meter1.id,
        readingValue: 1000,
        readingDate: twoMonthsAgo,
        recordedBy: meterReader.username,
      },
      {
        meterId: meter1.id,
        readingValue: 1250,
        readingDate: lastMonth,
        recordedBy: meterReader.username,
      },
      {
        meterId: meter1.id,
        readingValue: 1520,
        readingDate: now,
        recordedBy: meterReader.username,
      },
    ],
  });

  // Readings for meter2 (Water - Household 1)
  await prisma.meterReading.createMany({
    data: [
      {
        meterId: meter2.id,
        readingValue: 500,
        readingDate: twoMonthsAgo,
        recordedBy: meterReader.username,
      },
      {
        meterId: meter2.id,
        readingValue: 535,
        readingDate: lastMonth,
        recordedBy: meterReader.username,
      },
      {
        meterId: meter2.id,
        readingValue: 572,
        readingDate: now,
        recordedBy: meterReader.username,
      },
    ],
  });

  // Readings for meter3 (Gas - Household 1)
  await prisma.meterReading.createMany({
    data: [
      {
        meterId: meter3.id,
        readingValue: 200,
        readingDate: twoMonthsAgo,
        recordedBy: meterReader.username,
      },
      {
        meterId: meter3.id,
        readingValue: 225,
        readingDate: lastMonth,
        recordedBy: meterReader.username,
      },
      {
        meterId: meter3.id,
        readingValue: 253,
        readingDate: now,
        recordedBy: meterReader.username,
      },
    ],
  });

  // Readings for meter5 (Electricity - Business)
  await prisma.meterReading.createMany({
    data: [
      {
        meterId: meter5.id,
        readingValue: 5000,
        readingDate: twoMonthsAgo,
        recordedBy: meterReader.username,
      },
      {
        meterId: meter5.id,
        readingValue: 5800,
        readingDate: lastMonth,
        recordedBy: meterReader.username,
      },
    ],
  });

  console.log('✅ Created meter readings');

  // Create Bills
  console.log('💵 Creating bills...');

  const lastMonthNum = lastMonth.getMonth() + 1;
  const lastMonthYear = lastMonth.getFullYear();

  const bill1 = await prisma.bill.create({
    data: {
      billNumber: 'BILL240100001',
      customerId: household1.id,
      billingMonth: lastMonthNum,
      billingYear: lastMonthYear,
      issueDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 15),
      dueDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 30),
      previousReading: 1700,
      currentReading: 2050,
      consumption: 350,
      totalAmount: 78.50,
      paidAmount: 78.50,
      outstandingAmount: 0,
      status: BillStatus.PAID,
    },
  });

  const bill2 = await prisma.bill.create({
    data: {
      billNumber: 'BILL240100002',
      customerId: business1.id,
      billingMonth: lastMonthNum,
      billingYear: lastMonthYear,
      issueDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 15),
      dueDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 30),
      previousReading: 5000,
      currentReading: 5800,
      consumption: 800,
      totalAmount: 215.0,
      paidAmount: 100.0,
      outstandingAmount: 115.0,
      status: BillStatus.PARTIALLY_PAID,
    },
  });

  console.log('✅ Created 2 bills');

  // Create Payments
  console.log('💳 Creating payments...');

  await prisma.payment.createMany({
    data: [
      {
        billId: bill1.id,
        amount: 78.50,
        paymentMethod: PaymentMethod.ONLINE,
        paymentDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 20),
        referenceNumber: 'PAY-001-2024',
        recordedBy: clerk.username,
      },
      {
        billId: bill2.id,
        amount: 100.0,
        paymentMethod: PaymentMethod.CASH,
        paymentDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 25),
        referenceNumber: 'PAY-002-2024',
        recordedBy: clerk.username,
      },
    ],
  });

  console.log('✅ Created 2 payments');

  // Create Complaints
  console.log('📝 Creating complaints...');

  await prisma.complaint.createMany({
    data: [
      {
        customerId: household1.id,
        subject: 'Meter reading discrepancy',
        description: 'The recent meter reading seems unusually high compared to previous months.',
        status: 'OPEN',
        priority: 'MEDIUM',
      },
      {
        customerId: business1.id,
        subject: 'Billing inquiry',
        description: 'Request clarification on the latest electricity bill charges.',
        status: 'RESOLVED',
        priority: 'LOW',
        resolution: 'Charges explained to customer. Bill is accurate.',
        resolvedAt: new Date(),
      },
    ],
  });

  console.log('✅ Created 2 complaints');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log('   - 4 Staff members (admin, reader01, clerk01, manager01)');
  console.log('   - Password for all: password123');
  console.log('   - 3 Utility types (Electricity, Water, Gas)');
  console.log('   - 7 Tariffs');
  console.log('   - 4 Customers (2 household, 1 business, 1 government)');
  console.log('   - 6 Meters');
  console.log('   - Multiple meter readings');
  console.log('   - 2 Bills (1 paid, 1 partially paid)');
  console.log('   - 2 Payments');
  console.log('   - 2 Complaints');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
