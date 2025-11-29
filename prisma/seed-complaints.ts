import prisma from '../src/lib/prisma';

async function main() {
  console.log('Seeding complaints...');

  // Get some existing customers
  const customers = await prisma.customer.findMany({
    take: 5,
  });

  if (customers.length === 0) {
    console.log('No customers found. Please seed customers first.');
    return;
  }

  const complaints = [
    {
      customerId: customers[0]?.id,
      subject: 'High electricity bill for last month',
      description: 'I received my electricity bill for last month and it seems unusually high compared to my average usage. I would like someone to review my meter readings and billing calculations.',
      priority: 'HIGH',
      status: 'OPEN',
    },
    {
      customerId: customers[1]?.id,
      subject: 'Water meter not working properly',
      description: 'My water meter appears to be stuck and not recording usage accurately. The readings have been the same for the past three days despite normal water usage.',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
    },
    {
      customerId: customers[2]?.id,
      subject: 'Billing discrepancy in account statement',
      description: 'There is a discrepancy in my last billing statement. The calculated amount does not match the consumption shown. Please investigate and correct this.',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      resolution: 'Billing error has been corrected. A credit of $45.50 has been applied to your account. We apologize for the inconvenience.',
      resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      customerId: customers[3]?.id,
      subject: 'Request for payment plan',
      description: 'Due to unexpected financial difficulties, I would like to request a payment plan for my outstanding balance of $320. Please advise on available options.',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
    },
    {
      customerId: customers[4]?.id,
      subject: 'Meter reading access issue',
      description: 'The meter reader was unable to access my property last week due to a locked gate. I would like to schedule a specific time for the next reading.',
      priority: 'LOW',
      status: 'RESOLVED',
      resolution: 'Reading appointment scheduled for next Monday at 10 AM. Customer will ensure access to meter.',
      resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
    {
      customerId: customers[0]?.id,
      subject: 'Late payment fee dispute',
      description: 'I was charged a late payment fee, but I made the payment on the due date. I have proof of payment and would like this fee waived.',
      priority: 'MEDIUM',
      status: 'OPEN',
    },
    {
      customerId: customers[1]?.id,
      subject: 'Broken water pipe reported',
      description: 'There is a broken water pipe on the street near my property causing water wastage. Please send someone to repair it as soon as possible.',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
    },
    {
      customerId: customers[2]?.id,
      subject: 'Request for service disconnection',
      description: 'I am moving to a new location next month. Please advise on the process for disconnecting service at my current address and transferring to the new address.',
      priority: 'LOW',
      status: 'OPEN',
    },
  ];

  for (const complaint of complaints) {
    if (complaint.customerId) {
      await prisma.complaint.create({
        data: complaint,
      });
      console.log(`Created complaint: ${complaint.subject}`);
    }
  }

  console.log('Complaints seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
