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

// GET — get single contract
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const contractId = parseInt(id, 10);

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      sale: true,
      clientUser: { select: { id: true, username: true, fullName: true, phone: true, whatsappRemindersEnabled: true } },
      sellerUser: { select: { id: true, username: true, fullName: true } },
      receipts: { orderBy: { monthNumber: 'asc' } },
    },
  });

  if (!contract) return NextResponse.json({ message: 'Contrato no encontrado' }, { status: 404 });

  // Access control
  if (auth.role === 'CLIENT' && contract.clientUserId !== auth.userId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }
  if (auth.role === 'SELLER' && contract.sellerUserId !== auth.userId && contract.sale.sellerUserId !== auth.userId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  return NextResponse.json(contract);
}

// PUT — update contract (admin/seller can link users, update amount)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const contractId = parseInt(id, 10);
  if (!Number.isInteger(contractId)) return NextResponse.json({ message: 'ID inválido' }, { status: 400 });

  const existingContract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { sale: true, clientUser: true },
  });
  if (!existingContract) return NextResponse.json({ message: 'Contrato no encontrado' }, { status: 404 });
  if (auth.role !== 'ADMIN' && auth.role !== 'SELLER') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }
  if (auth.role === 'SELLER' && existingContract.sellerUserId !== auth.userId && existingContract.sale.sellerUserId !== auth.userId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  const data = await req.json();

  const updateData: Record<string, unknown> = {};
  if (auth.role === 'ADMIN') {
    if (data.status !== undefined) updateData.status = data.status;
    if (data.sellerUserId !== undefined) updateData.sellerUserId = data.sellerUserId;
    if (data.monthlyAmount !== undefined) updateData.monthlyAmount = data.monthlyAmount;
  }
  if (data.clientUserId !== undefined) {
    if (data.clientUserId !== null) {
      const client = await prisma.user.findUnique({ where: { id: Number(data.clientUserId) } });
      if (!client || client.role !== 'CLIENT' || (auth.role === 'SELLER' && client.sellerId !== auth.userId)) {
        return NextResponse.json({ message: 'El cliente no pertenece a este asesor' }, { status: 403 });
      }
      updateData.clientUserId = client.id;
    } else if (auth.role === 'ADMIN') {
      updateData.clientUserId = null;
    }
  }
  if (data.reminderMode !== undefined) {
    if (!['MANUAL', 'AUTOMATIC'].includes(data.reminderMode)) {
      return NextResponse.json({ message: 'Modo de recordatorio inválido' }, { status: 400 });
    }
    if (data.reminderMode === 'AUTOMATIC' && !existingContract.clientUser?.whatsappRemindersEnabled) {
      return NextResponse.json({ message: 'El cliente debe aceptar primero los recordatorios por WhatsApp' }, { status: 400 });
    }
    updateData.reminderMode = data.reminderMode;
  }

  const contract = await prisma.contract.update({
    where: { id: contractId },
    data: updateData,
    include: { receipts: true, sale: true },
  });

  return NextResponse.json(contract);
}
