import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET all complaints
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              contact: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.complaint.count({ where }),
    ]);

    return NextResponse.json({
      data: complaints,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch complaints' },
      { status: 500 }
    );
  }
}

// POST create new complaint
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, ['ADMIN', 'CLERK']);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const { customerId, subject, description, priority } = body;

    if (!customerId || !subject || !description) {
      return NextResponse.json(
        { error: 'Customer ID, subject, and description are required' },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const complaint = await prisma.complaint.create({
      data: {
        customerId,
        subject,
        description,
        priority: priority || 'MEDIUM',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            contact: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ data: complaint }, { status: 201 });
  } catch (error) {
    console.error('Create complaint error:', error);
    return NextResponse.json(
      { error: 'Failed to create complaint' },
      { status: 500 }
    );
  }
}
