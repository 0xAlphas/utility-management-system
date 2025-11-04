import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET dashboard statistics
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, [
    'ADMIN',
    'MANAGER',
    'CLERK',
  ]);
  if (authResult instanceof Response) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // day, week, month, year

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Get counts
    const [
      totalCustomers,
      activeCustomers,
      totalMeters,
      activeMeters,
      totalBills,
      unpaidBills,
      totalPayments,
      openComplaints,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { isActive: true } }),
      prisma.meter.count(),
      prisma.meter.count({ where: { status: 'ACTIVE' } }),
      prisma.bill.count(),
      prisma.bill.count({
        where: {
          status: {
            in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'],
          },
        },
      }),
      prisma.payment.count({
        where: {
          paymentDate: {
            gte: startDate,
          },
        },
      }),
      prisma.complaint.count({
        where: {
          status: {
            in: ['OPEN', 'IN_PROGRESS'],
          },
        },
      }),
    ]);

    // Get revenue statistics for the period
    const payments = await prisma.payment.findMany({
      where: {
        paymentDate: {
          gte: startDate,
        },
      },
      select: {
        amount: true,
        paymentMethod: true,
      },
    });

    const periodRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    // Get outstanding amount
    const unpaidBillsData = await prisma.bill.findMany({
      where: {
        status: {
          in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'],
        },
      },
      select: {
        outstandingAmount: true,
      },
    });

    const totalOutstanding = unpaidBillsData.reduce(
      (sum, b) => sum + b.outstandingAmount,
      0
    );

    // Get recent activity
    const [recentBills, recentPayments, recentComplaints] = await Promise.all([
      prisma.bill.findMany({
        where: {
          issueDate: {
            gte: startDate,
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: { issueDate: 'desc' },
        take: 10,
      }),
      prisma.payment.findMany({
        where: {
          paymentDate: {
            gte: startDate,
          },
        },
        include: {
          bill: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        take: 10,
      }),
      prisma.complaint.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Get utility type breakdown
    const utilityTypes = await prisma.utilityType.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            meters: true,
            tariffs: true,
          },
        },
      },
    });

    // Customer type breakdown
    const customersByType = await prisma.customer.groupBy({
      by: ['type'],
      _count: {
        type: true,
      },
      where: {
        isActive: true,
      },
    });

    // Payment method breakdown for the period
    const paymentsByMethod = payments.reduce((acc: any, p) => {
      if (!acc[p.paymentMethod]) {
        acc[p.paymentMethod] = { count: 0, amount: 0 };
      }
      acc[p.paymentMethod].count++;
      acc[p.paymentMethod].amount += p.amount;
      return acc;
    }, {});

    return NextResponse.json({
      data: {
        overview: {
          customers: {
            total: totalCustomers,
            active: activeCustomers,
            byType: customersByType,
          },
          meters: {
            total: totalMeters,
            active: activeMeters,
          },
          bills: {
            total: totalBills,
            unpaid: unpaidBills,
            totalOutstanding,
          },
          revenue: {
            period,
            amount: periodRevenue,
            paymentsCount: totalPayments,
            byPaymentMethod: paymentsByMethod,
          },
          complaints: {
            open: openComplaints,
          },
        },
        utilityTypes,
        recentActivity: {
          bills: recentBills,
          payments: recentPayments,
          complaints: recentComplaints,
        },
        period: {
          type: period,
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Dashboard report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate dashboard report' },
      { status: 500 }
    );
  }
}
