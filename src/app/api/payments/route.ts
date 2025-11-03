import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { StaffRole, PaymentMethod, BillStatus } from '@/generated/prisma';

// GET all payments
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('billId');
    const customerId = searchParams.get('customerId');
    const paymentMethod = searchParams.get('paymentMethod');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (billId) where.billId = billId;
    if (paymentMethod) where.paymentMethod = paymentMethod as PaymentMethod;
    if (startDate) where.paymentDate = { gte: new Date(startDate) };
    if (endDate) {
      where.paymentDate = {
        ...where.paymentDate,
        lte: new Date(endDate),
      };
    }

    // If customerId is provided, find bills for that customer
    if (customerId) {
      const customerBills = await prisma.bill.findMany({
        where: { customerId },
        select: { id: true },
      });
      where.billId = { in: customerBills.map((b) => b.id) };
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          bill: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// POST create new payment
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, [StaffRole.ADMIN, StaffRole.CLERK]);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const { billId, amount, paymentMethod, paymentDate, referenceNumber, remarks } = body;

    if (!billId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: 'Bill ID, amount, and payment method are required' },
        { status: 400 }
      );
    }

    // Validate payment method
    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    // Get bill
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        payments: true,
      },
    });

    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    if (bill.status === BillStatus.CANCELLED) {
      return NextResponse.json(
        { error: 'Cannot add payment to cancelled bill' },
        { status: 400 }
      );
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (paymentAmount > bill.outstandingAmount) {
      return NextResponse.json(
        {
          error: 'Payment amount exceeds outstanding amount',
          outstandingAmount: bill.outstandingAmount,
        },
        { status: 400 }
      );
    }

    // Create payment and update bill in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.payment.create({
        data: {
          billId,
          amount: paymentAmount,
          paymentMethod,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          referenceNumber,
          remarks,
          recordedBy: authResult.user.username,
        },
      });

      // Update bill
      const newPaidAmount = bill.paidAmount + paymentAmount;
      const newOutstandingAmount = bill.totalAmount - newPaidAmount;
      const newStatus =
        newOutstandingAmount === 0
          ? BillStatus.PAID
          : newOutstandingAmount < bill.totalAmount
          ? BillStatus.PARTIALLY_PAID
          : bill.status;

      const updatedBill = await tx.bill.update({
        where: { id: billId },
        data: {
          paidAmount: newPaidAmount,
          outstandingAmount: newOutstandingAmount,
          status: newStatus,
        },
      });

      return { payment, bill: updatedBill };
    });

    return NextResponse.json(
      {
        data: result.payment,
        updatedBill: result.bill,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
