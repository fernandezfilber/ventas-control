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

// POST — sign contract (client or seller)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const contractId = parseInt(id, 10);
  const { signature, signerRole } = await req.json();

  if (typeof signature !== 'string' || !signature.startsWith('data:image/')) {
    return NextResponse.json({ message: 'Firma inválida' }, { status: 400 });
  }

  const contract = await prisma.contract.findUnique({ where: { id: contractId }, include: { sale: true } });
  if (!contract) return NextResponse.json({ message: 'Contrato no encontrado' }, { status: 404 });

  if (auth.role === 'SELLER' && contract.sellerUserId !== auth.userId && contract.sale.sellerUserId !== auth.userId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }
  if (auth.role !== 'ADMIN' && auth.role !== 'SELLER' && auth.role !== 'CLIENT') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};
  const now = new Date();

  if (auth.role === 'CLIENT') {
    if (auth.role === 'CLIENT' && contract.clientUserId !== auth.userId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }
    updateData.clientSignature = signature;
    updateData.clientSignedAt = now;
  } else if (auth.role === 'SELLER') {
    updateData.sellerSignature = signature;
    updateData.sellerSignedAt = now;
  } else if (auth.role === 'ADMIN') {
    if (signerRole === 'CLIENT') {
      updateData.clientSignature = signature;
      updateData.clientSignedAt = now;
    } else if (signerRole === 'SELLER') {
      updateData.sellerSignature = signature;
      updateData.sellerSignedAt = now;
    } else {
      return NextResponse.json({ message: 'Indica quién firma el contrato' }, { status: 400 });
    }
  }

  // Check if both parties have signed → activate contract
  const updated = await prisma.contract.update({
    where: { id: contractId },
    data: updateData,
  });

  if (updated.clientSignedAt && updated.sellerSignedAt && updated.status === 'PENDING_SIGNATURE') {
    await prisma.contract.update({
      where: { id: contractId },
      data: { status: 'ACTIVE' },
    });
  }

  const finalContract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { receipts: true, sale: true, clientUser: true, sellerUser: true },
  });

  return NextResponse.json(finalContract);
}
