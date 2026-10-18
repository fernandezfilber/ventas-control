import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'ventas-control-jwt-secret-prod-2024');

class ReviewConflict extends Error {}

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthUser();
  if (!auth || !['ADMIN', 'SELLER'].includes(auth.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;
  const proofId = Number(id);
  if (!Number.isInteger(proofId) || proofId <= 0) {
    return NextResponse.json({ message: 'Captura inválida' }, { status: 400 });
  }

  let body: { action?: unknown; receiptId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'El cuerpo debe ser JSON válido.' }, { status: 400 });
  }
  if (body.action !== 'approve' && body.action !== 'reject') {
    return NextResponse.json({ message: 'Acción de revisión inválida' }, { status: 400 });
  }

  const proof = await prisma.paymentProof.findUnique({
    where: { id: proofId },
    select: { id: true, clientUserId: true, status: true },
  });
  if (!proof || !proof.clientUserId) {
    return NextResponse.json({ message: 'Captura no encontrada o sin cliente asignado' }, { status: 404 });
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
  if (proof.status !== 'PENDING_REVIEW') {
    return NextResponse.json({ message: 'La captura ya fue revisada' }, { status: 409 });
  }

  try {
    const reviewed = await prisma.$transaction(async (tx) => {
      const claim = await tx.paymentProof.updateMany({
        where: { id: proofId, status: 'PENDING_REVIEW' },
        data: {
          status: body.action === 'approve' ? 'ACCEPTED' : 'REJECTED',
          reviewedAt: new Date(),
          reviewedByUserId: auth.userId,
        },
      });
      if (claim.count === 0) return false;

      if (body.action === 'approve') {
        const receiptId = Number(body.receiptId);
        if (!Number.isInteger(receiptId) || receiptId <= 0) {
          throw new ReviewConflict('Selecciona el recibo al que corresponde el pago.');
        }
        const payment = await tx.receipt.updateMany({
          where: {
            id: receiptId,
            status: { not: 'PAID' },
            contract: {
              clientUserId: proof.clientUserId,
              ...(auth.role === 'SELLER'
                ? { OR: [{ sellerUserId: auth.userId }, { sale: { sellerUserId: auth.userId } }] }
                : {}),
            },
          },
          data: { status: 'PAID', paidAt: new Date() },
        });
        if (payment.count === 0) {
          throw new ReviewConflict('El recibo no está pendiente o no pertenece a este cliente.');
        }
        await tx.paymentProof.update({
          where: { id: proofId },
          data: { candidateReceiptId: receiptId },
        });
      }
      return true;
    });

    if (!reviewed) return NextResponse.json({ message: 'La captura ya fue revisada' }, { status: 409 });
    return NextResponse.json({ message: body.action === 'approve' ? 'Pago confirmado.' : 'Captura rechazada.' });
  } catch (error) {
    if (error instanceof ReviewConflict) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    console.error('Error al revisar la captura de pago:', error);
    return NextResponse.json({ message: 'No se pudo revisar la captura.' }, { status: 500 });
  }
}
