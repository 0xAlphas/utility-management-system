import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, hashPassword } from '@/lib/auth';
import { StaffRole } from '@/generated/prisma';

// GET all staff (Admin and Manager only)
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, [StaffRole.ADMIN, StaffRole.MANAGER]);
  if (authResult instanceof Response) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (role) where.role = role as StaffRole;
    if (isActive !== null) where.isActive = isActive === 'true';

    const staff = await prisma.staff.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: staff, count: staff.length });
  } catch (error) {
    console.error('Get staff error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
      { status: 500 }
    );
  }
}

// POST create new staff (Admin only)
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, [StaffRole.ADMIN]);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const { username, password, name, email, role } = body;

    if (!username || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Username, password, name, and role are required' },
        { status: 400 }
      );
    }

    // Check if username or email already exists
    const existing = await prisma.staff.findFirst({
      where: {
        OR: [
          { username },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create staff
    const staff = await prisma.staff.create({
      data: {
        username,
        passwordHash,
        name,
        email,
        role,
      },
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

    return NextResponse.json({ data: staff }, { status: 201 });
  } catch (error) {
    console.error('Create staff error:', error);
    return NextResponse.json(
      { error: 'Failed to create staff' },
      { status: 500 }
    );
  }
}
