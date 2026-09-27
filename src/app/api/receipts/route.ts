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

// GET — list receipts
export async function GET(req: Request) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  if (!['ADMIN', 'SELLER', 'CLIENT'].includes(auth.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const contractId = searchParams.get('contractId');

  const where: Record<string, unknown> = {};
  if (contractId) where.contractId = parseInt(contractId, 10);

  // For CLIENT role - only their receipts
  if (auth.role === 'CLIENT') {
    const clientContracts = await prisma.contract.findMany({
      where: { clientUserId: auth.userId },
      select: { id: true },
    });
    where.contractId = { in: clientContracts.map((c) => c.id) };
  }
  if (auth.role === 'SELLER') {
    const sellerContracts = await prisma.contract.findMany({
      where: { OR: [{ sellerUserId: auth.userId }, { sale: { sellerUserId: auth.userId } }] },
      select: { id: true },
    });
    where.contractId = { in: sellerContracts.map((contract) => contract.id) };
  }

  const receipts = await prisma.receipt.findMany({
    where,
    include: { contract: { select: { contractNumber: true, sale: { select: { names: true } } } } },
    orderBy: { dueDate: 'asc' },
  });

  return NextResponse.json(receipts);
}
