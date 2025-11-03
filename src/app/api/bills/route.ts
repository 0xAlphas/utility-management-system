import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { StaffRole, BillStatus } from '@/generated/prisma';
import {
  calculateBillAmount,
  generateBillNumber,
  getLatestReading,
  calculateConsumption,
} from '@/lib/billing';

// GET all bills
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status as BillStatus;
    if (month) where.billingMonth = parseInt(month);
    if (year) where.billingYear = parseInt(year);

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              type: true,
              contact: true,
            },
          },
          payments: {
            orderBy: { paymentDate: 'desc' },
          },
        },
        orderBy: { issueDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bill.count({ where }),
    ]);

    return NextResponse.json({
      data: bills,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get bills error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    );
  }
}

// POST create/generate new bill
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, [StaffRole.ADMIN, StaffRole.CLERK]);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const { customerId, billingMonth, billingYear, dueDate } = body;

    if (!customerId || !billingMonth || !billingYear) {
      return NextResponse.json(
        { error: 'Customer ID, billing month, and billing year are required' },
        { status: 400 }
      );
    }

    // Check if bill already exists for this period
    const existingBill = await prisma.bill.findUnique({
      where: {
        customerId_billingMonth_billingYear: {
          customerId,
          billingMonth: parseInt(billingMonth),
          billingYear: parseInt(billingYear),
        },
      },
    });

    if (existingBill) {
      return NextResponse.json(
        { error: 'Bill already exists for this period' },
        { status: 409 }
      );
    }

    // Get customer with meters
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        meters: {
          where: { status: 'ACTIVE' },
          include: {
            utilityType: true,
            readings: {
              orderBy: { readingDate: 'desc' },
              take: 2,
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    if (customer.meters.length === 0) {
      return NextResponse.json(
        { error: 'Customer has no active meters' },
        { status: 400 }
      );
    }

    // Calculate total bill amount from all meters
    let totalAmount = 0;
    let totalConsumption = 0;
    let currentReading = 0;
    let previousReading = 0;
    const billDetails: any[] = [];

    for (const meter of customer.meters) {
      if (meter.readings.length < 2) {
        return NextResponse.json(
          {
            error: `Insufficient readings for meter ${meter.meterNumber}. Need at least 2 readings.`,
          },
          { status: 400 }
        );
      }

      const current = meter.readings[0];
      const previous = meter.readings[1];

      const consumption = calculateConsumption(
        current.readingValue,
        previous.readingValue
      );

      const calculation = await calculateBillAmount(
        meter.utilityTypeId,
        consumption
      );

      totalAmount += calculation.totalAmount;
      totalConsumption += consumption;
      currentReading += current.readingValue;
      previousReading += previous.readingValue;

      billDetails.push({
        meterNumber: meter.meterNumber,
        utilityType: meter.utilityType.name,
        previousReading: previous.readingValue,
        currentReading: current.readingValue,
        consumption,
        amount: calculation.totalAmount,
        breakdown: calculation.breakdown,
      });
    }

    // Generate bill number
    const billCount = await prisma.bill.count();
    const billNumber = generateBillNumber(
      parseInt(billingYear),
      parseInt(billingMonth),
      billCount + 1
    );

    // Calculate due date (default: 15 days from now)
    const calculatedDueDate = dueDate
      ? new Date(dueDate)
      : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    // Create bill
    const bill = await prisma.bill.create({
      data: {
        billNumber,
        customerId,
        billingMonth: parseInt(billingMonth),
        billingYear: parseInt(billingYear),
        issueDate: new Date(),
        dueDate: calculatedDueDate,
        previousReading,
        currentReading,
        consumption: totalConsumption,
        totalAmount,
        paidAmount: 0,
        outstandingAmount: totalAmount,
        status: BillStatus.UNPAID,
        remarks: JSON.stringify(billDetails),
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            type: true,
            contact: true,
            address: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        data: bill,
        details: billDetails,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create bill error:', error);
    return NextResponse.json(
      { error: 'Failed to create bill', details: (error as Error).message },
      { status: 500 }
    );
  }
}
