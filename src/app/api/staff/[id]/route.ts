import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, hashPassword } from '@/lib/auth';


// GET single staff member
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, ['ADMIN', 'MANAGER']);
  if (authResult instanceof Response) return authResult;

  try {
    const staff = await prisma.staff.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: staff });
  } catch (error) {
    console.error('Get staff error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
      { status: 500 }
    );
  }
}

// PATCH update staff member
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, ['ADMIN']);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const { name, email, role, isActive, password } = body;

    // Check if staff exists
    const existing = await prisma.staff.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.passwordHash = await hashPassword(password);

    const staff = await prisma.staff.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: staff });
  } catch (error) {
    console.error('Update staff error:', error);
    return NextResponse.json(
      { error: 'Failed to update staff' },
      { status: 500 }
    );
  }
}

// DELETE staff member (soft delete by setting isActive to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, ['ADMIN']);
  if (authResult instanceof Response) return authResult;

  try {
    const staff = await prisma.staff.update({
      where: { id: params.id },
      data: { isActive: false },
      select: {
        id: true,
        username: true,
        name: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      message: 'Staff deactivated successfully',
      data: staff
    });
  } catch (error) {
    console.error('Delete staff error:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate staff' },
      { status: 500 }
    );
  }
}
