import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { StaffRole } from '@/generated/prisma';

// GET defaulters report
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, [StaffRole.ADMIN, StaffRole.MANAGER]);
  if (authResult instanceof Response) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const minAmount = searchParams.get('minAmount');
    const customerType = searchParams.get('customerType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Get all unpaid and overdue bills
    const where: any = {
      status: {
        in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'],
      },
      outstandingAmount: {
        gt: 0,
      },
    };

    if (minAmount) {
      where.outstandingAmount.gte = parseFloat(minAmount);
    }

    if (customerType) {
      where.customer = {
        type: customerType,
      };
    }

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
              email: true,
              address: true,
            },
          },
          payments: {
            orderBy: { paymentDate: 'desc' },
            take: 1,
          },
        },
        orderBy: { outstandingAmount: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bill.count({ where }),
    ]);

    // Calculate days overdue
    const defaulters = bills.map((bill) => {
      const dueDate = new Date(bill.dueDate);
      const today = new Date();
      const daysOverdue = Math.max(
        0,
        Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      );

      return {
        ...bill,
        daysOverdue,
        lastPaymentDate: bill.payments[0]?.paymentDate || null,
      };
    });

    // Calculate summary statistics
    const totalOutstanding = bills.reduce((sum, b) => sum + b.outstandingAmount, 0);
    const avgOutstanding = bills.length > 0 ? totalOutstanding / bills.length : 0;

    // Group by customer type
    const byCustomerType = bills.reduce((acc: any, b) => {
      const type = b.customer.type;
      if (!acc[type]) {
        acc[type] = { count: 0, totalOutstanding: 0 };
      }
      acc[type].count++;
      acc[type].totalOutstanding += b.outstandingAmount;
      return acc;
    }, {});

    // Group by age of debt
    const byAgeGroup = bills.reduce((acc: any, b) => {
      const dueDate = new Date(b.dueDate);
      const today = new Date();
      const daysOverdue = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      let group;
      if (daysOverdue < 0) group = 'Not Yet Due';
      else if (daysOverdue <= 30) group = '0-30 days';
      else if (daysOverdue <= 60) group = '31-60 days';
      else if (daysOverdue <= 90) group = '61-90 days';
      else group = '90+ days';

      if (!acc[group]) {
        acc[group] = { count: 0, totalOutstanding: 0 };
      }
      acc[group].count++;
      acc[group].totalOutstanding += b.outstandingAmount;
      return acc;
    }, {});

    return NextResponse.json({
      data: defaulters,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalDefaulters: total,
        totalOutstanding,
        avgOutstanding,
        byCustomerType,
        byAgeGroup,
      },
    });
  } catch (error) {
    console.error('Defaulters report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate defaulters report' },
      { status: 500 }
    );
  }
}
