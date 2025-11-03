import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { StaffRole } from '@/generated/prisma';

// GET single customer
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        meters: {
          include: {
            utilityType: true,
            readings: {
              orderBy: { readingDate: 'desc' },
              take: 5,
            },
          },
        },
        bills: {
          orderBy: { issueDate: 'desc' },
          take: 10,
          include: {
            payments: true,
          },
        },
        complaints: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: customer });
  } catch (error) {
    console.error('Get customer error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

// PATCH update customer
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, [StaffRole.ADMIN, StaffRole.CLERK]);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const { name, type, contact, email, address, city, postalCode, isActive } = body;

    // Check if customer exists
    const existing = await prisma.customer.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (contact) updateData.contact = contact;
    if (email !== undefined) updateData.email = email;
    if (address) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (postalCode !== undefined) updateData.postalCode = postalCode;
    if (isActive !== undefined) updateData.isActive = isActive;

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: updateData,
      include: {
        meters: {
          include: {
            utilityType: true,
          },
        },
      },
    });

    return NextResponse.json({ data: customer });
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}

// DELETE customer (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, [StaffRole.ADMIN]);
  if (authResult instanceof Response) return authResult;

  try {
    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({
      message: 'Customer deactivated successfully',
      data: customer,
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate customer' },
      { status: 500 }
    );
  }
}
