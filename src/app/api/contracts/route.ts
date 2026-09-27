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

// GET — list contracts
export async function GET(req: Request) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  // Sellers only see their contracts
  if (auth.role === 'SELLER') {
    where.sellerUserId = auth.userId;
  }
  // Clients only see their own contract
  if (auth.role === 'CLIENT') {
    where.clientUserId = auth.userId;
  }

  const contracts = await prisma.contract.findMany({
    where,
    include: {
      sale: { select: { names: true, dni: true, phone: true, address: true, internetPlan: true, correlativeId: true } },
      clientUser: { select: { id: true, username: true, fullName: true, phone: true } },
      sellerUser: { select: { id: true, username: true, fullName: true } },
      receipts: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(contracts);
}

// POST — create contract manually (admin)
export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    const { saleId, monthlyAmount, clientUserId, sellerUserId } = await req.json();

    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) return NextResponse.json({ message: 'Venta no encontrada' }, { status: 404 });

    const existing = await prisma.contract.findUnique({ where: { saleId } });
    if (existing) return NextResponse.json({ message: 'Ya existe un contrato para esta venta' }, { status: 409 });

    const startDate = sale.installedAt || new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 3);
    const paymentDay = startDate.getDate();

    const lastContract = await prisma.contract.findFirst({ orderBy: { id: 'desc' } });
    const nextNum = lastContract ? lastContract.id + 1 : 1;
    const contractNumber = `FV-${new Date().getFullYear()}-${nextNum.toString().padStart(4, '0')}`;

    const contract = await prisma.contract.create({
      data: {
        contractNumber,
        saleId,
        clientUserId: clientUserId || null,
        sellerUserId: sellerUserId || null,
        startDate,
        endDate,
        monthlyAmount: monthlyAmount || 0,
        paymentDay,
        receipts: {
          create: [1, 2, 3].map((month) => {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + month);
            return { monthNumber: month, dueDate, amount: monthlyAmount || 0 };
          }),
        },
      },
      include: { receipts: true, sale: true },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    console.error('Error creating contract:', error);
    return NextResponse.json({ message: 'Error al crear contrato' }, { status: 500 });
  }
}
