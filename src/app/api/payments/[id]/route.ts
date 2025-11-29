import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET single payment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: {
        bill: {
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
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: payment });
  } catch (error) {
    console.error('Get payment error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment' },
      { status: 500 }
    );
  }
}

// PATCH update payment (limited fields)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, ['ADMIN', 'CLERK']);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const { referenceNumber, remarks } = body;

    // Check if payment exists
    const existing = await prisma.payment.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (referenceNumber !== undefined) updateData.referenceNumber = referenceNumber;
    if (remarks !== undefined) updateData.remarks = remarks;

    const payment = await prisma.payment.update({
      where: { id: params.id },
      data: updateData,
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
    });

    return NextResponse.json({ data: payment });
  } catch (error) {
    console.error('Update payment error:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}

// DELETE payment (refund/reverse)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, ['ADMIN']);
  if (authResult instanceof Response) return authResult;

  try {
    // Get payment with bill
    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: {
        bill: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Delete payment and update bill in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete payment
      await tx.payment.delete({
        where: { id: params.id },
      });

      // Recalculate bill amounts
      const remainingPayments = await tx.payment.findMany({
        where: { billId: payment.billId },
      });

      const newPaidAmount = remainingPayments.reduce(
        (sum, p) => sum + p.amount,
        0
      );
      const newOutstandingAmount = payment.bill.totalAmount - newPaidAmount;

      let newStatus;
      if (newOutstandingAmount === 0 && newPaidAmount === 0) {
        newStatus = 'UNPAID';
      } else if (newOutstandingAmount === 0) {
        newStatus = 'PAID';
      } else if (newPaidAmount > 0) {
        newStatus = 'PARTIALLY_PAID';
      } else {
        newStatus = 'UNPAID';
      }

      // Update bill
      const updatedBill = await tx.bill.update({
        where: { id: payment.billId },
        data: {
          paidAmount: newPaidAmount,
          outstandingAmount: newOutstandingAmount,
          status: newStatus,
        },
      });

      return { updatedBill };
    });

    return NextResponse.json({
      message: 'Payment deleted successfully',
      updatedBill: result.updatedBill,
    });
  } catch (error) {
    console.error('Delete payment error:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment' },
      { status: 500 }
    );
  }
}
