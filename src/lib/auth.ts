import { NextRequest } from 'next/server';
import { StaffRole } from './types';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  id: string;
  username: string;
  role: string;
}

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export async function authenticateRequest(request: NextRequest): Promise<JWTPayload | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  // Verify user still exists and is active
  const staff = await prisma.staff.findUnique({
    where: { id: payload.id, isActive: true },
  });

  if (!staff) return null;

  return payload;
}

export function authorizeRoles(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

export async function requireAuth(
  request: NextRequest,
  allowedRoles?: string[]
): Promise<{ user: JWTPayload } | Response> {
  const user = await authenticateRequest(request);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (allowedRoles && !authorizeRoles(user.role, allowedRoles)) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return { user };
}
