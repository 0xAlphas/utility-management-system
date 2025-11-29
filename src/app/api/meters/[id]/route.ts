import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';


// GET single meter
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const meter = await prisma.meter.findUnique({
      where: { id: params.id },
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
          take: 20,
        },
      },
    });

    if (!meter) {
      return NextResponse.json(
        { error: 'Meter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: meter });
  } catch (error) {
    console.error('Get meter error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meter' },
      { status: 500 }
    );
  }
}

// PATCH update meter
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, ['ADMIN', 'CLERK']);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const { status, lastReadingDate } = body;

    // Check if meter exists
    const existing = await prisma.meter.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Meter not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (lastReadingDate) updateData.lastReadingDate = new Date(lastReadingDate);

    const meter = await prisma.meter.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json({ data: meter });
  } catch (error) {
    console.error('Update meter error:', error);
    return NextResponse.json(
      { error: 'Failed to update meter' },
      { status: 500 }
    );
  }
}

// DELETE meter
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, ['ADMIN']);
  if (authResult instanceof Response) return authResult;

  try {
    // Check if meter has readings
    const readingsCount = await prisma.meterReading.count({
      where: { meterId: params.id },
    });

    if (readingsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete meter with existing readings. Set status to DISCONNECTED instead.' },
        { status: 400 }
      );
    }

    await prisma.meter.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: 'Meter deleted successfully',
    });
  } catch (error) {
    console.error('Delete meter error:', error);
    return NextResponse.json(
      { error: 'Failed to delete meter' },
      { status: 500 }
    );
  }
}
