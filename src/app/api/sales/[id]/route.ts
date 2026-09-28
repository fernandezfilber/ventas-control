import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'ventas-control-jwt-secret-prod-2024');

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  let authUserId: number;
  let authRole: string;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.role !== 'ADMIN' && payload.role !== 'SELLER') {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }
    authUserId = payload.userId as number;
    authRole = payload.role as string;
  } catch {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    const data = await req.json();
    const confirmsInstallation = data.status === 'INSTALLED';

    if (isNaN(id)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    const existingSale = await prisma.sale.findUnique({ where: { id } });
    if (!existingSale) return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    if (authRole === 'SELLER' && existingSale.sellerUserId !== authUserId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }
    if (authRole === 'SELLER' && data.status !== undefined && !confirmsInstallation) {
      return NextResponse.json({ message: 'El asesor solo puede confirmar la instalación de su cliente' }, { status: 403 });
    }
    if (confirmsInstallation && (!Number.isFinite(data.monthlyAmount) || data.monthlyAmount <= 0)) {
      return NextResponse.json({ message: 'Ingresa un monto mensual válido mayor que cero' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    const installedAt = new Date();
    if (authRole === 'ADMIN') {
      if (data.status !== undefined) updateData.status = data.status;
      if (data.clientId !== undefined) updateData.clientId = data.clientId;

      if (data.status === 'INSTALLED') updateData.installedAt = installedAt;
      if (data.status === 'PENDING') updateData.installedAt = null;
    } else {
      if (confirmsInstallation) {
        updateData.status = 'INSTALLED';
        updateData.installedAt = installedAt;
      }
      const editableFields = ['dni', 'names', 'address', 'phone', 'locationLink', 'referencePhotos', 'installationDate', 'installationTimeRange', 'internetPlan', 'details'];
      for (const field of editableFields) {
        if (data[field] !== undefined) updateData[field] = data[field];
      }
    }

    const updatedSale = await prisma.sale.update({
      where: { id },
      data: updateData,
    });

    // Auto-generate contract when sale is marked as INSTALLED
    if (confirmsInstallation) {
      const existingContract = await prisma.contract.findUnique({ where: { saleId: id } });

      if (!existingContract) {
        const monthlyAmount = data.monthlyAmount;
        const startDate = installedAt;
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 3);
        const paymentDay = startDate.getDate();

        const lastContract = await prisma.contract.findFirst({ orderBy: { id: 'desc' } });
        const nextNum = lastContract ? lastContract.id + 1 : 1;
        const contractNumber = `FV-${new Date().getFullYear()}-${nextNum.toString().padStart(4, '0')}`;

        await prisma.contract.create({
          data: {
            contractNumber,
            saleId: id,
            clientUserId: updatedSale.clientUserId || (await prisma.user.findFirst({ where: { username: updatedSale.dni, role: 'CLIENT' } }))?.id || null,
            sellerUserId: updatedSale.sellerUserId,
            startDate,
            endDate,
            monthlyAmount,
            paymentDay,
            receipts: {
              create: [1, 2, 3].map((month) => {
                const dueDate = new Date(startDate);
                dueDate.setMonth(dueDate.getMonth() + month);
                return { monthNumber: month, dueDate, amount: monthlyAmount };
              }),
            },
          },
        });
      }
    }

    return NextResponse.json(updatedSale);
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json({ message: 'Error al actualizar venta' }, { status: 500 });
  }
}
