import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET all utility types
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const utilityTypes = await prisma.utilityType.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(
      {
        data: utilityTypes,
        count: utilityTypes.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching utility types:', error);
    return NextResponse.json({ error: 'Failed to fetch utility types' }, { status: 500 });
  }
}
