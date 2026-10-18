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
  const saleId = Number(id);
  if (!Number.isInteger(saleId) || saleId <= 0) {
    return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
  }
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
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
  if (auth.role === 'CLIENT' && sale.clientUserId !== auth.userId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }
  if (auth.role === 'SELLER' && sale.sellerUserId !== auth.userId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }
  if (!['ADMIN', 'SELLER', 'CLIENT'].includes(auth.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }
  return NextResponse.json(sale);
}

// PUT — editar cliente
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SELLER')) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const saleId = Number(id);
  if (!Number.isInteger(saleId) || saleId <= 0) {
    return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
  }
  const existing = await prisma.sale.findUnique({ where: { id: saleId }, include: { contract: true } });
  if (!existing) return NextResponse.json({ message: 'No encontrado' }, { status: 404 });
  if (auth.role === 'SELLER' && existing.sellerUserId !== auth.userId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }
  const data = await req.json();

  try {
    const updateData: Record<string, unknown> = {};
    for (const field of [
      'names', 'dni', 'phone', 'address', 'locationLink', 'internetPlan',
      'details', 'installationTimeRange',
    ]) {
      if (typeof data[field] === 'string') updateData[field] = data[field].trim();
    }
    if (typeof data.installationDate === 'string') {
      const value = data.installationDate.trim();
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      const year = match ? Number(match[1]) : 0;
      const month = match ? Number(match[2]) : 0;
      const day = match ? Number(match[3]) : 0;
      const parsed = match ? new Date(Date.UTC(year, month - 1, day)) : null;
      if (!parsed ||
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day) {
        return NextResponse.json({ message: 'La fecha de instalación debe tener formato AAAA-MM-DD válido.' }, { status: 400 });
      }
      updateData.installationDate = value;
      updateData.installedAt = parsed;
    }
    if (Object.keys(updateData).length === 0 && data.monthlyAmount === undefined) {
      return NextResponse.json({ message: 'No hay cambios para guardar' }, { status: 400 });
    }

    const monthlyAmount = data.monthlyAmount === undefined
      ? null
      : Number(String(data.monthlyAmount).replace(',', '.'));
    if (monthlyAmount !== null && (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0)) {
      return NextResponse.json({ message: 'El monto mensual debe ser mayor que cero' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.sale.update({ where: { id: saleId }, data: updateData });
      if (existing.clientUserId && (typeof updateData.names === 'string' || typeof updateData.phone === 'string')) {
        await tx.user.update({
          where: { id: existing.clientUserId },
          data: {
            ...(typeof updateData.names === 'string' ? { fullName: updateData.names } : {}),
            ...(typeof updateData.phone === 'string' ? { phone: updateData.phone } : {}),
          },
        });
      }
      if (monthlyAmount !== null && existing.contract) {
        await tx.contract.update({
          where: { id: existing.contract.id },
          data: { monthlyAmount },
        });
        await tx.receipt.updateMany({
          where: { contractId: existing.contract.id, status: 'PENDING' },
          data: { amount: monthlyAmount },
        });
      }
      if (updateData.installedAt instanceof Date && existing.contract) {
        const startDate = updateData.installedAt;
        const paymentDay = startDate.getUTCDate();
        const endDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 3, 1));
        endDate.setUTCDate(Math.min(
          paymentDay,
          new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0)).getUTCDate(),
        ));
        await tx.contract.update({
          where: { id: existing.contract.id },
          data: { startDate, endDate, paymentDay },
        });
        const unpaidReceipts = await tx.receipt.findMany({
          where: { contractId: existing.contract.id, status: { not: 'PAID' } },
          select: { id: true, monthNumber: true },
        });
        for (const receipt of unpaidReceipts) {
          const dueDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + receipt.monthNumber, 1));
          dueDate.setUTCDate(Math.min(
            paymentDay,
            new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth() + 1, 0)).getUTCDate(),
          ));
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0);
          await tx.receipt.update({
            where: { id: receipt.id },
            data: {
              dueDate,
              status: dueDate < today ? 'OVERDUE' : 'PENDING',
              reminderFiveDaysSentAt: null,
              reminderDueDateSentAt: null,
              reminderClaimedAt: null,
              reminderClaimedStage: null,
            },
          });
        }
      }
      return tx.sale.findUnique({
        where: { id: saleId },
        include: { contract: { include: { receipts: true } } },
      });
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ message: 'Error al actualizar cliente' }, { status: 500 });
  }
}

// DELETE — eliminar cliente
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SELLER')) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const saleId = Number(id);
  if (!Number.isInteger(saleId) || saleId <= 0) {
    return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
  }

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { contract: { include: { receipts: { select: { status: true } } } } },
  });
  if (!sale) return NextResponse.json({ message: 'No encontrado' }, { status: 404 });
  if (auth.role === 'SELLER' && sale.sellerUserId !== auth.userId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }
  if (sale.contract?.receipts.some((receipt) => receipt.status === 'PAID')) {
    return NextResponse.json({ message: 'No se puede eliminar un cliente con pagos confirmados; conserva su historial.' }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    if (sale.contract) {
      await tx.receipt.deleteMany({ where: { contractId: sale.contract.id } });
      await tx.contract.delete({ where: { id: sale.contract.id } });
    }
    await tx.sale.delete({ where: { id: saleId } });
  });

  return NextResponse.json({ message: 'Cliente eliminado' });
}
