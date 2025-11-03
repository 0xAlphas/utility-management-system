import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { StaffRole, MeterStatus } from '@/generated/prisma';

// GET all meters
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const utilityTypeId = searchParams.get('utilityTypeId');
    const status = searchParams.get('status');
    const meterNumber = searchParams.get('meterNumber');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (utilityTypeId) where.utilityTypeId = utilityTypeId;
    if (status) where.status = status as MeterStatus;
    if (meterNumber) where.meterNumber = { contains: meterNumber };

    const [meters, total] = await Promise.all([
      prisma.meter.findMany({
        where,
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
          utilityType: true,
          readings: {
            orderBy: { readingDate: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.meter.count({ where }),
    ]);

    return NextResponse.json({
      data: meters,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get meters error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meters' },
      { status: 500 }
    );
  }
}

// POST create new meter
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, [StaffRole.ADMIN, StaffRole.CLERK]);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const { meterNumber, customerId, utilityTypeId, installationDate, status } = body;

    if (!meterNumber || !customerId || !utilityTypeId) {
      return NextResponse.json(
        { error: 'Meter number, customer ID, and utility type ID are required' },
        { status: 400 }
      );
    }

    // Check if meter number already exists
    const existingMeter = await prisma.meter.findUnique({
      where: { meterNumber },
    });

    if (existingMeter) {
      return NextResponse.json(
        { error: 'Meter number already exists' },
        { status: 409 }
      );
    }

    // Check if customer already has a meter for this utility type
    const existingCustomerMeter = await prisma.meter.findUnique({
      where: {
        customerId_utilityTypeId: {
          customerId,
          utilityTypeId,
        },
      },
    });

    if (existingCustomerMeter) {
      return NextResponse.json(
        { error: 'Customer already has a meter for this utility type' },
        { status: 409 }
      );
    }

    // Verify customer and utility type exist
    const [customer, utilityType] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.utilityType.findUnique({ where: { id: utilityTypeId } }),
    ]);

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    if (!utilityType) {
      return NextResponse.json(
        { error: 'Utility type not found' },
        { status: 404 }
      );
    }

    const meter = await prisma.meter.create({
      data: {
        meterNumber,
        customerId,
        utilityTypeId,
        installationDate: installationDate ? new Date(installationDate) : new Date(),
        status: status || MeterStatus.ACTIVE,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        utilityType: true,
      },
    });

    return NextResponse.json({ data: meter }, { status: 201 });
  } catch (error) {
    console.error('Create meter error:', error);
    return NextResponse.json(
      { error: 'Failed to create meter' },
      { status: 500 }
    );
  }
}
