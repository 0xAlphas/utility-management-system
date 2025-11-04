import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { StaffRole } from '@/generated/prisma';

// GET all tariffs
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const utilityTypeId = searchParams.get('utilityTypeId');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (utilityTypeId) where.utilityTypeId = utilityTypeId;
    if (isActive !== null) where.isActive = isActive === 'true';

    // Get active tariffs (not expired)
    const now = new Date();
    where.effectiveFrom = { lte: now };
    where.OR = [
      { effectiveTo: null },
      { effectiveTo: { gte: now } },
    ];

    const tariffs = await prisma.tariff.findMany({
      where,
      include: {
        utilityType: true,
      },
      orderBy: [
        { utilityTypeId: 'asc' },
        { minUsage: 'asc' },
      ],
    });

    return NextResponse.json({
      data: tariffs,
      count: tariffs.length,
    });
  } catch (error) {
    console.error('Get tariffs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tariffs' },
      { status: 500 }
    );
  }
}

// POST create new tariff
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, [StaffRole.ADMIN]);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const {
      name,
      utilityTypeId,
      minUsage,
      maxUsage,
      rate,
      fixedCharge,
      effectiveFrom,
      effectiveTo,
    } = body;

    if (!name || !utilityTypeId || rate === undefined) {
      return NextResponse.json(
        { error: 'Name, utility type ID, and rate are required' },
        { status: 400 }
      );
    }

    // Verify utility type exists
    const utilityType = await prisma.utilityType.findUnique({
      where: { id: utilityTypeId },
    });

    if (!utilityType) {
      return NextResponse.json(
        { error: 'Utility type not found' },
        { status: 404 }
      );
    }

    // Validate usage range
    if (maxUsage !== null && maxUsage !== undefined && minUsage >= maxUsage) {
      return NextResponse.json(
        { error: 'Maximum usage must be greater than minimum usage' },
        { status: 400 }
      );
    }

    const tariff = await prisma.tariff.create({
      data: {
        name,
        utilityTypeId,
        minUsage: minUsage || 0,
        maxUsage: maxUsage || null,
        rate: parseFloat(rate),
        fixedCharge: fixedCharge ? parseFloat(fixedCharge) : 0,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      },
      include: {
        utilityType: true,
      },
    });

    return NextResponse.json({ data: tariff }, { status: 201 });
  } catch (error) {
    console.error('Create tariff error:', error);
    return NextResponse.json(
      { error: 'Failed to create tariff' },
      { status: 500 }
    );
  }
}
