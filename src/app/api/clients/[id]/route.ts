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
    return payload as { userId: number; username: string; role: string };
  } catch { return null; }
}

// GET — obtener un cliente
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  const sale = await prisma.sale.findUnique({
    where: { id: parseInt(id) },
    include: {
      contract: {
        include: {
          receipts: { orderBy: { monthNumber: 'asc' } },
          clientUser: { select: { id: true, username: true, fullName: true, phone: true } },
          sellerUser: { select: { id: true, username: true, fullName: true } },
        },
      },
    },
  });
  if (!sale) return NextResponse.json({ message: 'No encontrado' }, { status: 404 });
  return NextResponse.json(sale);
}

// PUT — editar cliente
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SELLER')) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const data = await req.json();

  const updateData: Record<string, unknown> = {};
  if (data.names !== undefined) updateData.names = data.names;
  if (data.dni !== undefined) updateData.dni = data.dni;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.internetPlan !== undefined) updateData.internetPlan = data.internetPlan;
  if (data.details !== undefined) updateData.details = data.details;

  const updated = await prisma.sale.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: { contract: { include: { receipts: true } } },
  });

  // Actualizar monto mensual si cambió
  if (data.monthlyAmount && updated.contract) {
    const amount = parseFloat(data.monthlyAmount);
    await prisma.contract.update({
      where: { id: updated.contract.id },
      data: { monthlyAmount: amount },
    });
    // Actualizar recibos pendientes
    await prisma.receipt.updateMany({
      where: { contractId: updated.contract.id, status: 'PENDING' },
      data: { amount },
    });
  }

  return NextResponse.json(updated);
}

// DELETE — eliminar cliente
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SELLER')) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const saleId = parseInt(id);

  const sale = await prisma.sale.findUnique({ where: { id: saleId }, include: { contract: true } });
  if (!sale) return NextResponse.json({ message: 'No encontrado' }, { status: 404 });

  if (sale.contract) {
    await prisma.receipt.deleteMany({ where: { contractId: sale.contract.id } });
    await prisma.contract.delete({ where: { id: sale.contract.id } });
  }
  await prisma.sale.delete({ where: { id: saleId } });

  return NextResponse.json({ message: 'Cliente eliminado' });
}
