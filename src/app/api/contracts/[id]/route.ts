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
      clientUser: { select: { id: true, username: true, fullName: true, phone: true } },
      sellerUser: { select: { id: true, username: true, fullName: true } },
      receipts: { orderBy: { monthNumber: 'asc' } },
    },
  });

  if (!contract) return NextResponse.json({ message: 'Contrato no encontrado' }, { status: 404 });

  // Access control
  if (auth.role === 'CLIENT' && contract.clientUserId !== auth.userId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }
  if (auth.role === 'SELLER' && contract.sellerUserId !== auth.userId) {
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
  const data = await req.json();

  const updateData: Record<string, unknown> = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.clientUserId !== undefined) updateData.clientUserId = data.clientUserId;
  if (data.sellerUserId !== undefined) updateData.sellerUserId = data.sellerUserId;
  if (data.monthlyAmount !== undefined) updateData.monthlyAmount = data.monthlyAmount;

  const contract = await prisma.contract.update({
    where: { id: contractId },
    data: updateData,
    include: { receipts: true, sale: true },
  });

  return NextResponse.json(contract);
}
