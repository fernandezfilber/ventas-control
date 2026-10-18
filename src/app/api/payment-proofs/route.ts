import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';

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

export async function GET(request: Request) {
  const auth = await getAuthUser();
  if (!auth || !['ADMIN', 'SELLER'].includes(auth.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  const clientUserId = Number(new URL(request.url).searchParams.get('clientUserId'));
  if (!Number.isInteger(clientUserId) || clientUserId <= 0) {
    return NextResponse.json({ message: 'Cliente inválido' }, { status: 400 });
  }

  const client = await prisma.user.findFirst({
    where: {
      id: clientUserId,
      role: 'CLIENT',
      ...(auth.role === 'SELLER'
        ? {
            OR: [
              { sellerId: auth.userId },
              { clientContracts: { some: { sellerUserId: auth.userId } } },
              { clientSales: { some: { sellerUserId: auth.userId } } },
            ],
          }
        : {}),
    },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });

  const [proofs, pendingReceipts] = await Promise.all([
    prisma.paymentProof.findMany({
      where: { clientUserId },
      select: {
        id: true,
        candidateReceiptId: true,
        mimeType: true,
        caption: true,
        status: true,
        receivedAt: true,
        reviewedAt: true,
      },
      orderBy: { receivedAt: 'desc' },
    }),
    prisma.receipt.findMany({
      where: {
        status: { not: 'PAID' },
        contract: {
          clientUserId,
          ...(auth.role === 'SELLER'
            ? { OR: [{ sellerUserId: auth.userId }, { sale: { sellerUserId: auth.userId } }] }
            : {}),
        },
      },
      select: {
        id: true,
        monthNumber: true,
        dueDate: true,
        amount: true,
        contract: { select: { contractNumber: true } },
      },
      orderBy: { dueDate: 'asc' },
    }),
  ]);

  return NextResponse.json({ proofs, pendingReceipts });
}
