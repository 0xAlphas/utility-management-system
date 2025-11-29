import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';


// GET single tariff
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const tariff = await prisma.tariff.findUnique({
      where: { id: params.id },
      include: {
        utilityType: true,
      },
    });

    if (!tariff) {
      return NextResponse.json(
        { error: 'Tariff not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: tariff });
  } catch (error) {
    console.error('Get tariff error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tariff' },
      { status: 500 }
    );
  }
}

// PATCH update tariff
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, ['ADMIN']);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const { name, minUsage, maxUsage, rate, fixedCharge, isActive, effectiveTo } = body;

    // Check if tariff exists
    const existing = await prisma.tariff.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Tariff not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (minUsage !== undefined) updateData.minUsage = parseFloat(minUsage);
    if (maxUsage !== undefined) updateData.maxUsage = maxUsage ? parseFloat(maxUsage) : null;
    if (rate !== undefined) updateData.rate = parseFloat(rate);
    if (fixedCharge !== undefined) updateData.fixedCharge = parseFloat(fixedCharge);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (effectiveTo !== undefined) updateData.effectiveTo = effectiveTo ? new Date(effectiveTo) : null;

    const tariff = await prisma.tariff.update({
      where: { id: params.id },
      data: updateData,
      include: {
        utilityType: true,
      },
    });

    return NextResponse.json({ data: tariff });
  } catch (error) {
    console.error('Update tariff error:', error);
    return NextResponse.json(
      { error: 'Failed to update tariff' },
      { status: 500 }
    );
  }
}

// DELETE tariff
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, ['ADMIN']);
  if (authResult instanceof Response) return authResult;

  try {
    // Instead of deleting, set effectiveTo to now (expire the tariff)
    const tariff = await prisma.tariff.update({
      where: { id: params.id },
      data: {
        isActive: false,
        effectiveTo: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Tariff deactivated successfully',
      data: tariff,
    });
  } catch (error) {
    console.error('Delete tariff error:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate tariff' },
      { status: 500 }
    );
  }
}
