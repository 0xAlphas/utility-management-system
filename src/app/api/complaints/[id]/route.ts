import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET single complaint
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: params.id },
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

    if (!complaint) {
      return NextResponse.json(
        { error: 'Complaint not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: complaint });
  } catch (error) {
    console.error('Get complaint error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch complaint' },
      { status: 500 }
    );
  }
}

// PATCH update complaint
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, ['ADMIN', 'CLERK']);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const { status, resolution, priority, subject, description } = body;

    // Check if complaint exists
    const existing = await prisma.complaint.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Complaint not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (status) updateData.status = status;
    if (resolution !== undefined) updateData.resolution = resolution;
    if (priority) updateData.priority = priority;
    if (subject) updateData.subject = subject;
    if (description) updateData.description = description;

    // If status is being set to RESOLVED, update resolvedAt
    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    const complaint = await prisma.complaint.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json({ data: complaint });
  } catch (error) {
    console.error('Update complaint error:', error);
    return NextResponse.json(
      { error: 'Failed to update complaint' },
      { status: 500 }
    );
  }
}

// DELETE complaint
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, ['ADMIN']);
  if (authResult instanceof Response) return authResult;

  try {
    await prisma.complaint.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: 'Complaint deleted successfully',
    });
  } catch (error) {
    console.error('Delete complaint error:', error);
    return NextResponse.json(
      { error: 'Failed to delete complaint' },
      { status: 500 }
    );
  }
}
