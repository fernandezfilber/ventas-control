import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'ventas-control-jwt-secret-prod-2024');

async function getAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { userId: number; username: string; role: string; fullName?: string };
  } catch { return null; }
}

// GET — listar clientes del asesor (o todos para admin)
export async function GET(req: Request) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // "2024-10"
  const seller = searchParams.get('seller');

  const where: Record<string, unknown> = { status: 'INSTALLED' };

  // Solo instaladas (clientes activos con contrato)
  if (auth.role === 'SELLER') {
    where.sellerNameOrId = auth.fullName || auth.username;
  } else if (seller) {
    where.sellerNameOrId = seller;
  }

  if (month) {
    const [y, m] = month.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    where.installedAt = { gte: start, lte: end };
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      contract: {
        include: {
          receipts: { orderBy: { monthNumber: 'asc' } },
          clientUser: { select: { id: true, username: true, fullName: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(sales);
}

// POST — crear nuevo cliente (sale)
export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SELLER')) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    const data = await req.json();

    const lastSale = await prisma.sale.findFirst({ orderBy: { id: 'desc' } });
    const nextNum = lastSale ? parseInt(lastSale.correlativeId, 10) + 1 : 1;
    const correlativeId = nextNum.toString().padStart(4, '0');

    const sellerName = auth.fullName || auth.username;
    const installedAt = new Date();
    const endDate = new Date(installedAt);
    endDate.setMonth(endDate.getMonth() + 3);
    const paymentDay = installedAt.getDate();

    const lastContract = await prisma.contract.findFirst({ orderBy: { id: 'desc' } });
    const contractNum = lastContract ? lastContract.id + 1 : 1;
    const contractNumber = `FV-${new Date().getFullYear()}-${contractNum.toString().padStart(4, '0')}`;

    const sale = await prisma.sale.create({
      data: {
        correlativeId,
        dni: data.dni,
        names: data.names,
        address: data.address,
        phone: data.phone,
        locationLink: data.locationLink || '',
        installationDate: data.installationDate || null,
        internetPlan: data.internetPlan || null,
        details: data.details || null,
        sellerNameOrId: data.sellerName || sellerName,
        status: 'INSTALLED',
        installedAt,
        contract: {
          create: {
            contractNumber,
            sellerUserId: auth.userId,
            startDate: installedAt,
            endDate,
            monthlyAmount: parseFloat(data.monthlyAmount) || 0,
            paymentDay,
            receipts: {
              create: [1, 2, 3].map((month) => {
                const dueDate = new Date(installedAt);
                dueDate.setMonth(dueDate.getMonth() + month);
                return { monthNumber: month, dueDate, amount: parseFloat(data.monthlyAmount) || 0 };
              }),
            },
          },
        },
      },
      include: { contract: { include: { receipts: true } } },
    });

    // Crear cuenta Cliente si se proporciona DNI (usuario=DNI, pass=DNI)
    if (data.createAccess !== false) {
      const existing = await prisma.user.findUnique({ where: { username: data.dni } });
      if (!existing) {
        const bcrypt = require('bcryptjs');
        const hashed = await bcrypt.hash(data.dni, 10);
        const newUser = await prisma.user.create({
          data: { username: data.dni, password: hashed, role: 'CLIENT', fullName: data.names, phone: data.phone, sellerId: auth.userId },
        });
        // Vincular al contrato
        await prisma.contract.update({
          where: { saleId: sale.id },
          data: { clientUserId: newUser.id },
        });
      }
    }

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ message: 'Error al crear cliente' }, { status: 500 });
  }
}
