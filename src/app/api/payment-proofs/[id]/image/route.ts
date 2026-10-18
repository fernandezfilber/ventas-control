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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthUser();
  if (!auth || !['ADMIN', 'SELLER'].includes(auth.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  const proofId = Number((await params).id);
  if (!Number.isInteger(proofId) || proofId <= 0) {
    return NextResponse.json({ message: 'Captura inválida' }, { status: 400 });
  }

  const proof = await prisma.paymentProof.findUnique({
    where: { id: proofId },
    select: { mimeType: true, imageBase64: true, clientUserId: true },
  });
  if (!proof || !proof.clientUserId) {
    return NextResponse.json({ message: 'Captura no encontrada' }, { status: 404 });
  }

  if (auth.role === 'SELLER') {
    const client = await prisma.user.findFirst({
      where: {
        id: proof.clientUserId,
        role: 'CLIENT',
        OR: [
          { sellerId: auth.userId },
          { clientContracts: { some: { sellerUserId: auth.userId } } },
          { clientSales: { some: { sellerUserId: auth.userId } } },
        ],
      },
      select: { id: true },
    });
    if (!client) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(proof.mimeType)) {
    return NextResponse.json({ message: 'Formato de imagen no admitido' }, { status: 415 });
  }

  return new Response(Buffer.from(proof.imageBase64, 'base64'), {
    headers: {
      'Content-Type': proof.mimeType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
