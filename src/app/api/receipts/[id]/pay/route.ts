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

// PUT — mark receipt as paid
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SELLER')) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;
  const receiptId = parseInt(id, 10);

  const receipt = await prisma.receipt.update({
    where: { id: receiptId },
    data: { status: 'PAID', paidAt: new Date() },
  });

  return NextResponse.json(receipt);
}
