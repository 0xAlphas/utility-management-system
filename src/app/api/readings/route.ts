import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { StaffRole } from '@/generated/prisma';

// GET all meter readings
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const meterId = searchParams.get('meterId');
    const customerId = searchParams.get('customerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (meterId) where.meterId = meterId;
    if (startDate) where.readingDate = { gte: new Date(startDate) };
    if (endDate) {
      where.readingDate = {
        ...where.readingDate,
        lte: new Date(endDate),
      };
    }

    // If customerId is provided, find meters for that customer
    if (customerId) {
      const customerMeters = await prisma.meter.findMany({
        where: { customerId },
        select: { id: true },
      });
      where.meterId = { in: customerMeters.map((m) => m.id) };
    }

    const [readings, total] = await Promise.all([
      prisma.meterReading.findMany({
        where,
        include: {
          meter: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
              utilityType: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
        },
        orderBy: { readingDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.meterReading.count({ where }),
    ]);

    return NextResponse.json({
      data: readings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get readings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch readings' },
      { status: 500 }
    );
  }
}

// POST create new meter reading
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, [
    StaffRole.ADMIN,
    StaffRole.METER_READER,
    StaffRole.CLERK,
  ]);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const { meterId, readingValue, readingDate, remarks } = body;

    if (!meterId || readingValue === undefined) {
      return NextResponse.json(
        { error: 'Meter ID and reading value are required' },
        { status: 400 }
      );
    }

    // Verify meter exists and is active
    const meter = await prisma.meter.findUnique({
      where: { id: meterId },
      include: {
        readings: {
          orderBy: { readingDate: 'desc' },
          take: 1,
        },
      },
    });

    if (!meter) {
      return NextResponse.json(
        { error: 'Meter not found' },
        { status: 404 }
      );
    }

    if (meter.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot record reading for inactive meter' },
        { status: 400 }
      );
    }

    // Validate reading value is not less than previous reading
    if (meter.readings.length > 0) {
      const lastReading = meter.readings[0];
      if (readingValue < lastReading.readingValue) {
        return NextResponse.json(
          {
            error: 'Reading value cannot be less than previous reading',
            previousReading: lastReading.readingValue,
          },
          { status: 400 }
        );
      }
    }

    const reading = await prisma.meterReading.create({
      data: {
        meterId,
        readingValue: parseFloat(readingValue),
        readingDate: readingDate ? new Date(readingDate) : new Date(),
        remarks,
        recordedBy: authResult.user.username,
      },
      include: {
        meter: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
            utilityType: true,
          },
        },
      },
    });

    // Update meter's last reading date
    await prisma.meter.update({
      where: { id: meterId },
      data: { lastReadingDate: reading.readingDate },
    });

    return NextResponse.json({ data: reading }, { status: 201 });
  } catch (error) {
    console.error('Create reading error:', error);
    return NextResponse.json(
      { error: 'Failed to create reading' },
      { status: 500 }
    );
  }
}
