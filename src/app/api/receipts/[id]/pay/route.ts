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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  if (!['ADMIN', 'SELLER'].includes(auth.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;
  const receiptId = parseInt(id, 10);
  if (!Number.isInteger(receiptId) || receiptId <= 0) {
    return NextResponse.json({ message: 'ID de recibo inválido' }, { status: 400 });
  }

  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: { contract: { select: { sellerUserId: true, sale: { select: { sellerUserId: true } } } } },
  });
  if (!receipt) return NextResponse.json({ message: 'Recibo no encontrado' }, { status: 404 });
  if (auth.role === 'SELLER' &&
    receipt.contract.sellerUserId !== auth.userId &&
    receipt.contract.sale.sellerUserId !== auth.userId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }
  if (receipt.status === 'PAID') return NextResponse.json(receipt);

  const result = await prisma.receipt.updateMany({
    where: { id: receiptId, status: 'PENDING' },
    data: { status: 'PAID', paidAt: new Date() },
  });
  if (result.count === 0) {
    return NextResponse.json({ message: 'El recibo ya no está pendiente de pago' }, { status: 409 });
  }

  const updated = await prisma.receipt.findUnique({ where: { id: receiptId } });
  return NextResponse.json(updated);
}
