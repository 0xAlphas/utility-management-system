import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET usage patterns report
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, ['ADMIN', 'MANAGER']);
  if (authResult instanceof Response) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const utilityTypeId = searchParams.get('utilityTypeId');
    const customerType = searchParams.get('customerType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Build where clause for bills
    const billWhere: any = {
      issueDate: {
        gte: start,
        lte: end,
      },
    };

    if (customerType) {
      billWhere.customer = {
        type: customerType,
      };
    }

    // Get bills with consumption data
    const bills = await prisma.bill.findMany({
      where: billWhere,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { consumption: 'desc' },
      take: limit,
    });

    // Calculate statistics
    const totalConsumption = bills.reduce((sum, b) => sum + b.consumption, 0);
    const avgConsumption = bills.length > 0 ? totalConsumption / bills.length : 0;
    const maxConsumption = bills.length > 0 ? Math.max(...bills.map((b) => b.consumption)) : 0;
    const minConsumption = bills.length > 0 ? Math.min(...bills.map((b) => b.consumption)) : 0;

    // Group by customer type
    const byCustomerType = bills.reduce((acc: any, b) => {
      const type = b.customer.type;
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          totalConsumption: 0,
          avgConsumption: 0,
        };
      }
      acc[type].count++;
      acc[type].totalConsumption += b.consumption;
      acc[type].avgConsumption = acc[type].totalConsumption / acc[type].count;
      return acc;
    }, {});

    // Group by month
    const byMonth = bills.reduce((acc: any, b) => {
      const key = `${b.billingYear}-${String(b.billingMonth).padStart(2, '0')}`;
      if (!acc[key]) {
        acc[key] = {
          count: 0,
          totalConsumption: 0,
          avgConsumption: 0,
        };
      }
      acc[key].count++;
      acc[key].totalConsumption += b.consumption;
      acc[key].avgConsumption = acc[key].totalConsumption / acc[key].count;
      return acc;
    }, {});

    // Get top consumers
    const topConsumers = bills.slice(0, 20).map((b) => ({
      customerId: b.customer.id,
      customerName: b.customer.name,
      customerType: b.customer.type,
      consumption: b.consumption,
      amount: b.totalAmount,
      period: `${b.billingYear}-${String(b.billingMonth).padStart(2, '0')}`,
    }));

    // Get meter reading statistics if utilityTypeId is provided
    let meterStats = null;
    if (utilityTypeId) {
      const meters = await prisma.meter.findMany({
        where: {
          utilityTypeId,
          status: 'ACTIVE',
        },
        include: {
          customer: {
            select: {
              type: true,
            },
          },
          readings: {
            where: {
              readingDate: {
                gte: start,
                lte: end,
              },
            },
            orderBy: { readingDate: 'desc' },
          },
          utilityType: {
            select: {
              name: true,
              unit: true,
            },
          },
        },
      });

      const totalMeters = meters.length;
      const metersWithReadings = meters.filter((m) => m.readings.length > 0).length;
      const totalReadings = meters.reduce((sum, m) => sum + m.readings.length, 0);

      meterStats = {
        totalMeters,
        metersWithReadings,
        totalReadings,
        avgReadingsPerMeter: totalMeters > 0 ? totalReadings / totalMeters : 0,
        utilityType: meters[0]?.utilityType,
      };
    }

    return NextResponse.json({
      data: {
        summary: {
          totalBills: bills.length,
          totalConsumption,
          avgConsumption,
          maxConsumption,
          minConsumption,
        },
        byCustomerType,
        byMonth,
        topConsumers,
        meterStats,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      },
    });
  } catch (error) {
    console.error('Usage report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate usage report' },
      { status: 500 }
    );
  }
}
