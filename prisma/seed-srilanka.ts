import { PrismaClient } from '../src/generated/prisma';
import { StaffRole, CustomerType, MeterStatus, BillStatus, PaymentMethod } from '../src/lib/types';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🇱🇰 Starting Sri Lankan realistic data seed...');

  // Clear existing data
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

  // ===========================================
  // STAFF (20 records)
  // ===========================================
  console.log('👤 Creating staff members...');
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const staffMembers = await Promise.all([
    // Admin
    prisma.staff.create({
      data: {
        username: 'admin',
        passwordHash,
        name: 'Kasun Jayasinghe',
        email: 'kasun.j@waterboard.gov.lk',
        role: StaffRole.ADMIN,
      },
    }),
    prisma.staff.create({
      data: {
        username: 'sadmin01',
        passwordHash,
        name: 'Nimali Fernando',
        email: 'nimali.f@waterboard.gov.lk',
        role: StaffRole.ADMIN,
      },
    }),
    // Managers
    prisma.staff.create({
      data: {
        username: 'mgr_colombo',
        passwordHash,
        name: 'Rohan Perera',
        email: 'rohan.perera@waterboard.gov.lk',
        role: StaffRole.MANAGER,
      },
    }),
    prisma.staff.create({
      data: {
        username: 'mgr_kandy',
        passwordHash,
        name: 'Sanduni Wijesinghe',
        email: 'sanduni.w@waterboard.gov.lk',
        role: StaffRole.MANAGER,
      },
    }),
    prisma.staff.create({
      data: {
        username: 'mgr_galle',
        passwordHash,
        name: 'Chaminda Silva',
        email: 'chaminda.silva@waterboard.gov.lk',
        role: StaffRole.MANAGER,
      },
    }),
    // Clerks
    prisma.staff.create({
      data: {
        username: 'clerk_col01',
        passwordHash,
        name: 'Tharindu Lakshan',
        email: 'tharindu.l@waterboard.gov.lk',
        role: StaffRole.CLERK,
      },
    }),
    prisma.staff.create({
      data: {
        username: 'clerk_col02',
        passwordHash,
        name: 'Dilini Rathnayake',
        email: 'dilini.r@waterboard.gov.lk',
        role: StaffRole.CLERK,
      },
    }),
    prisma.staff.create({
      data: {
        username: 'clerk_negombo',
        passwordHash,
        name: 'Harsha Gunasekara',
        email: 'harsha.g@waterboard.gov.lk',
        role: StaffRole.CLERK,
      },
    }),
    prisma.staff.create({
      data: {
        username: 'clerk_gampaha',
        passwordHash,
        name: 'Nadeeka Kumari',
        email: 'nadeeka.k@waterboard.gov.lk',
        role: StaffRole.CLERK,
      },
    }),
    prisma.staff.create({
      data: {
        username: 'clerk_kandy01',
        passwordHash,
        name: 'Buddhika Rathnayake',
        email: 'buddhika.r@waterboard.gov.lk',
        role: StaffRole.CLERK,
      },
    }),
    // Meter Readers
    prisma.staff.create({
      data: {
        username: 'reader_col01',
        passwordHash,
        name: 'Sunil Bandara',
        email: 'sunil.b@waterboard.gov.lk',
        role: StaffRole.METER_READER,
      },
    }),
    prisma.staff.create({
      data: {
        username: 'reader_col02',
        passwordHash,
        name: 'Gamini Wickramasinghe',
        email: 'gamini.w@waterboard.gov.lk',
        role: StaffRole.METER_READER,
      },
    }),
    prisma.staff.create({
      data: {
        username: 'reader_nugegoda',
        passwordHash,
        name: 'Pradeep Samaraweera',
        email: 'pradeep.s@waterboard.gov.lk',
        role: StaffRole.METER_READER,
      },
    }),
    prisma.staff.create({
      data: {
        username: 'reader_dehiwala',
        passwordHash,
        name: 'Janaka De Silva',
        email: 'janaka.d@waterboard.gov.lk',
        role: StaffRole.METER_READER,
      },
    }),
    prisma.staff.create({
      data: {
        username: 'reader_moratuwa',
        passwordHash,
        name: 'Ajith Kumara',
        email: 'ajith.k@waterboard.gov.lk',
        role: StaffRole.METER_READER,
      },
    }),
    prisma.staff.create({
      data: {
        username: 'reader_kandy01',
        passwordHash,
        name: 'Mahinda Jayawardana',
        email: 'mahinda.j@waterboard.gov.lk',
        role: StaffRole.METER_READER,
      },
    }),
    prisma.staff.create({
      data: {
        username: 'reader_kandy02',
        passwordHash,
        name: 'Chamara Rathnayake',
        email: 'chamara.r@waterboard.gov.lk',
        role: StaffRole.METER_READER,
      },
    }),
    prisma.staff.create({
      data: {
        username: 'reader_galle01',
        passwordHash,
        name: 'Upul Jayasuriya',
        email: 'upul.j@waterboard.gov.lk',
        role: StaffRole.METER_READER,
      },
    }),
    prisma.staff.create({
      data: {
        username: 'reader_matara',
        passwordHash,
        name: 'Ranjith Fernando',
        email: 'ranjith.f@waterboard.gov.lk',
        role: StaffRole.METER_READER,
      },
    }),
    prisma.staff.create({
      data: {
        username: 'reader_kurunegala',
        passwordHash,
        name: 'Anura Dissanayake',
        email: 'anura.d@waterboard.gov.lk',
        role: StaffRole.METER_READER,
      },
    }),
  ]);

  console.log(`✅ Created ${staffMembers.length} staff members`);

  // ===========================================
  // UTILITY TYPES (3 records)
  // ===========================================
  console.log('⚡ Creating utility types...');

  const electricity = await prisma.utilityType.create({
    data: {
      name: 'Electricity',
      description: 'Electrical power supply provided by Ceylon Electricity Board (CEB)',
      unit: 'kWh',
    },
  });

  const water = await prisma.utilityType.create({
    data: {
      name: 'Water',
      description: 'Municipal water supply provided by National Water Supply & Drainage Board (NWSDB)',
      unit: 'm³',
    },
  });

  const gas = await prisma.utilityType.create({
    data: {
      name: 'Gas',
      description: 'Liquefied Petroleum Gas (LPG) supply',
      unit: 'm³',
    },
  });

  console.log('✅ Created 3 utility types');

  // ===========================================
  // TARIFFS (15 records - Sri Lankan realistic rates)
  // ===========================================
  console.log('💰 Creating tariffs with Sri Lankan rates...');

  await prisma.tariff.createMany({
    data: [
      // Electricity tariffs (based on CEB rates)
      {
        name: 'Electricity - Domestic 0-30 kWh',
        utilityTypeId: electricity.id,
        minUsage: 0,
        maxUsage: 30,
        rate: 7.85, // LKR per kWh
        fixedCharge: 100.0, // LKR
      },
      {
        name: 'Electricity - Domestic 31-60 kWh',
        utilityTypeId: electricity.id,
        minUsage: 30,
        maxUsage: 60,
        rate: 12.50,
        fixedCharge: 0,
      },
      {
        name: 'Electricity - Domestic 61-90 kWh',
        utilityTypeId: electricity.id,
        minUsage: 60,
        maxUsage: 90,
        rate: 18.75,
        fixedCharge: 0,
      },
      {
        name: 'Electricity - Domestic 91-120 kWh',
        utilityTypeId: electricity.id,
        minUsage: 90,
        maxUsage: 120,
        rate: 27.75,
        fixedCharge: 0,
      },
      {
        name: 'Electricity - Domestic 121-180 kWh',
        utilityTypeId: electricity.id,
        minUsage: 120,
        maxUsage: 180,
        rate: 35.00,
        fixedCharge: 0,
      },
      {
        name: 'Electricity - Domestic Above 180 kWh',
        utilityTypeId: electricity.id,
        minUsage: 180,
        maxUsage: null,
        rate: 50.00,
        fixedCharge: 0,
      },
      // Water tariffs (based on NWSDB rates)
      {
        name: 'Water - Domestic 0-10 m³',
        utilityTypeId: water.id,
        minUsage: 0,
        maxUsage: 10,
        rate: 35.00, // LKR per m³
        fixedCharge: 150.0,
      },
      {
        name: 'Water - Domestic 11-25 m³',
        utilityTypeId: water.id,
        minUsage: 10,
        maxUsage: 25,
        rate: 65.00,
        fixedCharge: 0,
      },
      {
        name: 'Water - Domestic 26-40 m³',
        utilityTypeId: water.id,
        minUsage: 25,
        maxUsage: 40,
        rate: 100.00,
        fixedCharge: 0,
      },
      {
        name: 'Water - Domestic Above 40 m³',
        utilityTypeId: water.id,
        minUsage: 40,
        maxUsage: null,
        rate: 135.00,
        fixedCharge: 0,
      },
      {
        name: 'Water - Commercial/Industrial',
        utilityTypeId: water.id,
        minUsage: 0,
        maxUsage: null,
        rate: 180.00,
        fixedCharge: 500.0,
      },
      // Gas tariffs
      {
        name: 'Gas - Domestic 0-5 m³',
        utilityTypeId: gas.id,
        minUsage: 0,
        maxUsage: 5,
        rate: 250.00, // LKR per m³
        fixedCharge: 200.0,
      },
      {
        name: 'Gas - Domestic 6-15 m³',
        utilityTypeId: gas.id,
        minUsage: 5,
        maxUsage: 15,
        rate: 320.00,
        fixedCharge: 0,
      },
      {
        name: 'Gas - Domestic Above 15 m³',
        utilityTypeId: gas.id,
        minUsage: 15,
        maxUsage: null,
        rate: 380.00,
        fixedCharge: 0,
      },
      {
        name: 'Gas - Commercial',
        utilityTypeId: gas.id,
        minUsage: 0,
        maxUsage: null,
        rate: 450.00,
        fixedCharge: 800.0,
      },
    ],
  });

  console.log('✅ Created 15 tariff slabs');

  // ===========================================
  // CUSTOMERS (30 records - Sri Lankan names and addresses)
  // ===========================================
  console.log('🏠 Creating customers...');

  const customers = await Promise.all([
    // Household customers (20)
    prisma.customer.create({
      data: {
        name: 'W.M.S. Perera',
        type: CustomerType.HOUSEHOLD,
        contact: '+94771234567',
        email: 'saman.perera@gmail.com',
        address: 'No. 45, Galle Road',
        city: 'Colombo 03',
        postalCode: '00300',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'K.A. Rathnayake',
        type: CustomerType.HOUSEHOLD,
        contact: '+94712345678',
        email: 'anura.rathnayake@yahoo.com',
        address: 'No. 128, Peradeniya Road',
        city: 'Kandy',
        postalCode: '20000',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'H.M.N. Wijesinghe',
        type: CustomerType.HOUSEHOLD,
        contact: '+94763456789',
        email: null, // Some customers don't have email
        address: 'No. 23/A, Hospital Road',
        city: 'Galle',
        postalCode: '80000',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'D.S. Fernando',
        type: CustomerType.HOUSEHOLD,
        contact: '+94754567890',
        email: 'dilshan.fernando@outlook.com',
        address: 'No. 67, Baudhaloka Mawatha',
        city: 'Colombo 04',
        postalCode: '00400',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'P.K. Jayawardana',
        type: CustomerType.HOUSEHOLD,
        contact: '+94765678901',
        email: 'pradeep.jay@gmail.com',
        address: 'No. 234, Negombo Road',
        city: 'Wattala',
        postalCode: '11300',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'S.M. De Silva',
        type: CustomerType.HOUSEHOLD,
        contact: '+94776789012',
        email: null,
        address: 'No. 45/2, Temple Road',
        city: 'Nugegoda',
        postalCode: '10250',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'R.P. Bandara',
        type: CustomerType.HOUSEHOLD,
        contact: '+94787890123',
        email: 'ranjith.bandara@hotmail.com',
        address: 'No. 89, Station Road',
        city: 'Moratuwa',
        postalCode: '10400',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'N.K. Gunasekara',
        type: CustomerType.HOUSEHOLD,
        contact: '+94798901234',
        email: 'nimal.gun@gmail.com',
        address: 'No. 156, Main Street',
        city: 'Kurunegala',
        postalCode: '60000',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'T.L. Samaraweera',
        type: CustomerType.HOUSEHOLD,
        contact: '+94709012345',
        email: null,
        address: 'No. 78, Matara Road',
        city: 'Galle',
        postalCode: '80050',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'A.W. Wickramasinghe',
        type: CustomerType.HOUSEHOLD,
        contact: '+94710123456',
        email: 'asanka.wickrama@yahoo.com',
        address: 'No. 345, High Level Road',
        city: 'Maharagama',
        postalCode: '10280',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'M.D. Dissanayake',
        type: CustomerType.HOUSEHOLD,
        contact: '+94721234567',
        email: 'manoj.dissanayake@gmail.com',
        address: 'No. 56, Dutugemunu Street',
        city: 'Dehiwala',
        postalCode: '10350',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'G.H. Liyanage',
        type: CustomerType.HOUSEHOLD,
        contact: '+94732345678',
        email: null,
        address: 'No. 123, Kandy Road',
        city: 'Kadawatha',
        postalCode: '11850',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'C.P. Mendis',
        type: CustomerType.HOUSEHOLD,
        contact: '+94743456789',
        email: 'chathura.mendis@outlook.com',
        address: 'No. 234, Old Moor Street',
        city: 'Colombo 12',
        postalCode: '01200',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'U.S. Rajapaksha',
        type: CustomerType.HOUSEHOLD,
        contact: '+94754567891',
        email: 'upul.rajapaksha@gmail.com',
        address: 'No. 67, Beach Road',
        city: 'Negombo',
        postalCode: '11500',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'I.K. Herath',
        type: CustomerType.HOUSEHOLD,
        contact: '+94765678902',
        email: null,
        address: 'No. 89, Lake Road',
        city: 'Kandy',
        postalCode: '20100',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'B.A. Jayasena',
        type: CustomerType.HOUSEHOLD,
        contact: '+94776789013',
        email: 'buddhika.jayasena@yahoo.com',
        address: 'No. 45, Colombo Road',
        city: 'Gampaha',
        postalCode: '11000',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'V.N. Rodrigo',
        type: CustomerType.HOUSEHOLD,
        contact: '+94787890124',
        email: 'vinod.rodrigo@gmail.com',
        address: 'No. 178, Duplication Road',
        city: 'Colombo 04',
        postalCode: '00400',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'L.P. Karunaratne',
        type: CustomerType.HOUSEHOLD,
        contact: '+94798901235',
        email: null,
        address: 'No. 234, Havelock Road',
        city: 'Colombo 05',
        postalCode: '00500',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'S.D. Abeysekara',
        type: CustomerType.HOUSEHOLD,
        contact: '+94709012346',
        email: 'sunil.abey@hotmail.com',
        address: 'No. 56, Ward Place',
        city: 'Colombo 07',
        postalCode: '00700',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'J.M. Amarasinghe',
        type: CustomerType.HOUSEHOLD,
        contact: '+94710123457',
        email: 'janith.amara@gmail.com',
        address: 'No. 123, Baseline Road',
        city: 'Colombo 09',
        postalCode: '00900',
      },
    }),
    // Business customers (8)
    prisma.customer.create({
      data: {
        name: 'Lanka Traders (Pvt) Ltd',
        type: CustomerType.BUSINESS,
        contact: '+94112345678',
        email: 'info@lankatraders.lk',
        address: 'No. 456, Galle Road',
        city: 'Colombo 03',
        postalCode: '00300',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Ceylon Textile Mills',
        type: CustomerType.BUSINESS,
        contact: '+94812234567',
        email: 'admin@ctmills.lk',
        address: 'No. 234, Industrial Zone',
        city: 'Katunayake',
        postalCode: '11450',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Cinnamon Grand Hotel',
        type: CustomerType.BUSINESS,
        contact: '+94112437437',
        email: 'operations@cinnamongrand.com',
        address: 'No. 77, Galle Road',
        city: 'Colombo 03',
        postalCode: '00300',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Sampath Bank PLC - Kandy Branch',
        type: CustomerType.BUSINESS,
        contact: '+94812222345',
        email: 'kandy@sampathbank.com',
        address: 'No. 123, Dalada Vidiya',
        city: 'Kandy',
        postalCode: '20000',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Keells Super - Nugegoda',
        type: CustomerType.BUSINESS,
        contact: '+94112822222',
        email: 'nugegoda@keellssuper.com',
        address: 'No. 456, High Level Road',
        city: 'Nugegoda',
        postalCode: '10250',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Abans Electronics - Galle',
        type: CustomerType.BUSINESS,
        contact: '+94912234567',
        email: 'galle@abans.lk',
        address: 'No. 89, Main Street',
        city: 'Galle',
        postalCode: '80000',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Softlogic Holdings - Head Office',
        type: CustomerType.BUSINESS,
        contact: '+94117888888',
        email: 'headoffice@softlogic.lk',
        address: 'No. 14, Duplication Road',
        city: 'Colombo 04',
        postalCode: '00400',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Ceylon Cold Stores PLC',
        type: CustomerType.BUSINESS,
        contact: '+94112456789',
        email: 'info@ccs.lk',
        address: 'No. 278, Vauxhall Street',
        city: 'Colombo 02',
        postalCode: '00200',
      },
    }),
    // Government customers (2)
    prisma.customer.create({
      data: {
        name: 'Colombo Municipal Council',
        type: CustomerType.GOVERNMENT,
        contact: '+94112683232',
        email: 'admin@colombo.mc.gov.lk',
        address: 'Municipal Council Building, Town Hall',
        city: 'Colombo 07',
        postalCode: '00700',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Ministry of Health - Kandy Provincial Office',
        type: CustomerType.GOVERNMENT,
        contact: '+94812205050',
        email: 'kandy@health.gov.lk',
        address: 'Provincial Health Office, Polgolla Road',
        city: 'Kandy',
        postalCode: '20000',
      },
    }),
  ]);

  console.log(`✅ Created ${customers.length} customers`);

  // ===========================================
  // METERS (60+ records - multiple per customer)
  // ===========================================
  console.log('📊 Creating meters...');

  const meters = [];
  let meterCount = 1;

  // Create meters for each customer (most have 2-3 utilities)
  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const isHousehold = customer.type === CustomerType.HOUSEHOLD;
    const isBusiness = customer.type === CustomerType.BUSINESS;

    // All customers get electricity
    meters.push(
      await prisma.meter.create({
        data: {
          meterNumber: `EL-${String(meterCount++).padStart(6, '0')}`,
          customerId: customer.id,
          utilityTypeId: electricity.id,
          installationDate: new Date('2023-01-15'),
          status: MeterStatus.ACTIVE,
        },
      })
    );

    // Most customers get water
    if (i < 25) {
      meters.push(
        await prisma.meter.create({
          data: {
            meterNumber: `WT-${String(meterCount++).padStart(6, '0')}`,
            customerId: customer.id,
            utilityTypeId: water.id,
            installationDate: new Date('2023-01-15'),
            status: MeterStatus.ACTIVE,
          },
        })
      );
    }

    // Some households get gas
    if (isHousehold && i % 3 === 0) {
      meters.push(
        await prisma.meter.create({
          data: {
            meterNumber: `GS-${String(meterCount++).padStart(6, '0')}`,
            customerId: customer.id,
            utilityTypeId: gas.id,
            installationDate: new Date('2023-06-01'),
            status: MeterStatus.ACTIVE,
          },
        })
      );
    }

    // Business customers get gas
    if (isBusiness) {
      meters.push(
        await prisma.meter.create({
          data: {
            meterNumber: `GS-${String(meterCount++).padStart(6, '0')}`,
            customerId: customer.id,
            utilityTypeId: gas.id,
            installationDate: new Date('2023-03-01'),
            status: MeterStatus.ACTIVE,
          },
        })
      );
    }
  }

  console.log(`✅ Created ${meters.length} meters`);

  // ===========================================
  // METER READINGS (200+ records)
  // ===========================================
  console.log('📈 Creating meter readings...');

  const meterReadings = [];
  const reader = staffMembers.find((s) => s.role === StaffRole.METER_READER);

  // Create 6 months of readings for each meter
  for (const meter of meters) {
    let baseReading = Math.random() * 10000; // Random starting point

    for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
      const readingDate = new Date();
      readingDate.setMonth(readingDate.getMonth() - monthsAgo);
      readingDate.setDate(15); // Mid-month reading

      // Increment reading realistically
      const increment =
        meter.meterNumber.startsWith('EL-') ? Math.random() * 200 + 100 : // Electricity: 100-300 units
        meter.meterNumber.startsWith('WT-') ? Math.random() * 20 + 10 : // Water: 10-30 m³
        Math.random() * 5 + 2; // Gas: 2-7 m³

      baseReading += increment;

      meterReadings.push(
        await prisma.meterReading.create({
          data: {
            meterId: meter.id,
            readingValue: Math.round(baseReading * 100) / 100,
            readingDate,
            recordedBy: reader?.username || 'reader_col01',
          },
        })
      );
    }
  }

  console.log(`✅ Created ${meterReadings.length} meter readings`);

  // ===========================================
  // BILLS (100+ records)
  // ===========================================
  console.log('💵 Creating bills...');

  const bills = [];
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Generate bills for last 3 months for first 20 customers
  for (let i = 0; i < Math.min(20, customers.length); i++) {
    const customer = customers[i];

    for (let monthsAgo = 2; monthsAgo >= 0; monthsAgo--) {
      const billingMonth = currentMonth - monthsAgo;
      const billingYear = currentYear;

      // Realistic bill amounts based on customer type
      const baseAmount =
        customer.type === CustomerType.HOUSEHOLD ? Math.random() * 3000 + 1500 :
        customer.type === CustomerType.BUSINESS ? Math.random() * 15000 + 10000 :
        Math.random() * 8000 + 5000;

      const totalAmount = Math.round(baseAmount * 100) / 100;
      const isPaid = monthsAgo > 0 || Math.random() > 0.3; // Most old bills paid
      const paidAmount = isPaid ? totalAmount : (Math.random() > 0.5 ? totalAmount * 0.5 : 0);
      const outstanding = totalAmount - paidAmount;

      const issueDate = new Date(billingYear, billingMonth - 1, 5);
      const dueDate = new Date(billingYear, billingMonth - 1, 20);

      bills.push(
        await prisma.bill.create({
          data: {
            billNumber: `BILL${billingYear}${String(billingMonth).padStart(2, '0')}${String(bills.length + 1).padStart(5, '0')}`,
            customerId: customer.id,
            billingMonth,
            billingYear,
            issueDate,
            dueDate,
            consumption: Math.random() * 200 + 50,
            totalAmount,
            paidAmount,
            outstandingAmount: outstanding,
            status:
              outstanding === 0 ? BillStatus.PAID :
              paidAmount > 0 ? BillStatus.PARTIALLY_PAID :
              dueDate < currentDate ? BillStatus.OVERDUE :
              BillStatus.UNPAID,
          },
        })
      );
    }
  }

  console.log(`✅ Created ${bills.length} bills`);

  // ===========================================
  // PAYMENTS (80+ records)
  // ===========================================
  console.log('💳 Creating payments...');

  const payments = [];
  const clerk = staffMembers.find((s) => s.role === StaffRole.CLERK);

  // Create payments for paid bills
  for (const bill of bills) {
    if (bill.paidAmount > 0) {
      const paymentMethods = [PaymentMethod.ONLINE, PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.BANK_TRANSFER];

      payments.push(
        await prisma.payment.create({
          data: {
            billId: bill.id,
            amount: bill.paidAmount,
            paymentDate: new Date(bill.dueDate.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000),
            paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
            referenceNumber: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            recordedBy: clerk?.username || 'clerk_col01',
          },
        })
      );
    }
  }

  console.log(`✅ Created ${payments.length} payments`);

  // ===========================================
  // COMPLAINTS (25 records)
  // ===========================================
  console.log('📝 Creating complaints...');

  const complaintSubjects = [
    'High electricity bill',
    'Meter reading discrepancy',
    'Water supply interruption',
    'Billing error',
    'Request for meter replacement',
    'Late fee dispute',
    'Connection issue',
    'Poor water pressure',
    'Meter not working properly',
    'Duplicate billing',
  ];

  const complaints = [];
  for (let i = 0; i < 25; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const subject = complaintSubjects[Math.floor(Math.random() * complaintSubjects.length)];
    const isResolved = Math.random() > 0.4;

    complaints.push(
      await prisma.complaint.create({
        data: {
          customerId: customer.id,
          subject,
          description: `Customer ${customer.name} has raised a concern regarding ${subject.toLowerCase()}. This requires immediate attention.`,
          status: isResolved ? 'RESOLVED' : Math.random() > 0.5 ? 'IN_PROGRESS' : 'OPEN',
          priority: Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.4 ? 'MEDIUM' : 'LOW',
          resolution: isResolved ? 'Issue resolved after investigation and corrective action taken.' : null,
          resolvedAt: isResolved ? new Date() : null,
        },
      })
    );
  }

  console.log(`✅ Created ${complaints.length} complaints`);

  // ===========================================
  // Summary
  // ===========================================
  console.log('\n🎉 Sri Lankan realistic data seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   - ${staffMembers.length} Staff members`);
  console.log(`   - 3 Utility types (Electricity, Water, Gas)`);
  console.log(`   - 15 Tariff slabs (realistic Sri Lankan rates)`);
  console.log(`   - ${customers.length} Customers (20 household, 8 business, 2 government)`);
  console.log(`   - ${meters.length} Meters`);
  console.log(`   - ${meterReadings.length} Meter readings (6 months per meter)`);
  console.log(`   - ${bills.length} Bills (3 months for 20 customers)`);
  console.log(`   - ${payments.length} Payments`);
  console.log(`   - ${complaints.length} Complaints`);
  console.log('\n🔐 Login credentials:');
  console.log('   Username: admin');
  console.log('   Password: Admin@123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
