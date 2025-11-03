import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { StaffRole } from '@/generated/prisma';

// GET revenue report
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, [StaffRole.ADMIN, StaffRole.MANAGER]);
  if (authResult instanceof Response) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'month'; // day, month, year

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all payments in date range
    const payments = await prisma.payment.findMany({
      where: {
        paymentDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        bill: {
          include: {
            customer: {
              select: {
                type: true,
              },
            },
          },
        },
      },
    });

    // Calculate total revenue
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    // Group by payment method
    const byPaymentMethod = payments.reduce((acc: any, p) => {
      if (!acc[p.paymentMethod]) {
        acc[p.paymentMethod] = { count: 0, amount: 0 };
      }
      acc[p.paymentMethod].count++;
      acc[p.paymentMethod].amount += p.amount;
      return acc;
    }, {});

    // Group by customer type
    const byCustomerType = payments.reduce((acc: any, p) => {
      const type = p.bill.customer.type;
      if (!acc[type]) {
        acc[type] = { count: 0, amount: 0 };
      }
      acc[type].count++;
      acc[type].amount += p.amount;
      return acc;
    }, {});

    // Group by time period
    const byPeriod = payments.reduce((acc: any, p) => {
      const date = new Date(p.paymentDate);
      let key: string;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = String(date.getFullYear());
      }

      if (!acc[key]) {
        acc[key] = { count: 0, amount: 0 };
      }
      acc[key].count++;
      acc[key].amount += p.amount;
      return acc;
    }, {});

    // Get outstanding bills
    const outstandingBills = await prisma.bill.findMany({
      where: {
        status: {
          in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'],
        },
      },
      select: {
        id: true,
        billNumber: true,
        outstandingAmount: true,
      },
    });

    const totalOutstanding = outstandingBills.reduce(
      (sum, b) => sum + b.outstandingAmount,
      0
    );

    return NextResponse.json({
      data: {
        summary: {
          totalRevenue,
          totalPayments: payments.length,
          totalOutstanding,
          outstandingBillsCount: outstandingBills.length,
        },
        byPaymentMethod,
        byCustomerType,
        byPeriod,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      },
    });
  } catch (error) {
    console.error('Revenue report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate revenue report' },
      { status: 500 }
    );
  }
}
