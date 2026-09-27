import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'ventas-control-jwt-secret-prod-2024');

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { userId: number; username: string; role: string };
  } catch {
    return null;
  }
}

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, username: true, role: true, fullName: true, phone: true, sellerId: true, createdAt: true },
  });

  if (!user) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
  return NextResponse.json(user);
}
