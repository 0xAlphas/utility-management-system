import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET single bill
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const { id } = await params;
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            type: true,
            contact: true,
            email: true,
            address: true,
            city: true,
            postalCode: true,
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    // Parse bill details from remarks
    let details = null;
    try {
      details = bill.remarks ? JSON.parse(bill.remarks) : null;
    } catch (e) {
      details = null;
    }

    return NextResponse.json({
      data: {
        ...bill,
        details,
      },
    });
  } catch (error) {
    console.error('Get bill error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bill' },
      { status: 500 }
    );
  }
}

// PATCH update bill
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request, ['ADMIN', 'CLERK']);
  if (authResult instanceof Response) return authResult;

  try {
    const { id } = await params;
    const body = await request.json();
    const { dueDate, status, remarks } = body;

    // Check if bill exists
    const existing = await prisma.bill.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (status) updateData.status = status;
    if (remarks !== undefined) updateData.remarks = remarks;

    const bill = await prisma.bill.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        payments: true,
      },
    });

    return NextResponse.json({ data: bill });
  } catch (error) {
    console.error('Update bill error:', error);
    return NextResponse.json(
      { error: 'Failed to update bill' },
      { status: 500 }
    );
  }
}

// DELETE bill
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request, ['ADMIN']);
  if (authResult instanceof Response) return authResult;

  try {
    const { id } = await params;
    // Check if bill has payments
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        payments: true,
      },
    });

    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    if (bill.payments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete bill with existing payments. Cancel it instead.' },
        { status: 400 }
      );
    }

    await prisma.bill.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Bill deleted successfully',
    });
  } catch (error) {
    console.error('Delete bill error:', error);
    return NextResponse.json(
      { error: 'Failed to delete bill' },
      { status: 500 }
    );
  }
}
