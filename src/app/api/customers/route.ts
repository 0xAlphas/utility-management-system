import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET all customers
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contact: { contains: search } },
        { email: { contains: search } },
        { address: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          meters: {
            include: {
              utilityType: true,
            },
          },
          _count: {
            select: {
              bills: true,
              complaints: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

// POST create new customer
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, ['ADMIN', 'CLERK']);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const { name, type, contact, email, address, city, postalCode } = body;

    if (!name || !type || !contact || !address) {
      return NextResponse.json(
        { error: 'Name, type, contact, and address are required' },
        { status: 400 }
      );
    }

    // Validate customer type
    const validTypes = ['HOUSEHOLD', 'BUSINESS', 'GOVERNMENT'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid customer type' },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        type,
        contact,
        email,
        address,
        city,
        postalCode,
      },
      include: {
        meters: true,
      },
    });

    return NextResponse.json({ data: customer }, { status: 201 });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}
