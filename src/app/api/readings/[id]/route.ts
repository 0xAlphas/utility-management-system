import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { StaffRole } from '@/generated/prisma';

// GET single reading
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const reading = await prisma.meterReading.findUnique({
      where: { id: params.id },
      include: {
        meter: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                type: true,
                contact: true,
              },
            },
            utilityType: true,
          },
        },
      },
    });

    if (!reading) {
      return NextResponse.json(
        { error: 'Reading not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: reading });
  } catch (error) {
    console.error('Get reading error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reading' },
      { status: 500 }
    );
  }
}

// PATCH update reading
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, [
    StaffRole.ADMIN,
    StaffRole.METER_READER,
  ]);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const { readingValue, readingDate, remarks } = body;

    // Check if reading exists
    const existing = await prisma.meterReading.findUnique({
      where: { id: params.id },
      include: {
        meter: {
          include: {
            readings: {
              orderBy: { readingDate: 'desc' },
              take: 2,
            },
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Reading not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (readingValue !== undefined) {
      // Validate new reading value
      const previousReading = existing.meter.readings.find(
        (r) => r.id !== existing.id && r.readingDate < existing.readingDate
      );
      if (previousReading && readingValue < previousReading.readingValue) {
        return NextResponse.json(
          { error: 'Reading value cannot be less than previous reading' },
          { status: 400 }
        );
      }
      updateData.readingValue = parseFloat(readingValue);
    }
    if (readingDate) updateData.readingDate = new Date(readingDate);
    if (remarks !== undefined) updateData.remarks = remarks;

    const reading = await prisma.meterReading.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json({ data: reading });
  } catch (error) {
    console.error('Update reading error:', error);
    return NextResponse.json(
      { error: 'Failed to update reading' },
      { status: 500 }
    );
  }
}

// DELETE reading
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, [StaffRole.ADMIN]);
  if (authResult instanceof Response) return authResult;

  try {
    await prisma.meterReading.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: 'Reading deleted successfully',
    });
  } catch (error) {
    console.error('Delete reading error:', error);
    return NextResponse.json(
      { error: 'Failed to delete reading' },
      { status: 500 }
    );
  }
}
